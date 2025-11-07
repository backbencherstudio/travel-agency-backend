import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags, ApiQuery } from '@nestjs/swagger';
import { GiftCardService } from './gift-card.service';
import { CreateGiftCardDto } from './dto/create-gift-card.dto';
import { UpdateGiftCardDto } from './dto/update-gift-card.dto';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { Role } from '../../../common/guard/role/role.enum';

@ApiBearerAuth()
@ApiTags('Admin Gift Card')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/gift-card')
export class GiftCardController {
  constructor(private readonly giftCardService: GiftCardService) { }

  @ApiOperation({ summary: 'Create gift card' })
  @Post()
  async create(@Body() createGiftCardDto: CreateGiftCardDto) {
    try {
      const giftCard = await this.giftCardService.create(createGiftCardDto);
      return giftCard;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Get all gift cards' })
  @ApiQuery({ name: 'q', required: false, description: 'Search query' })
  @ApiQuery({ name: 'status', required: false, description: 'Filter by status' })
  @ApiQuery({ name: 'page', required: false, description: 'Page number' })
  @ApiQuery({ name: 'limit', required: false, description: 'Items per page' })
  @Get()
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

  @ApiOperation({ summary: 'Get gift card by ID' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const giftCard = await this.giftCardService.findOne(id);
      return giftCard;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Update gift card' })
  @Patch(':id')
  async update(@Param('id') id: string, @Body() updateGiftCardDto: UpdateGiftCardDto) {
    try {
      const giftCard = await this.giftCardService.update(id, updateGiftCardDto);
      return giftCard;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Delete gift card' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const result = await this.giftCardService.remove(id);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Find gift card by code' })
  @Get('code/:code')
  async findByCode(@Param('code') code: string) {
    try {
      const giftCard = await this.giftCardService.findByCode(code);
      return giftCard;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}