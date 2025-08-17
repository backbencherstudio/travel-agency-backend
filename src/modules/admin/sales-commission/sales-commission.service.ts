import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateCommissionRateDto } from './dto/create-commission-rate.dto';
import { UpdateCommissionRateDto } from './dto/update-commission-rate.dto';
import { QueryCommissionRateDto } from './dto/query-commission-rate.dto';
import { CalculateCommissionDto } from './dto/calculate-commission.dto';
import { ApproveCommissionDto } from './dto/approve-commission.dto';

@Injectable()
export class SalesCommissionService {
    constructor(private readonly prisma: PrismaService) { }

    // Commission Rate Management
    async createCommissionRate(createCommissionRateDto: CreateCommissionRateDto) {
        try {
            // Validate user if provided
            if (createCommissionRateDto.user_id) {
                const user = await this.prisma.user.findUnique({
                    where: { id: createCommissionRateDto.user_id }
                });
                if (!user) {
                    throw new NotFoundException('User not found');
                }
            }

            // Validate package if provided
            if (createCommissionRateDto.package_id) {
                const package_ = await this.prisma.package.findUnique({
                    where: { id: createCommissionRateDto.package_id }
                });
                if (!package_) {
                    throw new NotFoundException('Package not found');
                }
            }

            // Validate category if provided
            if (createCommissionRateDto.category_id) {
                const category = await this.prisma.category.findUnique({
                    where: { id: createCommissionRateDto.category_id }
                });
                if (!category) {
                    throw new NotFoundException('Category not found');
                }
            }

            const commissionRate = await this.prisma.commissionRate.create({
                data: {
                    name: createCommissionRateDto.name,
                    description: createCommissionRateDto.description,
                    commission_type: createCommissionRateDto.commission_type,
                    rate: createCommissionRateDto.rate,
                    min_amount: createCommissionRateDto.min_amount,
                    max_commission_amount: createCommissionRateDto.max_commission_amount,
                    tiered_rates: createCommissionRateDto.tiered_rates,
                    applicable_user_type: createCommissionRateDto.applicable_user_type,
                    user_id: createCommissionRateDto.user_id,
                    package_id: createCommissionRateDto.package_id,
                    category_id: createCommissionRateDto.category_id,
                    is_active: createCommissionRateDto.is_active ?? true,
                    effective_from: createCommissionRateDto.effective_from ? new Date(createCommissionRateDto.effective_from) : null,
                    effective_until: createCommissionRateDto.effective_until ? new Date(createCommissionRateDto.effective_until) : null,
                },
                include: {
                    user: {
                        select: { id: true, name: true, email: true }
                    },
                    package: {
                        select: { id: true, name: true }
                    },
                    category: {
                        select: { id: true, name: true }
                    }
                }
            });

            return {
                success: true,
                message: 'Commission rate created successfully',
                data: commissionRate
            };
        } catch (error) {
            throw new BadRequestException(`Failed to create commission rate: ${error.message}`);
        }
    }

