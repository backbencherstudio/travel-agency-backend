import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from '../../../common/guard/role/role.enum';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiBearerAuth()
@ApiTags('Dashboard')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.VENDOR)
@Controller('admin/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @ApiOperation({ summary: 'Get dashboard data' })
  @Get()
  async getAdminData(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      const dashboard = await this.dashboardService.getAdminData(user_id);
      return dashboard;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Get vendor dashboard data' })
  @Get('vendor')
  async getVendorData(
    @Req() req: any,  // Getting user data from request
    @Query() query: { page?: number; limit?: number }  // Pagination for recent bookings
  ) {
    const user_id = req.user.userId;
    const { page = 1, limit = 10 } = query;
    const data = await this.dashboardService.getVendorData(user_id, page, limit);
    return data;
  }
}
