import { Controller, Post, Get, Body, Req, Param, UseGuards, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../modules/auth/guards/jwt-auth.guard';
import { GiftCardService } from './gift-card.service';
import { PurchaseGiftCardDto } from './dto/purchase-gift-card.dto';
import { Request } from 'express';

@ApiBearerAuth()
@ApiTags('Gift Card')
@UseGuards(JwtAuthGuard)
@Controller('gift-card')
export class GiftCardController {
  constructor(private readonly giftCardService: GiftCardService) { }

  @Get()
  @ApiOperation({ summary: 'Get all available gift cards' })
  async findAll(
    @Query('q') q?: string,
    @Query('status') status?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    try {
      const filters = {
        q: q || null,
        status: status ? parseInt(status) : null,
      };

      const pagination = {
        page: page ? parseInt(page) : 1,
        limit: limit ? parseInt(limit) : 10,
      };

      const giftCards = await this.giftCardService.findAll(filters, pagination);
      return giftCards;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get(':id')
  @ApiOperation({ summary: 'Find gift card by ID (view before purchase)' })
  async findGiftCardById(@Param('id') id: string) {
    try {
      const result = await this.giftCardService.findGiftCardById(id);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Post(':id/purchase')
  @ApiOperation({ summary: 'Purchase gift card by ID' })
  async purchaseGiftCard(
    @Req() req: Request,
    @Param('id') giftCardId: string,
    @Body() purchaseDto: PurchaseGiftCardDto,
  ) {
    try {
      const userId = req.user.userId;
      const result = await this.giftCardService.purchaseGiftCard(userId, giftCardId, purchaseDto);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
