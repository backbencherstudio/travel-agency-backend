import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { PlaceService } from './place.service';
import { CreatePlaceDto } from './dto/create-place.dto';
import { UpdatePlaceDto } from './dto/update-place.dto';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { Role } from '../../../common/guard/role/role.enum';

@ApiBearerAuth()
@ApiTags('Place')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('admin/place')
export class PlaceController {
  constructor(private readonly placeService: PlaceService) { }

  @Roles(Role.ADMIN, Role.VENDOR)
  @ApiOperation({ summary: 'Create place' })
  @Post()
  async create(@Req() req: Request, @Body() createPlaceDto: CreatePlaceDto) {
    try {
      const record = await this.placeService.create(createPlaceDto);
      return record;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Roles(Role.ADMIN, Role.VENDOR)
  @ApiOperation({ summary: 'Get all places' })
  @Get()
  async findAll(
    @Req() req: Request,
    @Query() query: {
      q?: string;
      type?: string;
      city?: string;
      country?: string;
    },
  ) {
    try {
      const filters = {
        q: query.q,
        type: query.type,
        city: query.city,
        country: query.country,
      };

      const places = await this.placeService.findAll(filters);
      return places;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Roles(Role.ADMIN, Role.VENDOR)
  @ApiOperation({ summary: 'Get place by id' })
  @Get(':id')
  async findOne(@Req() req: Request, @Param('id') id: string) {
    try {
      const record = await this.placeService.findOne(id);
      return record;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Roles(Role.ADMIN, Role.VENDOR)
  @ApiOperation({ summary: 'Update place' })
  @Patch(':id')
  async update(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() updatePlaceDto: UpdatePlaceDto,
  ) {
    try {
      const record = await this.placeService.update(id, updatePlaceDto);
      return record;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Roles(Role.ADMIN, Role.VENDOR)
  @ApiOperation({ summary: 'Delete place' })
  @Delete(':id')
  async remove(@Req() req: Request, @Param('id') id: string) {
    try {
      const record = await this.placeService.remove(id);
      return record;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
