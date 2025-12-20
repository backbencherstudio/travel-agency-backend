import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { StripeConnect } from '../../../common/lib/Payment/stripe/StripeConnect';
import appConfig from '../../../config/app.config';
import { UserRepository } from '../../../common/repository/user/user.repository';
import { calculateCommission, calculateVendorPayout } from '../utils/payment-calculations.util';
import { EscrowExceptionsService } from './escrow-exceptions.service';

@Injectable()
export class EscrowService {
    private readonly logger = new Logger(EscrowService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly escrowExceptionsService: EscrowExceptionsService,
    ) { }

    /**
     * Handle vendor onboarding return from Stripe (by account ID)
     * Checks onboarding status after Stripe redirect using account_id
     */
    async handleVendorOnboardingReturnByAccountId(accountId: string) {
        try {
            // Find user by stripe_connect_account_id
            const user = await this.prisma.user.findFirst({
                where: {
                    stripe_connect_account_id: accountId,
                    type: 'vendor',
                    deleted_at: null,
                },
            });

            if (!user) {
                return {
                    success: false,
                    message: 'Vendor account not found',
                };
            }

            // Check account status
            const connectAccount = await StripeConnect.getConnectAccount(accountId);

            const transfersCapability = connectAccount.capabilities?.transfers;
            const cardPaymentsCapability = connectAccount.capabilities?.card_payments;
            const chargesEnabled = connectAccount.charges_enabled;
            const payoutsEnabled = connectAccount.payouts_enabled;
            const detailsSubmitted = connectAccount.details_submitted;

            const currentlyDue = connectAccount.requirements?.currently_due || [];
            const pastDue = connectAccount.requirements?.past_due || [];

            const isFullyOnboarded =
                transfersCapability === 'active' &&
                cardPaymentsCapability === 'active' &&
                chargesEnabled === true &&
                payoutsEnabled === true &&
                detailsSubmitted === true &&
                currentlyDue.length === 0 &&
                pastDue.length === 0;

            if (isFullyOnboarded) {
                this.logger.log(
                    `Vendor ${user.id} successfully completed Stripe onboarding`,
                );

                return {
                    success: true,
                    message: 'Onboarding completed successfully! ✓',
                    data: {
                        account_id: accountId,
                        vendor_name: user.name,
                        vendor_email: user.email,
                        onboarding_complete: true,
                        transfers_enabled: true,
                        card_payments_enabled: true,
                        charges_enabled: true,
                        payouts_enabled: true,
                        details_submitted: true,
                    },
                };
            } else {
                // Onboarding started but not complete yet
                return {
                    success: false,
                    message: 'Onboarding not yet complete. Please complete all requirements.',
                    data: {
                        account_id: accountId,
                        vendor_name: user.name,
                        vendor_email: user.email,
                        onboarding_complete: false,
                        transfers_enabled: transfersCapability === 'active',
                        card_payments_enabled: cardPaymentsCapability === 'active',
                        charges_enabled: chargesEnabled,
                        payouts_enabled: payoutsEnabled,
                        details_submitted: detailsSubmitted,
                        requirements_pending: currentlyDue.length + pastDue.length,
                        currently_due: currentlyDue,
                        past_due: pastDue,
                    },
                };
            }
        } catch (error) {
            this.logger.error('Error handling vendor onboarding return:', error);
            return {
                success: false,
                message: error.message || 'Failed to complete onboarding',
            };
        }
    }

    /**
     * Handle vendor onboarding refresh (by account ID)
     * Generates new onboarding link using account ID
     */
    async handleVendorOnboardingRefreshByAccountId(accountId: string) {
        try {
            // Find user by stripe_connect_account_id
            const user = await this.prisma.user.findFirst({
                where: {
                    stripe_connect_account_id: accountId,
                    type: 'vendor',
                    deleted_at: null,
                },
            });

            if (!user) {
                return {
                    success: false,
                    message: 'Vendor account not found',
                };
            }

            // Generate new onboarding link
            const baseUrl = appConfig().app.url || 'http://localhost:3000';
            const accountLink = await StripeConnect.createAccountLink(
                accountId,
                `${baseUrl}/api/escrow/vendor/onboarding/return?account_id=${accountId}`,
                `${baseUrl}/api/escrow/vendor/onboarding/refresh?account_id=${accountId}`,
            );

            this.logger.log(`Generated refresh onboarding link for account ${accountId}`);

            return {
                success: true,
                message: 'New onboarding link generated',
                data: {
                    account_id: accountId,
                    vendor_name: user.name,
                    vendor_email: user.email,
                    onboarding_url: accountLink.url,
                    expires_at: accountLink.expires_at,
                },
            };
        } catch (error) {
            this.logger.error('Error refreshing vendor onboarding link:', error);
            return {
                success: false,
                message: error.message || 'Failed to refresh onboarding link',
            };
        }
    }

