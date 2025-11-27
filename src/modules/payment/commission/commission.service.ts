import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { calculateCommission, COMMISSION_RATE } from '../utils/payment-calculations.util';

@Injectable()
export class CommissionService {
    private readonly logger = new Logger(CommissionService.name);

    constructor(private readonly prisma: PrismaService) { }

    /**
     * Calculate and store commission for a booking when payment succeeds
     * Uses fixed 20% commission rate
     */
    async calculateCommissionForBooking(bookingId: string): Promise<void> {
        try {
            this.logger.log(`Calculating commission for booking: ${bookingId}`);

            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
            });

            if (!booking) {
                this.logger.error(`Booking not found: ${bookingId}`);
                return;
            }

            // Only calculate for successful payments
            if (booking.payment_status !== 'succeeded') {
                this.logger.log(
                    `Booking ${bookingId} payment status is ${booking.payment_status}, skipping commission calculation`,
                );
                return;
            }

            // Check if commission already exists (prevent duplicates)
            const existingCommission = await this.prisma.commissionCalculation.findFirst({
                where: {
                    booking_id: bookingId,
                    recipient_user_id: booking.vendor_id,
                    deleted_at: null,
                },
            });

            if (existingCommission) {
                this.logger.log(
                    `Commission already calculated for booking ${bookingId}. Skipping duplicate calculation.`,
                );
                return;
            }

            // Calculate commission (20% of paid amount)
            const paidAmount = Number(booking.paid_amount || booking.total_amount || 0);
            const commissionAmount = calculateCommission(paidAmount);

            // Create commission calculation record
            await this.prisma.commissionCalculation.create({
                data: {
                    booking_id: bookingId,
                    recipient_user_id: booking.vendor_id,
                    base_amount: paidAmount,
                    commission_rate_value: COMMISSION_RATE,
                    commission_amount: commissionAmount,
                    commission_type: 'percentage',
                    commission_status: 'pending',
                    notes: `Commission for booking ${booking.invoice_number || bookingId}`,
                },
            });

            this.logger.log(
                `Commission calculated: ${commissionAmount} for booking ${bookingId}`,
            );
        } catch (error) {
            this.logger.error(`Error calculating commission for booking ${bookingId}:`, error);
        }
    }

    /**
     * Get commission summary for a user
     */
    async getCommissionSummary(userId: string, userType: string) {
        const whereClause: any = {
            deleted_at: null,
        };

        if (userType === 'vendor') {
            whereClause.recipient_user_id = userId;
        }

        const [total, pending, approved, paid] = await Promise.all([
            this.prisma.commissionCalculation.aggregate({
                where: whereClause,
                _sum: { commission_amount: true },
            }),
            this.prisma.commissionCalculation.aggregate({
                where: { ...whereClause, commission_status: 'pending' },
                _sum: { commission_amount: true },
            }),
            this.prisma.commissionCalculation.aggregate({
                where: { ...whereClause, commission_status: 'approved' },
                _sum: { commission_amount: true },
            }),
            this.prisma.commissionCalculation.aggregate({
                where: { ...whereClause, commission_status: 'paid' },
                _sum: { commission_amount: true },
            }),
        ]);

        return {
            total_commission: Number(total._sum.commission_amount || 0),
            platform_commission: Number(total._sum.commission_amount || 0),
            vendor_commission: 0,
            pending_approval: Number(pending._sum.commission_amount || 0),
            approved: Number(approved._sum.commission_amount || 0),
            paid: Number(paid._sum.commission_amount || 0),
        };
    }
}

