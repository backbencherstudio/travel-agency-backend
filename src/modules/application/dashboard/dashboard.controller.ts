import { Controller, Get, Query, Param, Req, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Request } from 'express';
import { GetBookingsDto } from './dto/get-bookings.dto';
import { DashboardStatsResponseDto } from './dto/dashboard-stats.dto';
import { UserBookingsResponseDto } from './dto/booking-item.dto';

@ApiBearerAuth()
@ApiTags('Client Dashboard')
@UseGuards(JwtAuthGuard)
@Controller('user/dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) { }

  @ApiOperation({
    summary: 'Get dashboard statistics',
    description: 'Get tour complete, tour canceled, and upcoming tour counts for the authenticated user'
  })
  @ApiResponse({
    status: 200,
    description: 'Dashboard statistics retrieved successfully',
    type: DashboardStatsResponseDto,
  })
  @Get('stats')
  async getDashboardStats(@Req() req: Request) {
    try {
      const user_id = req.user.userId;
      const stats = await this.dashboardService.getDashboardStats(user_id);
      return stats;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Get user bookings',
    description: 'Get paginated list of user bookings with filtering and search capabilities'
  })
  @ApiResponse({
    status: 200,
    description: 'User bookings retrieved successfully',
    type: UserBookingsResponseDto,
  })
  @Get('bookings')
  async getUserBookings(
    @Req() req: Request,
    @Query() query: GetBookingsDto,
  ) {
    try {
      const user_id = req.user.userId;
      const { page = 1, limit = 10, status,booking_type, search } = query;

      const bookings = await this.dashboardService.getUserBookings(
        user_id,
        page,
        limit,
        status,
        booking_type,
        search,
      );
      return bookings;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Get booking details',
    description: 'Get detailed information about a specific booking'
  })
  @ApiResponse({
    status: 200,
    description: 'Booking details retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Booking not found',
  })
  @Get('bookings/:id')
  async getBookingDetails(@Req() req: Request, @Param('id') id: string) {
    try {
      const user_id = req.user.userId;
      const booking = await this.dashboardService.getBookingDetails(id, user_id);
      return booking;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