    /**
     * Get retained funds for vendor dashboard
     */
    async getRetainedFundsForVendor(userId: string) {
        const user = await UserRepository.getUserDetails(userId);
        if (!user || user.type !== 'vendor') {
            return {
                success: false,
                message: 'Only vendors can view retained funds',
            };
        }

        const bookings = await this.prisma.booking.findMany({
            where: {
                vendor_id: userId,
                escrow_status: 'held',
                payment_status: 'succeeded',
                deleted_at: null,
            },
            include: {
                booking_items: {
                    include: {
                        package: {
                            select: {
                                name: true,
                                duration: true,
                                duration_type: true,
                            },
                        },
                    },
                },
            },
            orderBy: { created_at: 'desc' },
        });

        const totalHeld = bookings.reduce(
            (sum, booking) => sum + Number(booking.paid_amount || 0),
            0,
        );

        return {
            success: true,
            data: {
                total_held: totalHeld,
                bookings_count: bookings.length,
                bookings: bookings.map((booking) => ({
                    booking_id: booking.id,
                    invoice_number: booking.invoice_number,
                    amount: booking.paid_amount,
                    currency: booking.paid_currency,
                    escrow_status: booking.escrow_status,
                    created_at: booking.created_at,
                    package_name: booking.booking_items[0]?.package?.name,
                })),
            },
        };
    }

    /**
     * Generate Stripe onboarding link for vendor
     */
    async generateVendorOnboardingLink(userId: string) {
        const user = await UserRepository.getUserDetails(userId);

        if (!user || user.type !== 'vendor') {
            return {
                success: false,
                message: 'Only vendors can access onboarding link',
            };
        }

        if (!user.stripe_connect_account_id) {
            return {
                success: false,
                message: 'Vendor does not have Stripe Connect account. Please contact admin.',
            };
        }

        const connectAccount = await StripeConnect.getConnectAccount(
            user.stripe_connect_account_id,
        );

        const transfersCapability = connectAccount.capabilities?.transfers;
        const cardPaymentsCapability = connectAccount.capabilities?.card_payments;

        if (transfersCapability === 'active' && cardPaymentsCapability === 'active') {
            return {
                success: true,
                message: 'Stripe Connect account is already fully onboarded',
                data: {
                    account_id: user.stripe_connect_account_id,
                    transfers_enabled: true,
                    card_payments_enabled: true,
                    onboarding_required: false,
                },
            };
        }

        const baseUrl = appConfig().app.url || 'http://localhost:3000';
        const accountLink = await StripeConnect.createAccountLink(
            user.stripe_connect_account_id,
            `${baseUrl}/api/escrow/vendor/onboarding/return?account_id=${user.stripe_connect_account_id}`,
            `${baseUrl}/api/escrow/vendor/onboarding/refresh?account_id=${user.stripe_connect_account_id}`,
        );

        return {
            success: true,
            message: 'Onboarding link generated successfully',
            data: {
                account_id: user.stripe_connect_account_id,
                onboarding_url: accountLink.url,
                expires_at: accountLink.expires_at,
                transfers_enabled: transfersCapability === 'active',
                card_payments_enabled: cardPaymentsCapability === 'active',
                onboarding_required: true,
            },
        };
    }

    /**
     * Release funds partially (admin only)
     */
    async releasePartialFundsAsAdmin(
        userId: string,
        bookingId: string,
        percentage: number,
    ) {
        const user = await UserRepository.getUserDetails(userId);
        if (!user || (user.type !== 'admin' && user.type !== 'su_admin')) {
            return {
                success: false,
                message: 'Only admins can manually release funds',
            };
        }

        return this.releaseFunds(bookingId, percentage);
    }

    /**
     * Release funds fully (admin only)
     */
    async releaseFinalFundsAsAdmin(userId: string, bookingId: string) {
        const user = await UserRepository.getUserDetails(userId);
        if (!user || (user.type !== 'admin' && user.type !== 'su_admin')) {
            return {
                success: false,
                message: 'Only admins can trigger final release',
            };
        }

        return this.processFinalRelease(bookingId);
    }

