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

    async redeemCoupon(userId: string, code: string) {
        try {
            // Validate input
            if (!code) {
                throw new BadRequestException('Coupon code is required');
            }

            // Find the coupon with case-insensitive search
            const coupon = await this.prisma.coupon.findFirst({
                where: {
                    code: {
                        equals: code.toUpperCase(),
                        mode: 'insensitive'
                    },
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
            });

            if (!coupon) {
                throw new BadRequestException('Invalid or expired coupon code');
            }

            // Check if coupon has reached max uses
            if (coupon.max_uses && coupon.uses >= coupon.max_uses) {
                throw new BadRequestException('This coupon has reached its maximum usage limit');
            }

            // Check if user has already used this coupon maximum times
            const userUsageCount = await this.prisma.tempRedeem.count({
                where: {
                    user_id: userId,
                    coupon_id: coupon.id,
                },
            });

            if (coupon.max_uses_per_user && userUsageCount >= coupon.max_uses_per_user) {
                throw new BadRequestException(`You have already used this coupon ${coupon.max_uses_per_user} time(s)`);
            }

            // Check if user has already redeemed this coupon
            const existingRedeem = await this.prisma.tempRedeem.findFirst({
                where: {
                    user_id: userId,
                    coupon_id: coupon.id,
                },
            });

            if (existingRedeem) {
                throw new BadRequestException('You have already redeemed this coupon');
            }

            // Create temp redeem record (without checkout_id - will be applied during checkout)
            const tempRedeem = await this.prisma.tempRedeem.create({
                data: {
                    user_id: userId,
                    coupon_id: coupon.id,
                },
            });

            // Update coupon usage count
            await this.prisma.coupon.update({
                where: { id: coupon.id },
                data: {
                    uses: {
                        increment: 1,
                    },
                },
            });

            return {
                success: true,
                message: 'Coupon redeemed successfully! It will be applied automatically during checkout.',
                data: {
                    coupon: {
                        id: coupon.id,
                        name: coupon.name,
                        code: coupon.code,
                        description: coupon.description,
                        amount_type: coupon.amount_type,
                        amount: coupon.amount,
                        min_type: coupon.min_type,
                        min_amount: coupon.min_amount,
                        min_quantity: coupon.min_quantity,
                    },
                    temp_redeem_id: tempRedeem.id,
                },
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

    async getAppliedCoupon(userId: string, checkoutId: string) {
        try {
            // Validate input
            if (!checkoutId) {
                throw new BadRequestException('Checkout ID is required');
            }

            const tempRedeem = await this.prisma.tempRedeem.findFirst({
                where: {
                    user_id: userId,
                    checkout_id: checkoutId,
                },
                include: {
                    coupon: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            description: true,
                            amount_type: true,
                            amount: true,
                            min_type: true,
                            min_amount: true,
                            min_quantity: true,
                        },
                    },
                },
            });

            if (!tempRedeem) {
                return {
                    success: true,
                    message: 'No coupon applied to this checkout',
                    data: null,
                };
            }

            // Get checkout details to calculate discount
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

            // Calculate total amount
            let totalAmount = 0;
            for (const item of checkout.checkout_items) {
                const itemPrice = Number(item.final_price || item.total_price || 0);
                totalAmount += itemPrice;
            }
            for (const service of checkout.checkout_extra_services) {
                const servicePrice = Number(service.extra_service.price || 0);
                totalAmount += servicePrice;
            }

            // Calculate discount amount
            let discountAmount = 0;
            if (tempRedeem.coupon.amount_type === 'percentage') {
                discountAmount = (totalAmount * Number(tempRedeem.coupon.amount)) / 100;
            } else if (tempRedeem.coupon.amount_type === 'fixed') {
                discountAmount = Number(tempRedeem.coupon.amount);
                if (discountAmount > totalAmount) {
                    discountAmount = totalAmount;
                }
            }

            const finalPrice = Math.max(0, totalAmount - discountAmount);

            return {
                success: true,
                message: 'Coupon found',
                data: {
                    coupon: tempRedeem.coupon,
                    checkout: {
                        id: checkoutId,
                        original_total: totalAmount,
                        discount_amount: discountAmount,
                        final_price: finalPrice,
                    },
                    temp_redeem_id: tempRedeem.id,
                },
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    async autoApplyAvailableCoupons(userId: string, checkoutId: string) {
        try {
            // Validate input
            if (!checkoutId) {
                throw new BadRequestException('Checkout ID is required');
            }

            // Get checkout details to validate minimum requirements
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

            // Calculate total amount and quantity
            let totalAmount = 0;
            let totalQuantity = 0;
            for (const item of checkout.checkout_items) {
                const itemPrice = Number(item.final_price || item.total_price || 0);
                totalAmount += itemPrice;
                totalQuantity += (item.total_travelers || 0);
            }
            for (const service of checkout.checkout_extra_services) {
                const servicePrice = Number(service.extra_service.price || 0);
                totalAmount += servicePrice;
            }

            // Find available coupons for this user (not yet applied to any checkout)
            const availableCoupons = await this.prisma.tempRedeem.findMany({
                where: {
                    user_id: userId,
                    checkout_id: null, // Not yet applied to any checkout
                },
                include: {
                    coupon: true,
                },
            });

            if (availableCoupons.length === 0) {
                return {
                    success: true,
                    message: 'No available coupons to apply',
                    data: {
                        applied_coupons: [],
                        total_discount: 0,
                        final_total: totalAmount,
                    },
                };
            }

            let totalDiscount = 0;
            const appliedCoupons = [];

            // Try to apply each available coupon
            for (const tempRedeem of availableCoupons) {
                const coupon = tempRedeem.coupon;

                // Validate minimum requirements
                let canApply = true;

                if (coupon.min_type === 'amount' && coupon.min_amount && totalAmount < Number(coupon.min_amount)) {
                    canApply = false;
                }

                if (coupon.min_type === 'quantity' && coupon.min_quantity && totalQuantity < coupon.min_quantity) {
                    canApply = false;
                }

                if (canApply) {
                    // Calculate discount for this coupon
                    let couponDiscount = 0;
                    if (coupon.amount_type === 'percentage') {
                        couponDiscount = (totalAmount * Number(coupon.amount)) / 100;
                    } else if (coupon.amount_type === 'fixed') {
                        couponDiscount = Number(coupon.amount);
                        if (couponDiscount > totalAmount) {
                            couponDiscount = totalAmount;
                        }
                    }

                    // Update tempRedeem with checkout_id
                    await this.prisma.tempRedeem.update({
                        where: { id: tempRedeem.id },
                        data: { checkout_id: checkoutId },
                    });

                    totalDiscount += couponDiscount;
                    appliedCoupons.push({
                        coupon: {
                            id: coupon.id,
                            name: coupon.name,
                            code: coupon.code,
                            description: coupon.description,
                            amount_type: coupon.amount_type,
                            amount: coupon.amount,
                        },
                        discount_amount: couponDiscount,
                        temp_redeem_id: tempRedeem.id,
                    });
                }
            }

            const finalTotal = Math.max(0, totalAmount - totalDiscount);

            return {
                success: true,
                message: `Applied ${appliedCoupons.length} coupon(s) automatically`,
                data: {
                    applied_coupons: appliedCoupons,
                    total_discount: totalDiscount,
                    final_total: finalTotal,
                    original_total: totalAmount,
                },
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    async getUserAvailableCoupons(userId: string) {
        try {
            // Find all redeemed coupons for this user that haven't been applied to any checkout yet
            const availableCoupons = await this.prisma.tempRedeem.findMany({
                where: {
                    user_id: userId,
                    checkout_id: null, // Not yet applied to any checkout
                },
                include: {
                    coupon: {
                        select: {
                            id: true,
                            name: true,
                            code: true,
                            description: true,
                            amount_type: true,
                            amount: true,
                            min_type: true,
                            min_amount: true,
                            min_quantity: true,
                            starts_at: true,
                            expires_at: true,
                        },
                    },
                },
            });

            return {
                success: true,
                message: `Found ${availableCoupons.length} available coupon(s)`,
                data: availableCoupons.map(tr => ({
                    temp_redeem_id: tr.id,
                    coupon: tr.coupon,
                    redeemed_at: tr.created_at,
                })),
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
}
