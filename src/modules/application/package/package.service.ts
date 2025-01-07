import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import appConfig from '../../../config/app.config';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class PackageService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async findAll() {
    try {
      const packages = await this.prisma.package.findMany({
        where: {
          status: 1,
          approved_at: {
            not: null,
          },
        },
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          user_id: true,
          name: true,
          description: true,
          price: true,
          duration: true,
          min_capacity: true,
          max_capacity: true,
          type: true,
          destination_id: true,
          cancellation_policy_id: true,
          package_categories: {
            select: {
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          package_images: {
            select: {
              id: true,
              image: true,
            },
          },
        },
      });

      // add image url package_images
      if (packages && packages.length > 0) {
        for (const record of packages) {
          if (record.package_images) {
            for (const image of record.package_images) {
              image['image_url'] = SojebStorage.url(
                appConfig().storageUrl.package + image.image,
              );
            }
          }
        }
      }

      return {
        success: true,
        data: packages,
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
      const record = await this.prisma.package.findUnique({
        where: {
          id: id,
          status: 1,
          approved_at: {
            not: null,
          },
        },
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          user_id: true,
          name: true,
          description: true,
          price: true,
          duration: true,
          min_capacity: true,
          max_capacity: true,
          type: true,
          reviews: {
            select: {
              id: true,
              rating_value: true,
              comment: true,
              user_id: true,
            },
          },
          destination: {
            select: {
              id: true,
              name: true,
            },
          },
          cancellation_policy: {
            select: {
              id: true,
              policy: true,
              description: true,
            },
          },
          package_images: {
            select: {
              id: true,
              image: true,
            },
          },
          package_trip_plans: {
            select: {
              id: true,
              title: true,
              description: true,
              package_trip_plan_images: {
                select: {
                  id: true,
                  image: true,
                },
              },
            },
          },
          package_tags: {
            select: {
              tag_id: true,
              type: true,
              tag: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
      return {
        success: true,
        data: record,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async createReview(
    package_id: string,
    user_id: string,
    createReviewDto: CreateReviewDto,
  ) {
    try {
      const data = {};
      if (createReviewDto.rating_value) {
        data['rating_value'] = createReviewDto.rating_value;
      }
      if (createReviewDto.comment) {
        data['comment'] = createReviewDto.comment;
      }
      // check if user has review
      const review = await this.prisma.review.findFirst({
        where: { user_id: user_id, package_id: package_id },
      });
      if (review) {
        return {
          success: false,
          message: 'You have already reviewed this package',
        };
      }
      await this.prisma.review.create({
        data: {
          ...data,
          package_id: package_id,
          user_id: user_id,
        },
      });

      return {
        success: true,
        message: 'Review created successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async removeReview(package_id: string, review_id: string, user_id: string) {
    try {
      // check if user has review
      const review = await this.prisma.review.findFirst({
        where: { id: review_id, user_id: user_id },
      });
      if (!review) {
        return {
          success: false,
          message: 'Review not found',
        };
      }
      await this.prisma.review.delete({
        where: {
          id: review_id,
          user_id: user_id,
          package_id: package_id,
        },
      });
      return {
        success: true,
        message: 'Review removed successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
