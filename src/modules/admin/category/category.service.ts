import { Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class CategoryService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async create(createCategoryDto: CreateCategoryDto) {
    try {
      const data = {
        name: createCategoryDto.name,
      };
      await this.prisma.category.create({
        data: {
          ...data,
        },
      });
      return {
        success: true,
        message: 'Category created successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findAll() {
    try {
      const categories = await this.prisma.category.findMany({
        select: {
          id: true,
          name: true,
          created_at: true,
          updated_at: true,
        },
      });

      return {
        success: true,
        data: categories,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findOne(id: string) {
    try {
      const category = await this.prisma.category.findUnique({
        where: { id: id },
        select: {
          id: true,
          name: true,
          created_at: true,
          updated_at: true,
        },
      });
      return {
        success: true,
        data: category,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async update(id: string, updateCategoryDto: UpdateCategoryDto) {
    try {
      await this.prisma.category.update({
        where: { id: id },
        data: {
          ...updateCategoryDto,
        },
      });
      return {
        success: true,
        message: 'Category updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async remove(id: string) {
    try {
      await this.prisma.category.delete({
        where: { id: id },
      });
      return {
        success: true,
        message: 'Category deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
