import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import appConfig from '../../../config/app.config';
import { CreateReviewDto } from './dto/create-review.dto';
import { MessageGateway } from '../../../modules/chat/message/message.gateway';
import { NotificationRepository } from '../../../common/repository/notification/notification.repository';
import { UpdateReviewDto } from './dto/update-review.dto';
import { UserRepository } from 'src/common/repository/user/user.repository';

@Injectable()
export class PackageService extends PrismaClient {
  constructor(
    private prisma: PrismaService,
    private readonly messageGateway: MessageGateway,
  ) {
    super();
  }

  // async findAll({
  //   filters: {
  //     q,
  //     type,
  //     duration_start,
  //     duration_end,
  //     budget_start,
  //     budget_end,
  //     ratings,
  //     free_cancellation,
  //     destinations,
  //     languages,
  //     cursor,
  //     limit = 15,
  //     page,
  //   },
  // }: {
  //   filters: {
  //     q?: string;
  //     type?: string;
  //     duration_start?: string;
  //     duration_end?: string;
  //     budget_start?: number;
  //     budget_end?: number;
  //     ratings?: number[];
  //     free_cancellation?: string[];
  //     destinations?: string[];
  //     languages?: string[];
  //     cursor?: string;
  //     limit?: number;
  //     page?: number;
  //   };
  // }) {
  //   try {
  //     const where_condition = {};
  //     const query_condition = {};
  //     if (q) {
  //       where_condition['OR'] = [
  //         { name: { contains: q, mode: 'insensitive' } },
  //         {
  //           package_destinations: {
  //             some: {
  //               destination: { name: { contains: q, mode: 'insensitive' } },
  //             },
  //           },
  //         },
  //         {
  //           package_languages: {
  //             some: {
  //               language: { name: { contains: q, mode: 'insensitive' } },
  //             },
  //           },
  //         },
  //       ];
  //     }
  //     if (type) {
  //       where_condition['type'] = type;
  //     }
  //     if (duration_start && duration_end) {
  //       // const diff = DateHelper.diff(duration_start, duration_end, 'day') + 1;
  //       // where_condition['duration'] = {
  //       //   gte: DateHelper.format(duration_start),
  //       //   lte: DateHelper.format(duration_end),
  //       // };
  //     }
  //     if (budget_start) {
  //       where_condition['price'] = {
  //         gte: Number(budget_start),
  //         // lte: Number(budget_end),
  //       };

  //       if (budget_end) {
  //         where_condition['price']['lte'] = Number(budget_end);
  //       }
  //     }

  //     if (ratings) {
  //       // if not array
  //       if (!Array.isArray(ratings)) {
  //         ratings = [ratings];
  //       }

  //       const minRating = Math.min(...ratings);
  //       const maxRating = Math.max(...ratings);

  //       where_condition['reviews'] = {
  //         some: {
  //           rating_value: {
  //             // in: ratings.map((rating) => Number(rating)),
  //             gte: minRating,
  //           },
  //         },
  //       };

  //       if (ratings.length > 1) {
  //         where_condition['reviews']['some']['rating_value']['lte'] = maxRating;
  //       }
  //     }

  //     if (free_cancellation) {
  //       // if not array
  //       if (!Array.isArray(free_cancellation)) {
  //         free_cancellation = [free_cancellation];
  //       }
  //       where_condition['cancellation_policy'] = {
  //         id: {
  //           in: free_cancellation,
  //         },
  //       };
  //     }

  //     if (destinations) {
  //       // if not array
  //       if (!Array.isArray(destinations)) {
  //         destinations = [destinations];
  //       }

  //       where_condition['package_destinations'] = {
  //         some: {
  //           destination_id: {
  //             in: destinations,
  //           },
  //         },
  //       };
  //     }

  //     if (languages) {
  //       if (!Array.isArray(languages)) {
  //         languages = [languages];
  //       }
  //       where_condition['package_languages'] = {
  //         some: {
  //           language_id: {
  //             in: languages,
  //           },
  //         },
  //       };
  //     }

  //     // cursor based pagination
  //     if (cursor) {
  //       // where_condition['id'] = {
  //       //   gt: cursor,
  //       // };
  //       query_condition['cursor'] = {
  //         id: cursor,
  //       };

  //       query_condition['skip'] = 1;
  //     }

  //     // offset based pagination
  //     if (page) {
  //       query_condition['skip'] = (page - 1) * limit;
  //     }

  //     if (limit) {
  //       query_condition['take'] = limit;
  //     }

