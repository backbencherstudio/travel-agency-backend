import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ReviewsService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async findAll() {
    try {
      const reviews = await this.review.findMany({
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

  async findOne(id: string) {
    try {
      const review = await this.review.findUnique({
        where: {
          id: id,
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
      const review = await this.review.delete({
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
