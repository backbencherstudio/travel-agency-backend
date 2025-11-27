import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { StripeConnect } from '../../../common/lib/Payment/stripe/StripeConnect';
import appConfig from '../../../config/app.config';
import { calculateCommission, calculateVendorPayout } from '../utils/payment-calculations.util';

@Injectable()
export class EscrowService {
    private readonly logger = new Logger(EscrowService.name);

    constructor(
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Hold funds in escrow after client payment
     * Confirms and captures the PaymentIntent to hold funds
     */
    async holdFundsInEscrow(bookingId: string): Promise<{
        success: boolean;
        message: string;
        data?: any;
    }> {
        try {
            this.logger.log(`Holding funds in escrow for booking: ${bookingId}`);

            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
                include: {
                    vendor: true,
                    payment_transactions: {
                        where: { status: 'succeeded' },
                        orderBy: { created_at: 'desc' },
                        take: 1,
                    },
                },
            });

            if (!booking) {
                return { success: false, message: 'Booking not found' };
            }

            if (booking.payment_status !== 'succeeded') {
                return {
                    success: false,
                    message: 'Payment must be succeeded before holding funds in escrow',
                };
            }

            const transaction = booking.payment_transactions[0];
            if (!transaction || !transaction.reference_number) {
                return {
                    success: false,
                    message: 'Payment transaction not found',
                };
            }

            // Get PaymentIntent from Stripe
            const paymentIntent = await StripeConnect.getPaymentIntent(
                transaction.reference_number,
            );

            // If PaymentIntent is not captured yet, capture it to hold funds
            if (paymentIntent.status === 'requires_capture') {
                await StripeConnect.capturePaymentIntent(paymentIntent.id);
                this.logger.log(`Captured PaymentIntent ${paymentIntent.id} for escrow`);
            }

            // Update booking escrow status
            await this.prisma.booking.update({
                where: { id: bookingId },
                data: {
                    escrow_status: 'held',
                },
            });

            this.logger.log(`Funds held in escrow for booking: ${bookingId}`);

            return {
                success: true,
                message: 'Funds held in escrow successfully',
                data: {
                    booking_id: bookingId,
                    escrow_status: 'held',
                    payment_intent_id: paymentIntent.id,
                },
            };
        } catch (error) {
            this.logger.error(
                `Error holding funds in escrow for booking ${bookingId}:`,
                error,
            );
            return {
                success: false,
                message: error.message || 'Failed to hold funds in escrow',
            };
        }
    }

    /**
     * Release funds to vendor
     * Calculates commission (20%) and transfers 80% to vendor's Connect account
     */
    async releaseFunds(
        bookingId: string,
        percentage: number = 100,
    ): Promise<{
        success: boolean;
        message: string;
        data?: any;
    }> {
        try {
            this.logger.log(
                `Releasing ${percentage}% of funds for booking: ${bookingId}`,
            );

            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
                include: {
                    vendor: true,
                    payment_transactions: {
                        where: { status: 'succeeded' },
                        orderBy: { created_at: 'desc' },
                        take: 1,
                    },
                },
            });

            if (!booking) {
                return { success: false, message: 'Booking not found' };
            }

            if (!booking.vendor_id || !booking.vendor) {
                return { success: false, message: 'Vendor not found for booking' };
            }

            if (!booking.vendor.stripe_connect_account_id) {
                return {
                    success: false,
                    message: 'Vendor does not have Stripe Connect account',
                };
            }

            // Check if vendor's Connect account has transfers capability enabled
            try {
                const connectAccount = await StripeConnect.getConnectAccount(
                    booking.vendor.stripe_connect_account_id,
                );

                // Check if transfers capability is enabled
                const transfersCapability = connectAccount.capabilities?.transfers;
                if (transfersCapability !== 'active') {
                    // Get onboarding link for vendor
                    const baseUrl = appConfig().app.url || 'http://localhost:3000';

                    let onboardingLink = null;
                    try {
                        const accountLink = await StripeConnect.createAccountLink(
                            booking.vendor.stripe_connect_account_id,
                            `${baseUrl}/vendor/onboarding/return`,
                            `${baseUrl}/vendor/onboarding/refresh`,
                        );
                        onboardingLink = accountLink.url;
                    } catch (linkError) {
                        this.logger.warn('Failed to create onboarding link:', linkError.message);
                    }

                    return {
                        success: false,
                        message: `Vendor's Stripe Connect account needs to complete onboarding. Transfers capability is: ${transfersCapability || 'not enabled'}`,
                        data: {
                            account_id: booking.vendor.stripe_connect_account_id,
                            capability_status: transfersCapability,
                            onboarding_required: true,
                            onboarding_link: onboardingLink,
                        },
                    };
                }
            } catch (accountError) {
                this.logger.error(
                    `Error checking Connect account capabilities: ${accountError.message}`,
                );
                return {
                    success: false,
                    message: `Failed to verify vendor's Stripe Connect account: ${accountError.message}`,
                };
            }

            if (!booking.paid_amount) {
                return { success: false, message: 'No paid amount found for booking' };
            }

            const transaction = booking.payment_transactions[0];
            if (!transaction || !transaction.reference_number) {
                return {
                    success: false,
                    message: 'Payment transaction not found',
                };
            }

            // Get PaymentIntent from Stripe to extract Charge ID
            const paymentIntent = await StripeConnect.getPaymentIntent(
                transaction.reference_number,
            );

            // Extract Charge ID from PaymentIntent
            // Stripe uses 'latest_charge' field for the most recent charge ID
            const chargeId = paymentIntent.latest_charge;
            if (!chargeId || typeof chargeId !== 'string') {
                return {
                    success: false,
                    message: 'Charge ID not found in PaymentIntent. Payment may not be completed yet.',
                };
            }

            // Calculate amounts
            const totalAmount = Number(booking.paid_amount);
            const releaseAmount = (totalAmount * percentage) / 100;
            const commissionAmount = calculateCommission(releaseAmount);
            const vendorAmount = calculateVendorPayout(releaseAmount);

            // Convert to cents for Stripe
            const vendorAmountCents = Math.round(vendorAmount * 100);
            // Commission is handled via application_fee_amount in Stripe Connect
            // commissionAmountCents is calculated but not used directly in transfer

            this.logger.log(
                `Releasing funds - Total: ${releaseAmount}, Vendor: ${vendorAmount}, Commission: ${commissionAmount}`,
            );
            this.logger.log(`Using Charge ID: ${chargeId} for transfer`);

            // Create transfer to vendor's Connect account
            // Use Charge ID (not PaymentIntent ID) as source_transaction
            const transfer = await StripeConnect.createTransfer({
                amount: vendorAmountCents,
                currency: booking.paid_currency || 'usd',
                destination: booking.vendor.stripe_connect_account_id,
                source_transaction: chargeId,
                metadata: {
                    booking_id: bookingId,
                    release_percentage: percentage.toString(),
                    commission_amount: commissionAmount.toString(),
                    payment_intent_id: transaction.reference_number,
                },
            });

            // Update booking escrow status
            const newEscrowStatus =
                percentage === 100 ? 'released_full' : 'released_partial';

            await this.prisma.booking.update({
                where: { id: bookingId },
                data: {
                    escrow_status: newEscrowStatus,
                },
            });

            // Note: Commission is calculated when payment succeeds (in webhook),
            // not when funds are released. This ensures commission is recorded
            // immediately after successful payment.

            this.logger.log(
                `Funds released successfully - Transfer ID: ${transfer.id}, Vendor received: ${vendorAmount}`,
            );

            return {
                success: true,
                message: `Funds released successfully (${percentage}%)`,
                data: {
                    booking_id: bookingId,
                    transfer_id: transfer.id,
                    vendor_amount: vendorAmount,
                    commission_amount: commissionAmount,
                    escrow_status: newEscrowStatus,
                },
            };
        } catch (error) {
            this.logger.error(
                `Error releasing funds for booking ${bookingId}:`,
                error,
            );
            return {
                success: false,
                message: error.message || 'Failed to release funds',
            };
        }
    }

    /**
     * Process weekly payouts for daily tours (runs every Monday)
     * Processes all completed daily tours from previous week
     */
    async processWeeklyPayouts(): Promise<{
        success: boolean;
        message: string;
        processed: number;
        failed: number;
        results: any[];
    }> {
        try {
            this.logger.log('Processing weekly payouts for daily tours');

            const oneWeekAgo = new Date();
            oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);

            // Find all completed daily tours from last week with weekly payout schedule
            const bookings = await this.prisma.booking.findMany({
                where: {
                    status: 'complete',
                    payout_schedule: 'weekly',
                    escrow_status: 'held',
                    completed_at: {
                        gte: oneWeekAgo,
                    },
                    payment_status: 'succeeded',
                },
                include: {
                    vendor: true,
                },
            });

            this.logger.log(`Found ${bookings.length} bookings for weekly payout`);

            const results = [];
            let processed = 0;
            let failed = 0;

            for (const booking of bookings) {
                try {
                    const result = await this.releaseFunds(booking.id, 100);
                    if (result.success) {
                        processed++;
                    } else {
                        failed++;
                    }
                    results.push({
                        booking_id: booking.id,
                        success: result.success,
                        message: result.message,
                    });
                } catch (error) {
                    failed++;
                    results.push({
                        booking_id: booking.id,
                        success: false,
                        message: error.message,
                    });
                    this.logger.error(
                        `Error processing weekly payout for booking ${booking.id}:`,
                        error,
                    );
                }
            }

            this.logger.log(
                `Weekly payout processing completed - Processed: ${processed}, Failed: ${failed}`,
            );

            return {
                success: true,
                message: `Weekly payouts processed - ${processed} successful, ${failed} failed`,
                processed,
                failed,
                results,
            };
        } catch (error) {
            this.logger.error('Error processing weekly payouts:', error);
            return {
                success: false,
                message: error.message || 'Failed to process weekly payouts',
                processed: 0,
                failed: 0,
                results: [],
            };
        }
    }

    /**
     * Process partial release (50% 30 days before trip for travel packages)
     */
    async processPartialRelease(bookingId: string): Promise<{
        success: boolean;
        message: string;
        data?: any;
    }> {
        try {
            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
                include: {
                    booking_items: {
                        include: {
                            package: true,
                        },
                    },
                },
            });

            if (!booking) {
                return { success: false, message: 'Booking not found' };
            }

            // Check if booking has a start date
            const startDate = booking.booking_items[0]?.start_date;
            if (!startDate) {
                return {
                    success: false,
                    message: 'Booking does not have a start date',
                };
            }

            // Calculate 30 days before trip
            const thirtyDaysBefore = new Date(startDate);
            thirtyDaysBefore.setDate(thirtyDaysBefore.getDate() - 30);

            const today = new Date();
            if (today < thirtyDaysBefore) {
                return {
                    success: false,
                    message: 'Cannot release partial payment yet (more than 30 days before trip)',
                };
            }

            // Check if already released
            if (booking.escrow_status === 'released_partial' || booking.escrow_status === 'released_full') {
                return {
                    success: false,
                    message: 'Partial payment already released',
                };
            }

            // Release 50% (or configured percentage)
            const releasePercentage = booking.release_percentage_30days
                ? Number(booking.release_percentage_30days)
                : 50;

            return await this.releaseFunds(bookingId, releasePercentage);
        } catch (error) {
            this.logger.error(
                `Error processing partial release for booking ${bookingId}:`,
                error,
            );
            return {
                success: false,
                message: error.message || 'Failed to process partial release',
            };
        }
    }

    /**
     * Process final release (remaining 50% after trip completion)
     */
    async processFinalRelease(bookingId: string): Promise<{
        success: boolean;
        message: string;
        data?: any;
    }> {
        try {
            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
            });

            if (!booking) {
                return { success: false, message: 'Booking not found' };
            }

            if (booking.status !== 'complete') {
                return {
                    success: false,
                    message: 'Booking must be completed before final release',
                };
            }

            // If partial release was done, release remaining amount
            if (booking.escrow_status === 'released_partial') {
                // Calculate remaining percentage
                const partialPercentage = booking.release_percentage_30days
                    ? Number(booking.release_percentage_30days)
                    : 50;
                const remainingPercentage = 100 - partialPercentage;

                return await this.releaseFunds(bookingId, remainingPercentage);
            } else if (booking.escrow_status === 'held') {
                // If no partial release, release 100%
                return await this.releaseFunds(bookingId, 100);
            } else {
                return {
                    success: false,
                    message: 'Funds already released',
                };
            }
        } catch (error) {
            this.logger.error(
                `Error processing final release for booking ${bookingId}:`,
                error,
            );
            return {
                success: false,
                message: error.message || 'Failed to process final release',
            };
        }
    }

    /**
     * Handle auto-confirmation if client doesn't confirm within time limit
     * 24h for daily tours, 48h for travel packages
     */
    async handleAutoConfirmation(bookingId: string): Promise<{
        success: boolean;
        message: string;
    }> {
        try {
            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
                include: {
                    booking_items: {
                        include: {
                            package: true,
                        },
                    },
                },
            });

            if (!booking) {
                return { success: false, message: 'Booking not found' };
            }

            if (booking.status !== 'confirmed') {
                return {
                    success: false,
                    message: 'Booking is not in confirmed status',
                };
            }

            if (booking.client_confirmed_at) {
                return {
                    success: false,
                    message: 'Booking already confirmed by client',
                };
            }

            // Determine time limit based on package type
            const isDailyTour = booking.booking_items.some(
                (item) => item.package?.duration_type === 'hours' && (item.package?.duration || 0) <= 24,
            );
            const hoursLimit = isDailyTour ? 24 : 48;

            // Check if time limit has passed
            const confirmedAt = booking.approved_at || booking.created_at;
            const timeSinceConfirmation = Date.now() - new Date(confirmedAt).getTime();
            const hoursSinceConfirmation = timeSinceConfirmation / (1000 * 60 * 60);

            if (hoursSinceConfirmation < hoursLimit) {
                return {
                    success: false,
                    message: `Auto-confirmation not yet due (${hoursLimit}h limit)`,
                };
            }

            // Auto-confirm
            await this.prisma.booking.update({
                where: { id: bookingId },
                data: {
                    client_confirmed_at: new Date(),
                    status: 'complete',
                    completed_at: new Date(),
                },
            });

            this.logger.log(
                `Auto-confirmed booking ${bookingId} after ${hoursLimit}h limit`,
            );

            // For daily tours with weekly payout, funds will be released on next Monday
            // For packages, trigger final release
            if (!isDailyTour) {
                await this.processFinalRelease(bookingId);
            }

            return {
                success: true,
                message: `Booking auto-confirmed after ${hoursLimit}h`,
            };
        } catch (error) {
            this.logger.error(
                `Error handling auto-confirmation for booking ${bookingId}:`,
                error,
            );
            return {
                success: false,
                message: error.message || 'Failed to handle auto-confirmation',
            };
        }
    }
}

