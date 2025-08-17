import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRepository } from '../../../common/repository/user/user.repository';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import appConfig from '../../../config/app.config';

@Injectable()
export class ReviewsService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async findAll(user_id?: string) {
    try {
      const userDetails = await UserRepository.getUserDetails(user_id);

      const whereClause = {};
      if (userDetails.type == 'vendor') {
        whereClause['user_id'] = user_id;
      }

      const reviews = await this.prisma.review.findMany({
        where: {
          ...whereClause,
        },
        select: {
          id: true,
          rating_value: true,
          comment: true,
          review_files: {
            select: {
              id: true,
              file: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
              avatar: true,
            },
          },
          package: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      // add url to avatar
      for (const review of reviews) {
        if (review.user && review.user.avatar) {
          review.user['avatar_url'] = SojebStorage.url(
            appConfig().storageUrl.avatar + review.user.avatar,
          );
        }
        if (review.review_files) {
          for (const file of review.review_files) {
            file['review_file_url'] = SojebStorage.url(
              appConfig().storageUrl.review + file.file,
            );
          }
        }
      }

      return {
        success: true,
        data: reviews,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findOne(id: string, user_id?: string) {
    try {
      const userDetails = await UserRepository.getUserDetails(user_id);

      const whereClause = {};
      if (userDetails.type == 'vendor') {
        whereClause['user_id'] = user_id;
      }

      const review = await this.prisma.review.findUnique({
        where: {
          id: id,
          ...whereClause,
        },
        select: {
          id: true,
          rating_value: true,
          comment: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          package: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      });

      if (!review) {
        return {
          success: false,
          message: 'Review not found',
        };
      }

      return {
        success: true,
        data: review,
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
      const review = await this.prisma.review.delete({
        where: {
          id: id,
        },
      });

      if (!review) {
        return {
          success: false,
          message: 'Review not found',
        };
      }

      return {
        success: true,
        message: 'Review deleted',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
