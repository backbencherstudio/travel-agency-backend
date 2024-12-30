import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { Roles } from '../../../common/guard/role/roles.decorator';
import { Role } from '../../../common/guard/role/role.enum';

@ApiBearerAuth()
@ApiTags('Category')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
@Controller('admin/category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @ApiOperation({ summary: 'Create category' })
  @Post()
  async create(@Body() createCategoryDto: CreateCategoryDto) {
    try {
      const category = await this.categoryService.create(createCategoryDto);
      return category;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Get all categories' })
  @Get()
  async findAll() {
    try {
      const categories = await this.categoryService.findAll();
      return categories;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const category = await this.categoryService.findOne(id);
      return category;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Update category' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateCategoryDto: UpdateCategoryDto,
  ) {
    try {
      const category = await this.categoryService.update(id, updateCategoryDto);
      return category;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const category = await this.categoryService.remove(id);
      return category;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
