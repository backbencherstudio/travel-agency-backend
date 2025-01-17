import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CheckoutService } from './checkout.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';

@ApiTags('Checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @ApiOperation({ summary: 'Create a new checkout' })
  @Post()
  async create(
    @Req() req: Request,
    @Body() createCheckoutDto: CreateCheckoutDto,
  ) {
    try {
      const user_id = req.user.userId;
      const checkout = await this.checkoutService.create(
        user_id,
        createCheckoutDto,
      );

      return checkout;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Get checkout details' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const checkout = await this.checkoutService.findOne(id);
      return checkout;
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
