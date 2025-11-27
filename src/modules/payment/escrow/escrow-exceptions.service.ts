import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { StripeConnect } from '../../../common/lib/Payment/stripe/StripeConnect';

@Injectable()
export class EscrowExceptionsService {
    private readonly logger = new Logger(EscrowExceptionsService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Handle client payment failure 30 days before trip
     * Cancel booking, deposit non-refundable
     */
    async handleClientPaymentFailure(bookingId: string): Promise<{
        success: boolean;
        message: string;
    }> {
        try {
            this.logger.log(
                `Handling client payment failure for booking: ${bookingId}`,
            );

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
                    message: 'Payment failure handling only applies 30 days before trip',
                };
            }

            // Cancel booking
            await this.prisma.booking.update({
                where: { id: bookingId },
                data: {
                    status: 'cancelled',
                    escrow_status: 'refunded',
                },
            });

            // Deposit is non-refundable, so no refund processing needed
            this.logger.log(
                `Booking ${bookingId} cancelled due to payment failure, deposit non-refundable`,
            );

            return {
                success: true,
                message: 'Booking cancelled, deposit non-refundable',
            };
        } catch (error) {
            this.logger.error(
                `Error handling client payment failure for booking ${bookingId}:`,
                error,
            );
            return {
                success: false,
                message: error.message || 'Failed to handle payment failure',
            };
        }
    }

    /**
     * Handle client cancellation (>30 days before trip)
     * Partial refund based on cancellation policy
     */
    async handleClientCancellation(
        bookingId: string,
        cancellationReason?: string,
    ): Promise<{
        success: boolean;
        message: string;
        refundAmount?: number;
    }> {
        try {
            this.logger.log(`Handling client cancellation for booking: ${bookingId}`);

            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
                include: {
                    booking_items: {
                        include: {
                            package: {
                                include: {
                                    cancellation_policy: true,
                                },
                            },
                        },
                    },
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

            // Check if booking has a start date
            const startDate = booking.booking_items[0]?.start_date;
            if (!startDate) {
                return {
                    success: false,
                    message: 'Booking does not have a start date',
                };
            }

            // Calculate days before trip
            const daysBeforeTrip = Math.floor(
                (new Date(startDate).getTime() - new Date().getTime()) /
                (1000 * 60 * 60 * 24),
            );

            if (daysBeforeTrip < 30) {
                return {
                    success: false,
                    message: 'Cancellation only allowed more than 30 days before trip',
                };
            }

            // Get cancellation policy to determine refund percentage
            const cancellationPolicy =
                booking.booking_items[0]?.package?.cancellation_policy;
            let refundPercentage = 0;

            // Default refund policy: >30 days = 50% refund
            if (daysBeforeTrip >= 30) {
                refundPercentage = 50;
            }

            // If cancellation policy exists, use it
            if (cancellationPolicy) {
                // Parse cancellation policy (this would depend on your policy structure)
                // For now, using default 50% for >30 days
                refundPercentage = 50;
            }

            const transaction = booking.payment_transactions[0];
            if (!transaction || !transaction.reference_number) {
                return {
                    success: false,
                    message: 'Payment transaction not found',
                };
            }

            const totalAmount = Number(booking.paid_amount || 0);
            const refundAmount = (totalAmount * refundPercentage) / 100;
            const refundAmountCents = Math.round(refundAmount * 100);

            // Create partial refund
            if (refundAmountCents > 0) {
                await StripeConnect.createRefund({
                    payment_intent_id: transaction.reference_number,
                    amount: refundAmountCents,
                    reason: 'requested_by_customer',
                    metadata: {
                        booking_id: bookingId,
                        cancellation_reason: cancellationReason || 'Client cancellation',
                        refund_percentage: refundPercentage.toString(),
                    },
                });
            }

            // Update booking status
            await this.prisma.booking.update({
                where: { id: bookingId },
                data: {
                    status: 'cancelled',
                    escrow_status: 'refunded',
                },
            });

            this.logger.log(
                `Booking ${bookingId} cancelled by client, refunded ${refundPercentage}% (${refundAmount})`,
            );

            return {
                success: true,
                message: `Booking cancelled, ${refundPercentage}% refunded`,
                refundAmount,
            };
        } catch (error) {
            this.logger.error(
                `Error handling client cancellation for booking ${bookingId}:`,
                error,
            );
            return {
                success: false,
                message: error.message || 'Failed to handle cancellation',
            };
        }
    }

    /**
     * Handle provider cancellation
     * Full refund to client
     */
    async handleProviderCancellation(
        bookingId: string,
        cancellationReason?: string,
    ): Promise<{
        success: boolean;
        message: string;
        refundAmount?: number;
    }> {
        try {
            this.logger.log(
                `Handling provider cancellation for booking: ${bookingId}`,
            );

            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
                include: {
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

            const transaction = booking.payment_transactions[0];
            if (!transaction || !transaction.reference_number) {
                return {
                    success: false,
                    message: 'Payment transaction not found',
                };
            }

            const totalAmount = Number(booking.paid_amount || 0);
            const refundAmountCents = Math.round(totalAmount * 100);

            // Create full refund
            await StripeConnect.createRefund({
                payment_intent_id: transaction.reference_number,
                amount: refundAmountCents,
                reason: 'requested_by_customer',
                metadata: {
                    booking_id: bookingId,
                    cancellation_reason: cancellationReason || 'Provider cancellation',
                    refund_type: 'full',
                },
            });

            // Update booking status
            await this.prisma.booking.update({
                where: { id: bookingId },
                data: {
                    status: 'cancelled',
                    escrow_status: 'refunded',
                },
            });

            this.logger.log(
                `Booking ${bookingId} cancelled by provider, full refund issued (${totalAmount})`,
            );

            return {
                success: true,
                message: 'Booking cancelled by provider, full refund issued',
                refundAmount: totalAmount,
            };
        } catch (error) {
            this.logger.error(
                `Error handling provider cancellation for booking ${bookingId}:`,
                error,
            );
            return {
                success: false,
                message: error.message || 'Failed to handle provider cancellation',
            };
        }
    }

    /**
     * Handle dispute
     * Hold payment until resolution
     */
    async handleDispute(
        bookingId: string,
        disputeReason?: string,
    ): Promise<{
        success: boolean;
        message: string;
    }> {
        try {
            this.logger.log(`Handling dispute for booking: ${bookingId}`);

            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
            });

            if (!booking) {
                return { success: false, message: 'Booking not found' };
            }

            // Update booking to hold payment
            await this.prisma.booking.update({
                where: { id: bookingId },
                data: {
                    escrow_status: 'held', // Keep in held status during dispute
                    comments: disputeReason
                        ? `${booking.comments || ''}\n[Dispute]: ${disputeReason}`
                        : booking.comments,
                },
            });

            this.logger.log(
                `Booking ${bookingId} disputed, payment held until resolution`,
            );

            return {
                success: true,
                message: 'Dispute registered, payment held until resolution',
            };
        } catch (error) {
            this.logger.error(`Error handling dispute for booking ${bookingId}:`, error);
            return {
                success: false,
                message: error.message || 'Failed to handle dispute',
            };
        }
    }

    /**
     * Resolve dispute
     * Release or refund based on resolution
     */
    async resolveDispute(
        bookingId: string,
        resolution: 'release' | 'refund',
        resolutionNotes?: string,
    ): Promise<{
        success: boolean;
        message: string;
    }> {
        try {
            this.logger.log(
                `Resolving dispute for booking: ${bookingId}, resolution: ${resolution}`,
            );

            if (resolution === 'release') {
                // Release funds to vendor
                const escrowService = new (await import('./escrow.service')).EscrowService(
                    this.prisma,
                );
                const result = await escrowService.releaseFunds(bookingId, 100);
                return result;
            } else {
                // Refund to client
                const booking = await this.prisma.booking.findUnique({
                    where: { id: bookingId },
                    include: {
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

                const transaction = booking.payment_transactions[0];
                if (!transaction || !transaction.reference_number) {
                    return {
                        success: false,
                        message: 'Payment transaction not found',
                    };
                }

                const totalAmount = Number(booking.paid_amount || 0);
                const refundAmountCents = Math.round(totalAmount * 100);

                await StripeConnect.createRefund({
                    payment_intent_id: transaction.reference_number,
                    amount: refundAmountCents,
                    reason: 'requested_by_customer',
                    metadata: {
                        booking_id: bookingId,
                        dispute_resolution: 'refund',
                        resolution_notes: resolutionNotes || '',
                    },
                });

                await this.prisma.booking.update({
                    where: { id: bookingId },
                    data: {
                        escrow_status: 'refunded',
                        comments: resolutionNotes
                            ? `${booking.comments || ''}\n[Dispute Resolved - Refund]: ${resolutionNotes}`
                            : booking.comments,
                    },
                });

                return {
                    success: true,
                    message: 'Dispute resolved, refund issued',
                };
            }
        } catch (error) {
            this.logger.error(
                `Error resolving dispute for booking ${bookingId}:`,
                error,
            );
            return {
                success: false,
                message: error.message || 'Failed to resolve dispute',
            };
        }
    }

    /**
     * Auto-release if client doesn't confirm within 48h
     */
    async handleAutoRelease(bookingId: string): Promise<{
        success: boolean;
        message: string;
    }> {
        try {
            this.logger.log(`Handling auto-release for booking: ${bookingId}`);

            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
            });

            if (!booking) {
                return { success: false, message: 'Booking not found' };
            }

            if (booking.client_confirmed_at) {
                return {
                    success: false,
                    message: 'Booking already confirmed by client',
                };
            }

            // Check if 48 hours have passed since booking confirmation
            const confirmedAt = booking.approved_at || booking.created_at;
            const hoursSinceConfirmation =
                (Date.now() - new Date(confirmedAt).getTime()) / (1000 * 60 * 60);

            if (hoursSinceConfirmation < 48) {
                return {
                    success: false,
                    message: 'Auto-release not yet due (48h limit)',
                };
            }

            // Auto-release funds
            const escrowService = new (await import('./escrow.service')).EscrowService(
                this.prisma,
            );
            const result = await escrowService.releaseFunds(bookingId, 100);

            if (result.success) {
                await this.prisma.booking.update({
                    where: { id: bookingId },
                    data: {
                        client_confirmed_at: new Date(),
                        status: 'complete',
                        completed_at: new Date(),
                    },
                });
            }

            return result;
        } catch (error) {
            this.logger.error(
                `Error handling auto-release for booking ${bookingId}:`,
                error,
            );
            return {
                success: false,
                message: error.message || 'Failed to handle auto-release',
            };
        }
    }
}