  //     const packages = await this.prisma.package.findMany({
  //       where: {
  //         ...where_condition,
  //         status: 1,
  //         approved_at: {
  //           not: null,
  //         },
  //       },
  //       orderBy: {
  //         id: 'asc',
  //       },
  //       ...query_condition,
  //       select: {
  //         id: true,
  //         created_at: true,
  //         updated_at: true,
  //         user_id: true,
  //         name: true,
  //         description: true,
  //         price: true,
  //         duration: true,
  //         min_capacity: true,
  //         max_capacity: true,
  //         type: true,
  //         package_traveller_types: {
  //           select: {
  //             traveller_type: {
  //               select: {
  //                 id: true,
  //                 type: true,
  //               },
  //             },
  //           },
  //         },
  //         package_languages: {
  //           select: {
  //             language: {
  //               select: {
  //                 id: true,
  //                 name: true,
  //               },
  //             },
  //           },
  //         },
  //         reviews: {
  //           select: {
  //             id: true,
  //             rating_value: true,
  //             comment: true,
  //             user_id: true,
  //           },
  //         },
  //         package_destinations: {
  //           select: {
  //             destination: {
  //               select: {
  //                 id: true,
  //                 name: true,
  //                 country: {
  //                   select: {
  //                     id: true,
  //                     name: true,
  //                   },
  //                 },
  //               },
  //             },
  //           },
  //         },
  //         cancellation_policy: {
  //           select: {
  //             id: true,
  //             policy: true,
  //             description: true,
  //           },
  //         },
  //         package_files: {
  //           select: {
  //             id: true,
  //             file: true,
  //           },
  //         },
  //         package_trip_plans: {
  //           select: {
  //             id: true,
  //             title: true,
  //             description: true,
  //             package_trip_plan_images: {
  //               select: {
  //                 id: true,
  //                 image: true,
  //               },
  //             },
  //           },
  //         },
  //         package_tags: {
  //           select: {
  //             tag_id: true,
  //             type: true,
  //             tag: {
  //               select: {
  //                 id: true,
  //                 name: true,
  //               },
  //             },
  //           },
  //         },
  //       },
  //     });

  //     // add image url package_files
  //     if (packages && packages.length > 0) {
  //       for (const record of packages) {
  //         if (record.package_files) {
  //           for (const file of record.package_files) {
  //             file['file_url'] = SojebStorage.url(
  //               appConfig().storageUrl.package + file.file,
  //             );
  //           }
  //         }
  //       }
  //     }

  //     const pagination = {
  //       current_page: page,
  //       total_pages: Math.ceil(packages.length / limit),
  //       cursor: cursor,
  //     };

