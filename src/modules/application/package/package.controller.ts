import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
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
import { UpdateReviewDto } from 'src/modules/admin/reviews/dto/update-review.dto';

@ApiTags('Package')
@Controller('package')
export class PackageController {
  constructor(private readonly packageService: PackageService) {}

  @ApiOperation({ summary: 'Get all packages' })
  @Get()
  // async findAll(@Query() query: QueryPackageDto) {
  //   try {
  //     const q = query.q;
  //     const type = query.type;
  //     const duration_start = query.duration_start;
  //     const duration_end = query.duration_end;
  //     const budget_start = query.budget_start;
  //     const budget_end = query.budget_end;
  //     const ratings = query.ratings;
  //     const free_cancellation = query.free_cancellation;
  //     const destinations = query.destinations;
  //     const languages = query.languages;

  //     const packages = await this.packageService.findAll({
  //       filters: {
  //         q: q,
  //         type: type,
  //         duration_start: duration_start,
  //         duration_end: duration_end,
  //         budget_start: budget_start,
  //         budget_end: budget_end,
  //         ratings: ratings,
  //         free_cancellation: free_cancellation,
  //         destinations: destinations,
  //         languages: languages,
  //       },
  //     });
  //     return packages;
  //   } catch (error) {
  //     return {
  //       success: false,
  //       message: error.message,
  //     };
  //   }
  // }
  async findAll(
    @Req() req: Request,
    @Query() query: {
      q?: string;
      vendor_id?: string;
      type?: string;
      duration?: number;
      min_price?: number;
      max_price?: number;
      min_rating?: number;
      free_cancellation?: string;
      tag_id?: string;
      category_id?: string;
      destination_id?: string;
      country_id?: string;
      start_date?: string;
      end_date?: string;
      available_date?: string;
      page?: string;
      limit?: string;
    },
  ) {
    try {
      const filters = {
        q: query.q,
        type: query.type,
        duration: query.duration ? Number(query.duration) : undefined,
        min_price: query.min_price ? Number(query.min_price) : undefined,
        max_price: query.max_price ? Number(query.max_price) : undefined,
        min_rating: query.min_rating ? Number(query.min_rating) : undefined,
        free_cancellation:
          query.free_cancellation !== undefined
            ? query.free_cancellation === 'true'
            : undefined,
        tag_id: query.tag_id,
        category_id: query.category_id,
        destination_id: query.destination_id,
        country_id: query.country_id,
        start_date: query.start_date,
        end_date: query.end_date,
        available_date: query.available_date,
      };

      const pagination = {
        page: query.page ? parseInt(query.page) : 1,
        limit: query.limit ? parseInt(query.limit) : 10,
      };

      const packages = await this.packageService.findAll(
        filters,
        pagination,
      );

      return packages;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // @UseGuards(JwtAuthGuard)
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

  // update review
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update review' })
  @Patch(':id/review/:review_id')
  async updateReview(
    @Req() req: Request,
    @Param('id') id: string,
    @Param('review_id') review_id: string,
    @Body() updateReviewDto: UpdateReviewDto,
  ) {
    try {
      const user_id = req.user.userId;
      const review = await this.packageService.updateReview(
        id,
        review_id,
        user_id,
        updateReviewDto,
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