    async findAllCommissionRates(query: QueryCommissionRateDto) {
        const { page = 1, limit = 10, search, commission_type, applicable_user_type, is_active, user_id, package_id, category_id } = query;
        const skip = (page - 1) * limit;

        // Build where clause
        const where: any = {
            deleted_at: null
        };

        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { description: { contains: search, mode: 'insensitive' } }
            ];
        }

        if (commission_type) {
            where.commission_type = commission_type;
        }

        if (applicable_user_type) {
            where.applicable_user_type = applicable_user_type;
        }

        if (is_active !== undefined) {
            where.is_active = is_active;
        }

        if (user_id) {
            where.user_id = user_id;
        }

        if (package_id) {
            where.package_id = package_id;
        }

        if (category_id) {
            where.category_id = category_id;
        }

        const [commissionRates, total] = await Promise.all([
            this.prisma.commissionRate.findMany({
                where,
                skip,
                take: limit,
                include: {
                    user: {
                        select: { id: true, name: true, email: true }
                    },
                    package: {
                        select: { id: true, name: true }
                    },
                    category: {
                        select: { id: true, name: true }
                    }
                },
                orderBy: { created_at: 'desc' }
            }),
            this.prisma.commissionRate.count({ where })
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            success: true,
            data: {
                items: commissionRates,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            }
        };
    }

    async findOneCommissionRate(id: string) {
        const commissionRate = await this.prisma.commissionRate.findFirst({
            where: { id, deleted_at: null },
            include: {
                user: {
                    select: { id: true, name: true, email: true }
                },
                package: {
                    select: { id: true, name: true }
                },
                category: {
                    select: { id: true, name: true }
                },
                commission_calculations: {
                    take: 5,
                    orderBy: { created_at: 'desc' },
                    include: {
                        booking: {
                            select: { id: true, invoice_number: true, total_amount: true }
                        },
                        recipient_user: {
                            select: { id: true, name: true, email: true }
                        }
                    }
                }
            }
        });

        if (!commissionRate) {
            throw new NotFoundException('Commission rate not found');
        }

        return {
            success: true,
            data: commissionRate
        };
    }

    async updateCommissionRate(id: string, updateCommissionRateDto: UpdateCommissionRateDto) {
        const existingRate = await this.prisma.commissionRate.findFirst({
            where: { id, deleted_at: null }
        });

        if (!existingRate) {
            throw new NotFoundException('Commission rate not found');
        }

        try {
            const commissionRate = await this.prisma.commissionRate.update({
                where: { id },
                data: {
                    name: updateCommissionRateDto.name,
                    description: updateCommissionRateDto.description,
                    commission_type: updateCommissionRateDto.commission_type,
                    rate: updateCommissionRateDto.rate,
                    min_amount: updateCommissionRateDto.min_amount,
                    max_commission_amount: updateCommissionRateDto.max_commission_amount,
                    tiered_rates: updateCommissionRateDto.tiered_rates,
                    applicable_user_type: updateCommissionRateDto.applicable_user_type,
                    user_id: updateCommissionRateDto.user_id,
                    package_id: updateCommissionRateDto.package_id,
                    category_id: updateCommissionRateDto.category_id,
                    is_active: updateCommissionRateDto.is_active,
                    effective_from: updateCommissionRateDto.effective_from ? new Date(updateCommissionRateDto.effective_from) : null,
                    effective_until: updateCommissionRateDto.effective_until ? new Date(updateCommissionRateDto.effective_until) : null,
                },
                include: {
                    user: {
                        select: { id: true, name: true, email: true }
                    },
                    package: {
                        select: { id: true, name: true }
                    },
                    category: {
                        select: { id: true, name: true }
                    }
                }
            });

            return {
                success: true,
                message: 'Commission rate updated successfully',
                data: commissionRate
            };
        } catch (error) {
            throw new BadRequestException(`Failed to update commission rate: ${error.message}`);
        }
    }

    async removeCommissionRate(id: string) {
        const existingRate = await this.prisma.commissionRate.findFirst({
            where: { id, deleted_at: null }
        });

        if (!existingRate) {
            throw new NotFoundException('Commission rate not found');
        }

        await this.prisma.commissionRate.update({
            where: { id },
            data: { deleted_at: new Date() }
        });

        return {
            success: true,
            message: 'Commission rate deleted successfully'
        };
    }

    // Commission Calculation Management
    async calculateCommission(calculateCommissionDto: CalculateCommissionDto) {
        const { booking_id, recipient_user_id, commission_rate_id, base_amount, notes } = calculateCommissionDto;

        // Validate booking
        const booking = await this.prisma.booking.findUnique({
            where: { id: booking_id },
            include: {
                booking_items: {
                    include: {
                        package: true
                    }
                }
            }
        });

        if (!booking) {
            throw new NotFoundException('Booking not found');
        }

        // Validate recipient user
        const recipientUser = await this.prisma.user.findUnique({
            where: { id: recipient_user_id }
        });

        if (!recipientUser) {
            throw new NotFoundException('Recipient user not found');
        }

        // Find appropriate commission rate
        let commissionRate;
        if (commission_rate_id) {
            commissionRate = await this.prisma.commissionRate.findFirst({
                where: { id: commission_rate_id, deleted_at: null, is_active: true }
            });
            if (!commissionRate) {
                throw new NotFoundException('Commission rate not found');
            }
        } else {
            // Find best matching commission rate
            commissionRate = await this.findBestCommissionRate(booking, recipientUser);
            if (!commissionRate) {
                throw new BadRequestException('No applicable commission rate found');
            }
        }

        // Calculate commission amount
        const calculationAmount = base_amount || Number(booking.total_amount || 0);
        const commissionAmount = this.calculateCommissionAmount(commissionRate, calculationAmount);

        // Create commission calculation
        const commissionCalculation = await this.prisma.commissionCalculation.create({
            data: {
                booking_id,
                recipient_user_id,
                commission_rate_id: commissionRate.id,
                base_amount: calculationAmount,
                commission_rate_value: commissionRate.rate,
                commission_amount: commissionAmount,
                commission_type: commissionRate.commission_type,
                commission_status: 'pending',
                notes,
                commission_period_start: new Date(),
                commission_period_end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
            },
            include: {
                booking: {
                    select: { id: true, invoice_number: true, total_amount: true }
                },
                recipient_user: {
                    select: { id: true, name: true, email: true }
                },
                commission_rate: {
                    select: { id: true, name: true, commission_type: true, rate: true }
                }
            }
        });

        return {
            success: true,
            message: 'Commission calculated successfully',
            data: commissionCalculation
        };
    }

    async findAllCommissionCalculations(query: any) {
        const { page = 1, limit = 10, status, recipient_user_id, booking_id } = query;
        const skip = (page - 1) * limit;

        const where: any = {
            deleted_at: null
        };

        if (status) {
            where.commission_status = status;
        }

        if (recipient_user_id) {
            where.recipient_user_id = recipient_user_id;
        }

        if (booking_id) {
            where.booking_id = booking_id;
        }

        const [calculations, total] = await Promise.all([
            this.prisma.commissionCalculation.findMany({
                where,
                skip,
                take: limit,
                include: {
                    booking: {
                        select: { id: true, invoice_number: true, total_amount: true, status: true }
                    },
                    recipient_user: {
                        select: { id: true, name: true, email: true }
                    },
                    commission_rate: {
                        select: { id: true, name: true, commission_type: true, rate: true }
                    }
                },
                orderBy: { created_at: 'desc' }
            }),
            this.prisma.commissionCalculation.count({ where })
        ]);

        const totalPages = Math.ceil(total / limit);

        return {
            success: true,
            data: {
                items: calculations,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            }
        };
    }

    async findOneCommissionCalculation(id: string) {
        const calculation = await this.prisma.commissionCalculation.findFirst({
            where: { id, deleted_at: null },
            include: {
                booking: {
                    select: { id: true, invoice_number: true, total_amount: true, status: true }
                },
                recipient_user: {
                    select: { id: true, name: true, email: true }
                },
                commission_rate: {
                    select: { id: true, name: true, commission_type: true, rate: true }
                },
                commission_payments: {
                    orderBy: { created_at: 'desc' }
                }
            }
        });

        if (!calculation) {
            throw new NotFoundException('Commission calculation not found');
        }

        return {
            success: true,
            data: calculation
        };
    }

    async approveCommission(id: string, approveCommissionDto: ApproveCommissionDto, adminUserId: string) {
        const calculation = await this.prisma.commissionCalculation.findFirst({
            where: { id, deleted_at: null }
        });

        if (!calculation) {
            throw new NotFoundException('Commission calculation not found');
        }

        const updateData: any = {
            commission_status: approveCommissionDto.status,
            admin_notes: approveCommissionDto.admin_notes
        };

        if (approveCommissionDto.status === 'approved') {
            updateData.approved_at = new Date();
            updateData.approved_by = adminUserId;
        } else if (approveCommissionDto.status === 'disputed') {
            updateData.disputed_at = new Date();
            updateData.dispute_reason = approveCommissionDto.dispute_reason;
        }

        const updatedCalculation = await this.prisma.commissionCalculation.update({
            where: { id },
            data: updateData,
            include: {
                booking: {
                    select: { id: true, invoice_number: true, total_amount: true }
                },
                recipient_user: {
                    select: { id: true, name: true, email: true }
                },
                commission_rate: {
                    select: { id: true, name: true, commission_type: true, rate: true }
                }
            }
        });

        return {
            success: true,
            message: `Commission ${approveCommissionDto.status} successfully`,
            data: updatedCalculation
        };
    }

    // Helper methods
    private async findBestCommissionRate(booking: any, recipientUser: any) {
        // Priority order: user-specific > package-specific > category-specific > general
        const rates = await this.prisma.commissionRate.findMany({
            where: {
                deleted_at: null,
                is_active: true,
                OR: [
                    { user_id: recipientUser.id },
                    { package_id: { in: booking.booking_items.map((item: any) => item.package_id) } },
                    { applicable_user_type: recipientUser.type },
                    { applicable_user_type: 'vendor' } // fallback
                ]
            },
            orderBy: [
                { user_id: 'asc' }, // user-specific first
                { package_id: 'asc' }, // then package-specific
                { category_id: 'asc' }, // then category-specific
                { created_at: 'desc' } // then newest general rate
            ]
        });

        return rates[0]; // Return the first (highest priority) rate
    }

    private calculateCommissionAmount(commissionRate: any, baseAmount: number): number {
        if (baseAmount < (commissionRate.min_amount || 0)) {
            return 0;
        }

        let commissionAmount = 0;

        switch (commissionRate.commission_type) {
            case 'percentage':
                commissionAmount = (baseAmount * Number(commissionRate.rate)) / 100;
                break;
            case 'fixed':
                commissionAmount = Number(commissionRate.rate);
                break;
            case 'tiered':
                commissionAmount = this.calculateTieredCommission(commissionRate, baseAmount);
                break;
            default:
                commissionAmount = 0;
        }

        // Apply maximum commission cap if set
        if (commissionRate.max_commission_amount) {
            commissionAmount = Math.min(commissionAmount, Number(commissionRate.max_commission_amount));
        }

        return Math.max(0, commissionAmount);
    }

    private calculateTieredCommission(commissionRate: any, baseAmount: number): number {
        if (!commissionRate.tiered_rates) {
            return 0;
        }

        try {
            const tiers = JSON.parse(commissionRate.tiered_rates);
            let totalCommission = 0;

            for (const tier of tiers) {
                if (baseAmount > tier.min && baseAmount <= (tier.max || Infinity)) {
                    const tierAmount = Math.min(baseAmount - tier.min, (tier.max || Infinity) - tier.min);
                    totalCommission += (tierAmount * tier.rate) / 100;
                }
            }

            return totalCommission;
        } catch (error) {
            console.log(error);
            return 0;
        }
    }

    // Statistics and Reports
    async getCommissionStats() {
        const [
            totalCalculations,
            pendingCalculations,
            approvedCalculations,
            paidCalculations,
            totalCommissionAmount,
            pendingCommissionAmount
        ] = await Promise.all([
            this.prisma.commissionCalculation.count({ where: { deleted_at: null } }),
            this.prisma.commissionCalculation.count({ where: { deleted_at: null, commission_status: 'pending' } }),
            this.prisma.commissionCalculation.count({ where: { deleted_at: null, commission_status: 'approved' } }),
            this.prisma.commissionCalculation.count({ where: { deleted_at: null, commission_status: 'paid' } }),
            this.prisma.commissionCalculation.aggregate({
                where: { deleted_at: null },
                _sum: { commission_amount: true }
            }),
            this.prisma.commissionCalculation.aggregate({
                where: { deleted_at: null, commission_status: 'pending' },
                _sum: { commission_amount: true }
            })
        ]);

        return {
            success: true,
            data: {
                total_calculations: totalCalculations,
                pending_calculations: pendingCalculations,
                approved_calculations: approvedCalculations,
                paid_calculations: paidCalculations,
                total_commission_amount: Number(totalCommissionAmount._sum.commission_amount || 0),
                pending_commission_amount: Number(pendingCommissionAmount._sum.commission_amount || 0)
            }
        };
    }

    // Dashboard Reports
    async getDashboardStats(period: string = 'monthly') {
        const now = new Date();
        let startDate: Date;
        let endDate: Date;

        // Calculate date range based on period
        switch (period) {
            case 'weekly':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                endDate = now;
                break;
            case 'monthly':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = now;
                break;
            case 'yearly':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = now;
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = now;
        }

        // Get total sales from bookings
        const totalSales = await this.prisma.booking.aggregate({
            where: {
                created_at: { gte: startDate, lte: endDate },
                payment_status: 'succeeded',
                deleted_at: null
            },
            _sum: { total_amount: true }
        });

        // Get total commission amount
        const totalCommission = await this.prisma.commissionCalculation.aggregate({
            where: {
                created_at: { gte: startDate, lte: endDate },
                deleted_at: null,
                commission_status: { in: ['approved', 'paid'] }
            },
            _sum: { commission_amount: true }
        });

        // Calculate product performance (percentage of successful bookings)
        const totalBookings = await this.prisma.booking.count({
            where: {
                created_at: { gte: startDate, lte: endDate },
                deleted_at: null
            }
        });

        const successfulBookings = await this.prisma.booking.count({
            where: {
                created_at: { gte: startDate, lte: endDate },
                payment_status: 'succeeded',
                deleted_at: null
            }
        });

        const productPerformance = totalBookings > 0 ? Math.round((successfulBookings / totalBookings) * 100) : 0;

        return {
            success: true,
            data: {
                total_sales: Number(totalSales._sum.total_amount || 0),
                total_commission: Number(totalCommission._sum.commission_amount || 0),
                product_performance: productPerformance,
                period: period,
                date_range: {
                    start: startDate,
                    end: endDate
                }
            }
        };
    }

    async getMonthlySalesTrend(period: string = 'monthly') {
        const now = new Date();
        let months: number;

        switch (period) {
            case 'weekly':
                months = 1;
                break;
            case 'monthly':
                months = 12;
                break;
            case 'yearly':
                months = 60;
                break;
            default:
                months = 12;
        }

        const salesData = [];
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

        for (let i = months - 1; i >= 0; i--) {
            const startDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const endDate = new Date(now.getFullYear(), now.getMonth() - i + 1, 0);

            const monthlySales = await this.prisma.booking.aggregate({
                where: {
                    created_at: { gte: startDate, lte: endDate },
                    payment_status: 'succeeded',
                    deleted_at: null
                },
                _sum: { total_amount: true }
            });

            salesData.push({
                month: monthNames[startDate.getMonth()],
                sales: Number(monthlySales._sum.total_amount || 0),
                year: startDate.getFullYear()
            });
        }

        return {
            success: true,
            data: {
                sales_trend: salesData,
                period: period
            }
        };
    }

    async getCommissionBreakdown(period: string = 'monthly') {
        const now = new Date();
        let startDate: Date;
        let endDate: Date;

        switch (period) {
            case 'weekly':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                endDate = now;
                break;
            case 'monthly':
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = now;
                break;
            case 'yearly':
                startDate = new Date(now.getFullYear(), 0, 1);
                endDate = now;
                break;
            default:
                startDate = new Date(now.getFullYear(), now.getMonth(), 1);
                endDate = now;
        }

        // Get commission breakdown by package
        const commissionBreakdown = await this.prisma.commissionCalculation.groupBy({
            by: ['commission_rate_id'],
            where: {
                created_at: { gte: startDate, lte: endDate },
                deleted_at: null,
                commission_status: { in: ['approved', 'paid'] }
            },
            _sum: {
                commission_amount: true,
                base_amount: true
            },
            _count: true
        });

        // Get package details for each commission rate
        const breakdownWithPackages = await Promise.all(
            commissionBreakdown.map(async (item) => {

                const commissionRate = await this.prisma.commissionRate.findUnique({
                    where: { id: item.commission_rate_id },
                    include: {
                        package: {
                            select: { id: true, name: true }
                        },
                        commission_calculations: {
                            select: {
                                booking: {
                                    select: {
                                        booking_items: {
                                            select: {
                                                package: {
                                                    select: { id: true, name: true }
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                });

                return {
                    package_name: commissionRate?.package?.name || commissionRate?.commission_calculations[0]?.booking?.booking_items[0]?.package?.name || "Unmown Package",
                    package_id: commissionRate?.package?.id,
                    commission_amount: Number(item._sum.commission_amount || 0),
                    base_amount: Number(item._sum.base_amount || 0),
                    count: item._count
                };
            })
        );

        // Calculate percentages
        const totalCommission = breakdownWithPackages.reduce((sum, item) => sum + item.commission_amount, 0);
        const breakdownWithPercentages = breakdownWithPackages.map(item => ({
            ...item,
            percentage: totalCommission > 0 ? Math.round((item.commission_amount / totalCommission) * 100) : 0
        }));

        return {
            success: true,
            data: {
                commission_breakdown: breakdownWithPercentages,
                total_commission: totalCommission,
                period: period
            }
        };
    }

    async getProductPerformance(rawPage: any = 1, rawLimit: any = 10) {
        const page = Number(rawPage) || 1;
        const limit = Number(rawLimit) || 10;
      
        const skip = (page - 1) * limit;
        // Get packages with their sales and commission data
        const packages = await this.prisma.package.findMany({
            where: {
                deleted_at: null,
                status: 1
            },
            skip,
            take: limit,
            include: {
                booking_items: {
                    include: {
                        booking: {
                            where: {
                                payment_status: 'succeeded',
                                deleted_at: null
                            }
                        }
                    }
                },
                commission_rates: {
                    where: {
                        deleted_at: null,
                        is_active: true
                    }
                }
            }
        });

        const productPerformance = await Promise.all(
            packages.map(async (packageItem) => {
                // Calculate total sales for this package
                const totalSales = packageItem.booking_items.reduce((sum, item) => {
                    return sum + Number(item.booking?.total_amount || 0);
                }, 0);

                // Calculate total commission for this package
                const totalCommission = await this.prisma.commissionCalculation.aggregate({
                    where: {
                        commission_rate: {
                            package_id: packageItem.id
                        },
                        deleted_at: null,
                        commission_status: { in: ['approved', 'paid'] }
                    },
                    _sum: { commission_amount: true }
                });

                // Determine status based on performance
                let status = 'Moderate';
                if (totalSales > 5000) status = 'Top Seller';
                else if (totalSales > 2000) status = 'Trending';
                else if (totalSales > 1000) status = 'Consistent';

                return {
                    product_id: packageItem.id,
                    product_name: packageItem.name,
                    sales: totalSales,
                    commission: Number(totalCommission._sum.commission_amount || 0),
                    status: status,
                    booking_count: packageItem.booking_items.length
                };
            })
        );

        // Get total count for pagination
        const total = await this.prisma.package.count({
            where: {
                deleted_at: null,
                status: 1
            }
        });

        const totalPages = Math.ceil(total / limit);

        return {
            success: true,
            data: {
                products: productPerformance,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNextPage: page < totalPages,
                    hasPreviousPage: page > 1
                }
            }
        };
    }

    async getDashboardSummary(period: string = 'monthly') {
        const [dashboardStats, monthlyTrend, commissionBreakdown, productPerformance] = await Promise.all([
            this.getDashboardStats(period),
            this.getMonthlySalesTrend(period),
            this.getCommissionBreakdown(period),
            this.getProductPerformance(1, 5) // Get top 5 products for dashboard
        ]);

        return {
            success: true,
            data: {
                summary_stats: dashboardStats.data,
                monthly_sales_trend: monthlyTrend.data,
                commission_breakdown: commissionBreakdown.data,
                product_performance: productPerformance.data,
                period: period
            }
        };
    }
}
