import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { SalesCommissionService } from './sales-commission.service';

@Injectable()
export class CommissionIntegrationService {
    private readonly logger = new Logger(CommissionIntegrationService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly salesCommissionService: SalesCommissionService,
    ) { }

    /**
     * Automatically calculate commissions for a booking when payment is completed
     */
    async calculateCommissionsForBooking(bookingId: string): Promise<void> {
        try {
            this.logger.log(`Calculating commissions for booking: ${bookingId}`);

            const booking = await this.prisma.booking.findUnique({
                where: { id: bookingId },
                include: {
                    booking_items: {
                        include: {
                            package: {
                                include: {
                                    user: true // vendor
                                }
                            }
                        }
                    }
                }
            });

            if (!booking) {
                this.logger.error(`Booking not found: ${bookingId}`);
                return;
            }

            // Only calculate commissions for successful payments
            if (booking.payment_status !== 'succeeded') {
                this.logger.log(`Booking ${bookingId} payment status is ${booking.payment_status}, skipping commission calculation`);
                return;
            }

            // Calculate commission for vendor (package owner)
            if (booking.vendor_id) {
                await this.calculateVendorCommission(booking);
            }

            // You can add more commission calculations here for:
            // - Sales agents
            // - Affiliates
            // - Partners
            // - Referrers

            this.logger.log(`Commission calculation completed for booking: ${bookingId}`);
        } catch (error) {
            this.logger.error(`Error calculating commissions for booking ${bookingId}:`, error);
        }
    }

    /**
     * Calculate commission for the vendor (package owner)
     */
    private async calculateVendorCommission(booking: any): Promise<void> {
        try {
            const vendorCommission = await this.salesCommissionService.calculateCommission({
                booking_id: booking.id,
                recipient_user_id: booking.vendor_id,
                notes: `Vendor commission for booking ${booking.invoice_number}`,
            });

            this.logger.log(`Vendor commission calculated: ${vendorCommission.data.commission_amount} for user ${booking.vendor_id}`);
        } catch (error) {
            this.logger.error(`Error calculating vendor commission for booking ${booking.id}:`, error);
        }
    }

    /**
     * Calculate commission for a sales agent
     */
    async calculateSalesAgentCommission(bookingId: string, salesAgentId: string, notes?: string): Promise<void> {
        try {
            const commission = await this.salesCommissionService.calculateCommission({
                booking_id: bookingId,
                recipient_user_id: salesAgentId,
                notes: notes || `Sales agent commission for booking ${bookingId}`,
            });

            this.logger.log(`Sales agent commission calculated: ${commission.data.commission_amount} for user ${salesAgentId}`);
        } catch (error) {
            this.logger.error(`Error calculating sales agent commission for booking ${bookingId}:`, error);
        }
    }

    /**
     * Calculate commission for an affiliate
     */
    async calculateAffiliateCommission(bookingId: string, affiliateId: string, notes?: string): Promise<void> {
        try {
            const commission = await this.salesCommissionService.calculateCommission({
                booking_id: bookingId,
                recipient_user_id: affiliateId,
                notes: notes || `Affiliate commission for booking ${bookingId}`,
            });

            this.logger.log(`Affiliate commission calculated: ${commission.data.commission_amount} for user ${affiliateId}`);
        } catch (error) {
            this.logger.error(`Error calculating affiliate commission for booking ${bookingId}:`, error);
        }
    }

    /**
     * Get commission summary for a user
     */
    async getUserCommissionSummary(userId: string, period?: { start: Date; end: Date }) {
        const where: any = {
            recipient_user_id: userId,
            deleted_at: null,
        };

        if (period) {
            where.created_at = {
                gte: period.start,
                lte: period.end,
            };
        }

        const [calculations, stats] = await Promise.all([
            this.prisma.commissionCalculation.findMany({
                where,
                include: {
                    booking: {
                        select: { id: true, invoice_number: true, total_amount: true }
                    },
                    commission_rate: {
                        select: { name: true, commission_type: true, rate: true }
                    }
                },
                orderBy: { created_at: 'desc' },
                take: 10,
            }),
            this.prisma.commissionCalculation.aggregate({
                where,
                _sum: {
                    commission_amount: true,
                    base_amount: true,
                },
                _count: true,
            })
        ]);

        const statusCounts = await this.prisma.commissionCalculation.groupBy({
            by: ['commission_status'],
            where,
            _count: true,
        });

        return {
            success: true,
            data: {
                recent_calculations: calculations,
                summary: {
                    total_commission: Number(stats._sum.commission_amount || 0),
                    total_base_amount: Number(stats._sum.base_amount || 0),
                    total_calculations: stats._count,
                    status_breakdown: statusCounts.reduce((acc, item) => {
                        acc[item.commission_status] = item._count;
                        return acc;
                    }, {} as Record<string, number>),
                }
            }
        };
    }

    /**
     * Process commission payments for approved calculations
     */
    async processCommissionPayments(calculationIds: string[], paymentMethod: string, paymentReference?: string) {
        const results = [];

        for (const calculationId of calculationIds) {
            try {
                const calculation = await this.prisma.commissionCalculation.findFirst({
                    where: { id: calculationId, commission_status: 'approved', deleted_at: null }
                });

                if (!calculation) {
                    results.push({ calculationId, success: false, message: 'Calculation not found or not approved' });
                    continue;
                }

                // Create commission payment record
                const payment = await this.prisma.commissionPayment.create({
                    data: {
                        commission_calculation_id: calculationId,
                        payment_amount: calculation.commission_amount,
                        payment_method: paymentMethod,
                        payment_reference: paymentReference || `PAY-${Date.now()}`,
                        payment_status: 'processing',
                        scheduled_at: new Date(),
                    }
                });

                // Update calculation status to paid
                await this.prisma.commissionCalculation.update({
                    where: { id: calculationId },
                    data: {
                        commission_status: 'paid',
                        paid_at: new Date(),
                        paid_amount: calculation.commission_amount,
                        payment_method: paymentMethod,
                    }
                });

                results.push({ calculationId, success: true, paymentId: payment.id });
            } catch (error) {
                results.push({ calculationId, success: false, message: error.message });
            }
        }

        return {
            success: true,
            data: {
                processed: results.filter(r => r.success).length,
                failed: results.filter(r => !r.success).length,
                results
            }
        };
    }
} 