    /**
     * Handle client cancellation request
     */
    async handleClientCancellationRequest(
        userId: string,
        bookingId: string,
        reason?: string,
    ) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId, user_id: userId },
        });

        if (!booking) {
            return {
                success: false,
                message: 'Booking not found or access denied',
            };
        }

        return this.escrowExceptionsService.handleClientCancellation(
            bookingId,
            reason,
        );
    }

    /**
     * Handle provider cancellation request
     */
    async handleProviderCancellationRequest(
        userId: string,
        bookingId: string,
        reason?: string,
    ) {
        const booking = await this.prisma.booking.findUnique({
            where: { id: bookingId, vendor_id: userId },
        });

        if (!booking) {
            return {
                success: false,
                message: 'Booking not found or access denied',
            };
        }

        return this.escrowExceptionsService.handleProviderCancellation(
            bookingId,
            reason,
        );
    }

    /**
     * Handle dispute submission by client or vendor
     */
    async handleDisputeRequest(
        userId: string,
        bookingId: string,
        reason: string,
    ) {
        const booking = await this.prisma.booking.findFirst({
            where: {
                id: bookingId,
                OR: [{ user_id: userId }, { vendor_id: userId }],
            },
        });

        if (!booking) {
            return {
                success: false,
                message: 'Booking not found or access denied',
            };
        }

        return this.escrowExceptionsService.handleDispute(bookingId, reason);
    }

    /**
     * Resolve dispute (admin only)
     */
    async resolveDisputeRequest(
        userId: string,
        bookingId: string,
        resolution: 'release' | 'refund',
        notes?: string,
    ) {
        const user = await UserRepository.getUserDetails(userId);
        if (!user || (user.type !== 'admin' && user.type !== 'su_admin')) {
            return {
                success: false,
                message: 'Only admins can resolve disputes',
            };
        }

        if (resolution === 'release') {
            return this.releaseFunds(bookingId, 100);
        }

        return this.escrowExceptionsService.resolveDisputeWithRefund(
            bookingId,
            notes,
        );
    }

    /**
     * Hold funds in escrow after client payment
     * Confirms and captures the PaymentIntent to hold funds
     * For packages: Automatically releases 20% immediately, holds remaining 80%
     * For daily tours: Holds 100% for weekly payout
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

            // Determine if it's a package or tour based on 'type' field
            // Both type='package' and type='tour' → Hold 100% in escrow
            // No immediate release for either; admin releases when booking is complete
            const isPackage = booking.booking_items.some(
                (item) => item.package?.type === 'package',
            );

            // For both packages and tours: Hold 100% for admin/manual release
            // Packages like tours - no immediate release
            await this.prisma.booking.update({
                where: { id: bookingId },
                data: { escrow_status: 'held' },
            });

            const bookingType = isPackage ? 'package' : 'tour';
            this.logger.log(`${bookingType} booking - All funds held in escrow. Admin will release when complete: ${bookingId}`);

            return {
                success: true,
                message: `Funds held in escrow. Admin will release 100% to vendor when booking is completed.`,
                data: {
                    booking_id: bookingId,
                    escrow_status: 'held',
                    payment_intent_id: paymentIntent.id,
                    booking_type: bookingType,
                    payout_release_method: 'admin_manual',
                    total_held_amount: Number(booking.paid_amount),
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
     * Process final release (remaining amount after trip completion)
     * For packages: Release remaining 80% (since 20% was released immediately)
     * For partial releases: Release remaining percentage based on what was already released
     */
    async processFinalRelease(bookingId: string): Promise<{
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

            if (booking.status !== 'complete') {
                return {
                    success: false,
                    message: 'Booking must be completed before final release',
                };
            }

            // Check if it's a package (20% already released at booking time)
            // Packages have type='package' vs tours have type='tour'
            const isPackage = booking.booking_items.some(
                (item) => item.package?.type === 'package',
            );

            // If partial release was done, release remaining amount
            if (booking.escrow_status === 'released_partial') {
                // For packages: 20% was released at booking, so release remaining 80%
                if (isPackage) {
                    this.logger.log(`Releasing remaining 80% for package booking: ${bookingId}`);
                    return await this.releaseFunds(bookingId, 80);
                }
                
                // For custom partial releases (admin-initiated)
                const partialPercentage = booking.release_percentage_30days
                    ? Number(booking.release_percentage_30days)
                    : 20; // Default to 20% if not specified
                const remainingPercentage = 100 - partialPercentage;

                this.logger.log(`Releasing remaining ${remainingPercentage}% for booking: ${bookingId}`);
                return await this.releaseFunds(bookingId, remainingPercentage);
            } else if (booking.escrow_status === 'held') {
                // If no partial release, release 100%
                this.logger.log(`No partial release found - releasing 100% for booking: ${bookingId}`);
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

            // Auto-confirm should only run after vendor marks complete
            if (booking.status !== 'vendor_completed') {
                return {
                    success: false,
                    message: 'Booking is not awaiting client confirmation',
                };
            }

            if (booking.client_confirmed_at) {
                return {
                    success: false,
                    message: 'Booking already confirmed by client',
                };
            }

            // Determine time limit based on package type field
            // Tours: 24 hours, Packages: 48 hours
            const isTour = booking.booking_items.some(
                (item) => item.package?.type === 'tour',
            );
            const hoursLimit = isTour ? 24 : 48;

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
                `Auto-confirmed booking ${bookingId} (${isTour ? 'tour' : 'package'}) after ${hoursLimit}h limit`,
            );

            // For tours with weekly payout, funds will be released on next Monday
            // For packages, trigger final release
            if (!isTour) {
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

    /**
     * Process auto-confirmations for all pending bookings
     * Runs hourly via cron job
     * - Daily tours: auto-confirm after 24 hours
     * - Travel packages: auto-confirm after 48 hours
     */
        async processAutoConfirmations(): Promise<{
            success: boolean;
            message: string;
            confirmed: number;
            skipped: number;
        }> {
            try {
                this.logger.log('Processing auto-confirmations for pending bookings...');
    
                // Find all vendor-completed bookings that haven't been client-confirmed yet
                const pendingBookings = await this.prisma.booking.findMany({
                    where: {
                        status: 'vendor_completed',
                        client_confirmed_at: null,
                    },
                    include: {
                        booking_items: {
                            include: {
                                package: true,
                            },
                        },
                    },
                });
    
                this.logger.log(`Found ${pendingBookings.length} pending bookings for auto-confirmation check`);
    
                let confirmed = 0;
                let skipped = 0;
    
                for (const booking of pendingBookings) {
                    try {
                        // Determine time limit based on type field
                        // Tours: 24 hours, Packages: 48 hours
                        const isTour = booking.booking_items.some(
                            (item) => item.package?.type === 'tour',
                        );
                        const hoursLimit = isTour ? 24 : 48;
    
                        // Check if time limit has passed
                        const confirmedAt = booking.approved_at || booking.created_at;
                        const timeSinceConfirmation = Date.now() - new Date(confirmedAt).getTime();
                        const hoursSinceConfirmation = timeSinceConfirmation / (1000 * 60 * 60);
    
                        if (hoursSinceConfirmation < hoursLimit) {
                            skipped++;
                            continue;
                        }
    
                        // Auto-confirm this booking
                        await this.prisma.booking.update({
                            where: { id: booking.id },
                            data: {
                                client_confirmed_at: new Date(),
                                status: 'complete',
                                completed_at: new Date(),
                            },
                        });
    
                        this.logger.log(
                            `Auto-confirmed booking ${booking.id} (${isTour ? 'tour' : 'package'} - ${hoursLimit}h limit exceeded)`,
                        );

                        // For packages, trigger final release
                        if (!isTour) {
                            await this.processFinalRelease(booking.id);
                        }
                        // For tours, funds will be released on next Monday via weekly payout
                        confirmed++;
                    } catch (error) {
                        this.logger.error(
                            `Error auto-confirming booking ${booking.id}:`,
                            error,
                        );
                        skipped++;
                    }
                }
    
                this.logger.log(
                    `Auto-confirmation processing completed - Confirmed: ${confirmed}, Skipped: ${skipped}`,
                );
    
                return {
                    success: true,
                    message: `Auto-confirmation processing completed - ${confirmed} confirmed, ${skipped} skipped`,
                    confirmed,
                    skipped,
                };
            } catch (error) {
                this.logger.error('Error processing auto-confirmations:', error);
                return {
                    success: false,
                    message: error.message || 'Failed to process auto-confirmations',
                    confirmed: 0,
                    skipped: 0,
                };
            }
        }
    }
