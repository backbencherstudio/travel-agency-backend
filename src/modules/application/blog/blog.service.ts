import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import appConfig from '../../../config/app.config';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import { StringHelper } from '../../../common/helper/string.helper';
import { LikeRepository } from 'src/common/repository/like/like.repository';

@Injectable()
export class BlogService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async findAll() {
    try {
      const blogs = await this.prisma.blog.findMany({
        select: {
          id: true,
          title: true,
          body: true,
          description: true,
          created_at: true,
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          blog_images: {
            select: {
              id: true,
              image: true,
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

      // add read time
      blogs.forEach((blog) => {
        blog['read_time'] = StringHelper.getReadTime(blog.body);
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
          body: true,
          description: true,
          created_at: true,
          user: {
            select: {
              id: true,
              name: true,
              avatar: true,
            },
          },
          blog_images: {
            select: {
              id: true,
              image: true,
            },
          },
        },
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

  // like a blog
  async react(user_id: string, blog_id: string) {
    const likeExist = await this.prisma.like.findFirst({
      where: {
        likeable_id: blog_id,
        likeable_type: 'blog',
        user_id: user_id,
      },
    });

    if (likeExist) {
      await this.prisma.like.delete({
        where: {
          id: likeExist.id,
        },
      });

      await LikeRepository.updateLikeCount(blog_id, 'blog');

      return true;
    } else {
      await this.prisma.like.create({
        data: {
          likeable_type: 'blog',
          likeable_id: blog_id,
          user_id: user_id,
        },
      });

      await LikeRepository.updateLikeCount(blog_id, 'blog');

      return true;
    }
  }
}
