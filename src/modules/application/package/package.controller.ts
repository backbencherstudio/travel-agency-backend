import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { PackageService } from './package.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Package')
@Controller('package')
export class PackageController {
  constructor(private readonly packageService: PackageService) {}

  @ApiOperation({ summary: 'Get all packages' })
  @Get()
  async findAll(@Query() query: { type: string }) {
    try {
      const type = query.type;
      const packages = await this.packageService.findAll({ type: type });
      return packages;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get package by id' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const record = await this.packageService.findOne(id);
      return record;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Add review to package' })
  @Post(':id/review')
  async createReview(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() createReviewDto: CreateReviewDto,
  ) {
    try {
      const user_id = req.user.userId;
      const review = await this.packageService.createReview(
        id,
        user_id,
        createReviewDto,
      );
      return review;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Remove review from package' })
  @Delete(':id/review/:review_id')
  async removeReview(
    @Param('id') id: string,
    @Param('review_id') review_id: string,
    @Req() req: Request,
  ) {
    try {
      const user_id = req.user.userId;
      const review = await this.packageService.removeReview(
        id,
        review_id,
        user_id,
      );
      return review;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
