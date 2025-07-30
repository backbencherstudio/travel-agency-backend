import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRepository } from '../../../common/repository/user/user.repository';
import appConfig from '../../../config/app.config';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import { DateHelper } from '../../../common/helper/date.helper';

@Injectable()
export class UserService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async create(createUserDto: CreateUserDto) {
    try {
      const user = await UserRepository.createUser(createUserDto);

      if (user.success) {
        return {
          success: user.success,
          message: user.message,
        };
      } else {
        return {
          success: user.success,
          message: user.message,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findAll({
    q,
    type,
    approved,
  }: {
    q?: string;
    type?: string;
    approved?: string;
  }) {
    try {
      const where_condition = {};
      if (q) {
        where_condition['OR'] = [
          { name: { contains: q, mode: 'insensitive' } },
          { email: { contains: q, mode: 'insensitive' } },
        ];
      }

      if (type) {
        where_condition['type'] = type;
      }

      if (approved) {
        where_condition['approved_at'] =
          approved == 'approved' ? { not: null } : { equals: null };
      }

      const users = await this.prisma.user.findMany({
        where: {
          ...where_condition,
        },
        select: {
          id: true,
          name: true,
          email: true,
          phone_number: true,
          address: true,
          type: true,
          approved_at: true,
          created_at: true,
          updated_at: true,
        },
      });

      return {
        success: true,
        data: users,
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
      const user = await this.prisma.user.findUnique({
        where: {
          id: id,
        },
        select: {
          id: true,
          name: true,
          email: true,
          type: true,
          phone_number: true,
          approved_at: true,
          created_at: true,
          updated_at: true,
          gender: true,
          date_of_birth: true,
          avatar: true,
          billing_id: true,
          packages: {
            select: {
              id: true,
              status: true,
              name: true,
              description: true,
              price: true,
              price_type: true,
              final_price: true,
              duration: true,
              duration_type: true,
              type: true,
              package_files: {
                select: {
                  id: true,
                  file: true,
                },
              },
            },
          },  
        },
      });

      const user_reviews = await this.prisma.review.findMany({
        where: {
          user_id: user.id,
        },
      });

      const reviews_count = await this.prisma.review.count({
        where: {
          user_id: user.id,
        },
      });

      // calculate avarage rating
      let totalRating = 0;
      let totalReviews = 0;
      for (const review of user_reviews) {
        totalRating += review.rating_value;
        totalReviews++;
      }
      const averageRating = totalRating / totalReviews;
      user['average_rating'] = averageRating;
      user['reviews_count'] = reviews_count;

      // add avatar url to user
      if (user.avatar) {
        user['avatar_url'] = SojebStorage.url(
          appConfig().storageUrl.avatar + user.avatar,
        );
      }

      // add package files url to user
      if (user.packages) {
        for (const userPackage of user.packages) {
          if (userPackage.package_files) {
            for (const file of userPackage.package_files) {
              file['file_url'] = SojebStorage.url(
                appConfig().storageUrl.package + file.file,
              );
            }
          }
        }
      }

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      return {
        success: true,
        data: user,
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
      const user = await this.prisma.user.findUnique({
        where: { id: id },
      });
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }
      await this.prisma.user.update({
        where: { id: id },
        data: { approved_at: DateHelper.now() },
      });
      return {
        success: true,
        message: 'User approved successfully',
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
      const user = await this.prisma.user.findUnique({
        where: { id: id },
      });
      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }
      await this.prisma.user.update({
        where: { id: id },
        data: { approved_at: null },
      });
      return {
        success: true,
        message: 'User rejected successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async update(id: string, updateUserDto: UpdateUserDto) {
    try {
      const user = await UserRepository.updateUser(id, updateUserDto);

      if (user.success) {
        return {
          success: user.success,
          message: user.message,
        };
      } else {
        return {
          success: user.success,
          message: user.message,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async remove(id: string) {
    try {
      const user = await UserRepository.deleteUser(id);
      return user;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
