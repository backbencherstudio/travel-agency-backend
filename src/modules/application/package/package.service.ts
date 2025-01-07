import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

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
        },
      });
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
              rating: true,
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
}
