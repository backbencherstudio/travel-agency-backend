import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import appConfig from '../../../config/app.config';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import { StringHelper } from '../../../common/helper/string.helper';
import { LikeRepository } from '../../../common/repository/like/like.repository';
import { CreateCommentDto } from './dto/create-comment.dto';

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
          like_count: true,
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
          blog_comments: {
            select: {
              id: true,
              comment: true,
              created_at: true,
              user: {
                select: {
                  id: true,
                  name: true,
                  avatar: true,
                },
              },
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

      // add avatar url
      blog.user.avatar = SojebStorage.url(
        appConfig().storageUrl.avatar + blog.user.avatar,
      );

      // add comment avatar url
      blog.blog_comments.forEach((comment) => {
        comment.user.avatar = SojebStorage.url(
          appConfig().storageUrl.avatar + comment.user.avatar,
        );
      });

      // add recent post
      const recentBlogs = await this.prisma.blog.findMany({
        orderBy: {
          created_at: 'desc',
        },
        select: {
          id: true,
          title: true,
          created_at: true,
          blog_images: {
            select: {
              image: true,
            },
          },
        },
        take: 3,
      });

      // add image url
      recentBlogs.forEach((post) => {
        post.blog_images.forEach((image) => {
          image['image_url'] = SojebStorage.url(
            appConfig().storageUrl.blog + image.image,
          );
        });
      });

      blog['recent_blogs'] = recentBlogs;

      // add featured blog
      const featuredBlog = await this.prisma.blog.findFirst({
        orderBy: {
          like_count: 'desc',
        },
        take: 1,
        select: {
          id: true,
          title: true,
          created_at: true,
          blog_images: {
            select: {
              image: true,
            },
          },
        },
      });

      // add image url
      featuredBlog.blog_images.forEach((image) => {
        image['image_url'] = SojebStorage.url(
          appConfig().storageUrl.blog + image.image,
        );
      });

      blog['featured_blog'] = featuredBlog;

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

  async search(keyword: string) {
    try {
      // measure time
      const start = performance.now();
      const blogs = await this.prisma.blog.findMany({
        where: {
          title: {
            contains: keyword,
          },
        },
        select: {
          id: true,
          title: true,
          description: true,
          created_at: true,
          blog_images: {
            select: {
              image: true,
            },
          },
        },
      });

      // add image url
      blogs.forEach((blog) => {
        if (blog.blog_images.length > 0) {
          blog.blog_images.forEach((image) => {
            image['image_url'] = SojebStorage.url(
              appConfig().storageUrl.blog + image.image,
            );
          });
        }
      });

      const end = performance.now();
      const time = (end - start) / 1000; // in seconds

      return {
        success: true,
        time: time,
        data: blogs,
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

      return {
        success: true,
        message: 'Blog unliked successfully',
      };
    } else {
      await this.prisma.like.create({
        data: {
          likeable_type: 'blog',
          likeable_id: blog_id,
          user_id: user_id,
        },
      });

      await LikeRepository.updateLikeCount(blog_id, 'blog');

      return {
        success: true,
        message: 'Blog liked successfully',
      };
    }
  }

  async comment(
    user_id: string,
    blog_id: string,
    commentDto: CreateCommentDto,
  ) {
    try {
      const blog = await this.prisma.blog.findUnique({
        where: { id: blog_id },
      });

      if (!blog) {
        return {
          success: false,
          message: 'Blog not found',
        };
      }

      const comment = commentDto.comment;

      await this.prisma.blogComment.create({
        data: {
          blog_id: blog_id,
          user_id: user_id,
          comment: comment,
        },
      });

      return {
        success: true,
        message: 'Comment added successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async deleteComment(user_id: string, comment_id: string) {
    try {
      const comment = await this.prisma.blogComment.findUnique({
        where: { id: comment_id },
      });

      if (!comment) {
        return {
          success: false,
          message: 'Comment not found',
        };
      }
      // check if the comment is owned by the user
      if (comment.user_id != user_id) {
        return {
          success: false,
          message: 'You are not allowed to delete this comment',
        };
      }
      await this.prisma.blogComment.delete({
        where: { id: comment_id },
      });

      return {
        success: true,
        message: 'Comment deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
