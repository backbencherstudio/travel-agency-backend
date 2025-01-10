import { Controller, Get, Post, Body, Param, Query } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CreateCheckoutDto } from './dto/create-checkout.dto';
import { ApiOperation, ApiTags } from '@nestjs/swagger';

@ApiTags('Checkout')
@Controller('checkout')
export class CheckoutController {
  constructor(private readonly checkoutService: CheckoutService) {}

  @Post()
  create(@Body() createCheckoutDto: CreateCheckoutDto) {
    return this.checkoutService.create(createCheckoutDto);
  }

  @ApiOperation({ summary: 'Get checkout details' })
  @Get(':id')
  async findOne(
    @Param('id') id: string,
    @Query('traveller_count') traveller_count: number,
  ) {
    try {
      const checkout = await this.checkoutService.findOne(id, traveller_count);
      return checkout;
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
