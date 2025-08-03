import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    UseGuards,
    Req,
    Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { WishListService } from './wishlist.service';
import { CreateWishListDto } from './dto/create-wishlist.dto';
import { UpdateWishListDto } from './dto/update-wishlist.dto';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('WishList')
@Controller('wishlist')
export class WishListController {
    constructor(private readonly wishListService: WishListService) { }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Add package to wishlist' })
    @Post()
    async create(@Req() req: Request, @Body() createWishListDto: CreateWishListDto) {
        try {
            const user_id = req.user.userId;
            const result = await this.wishListService.create(user_id, createWishListDto);
            return result;
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get all wishlist items for user' })
    @Get()
    async findAll(
        @Req() req: Request,
        @Query() query: {
            page?: string;
            limit?: string;
        },
    ) {
        try {
            const user_id = req.user.userId;
            const pagination = {
                page: query.page ? parseInt(query.page) : 1,
                limit: query.limit ? parseInt(query.limit) : 10,
            };
            const result = await this.wishListService.findAll(user_id, pagination);
            return result;
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get wishlist item by ID' })
    @Get(':id')
    async findOne(@Req() req: Request, @Param('id') id: string) {
        try {
            const user_id = req.user.userId;
            const result = await this.wishListService.findOne(user_id, id);
            return result;
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update wishlist item note' })
    @Patch(':id')
    async update(
        @Req() req: Request,
        @Param('id') id: string,
        @Body() updateWishListDto: UpdateWishListDto,
    ) {
        try {
            const user_id = req.user.userId;
            const result = await this.wishListService.update(user_id, id, updateWishListDto);
            return result;
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Remove package from wishlist' })
    @Delete(':id')
    async remove(@Req() req: Request, @Param('id') id: string) {
        try {
            const user_id = req.user.userId;
            const result = await this.wishListService.remove(user_id, id);
            return result;
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
} 