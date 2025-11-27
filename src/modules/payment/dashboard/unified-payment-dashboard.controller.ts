import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { UnifiedPaymentDashboardService } from './unified-payment-dashboard.service';
import { UserRepository } from '../../../common/repository/user/user.repository';
import { Request } from 'express';

@ApiBearerAuth()
@ApiTags('Payment Dashboard')
@UseGuards(JwtAuthGuard)
@Controller('payment/dashboard')
export class UnifiedPaymentDashboardController {
    constructor(
        private readonly unifiedDashboardService: UnifiedPaymentDashboardService,
    ) { }

    @Get()
    async getUnifiedDashboard(@Req() req: Request) {
        try {
            const userId = req.user.userId;
            const user = await UserRepository.getUserDetails(userId);

            if (!user) {
                return {
                    success: false,
                    message: 'User not found',
                };
            }

            const result = await this.unifiedDashboardService.getUnifiedDashboard(
                userId,
                user.type,
            );

            return result;
        } catch (error) {
            return {
                success: false,
                message: error.message || 'Failed to fetch dashboard data',
            };
        }
    }
}

