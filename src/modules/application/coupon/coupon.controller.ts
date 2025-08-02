import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CouponService } from './coupon.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiBearerAuth()
@ApiTags('Coupon')
@UseGuards(JwtAuthGuard)
@Controller('coupon')
export class CouponController {
  constructor(private readonly couponService: CouponService) { }

  @ApiOperation({ summary: 'Get all available coupons' })
  @Get()
  async findAll(
    @Query() query: {
      q?: string;
      status?: number;
      coupon_type?: string;
      page?: string;
      limit?: string;
    },
  ) {
    try {
      const searchQuery = query.q;
      const status = query.status;
      const couponType = query.coupon_type;
      const page = query.page ? parseInt(query.page) : 1;
      const limit = query.limit ? parseInt(query.limit) : 10;

      const coupons = await this.couponService.findAll(
        {
          q: searchQuery,
          status: status,
          coupon_type: couponType,
        },
        {
          page,
          limit,
        },
      );
      return coupons;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Get a coupon by id' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const coupon = await this.couponService.findOne(id);
      return coupon;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Redeem a coupon' })
  @Post('redeem')
  async redeemCoupon(
    @Request() req,
    @Body() body: { code: string },
  ) {
    try {
      const userId = req.user.userId;
      const { code } = body;
      const result = await this.couponService.redeemCoupon(userId, code);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Remove applied coupon from checkout' })
  @Delete('remove/:checkoutId')
  async removeCoupon(
    @Request() req,
    @Param('checkoutId') checkoutId: string,
  ) {
    try {
      const userId = req.user.userId;
      const result = await this.couponService.removeCoupon(userId, checkoutId);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Get applied coupon for checkout' })
  @Get('applied/:checkoutId')
  async getAppliedCoupon(
    @Request() req,
    @Param('checkoutId') checkoutId: string,
  ) {
    try {
      const userId = req.user.userId;
      const result = await this.couponService.getAppliedCoupon(userId, checkoutId);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Auto-apply available coupons to checkout' })
  @Post('auto-apply/:checkoutId')
  async autoApplyCoupons(
    @Request() req,
    @Param('checkoutId') checkoutId: string,
  ) {
    try {
      const userId = req.user.userId;
      const result = await this.couponService.autoApplyAvailableCoupons(userId, checkoutId);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Get user available coupons' })
  @Get('my-coupons')
  async getUserAvailableCoupons(@Request() req) {
    try {
      const userId = req.user.userId;
      const result = await this.couponService.getUserAvailableCoupons(userId);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
