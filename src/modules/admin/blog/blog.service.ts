import { Injectable } from '@nestjs/common';
import { CreateBlogDto } from './dto/create-blog.dto';
import { UpdateBlogDto } from './dto/update-blog.dto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import appConfig from '../../../config/app.config';

@Injectable()
export class BlogService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async create(
    createBlogDto: CreateBlogDto,
    user_id: string,
    images: Express.Multer.File[],
  ) {
    try {
      const data = {};
      if (createBlogDto.title) {
        data['title'] = createBlogDto.title;
      }
      if (createBlogDto.description) {
        data['description'] = createBlogDto.description;
      }
      if (createBlogDto.body) {
        data['body'] = createBlogDto.body;
      }

      const blog = await this.prisma.blog.create({
        data: {
          ...data,
          user_id,
        },
      });

      if (images) {
        await this.prisma.blogImage.createMany({
          data: images.map((image) => ({
            blog_id: blog.id,
            image: image.filename,
          })),
        });
      }
      return {
        success: true,
        message: 'Blog created successfully',
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
      const blogs = await this.prisma.blog.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          body: true,
          approved_at: true,
          created_at: true,
          updated_at: true,
          blog_images: {
            select: {
              image: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });
      // add image url
      blogs.forEach((blog) => {
        blog.blog_images.forEach((image) => {
          image['image_url'] = SojebStorage.url(
            appConfig().storageUrl.blog + image.image,
          );
        });
      });

      return {
        success: true,
        data: blogs,
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
      const blog = await this.prisma.blog.findUnique({
        where: { id },
        select: {
          id: true,
          title: true,
          description: true,
          body: true,
          approved_at: true,
          created_at: true,
          updated_at: true,
          blog_images: {
            select: {
              image: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // add image url
      blog.blog_images.forEach((image) => {
        image['image_url'] = SojebStorage.url(
          appConfig().storageUrl.blog + image.image,
        );
      });

      return {
        success: true,
        data: blog,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async update(
    id: string,
    updateBlogDto: UpdateBlogDto,
    images: Express.Multer.File[],
  ) {
    try {
      const data = {};
      if (updateBlogDto.title) {
        data['title'] = updateBlogDto.title;
      }
      if (updateBlogDto.description) {
        data['description'] = updateBlogDto.description;
      }
      if (updateBlogDto.body) {
        data['body'] = updateBlogDto.body;
      }
      const blog = await this.prisma.blog.update({
        where: { id },
        data: data,
      });

      if (images) {
        const blogImages = await this.prisma.blogImage.findMany({
          where: { blog_id: blog.id },
        });
        // delete images from storage
        blogImages.forEach((image) => {
          SojebStorage.delete(appConfig().storageUrl.blog + image.image);
        });
        await this.prisma.blogImage.deleteMany({
          where: { blog_id: blog.id },
        });
        // create new images
        await this.prisma.blogImage.createMany({
          data: images.map((image) => ({
            blog_id: blog.id,
            image: image.filename,
          })),
        });
      }
      return {
        success: true,
        message: 'Blog updated successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async approve(id: string) {
    try {
      const record = await this.prisma.blog.findUnique({
        where: { id },
      });
      if (!record) {
        return {
          success: false,
          message: 'Blog not found',
        };
      }
      await this.prisma.blog.update({
        where: { id },
        data: { approved_at: new Date() },
      });
      return {
        success: true,
        message: 'Blog approved successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async reject(id: string) {
    try {
      const record = await this.prisma.blog.findUnique({
        where: { id },
      });
      if (!record) {
        return {
          success: false,
          message: 'Blog not found',
        };
      }
      await this.prisma.blog.update({
        where: { id },
        data: { approved_at: null },
      });
      return {
        success: true,
        message: 'Blog rejected successfully',
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
      // use transaction
      const result = await this.prisma.$transaction(async (tx) => {
        // delete images from storage
        const blogImages = await tx.blogImage.findMany({
          where: { blog_id: id },
        });
        blogImages.forEach((image) => {
          SojebStorage.delete(appConfig().storageUrl.blog + image.image);
        });
        await tx.blogImage.deleteMany({
          where: { blog_id: id },
        });
        await tx.blog.delete({
          where: { id },
        });

        return {
          success: true,
          message: 'Blog deleted successfully',
        };
      });
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
