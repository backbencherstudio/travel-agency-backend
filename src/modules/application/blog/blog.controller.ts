import { Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { BlogService } from './blog.service';
import { ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../../../common/guard/role/roles.guard';
import { ApiTags } from '@nestjs/swagger';
import { Request } from 'express';

@ApiBearerAuth()
@ApiTags('Blog')
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('blog')
export class BlogController {
  constructor(private readonly blogService: BlogService) {}

  @ApiOperation({ summary: 'Get all blogs' })
  @Get()
  async findAll() {
    try {
      const blogs = await this.blogService.findAll();
      return blogs;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Get a blog by id' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const blog = await this.blogService.findOne(id);
      return blog;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Like a blog' })
  @Post(':id/like')
  async like(@Req() req: Request, @Param('id') id: string) {
    try {
      const user_id = req.user.userId;
      const result = await this.blogService.react(user_id, id);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
