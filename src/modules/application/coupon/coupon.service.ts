import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CouponService {
    constructor(private prisma: PrismaService) { }

    async findAll(
        filters?: {
            q?: string;
            status?: number;
            coupon_type?: string;
        },
        pagination?: { page?: number; limit?: number },
    ) {
        try {
            const whereClause: any = {
                deleted_at: null,
                status: 1, // Only active coupons
            };

            // Add search filter
            if (filters?.q) {
                whereClause['OR'] = [
                    { name: { contains: filters.q, mode: 'insensitive' } },
                    { code: { contains: filters.q, mode: 'insensitive' } },
                ];
            }

            // Add status filter
            if (filters?.status !== undefined) {
                whereClause.status = Number(filters.status);
            }

            // Add coupon type filter
            if (filters?.coupon_type) {
                whereClause.coupon_type = filters.coupon_type;
            }

            // Add date filters - only show valid coupons
            whereClause['AND'] = [
                {
                    OR: [
                        { starts_at: null },
                        { starts_at: { lte: new Date() } },
                    ],
                },
                {
                    OR: [
                        { expires_at: null },
                        { expires_at: { gte: new Date() } },
                    ],
                },
            ];

            // Pagination parameters
            const page = pagination?.page || 1;
            const limit = pagination?.limit || 10;
            const skip = (page - 1) * limit;

            // Get total count for pagination metadata
            const total = await this.prisma.coupon.count({
                where: whereClause,
            });

            const coupons = await this.prisma.coupon.findMany({
                where: whereClause,
                skip,
                take: limit,
                orderBy: {
                    created_at: 'desc',
                },
                select: {
                    id: true,
                    name: true,
                    code: true,
                    description: true,
                    amount_type: true,
                    amount: true,
                    uses: true,
                    max_uses: true,
                    max_uses_per_user: true,
                    coupon_type: true,
                    coupon_ids: true,
                    starts_at: true,
                    expires_at: true,
                    min_type: true,
                    min_amount: true,
                    min_quantity: true,
                    created_at: true,
                    updated_at: true,
                },
            });

            // Calculate pagination metadata
            const totalPages = Math.ceil(total / limit);
            const hasNextPage = page < totalPages;
            const hasPreviousPage = page > 1;

            return {
                success: true,
                data: coupons,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNextPage,
                    hasPreviousPage,
                },
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    async findOne(id: string) {
        try {
            const coupon = await this.prisma.coupon.findFirst({
                where: {
                    id,
                    deleted_at: null,
                    status: 1,
                    AND: [
                        {
                            OR: [
                                { starts_at: null },
                                { starts_at: { lte: new Date() } },
                            ],
                        },
                        {
                            OR: [
                                { expires_at: null },
                                { expires_at: { gte: new Date() } },
                            ],
                        },
                    ],
                },
                select: {
                    id: true,
                    name: true,
                    code: true,
                    description: true,
                    amount_type: true,
                    amount: true,
                    uses: true,
                    max_uses: true,
                    max_uses_per_user: true,
                    coupon_type: true,
                    coupon_ids: true,
                    starts_at: true,
                    expires_at: true,
                    min_type: true,
                    min_amount: true,
                    min_quantity: true,
                    created_at: true,
                    updated_at: true,
                },
            });

            if (!coupon) {
                throw new NotFoundException('Coupon not found');
            }

            return {
                success: true,
                data: coupon,
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    async removeCoupon(userId: string, checkoutId: string) {
        try {
            // Validate input
            if (!checkoutId) {
                throw new BadRequestException('Checkout ID is required');
            }

            // Find the temp redeem record
            const tempRedeem = await this.prisma.tempRedeem.findFirst({
                where: {
                    user_id: userId,
                    checkout_id: checkoutId,
                },
                include: {
                    coupon: true,
                },
            });

            if (!tempRedeem) {
                throw new BadRequestException('No coupon is currently applied to this checkout');
            }

            // Get checkout details to calculate original total
            const checkout = await this.prisma.checkout.findFirst({
                where: {
                    id: checkoutId,
                    user_id: userId,
                },
                include: {
                    checkout_items: true,
                    checkout_extra_services: {
                        include: {
                            extra_service: true,
                        },
                    },
                },
            });

            if (!checkout) {
                throw new BadRequestException('Checkout not found or you do not have permission to access it');
            }

            // Calculate original total
            let originalTotal = 0;
            for (const item of checkout.checkout_items) {
                const itemPrice = Number(item.final_price || item.total_price || 0);
                originalTotal += itemPrice;
            }
            for (const service of checkout.checkout_extra_services) {
                const servicePrice = Number(service.extra_service.price || 0);
                originalTotal += servicePrice;
            }

            // Remove the temp redeem record
            await this.prisma.tempRedeem.delete({
                where: { id: tempRedeem.id },
            });

            // Update coupon usage count (decrease)
            await this.prisma.coupon.update({
                where: { id: tempRedeem.coupon_id },
                data: {
                    uses: {
                        decrement: 1,
                    },
                },
            });

            return {
                success: true,
                message: 'Coupon removed successfully',
                data: {
                    removed_coupon: {
                        id: tempRedeem.coupon.id,
                        name: tempRedeem.coupon.name,
                        code: tempRedeem.coupon.code,
                    },
                    checkout: {
                        id: checkoutId,
                        original_total: originalTotal,
                        discount_amount: 0,
                        final_price: originalTotal,
                    },
                },
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

}
