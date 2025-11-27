import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { calculateCommission, calculateVendorPayout, COMMISSION_RATE } from '../utils/payment-calculations.util';
import { CommissionService } from '../commission/commission.service';

@Injectable()
export class UnifiedPaymentDashboardService {
    constructor(
        private readonly prisma: PrismaService,
        private readonly commissionService: CommissionService,
    ) { }

    /**
     * Get unified dashboard data combining payment, escrow, and commission
     * @param userId User ID
     * @param userType User type (admin, vendor, etc.)
     */
    async getUnifiedDashboard(userId: string, userType: string) {
        try {
            // Build where clause based on user type
            const whereClause: any = {
                deleted_at: null,
            };

            if (userType === 'vendor') {
                whereClause.vendor_id = userId;
            }

            // Get all bookings with payment, escrow, and commission data
            const bookings = await this.prisma.booking.findMany({
                where: {
                    ...whereClause,
                    payment_status: 'succeeded',
                },
                include: {
                    payment_transactions: {
                        where: { status: 'succeeded' },
                        orderBy: { created_at: 'desc' },
                        take: 1,
                    },
                    commission_calculations: {
                        where: { deleted_at: null },
                        orderBy: { created_at: 'desc' },
                        take: 1,
                    },
                    booking_items: {
                        include: {
                            package: {
                                select: { name: true },
                            },
                        },
                    },
                },
                orderBy: { created_at: 'desc' },
                take: 50, // Limit to recent 50 bookings
            });

            // Calculate summaries
            const paymentSummary = await this.getPaymentSummary(userId, userType);
            const escrowSummary = await this.getEscrowSummary(userId, userType);
            const commissionSummary = await this.commissionService.getCommissionSummary(userId, userType);

            // Build booking-wise breakdown
            const bookingsBreakdown = bookings.map((booking) => {
                const paidAmount = Number(booking.paid_amount || 0);
                const transaction = booking.payment_transactions[0];
                const commissionCalc = booking.commission_calculations[0];

                // Calculate escrow amounts
                let heldAmount = 0;
                let releasedAmount = 0;
                const vendorPayout = calculateVendorPayout(paidAmount);

                if (booking.escrow_status === 'held') {
                    heldAmount = vendorPayout;
                } else if (
                    booking.escrow_status === 'released_full' ||
                    booking.escrow_status === 'released_partial'
                ) {
                    releasedAmount = vendorPayout;
                }

                return {
                    booking_id: booking.id,
                    invoice_number: booking.invoice_number,
                    payment: {
                        amount: paidAmount,
                        status: booking.payment_status,
                        date: transaction?.created_at || booking.created_at,
                        transaction_id: transaction?.id,
                    },
                    escrow: {
                        status: booking.escrow_status || 'pending',
                        held_amount: heldAmount,
                        released_amount: releasedAmount,
                        vendor_payout: vendorPayout,
                    },
                    commission: {
                        amount: commissionCalc
                            ? Number(commissionCalc.commission_amount || 0)
                            : calculateCommission(paidAmount),
                        status: commissionCalc?.commission_status || 'pending',
                        rate: commissionCalc?.commission_rate_value
                            ? Number(commissionCalc.commission_rate_value)
                            : COMMISSION_RATE,
                        calculation_id: commissionCalc?.id,
                    },
                    package_name: booking.booking_items[0]?.package?.name || 'N/A',
                    booking_status: booking.status,
                    created_at: booking.created_at,
                };
            });

            return {
                success: true,
                data: {
                    summary: {
                        payment: paymentSummary,
                        escrow: escrowSummary,
                        commission: commissionSummary,
                    },
                    bookings: bookingsBreakdown,
                },
            };
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to fetch unified dashboard data',
            };
        }
    }

    /**
     * Get payment summary
     */
    private async getPaymentSummary(userId: string, userType: string) {
        if (userType === 'vendor') {
            const baseWhere = {
                vendor_id: userId,
                payment_status: 'succeeded',
                deleted_at: null,
            };

            const [allBookings, heldBookings, releasedBookings] = await Promise.all([
                this.prisma.booking.findMany({
                    where: baseWhere,
                    select: { paid_amount: true },
                }),
                this.prisma.booking.findMany({
                    where: {
                        ...baseWhere,
                        escrow_status: 'held',
                    },
                    select: { paid_amount: true },
                }),
                this.prisma.booking.findMany({
                    where: {
                        ...baseWhere,
                        escrow_status: { in: ['released_full', 'released_partial'] },
                    },
                    select: { paid_amount: true },
                }),
            ]);

            const totalGross = allBookings.reduce(
                (sum, booking) => sum + Number(booking.paid_amount || 0),
                0,
            );
            const totalReleasedAmount = releasedBookings.reduce(
                (sum, booking) => sum + calculateVendorPayout(Number(booking.paid_amount || 0)),
                0,
            );
            const pendingAmount = heldBookings.reduce(
                (sum, booking) => sum + calculateVendorPayout(Number(booking.paid_amount || 0)),
                0,
            );

            return {
                total_received: totalReleasedAmount,
                pending: pendingAmount,
                succeeded: totalGross,
                failed: 0,
                succeeded_count: allBookings.length,
                pending_count: heldBookings.length,
                failed_count: 0,
            };
        }

        const whereClause: any = {
            deleted_at: null,
        };

        const [succeeded, pending, failed] = await Promise.all([
            this.prisma.paymentTransaction.aggregate({
                where: { ...whereClause, status: 'succeeded' },
                _sum: { paid_amount: true },
                _count: true,
            }),
            this.prisma.paymentTransaction.aggregate({
                where: { ...whereClause, status: 'pending' },
                _sum: { paid_amount: true },
                _count: true,
            }),
            this.prisma.paymentTransaction.aggregate({
                where: { ...whereClause, status: 'failed' },
                _sum: { paid_amount: true },
                _count: true,
            }),
        ]);

        const succeededAmount = Number(succeeded._sum.paid_amount || 0);
        return {
            total_received: succeededAmount,
            pending: Number(pending._sum.paid_amount || 0),
            succeeded: succeededAmount,
            failed: Number(failed._sum.paid_amount || 0),
            succeeded_count: succeeded._count,
            pending_count: pending._count,
            failed_count: failed._count,
        };
    }

    /**
     * Get escrow summary
     */
    private async getEscrowSummary(userId: string, userType: string) {
        const whereClause: any = {
            payment_status: 'succeeded',
            deleted_at: null,
        };

        if (userType === 'vendor') {
            whereClause.vendor_id = userId;
        }

        const [heldBookings, releasedBookings] = await Promise.all([
            this.prisma.booking.findMany({
                where: { ...whereClause, escrow_status: 'held' },
                select: { paid_amount: true },
            }),
            this.prisma.booking.findMany({
                where: {
                    ...whereClause,
                    escrow_status: { in: ['released_full', 'released_partial'] },
                },
                select: { paid_amount: true },
            }),
        ]);

        const totalHeld = heldBookings.reduce(
            (sum, booking) => sum + calculateVendorPayout(Number(booking.paid_amount || 0)),
            0,
        );

        const totalReleased = releasedBookings.reduce(
            (sum, booking) => sum + calculateVendorPayout(Number(booking.paid_amount || 0)),
            0,
        );

        return {
            total_held: totalHeld,
            total_released: totalReleased,
            held_bookings_count: heldBookings.length,
            released_bookings_count: releasedBookings.length,
        };
    }

}