  //     return {
  //       success: true,
  //       pagination: pagination,
  //       data: packages,
  //     };
  //   } catch (error) {
  //     return {
  //       success: false,
  //       message: error.message,
  //     };
  //   }
  // }
  async findAll(
    filters?: {
      q?: string;
      type?: string;
      duration?: number;
      min_price?: number;
      max_price?: number;
      min_rating?: number;
      free_cancellation?: boolean;
      tag_id?: string;
      category_id?: string;
      destination_id?: string;
      country_id?: string;
      start_date?: string;
      end_date?: string;
      available_date?: string;
    },
    pagination?: {
      page?: number;
      limit?: number;
    },
  ) {
    try {
      const where_condition = {};
      // filter using vendor id if the package is from vendor
      // const userDetails = await UserRepository.getUserDetails(user_id);
      // if (userDetails && userDetails.type == 'vendor') {
      //   where_condition['user_id'] = user_id;
      // }

      // if (vendor_id) {
      //   where_condition['user_id'] = vendor_id;
      // }

      if (filters) {
        if (filters.q) {
          where_condition['name'] = {
            contains: filters.q,
            mode: 'insensitive',
          };
        }
        if (filters.type) {
          where_condition['type'] = filters.type;
        }
        if (filters.duration) {
          where_condition['duration'] = filters.duration;
        }
        if (filters.min_price || filters.max_price) {
          where_condition['final_price'] = {};
          if (filters.min_price) {
            where_condition['final_price']['gte'] = filters.min_price;
          }
          if (filters.max_price) {
            where_condition['final_price']['lte'] = filters.max_price;
          }
        }
        if (filters.free_cancellation !== undefined) {
          where_condition['cancellation_policy'] = {
            policy: filters.free_cancellation
              ? 'free_cancellation'
              : 'non_refundable',
          };
        }
        if (filters.category_id) {
          where_condition['package_categories'] = {
            some: {
              category_id: filters.category_id,
            },
          };
        }
        if (filters.tag_id) {
          where_condition['package_tags'] = {
            some: {
              tag_id: filters.tag_id,
            },
          };
        }
        if (filters.destination_id) {
          where_condition['package_destinations'] = {
            some: {
              destination_id: filters.destination_id,
            },
          };
        }
        if (filters.country_id) {
          where_condition['package_destinations'] = {
            some: {
              destination: {
                country: {
                  id: filters.country_id,
                },
              },
            },
          };
        }

        // Date filtering based on created_at
        if (filters.available_date) {
          const targetDate = new Date(filters.available_date);
          const startOfDay = new Date(targetDate);
          startOfDay.setHours(0, 0, 0, 0);

          const endOfDay = new Date(targetDate);
          endOfDay.setHours(23, 59, 59, 999);

          where_condition['created_at'] = {
            //gte: startOfDay,
            lte: endOfDay,
          };
        }
      }

      // Calculate pagination
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const skip = (page - 1) * limit;

      // Get total count for pagination
      const total = await this.prisma.package.count({
        where: { ...where_condition },
      });

      let packages = await this.prisma.package.findMany({
        where: {
          ...where_condition,
          status: 1,
          approved_at: {
            not: null,
          },
        },
        skip: skip,
        take: limit,
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          status: true,
          approved_at: true,
          user_id: true,
          name: true,
          description: true,
          price: true,
          price_type: true,
          discount_percent: true,
          discount_amount: true,
          final_price: true,
          duration: true,
          duration_type: true,
          min_adults: true,
          max_adults: true,
          min_children: true,
          max_children: true,
          min_infants: true,
          max_infants: true,
          type: true,
          user: {
            select: {
              id: true,
              name: true,
              type: true,
            },
          },
          package_languages: {
            select: {
              language: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          //   select: {
          //     id: true,
          //     available_date: true,
          //     start_date: true,
          //     end_date: true,
          //     available_slots: true,
          //     is_available: true,
          //   },
          // },
          package_destinations: {
            select: {
              destination: {
                select: {
                  id: true,
                  name: true,
                  country: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          cancellation_policy_id: true,
          cancellation_policy: {
            select: {
              id: true,
              policy: true,
              description: true,
            },
          },
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
          package_tags: {
            select: {
              tag: {
                select: {
                  id: true,
                  name: true,
                },
              },
              type: true,
            },
          },
          package_files: {
            select: {
              id: true,
              file: true,
            },
          },
          reviews: {
            select: {
              rating_value: true,
            },
          },
        },
      });

      // Process packages to add computed fields
      if (packages && packages.length > 0) {
        for (const record of packages) {
          // Add file URLs
          if (record.package_files) {
            for (const file of record.package_files) {
              file['file_url'] = SojebStorage.url(
                appConfig().storageUrl.package + file.file,
              );
            }
          }

          // Calculate average rating
          if (record.reviews && record.reviews.length > 0) {
            const totalRating = record.reviews.reduce(
              (sum, review) => sum + review.rating_value,
              0,
            );
            record['average_rating'] = totalRating / record.reviews.length;
            record['review_count'] = record.reviews.length;
          } else {
            record['average_rating'] = 0;
            record['review_count'] = 0;
          }

          // Remove reviews array as we've processed it
          delete record.reviews;
        }

        // Filter by rating if specified
        if (filters?.min_rating) {
          packages = packages.filter(
            (pkg: any) => pkg.average_rating >= filters.min_rating,
          );
        }
      }

      // Calculate pagination metadata
      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        success: true,
        data: packages,
        pagination: {
          page: page,
          limit: limit,
          total: total,
          totalPages: totalPages,
          hasNextPage: hasNextPage,
          hasPreviousPage: hasPreviousPage,
        },
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
      const where_condition = {};
      // filter using vendor id if the package is from vendor
      const userDetails = await UserRepository.getUserDetails(user_id);
      if (userDetails && userDetails.type == 'vendor') {
        where_condition['user_id'] = user_id;
      }

      const record = await this.prisma.package.findUnique({
        where: { id: id, ...where_condition },
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          status: true,
          approved_at: true,
          user_id: true,
          name: true,
          description: true,
          price: true,
          price_type: true,
          discount_percent: true,
          discount_amount: true,
          final_price: true,
          duration: true,
          duration_type: true,
          min_adults: true,
          max_adults: true,
          min_children: true,
          max_children: true,
          min_infants: true,
          max_infants: true,
          type: true,
          //   select: {
          //     id: true,
          //     available_date: true,
          //     start_date: true,
          //     end_date: true,
          //     available_slots: true,
          //     is_available: true,
          //   },
          // },
          package_languages: {
            select: {
              language: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          reviews: {
            select: {
              id: true,
              rating_value: true,
              comment: true,
              user_id: true,
            },
          },
          package_destinations: {
            select: {
              destination: {
                select: {
                  id: true,
                  name: true,
                  latitude: true,
                  longitude: true,
                  address: true,
                  country: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                },
              },
            },
          },
          cancellation_policy: {
            select: {
              id: true,
              policy: true,
              description: true,
            },
          },
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
          package_places: {
            select: {
              id: true,
              type: true,
              place: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
          package_additional_info: {
            select: {
              id: true,
              type: true,
              title: true,
              description: true,
              is_important: true,
              sort_order: true,
            },
            orderBy: {
              sort_order: 'asc',
            },
          },
          package_files: {
            select: {
              id: true,
              file: true,
            },
          },
          package_trip_plans: {
            select: {
              id: true,
              title: true,
              description: true,
              duration: true,
              duration_type: true,
              package_trip_plan_images: {
                select: {
                  id: true,
                  image: true,
                },
              },
              package_trip_plan_destinations: {
                select: {
                  destination: {
                    select: {
                      id: true,
                      name: true,
                      latitude: true,
                      longitude: true,
                    },
                  },
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
          package_extra_services: {
            select: {
              id: true,
              extra_service: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                },
              },
            },
          },
          package_traveller_types: {
            select: {
              traveller_type: {
                select: {
                  id: true,
                  type: true,
                },
              },
            },
          },
        },
      });

      if (!record) {
        return {
          success: false,
          message: 'Package not found',
        };
      }

      // add file url package_files
      if (record && record.package_files.length > 0) {
        for (const file of record.package_files) {
          if (file.file) {
            file['file_url'] = SojebStorage.url(
              appConfig().storageUrl.package + file.file,
            );
          }
        }
      }

      // add image url package_trip_plans
      if (record && record.package_trip_plans.length > 0) {
        for (const trip_plan of record.package_trip_plans) {
          if (trip_plan.package_trip_plan_images) {
            for (const image of trip_plan.package_trip_plan_images) {
              if (image.image) {
                image['image_url'] = SojebStorage.url(
                  appConfig().storageUrl.package + image.image,
                );
              }
            }
          }
        }
      }

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
      if (createReviewDto.booking_id) {
        data['booking_id'] = createReviewDto.booking_id;
      }

      // check if package exists
      const packageRecord = await this.prisma.package.findFirst({
        where: { id: package_id },
      });
      if (!packageRecord) {
        return {
          success: false,
          message: 'Package not found',
        };
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

      // notify the user that the package is reviewed
      await NotificationRepository.createNotification({
        sender_id: user_id,
        receiver_id: packageRecord.user_id,
        text: 'Your package has been reviewed',
        type: 'review',
        entity_id: package_id,
      });

      this.messageGateway.server.emit('notification', {
        sender_id: user_id,
        receiver_id: packageRecord.user_id,
        text: 'Your package has been reviewed',
        type: 'review',
        entity_id: package_id,
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

  async updateReview(
    package_id: string,
    review_id: string,
    user_id: string,
    updateReviewDto: UpdateReviewDto,
  ) {
    try {
      const data = {};
      if (updateReviewDto.rating_value) {
        data['rating_value'] = updateReviewDto.rating_value;
      }
      if (updateReviewDto.comment) {
        data['comment'] = updateReviewDto.comment;
      }

      // check if package exists
      const packageRecord = await this.prisma.package.findFirst({
        where: { id: package_id },
      });
      if (!packageRecord) {
        return {
          success: false,
          message: 'Package not found',
        };
      }

      // check if user has review
      const review = await this.prisma.review.findFirst({
        where: { user_id: user_id, package_id: package_id },
      });
      if (!review) {
        return {
          success: false,
          message: 'You have not reviewed this package',
        };
      }
      await this.prisma.review.update({
        where: { id: review_id },
        data: {
          ...data,
        },
      });

      // notify the user that the package is reviewed
      await NotificationRepository.createNotification({
        sender_id: user_id,
        receiver_id: packageRecord.user_id,
        text: 'Your package has been reviewed',
        type: 'review',
        entity_id: package_id,
      });

      this.messageGateway.server.emit('notification', {
        sender_id: user_id,
        receiver_id: packageRecord.user_id,
        text: 'Your package has been reviewed',
        type: 'review',
        entity_id: package_id,
      });

      return {
        success: true,
        message: 'Review updated successfully',
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
      // check if package exists
      const packageRecord = await this.prisma.package.findFirst({
        where: { id: package_id },
      });
      if (!packageRecord) {
        return {
          success: false,
          message: 'Package not found',
        };
      }

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
