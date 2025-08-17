import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { SalesCommissionService } from './sales-commission.service';
import { CreateCommissionRateDto } from './dto/create-commission-rate.dto';
import { UpdateCommissionRateDto } from './dto/update-commission-rate.dto';
import { QueryCommissionRateDto } from './dto/query-commission-rate.dto';
import { CalculateCommissionDto } from './dto/calculate-commission.dto';
import { ApproveCommissionDto } from './dto/approve-commission.dto';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { Role } from '../../../common/guard/role/role.enum';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';

@ApiTags('Admin - Sales Commission')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.SUPERADMIN)
@Controller('admin/sales-commission')
export class SalesCommissionController {
  constructor(private readonly salesCommissionService: SalesCommissionService) { }

  // Commission Rate Management
  @Post('rates')
  @ApiOperation({ summary: 'Create a new commission rate' })
  @ApiResponse({
    status: 201,
    description: 'Commission rate created successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'User, package, or category not found',
  })
  createCommissionRate(@Body() createCommissionRateDto: CreateCommissionRateDto) {
    return this.salesCommissionService.createCommissionRate(createCommissionRateDto);
  }

  @Get('rates')
  @ApiOperation({ summary: 'Get all commission rates with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'search', required: false, type: String, example: 'vendor' })
  @ApiQuery({ name: 'commission_type', required: false, enum: ['percentage', 'fixed', 'tiered'] })
  @ApiQuery({ name: 'applicable_user_type', required: false, enum: ['vendor', 'sales_agent', 'affiliate', 'partner'] })
  @ApiQuery({ name: 'is_active', required: false, type: Boolean })
  @ApiQuery({ name: 'user_id', required: false, type: String })
  @ApiQuery({ name: 'package_id', required: false, type: String })
  @ApiQuery({ name: 'category_id', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Commission rates retrieved successfully',
  })
  findAllCommissionRates(@Query() query: QueryCommissionRateDto) {
    return this.salesCommissionService.findAllCommissionRates(query);
  }

  @Get('rates/:id')
  @ApiOperation({ summary: 'Get a specific commission rate by ID' })
  @ApiParam({ name: 'id', description: 'Commission rate ID' })
  @ApiResponse({
    status: 200,
    description: 'Commission rate retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Commission rate not found',
  })
  findOneCommissionRate(@Param('id') id: string) {
    return this.salesCommissionService.findOneCommissionRate(id);
  }

  @Patch('rates/:id')
  @ApiOperation({ summary: 'Update a commission rate' })
  @ApiParam({ name: 'id', description: 'Commission rate ID' })
  @ApiResponse({
    status: 200,
    description: 'Commission rate updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Commission rate not found',
  })
  updateCommissionRate(
    @Param('id') id: string,
    @Body() updateCommissionRateDto: UpdateCommissionRateDto,
  ) {
    return this.salesCommissionService.updateCommissionRate(id, updateCommissionRateDto);
  }

  @Delete('rates/:id')
  @ApiOperation({ summary: 'Delete a commission rate (soft delete)' })
  @ApiParam({ name: 'id', description: 'Commission rate ID' })
  @ApiResponse({
    status: 200,
    description: 'Commission rate deleted successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Commission rate not found',
  })
  removeCommissionRate(@Param('id') id: string) {
    return this.salesCommissionService.removeCommissionRate(id);
  }

  // Commission Calculation Management
  @Post('calculate')
  @ApiOperation({ summary: 'Calculate commission for a booking' })
  @ApiResponse({
    status: 201,
    description: 'Commission calculated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error or no applicable rate found',
  })
  @ApiResponse({
    status: 404,
    description: 'Booking or recipient user not found',
  })
  calculateCommission(@Body() calculateCommissionDto: CalculateCommissionDto) {
    return this.salesCommissionService.calculateCommission(calculateCommissionDto);
  }

  @Get('calculations')
  @ApiOperation({ summary: 'Get all commission calculations with pagination and filters' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiQuery({ name: 'status', required: false, enum: ['pending', 'approved', 'paid', 'cancelled', 'disputed'] })
  @ApiQuery({ name: 'recipient_user_id', required: false, type: String })
  @ApiQuery({ name: 'booking_id', required: false, type: String })
  @ApiResponse({
    status: 200,
    description: 'Commission calculations retrieved successfully',
  })
  findAllCommissionCalculations(@Query() query: any) {
    return this.salesCommissionService.findAllCommissionCalculations(query);
  }

  @Get('calculations/:id')
  @ApiOperation({ summary: 'Get a specific commission calculation by ID' })
  @ApiParam({ name: 'id', description: 'Commission calculation ID' })
  @ApiResponse({
    status: 200,
    description: 'Commission calculation retrieved successfully',
  })
  @ApiResponse({
    status: 404,
    description: 'Commission calculation not found',
  })
  findOneCommissionCalculation(@Param('id') id: string) {
    return this.salesCommissionService.findOneCommissionCalculation(id);
  }

  @Patch('calculations/:id/approve')
  @ApiOperation({ summary: 'Approve, reject, or dispute a commission calculation' })
  @ApiParam({ name: 'id', description: 'Commission calculation ID' })
  @ApiResponse({
    status: 200,
    description: 'Commission status updated successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - validation error',
  })
  @ApiResponse({
    status: 404,
    description: 'Commission calculation not found',
  })
  approveCommission(
    @Param('id') id: string,
    @Body() approveCommissionDto: ApproveCommissionDto,
    @Request() req: any,
  ) {
    return this.salesCommissionService.approveCommission(id, approveCommissionDto, req.user.id);
  }

  // Statistics and Reports
  @Get('stats')
  @ApiOperation({ summary: 'Get commission statistics and summary' })
  @ApiResponse({
    status: 200,
    description: 'Commission statistics retrieved successfully',
  })
  getCommissionStats() {
    return this.salesCommissionService.getCommissionStats();
  }

  // Dashboard Reports
  @Get('dashboard/summary')
  @ApiOperation({ summary: 'Get comprehensive dashboard summary with all metrics' })
  @ApiQuery({ name: 'period', required: false, enum: ['weekly', 'monthly', 'yearly'], example: 'monthly' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard summary retrieved successfully',
  })
  getDashboardSummary(@Query('period') period: string = 'monthly') {
    return this.salesCommissionService.getDashboardSummary(period);
  }

  @Get('dashboard/stats')
  @ApiOperation({ summary: 'Get dashboard key metrics (Total Sales, Total Commission, Product Performance)' })
  @ApiQuery({ name: 'period', required: false, enum: ['weekly', 'monthly', 'yearly'], example: 'monthly' })
  @ApiResponse({
    status: 200,
    description: 'Dashboard stats retrieved successfully',
  })
  getDashboardStats(@Query('period') period: string = 'monthly') {
    return this.salesCommissionService.getDashboardStats(period);
  }

  @Get('dashboard/sales-trend')
  @ApiOperation({ summary: 'Get monthly sales trend data for charts' })
  @ApiQuery({ name: 'period', required: false, enum: ['weekly', 'monthly', 'yearly'], example: 'monthly' })
  @ApiResponse({
    status: 200,
    description: 'Sales trend data retrieved successfully',
  })
  getMonthlySalesTrend(@Query('period') period: string = 'monthly') {
    return this.salesCommissionService.getMonthlySalesTrend(period);
  }

  @Get('dashboard/commission-breakdown')
  @ApiOperation({ summary: 'Get commission breakdown by package for pie chart' })
  @ApiQuery({ name: 'period', required: false, enum: ['weekly', 'monthly', 'yearly'], example: 'monthly' })
  @ApiResponse({
    status: 200,
    description: 'Commission breakdown retrieved successfully',
  })
  getCommissionBreakdown(@Query('period') period: string = 'monthly') {
    return this.salesCommissionService.getCommissionBreakdown(period);
  }

  @Get('dashboard/product-performance')
  @ApiOperation({ summary: 'Get product performance table with sales, commission, and status' })
  @ApiQuery({ name: 'page', required: false, type: Number, example: 1 })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 10 })
  @ApiResponse({
    status: 200,
    description: 'Product performance data retrieved successfully',
  })
  getProductPerformance(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10
  ) {
    return this.salesCommissionService.getProductPerformance(page, limit);
  }
}
