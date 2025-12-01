import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import appConfig from '../../../config/app.config';
import { DateHelper } from '../../../common/helper/date.helper';
import { UserRepository } from '../../../common/repository/user/user.repository';
import { NotificationRepository } from '../../../common/repository/notification/notification.repository';
import { MessageGateway } from '../../../modules/chat/message/message.gateway';

@Injectable()
export class PackageService extends PrismaClient {
  constructor(
    private prisma: PrismaService,
    private readonly messageGateway: MessageGateway,
  ) {
    super();
  }

  private calculateFinalPrice(createPackageDto: CreatePackageDto): number {
    let finalPrice = createPackageDto.price;

    // Apply percentage discount first
    if (createPackageDto.discount_percent) {
      const discountAmount =
        (createPackageDto.price * createPackageDto.discount_percent) / 100;
      finalPrice = finalPrice - discountAmount;
    }

    // Apply fixed discount amount
    if (createPackageDto.discount_amount) {
      finalPrice = finalPrice - createPackageDto.discount_amount;
    }

    // Ensure final price is not negative
    return Math.max(0, finalPrice);
  }

  async create(
    user_id: string,
    createPackageDto: CreatePackageDto,
    files: Express.Multer.File[],
  ) {
    try {

      // Calculate final price
      const finalPrice = this.calculateFinalPrice(createPackageDto);

      const record = await this.prisma.package.create({
        data: {
          user_id: user_id,
          name: createPackageDto.name,
          description: createPackageDto.description,
          price: createPackageDto.price,
          price_type: createPackageDto.price_type || 'general',
          discount_percent: createPackageDto.discount_percent || null,
          discount_amount: createPackageDto.discount_amount || null,
          final_price: finalPrice,
          duration: createPackageDto.duration,
          duration_type: createPackageDto.duration_type,
          min_adults: createPackageDto.min_adults,
          max_adults: createPackageDto.max_adults,
          min_children: createPackageDto.min_children,
          max_children: createPackageDto.max_children,
          min_infants: createPackageDto.min_infants,
          max_infants: createPackageDto.max_infants,
          type: createPackageDto.type,
          region_type: createPackageDto.region_type,
          cancellation_policy_id: createPackageDto.cancellation_policy_id,
        },
      });

      // add package files to package
      const packageFiles = (files || []).filter((f) => f.fieldname === 'package_files');
      if (packageFiles && packageFiles.length > 0) {
        const package_files_data = packageFiles.map((file) => ({
          file: file.filename,
          file_alt: file.originalname,
          package_id: record.id,
          type: file.mimetype,
        }));
        await this.prisma.packageFile.createMany({
          data: package_files_data,
        });
      }

      // add trip plan to package
      if (createPackageDto.trip_plans) {
        const trip_plans = JSON.parse(createPackageDto.trip_plans);
        for (let index = 0; index < trip_plans.length; index++) {
          const trip_plan = trip_plans[index];
          const trip_plan_data = {
            title: trip_plan.title,
            description: trip_plan.description,
            duration: trip_plan.duration ? Number(trip_plan.duration) : null,
            duration_type: trip_plan.duration_type || null,
            package_id: record.id,
          };
          const trip_plan_record = await this.prisma.packageTripPlan.create({
            data: trip_plan_data,
          });
          if (trip_plan_record) {
            // add trip plan destinations if provided
            if (trip_plan.destinations && trip_plan.destinations.length > 0) {
              for (const destination of trip_plan.destinations) {
                await this.prisma.packageTripPlanDestination.create({
                  data: {
                    package_trip_plan_id: trip_plan_record.id,
                    destination_id: destination.id,
                  },
                });
              }
            }
            // trip plan details
            if (trip_plan.details && trip_plan.details.length > 0) {
              for (const detail of trip_plan.details) {
                await this.prisma.packageTripPlanDetails.create({
                  data: {
                    package_trip_plan_id: trip_plan_record.id,
                    title: detail.title,
                    description: detail.description,
                    time: detail.time,
                    notes: detail.notes,
                  },
                });
              }
            }
            // add trip plan images to this specific trip plan via field trip_plans_{index}_images
            const fieldName = `trip_plans_${index}_images`;
            const imagesForThisTrip = (files || []).filter((f) => f.fieldname === fieldName);
            if (imagesForThisTrip.length > 0) {
              const trip_plan_images_data = imagesForThisTrip.map((image) => ({
                image: image.filename,
                image_alt: image.originalname,
                package_trip_plan_id: trip_plan_record.id,
              }));
              await this.prisma.packageTripPlanImage.createMany({
                data: trip_plan_images_data,
              });
            }
          }
        }
      }

      // add extra services to package
      if (createPackageDto.extra_services) {
        const extra_services = JSON.parse(createPackageDto.extra_services);
        for (const extra_service of extra_services) {
          await this.prisma.packageExtraService.create({
            data: {
              package_id: record.id,
              extra_service_id: extra_service.id,
            },
          });
        }
      }

      // add destination to package
      if (createPackageDto.destinations) {
        const destinations = JSON.parse(createPackageDto.destinations);
        for (const destination of destinations) {
          const existing_destination =
            await this.prisma.packageDestination.findFirst({
              where: {
                destination_id: destination.id,
                package_id: record.id,
              },
            });
          if (!existing_destination) {
            await this.prisma.packageDestination.create({
              data: {
                destination_id: destination.id,
                package_id: record.id,
              },
            });
          }
        }
      }

      // add tag to included_packages
      if (createPackageDto.included_packages) {
        const included_packages = JSON.parse(
          createPackageDto.included_packages,
        );
        for (const tag of included_packages) {
          const existing_tag = await this.prisma.packageTag.findFirst({
            where: {
              tag_id: tag.id,
              package_id: record.id,
              type: 'included',
            },
          });
          if (!existing_tag) {
            await this.prisma.packageTag.create({
              data: {
                tag_id: tag.id,
                package_id: record.id,
                type: 'included',
              },
            });
          }
        }
      }

      // add traveller_type to package
      if (createPackageDto.traveller_types) {
        const traveller_types = JSON.parse(createPackageDto.traveller_types);
        for (const traveller_type of traveller_types) {
          const existing_traveller_type =
            await this.prisma.packageTravellerType.findFirst({
              where: {
                package_id: record.id,
                traveller_type_id: traveller_type.id,
              },
            });
          if (!existing_traveller_type) {
            await this.prisma.packageTravellerType.create({
              data: {
                package_id: record.id,
                traveller_type_id: traveller_type.id,
              },
            });
          }
        }
      }

      // add language to package
      if (createPackageDto.languages) {
        const languages = JSON.parse(createPackageDto.languages);
        for (const language of languages) {
          const existing_language = await this.prisma.packageLanguage.findFirst(
            {
              where: {
                language_id: language.id,
                package_id: record.id,
              },
            },
          );
          if (!existing_language) {
            await this.prisma.packageLanguage.create({
              data: {
                language_id: language.id,
                package_id: record.id,
              },
            });
          }
        }
      }

      // add tag to excluded_packages
      if (createPackageDto.excluded_packages) {
        const excluded_packages = JSON.parse(
          createPackageDto.excluded_packages,
        );
        for (const tag of excluded_packages) {
          const existing_tag = await this.prisma.packageTag.findFirst({
            where: {
              tag_id: tag.id,
              package_id: record.id,
              type: 'excluded',
            },
          });
          if (!existing_tag) {
            await this.prisma.packageTag.create({
              data: {
                tag_id: tag.id,
                package_id: record.id,
                type: 'excluded',
              },
            });
          }
        }
      }
      // add category to package
      if (createPackageDto.package_category) {
        // const package_category = JSON.parse(createPackageDto.package_category);
        // for (const category of package_category) {
        //   await this.prisma.packageCategory.create({
        //     data: {
        //       category_id: category.id,
        //       package_id: record.id,
        //     },
        //   });
        // }
        // check if category exists
        const category = await this.prisma.category.findUnique({
          where: {
            id: createPackageDto.package_category,
          },
        });

        if (!category) {
          return {
            success: false,
            message: 'Category not found',
          };
        }

        await this.prisma.packageCategory.create({
          data: {
            category_id: category.id,
            package_id: record.id,
          },
        });
      }



      // Create package places if provided
      if (createPackageDto.package_places) {
        const package_places = JSON.parse(createPackageDto.package_places);
        for (const package_place of package_places) {
          await this.prisma.packagePlace.create({
            data: {
              package: { connect: { id: record.id } },
              place: package_place.place_id
                ? { connect: { id: package_place.place_id } }
                : undefined,
              type: package_place.type || 'meeting_point',
            },
          });
        }
      }

      // Create package additional information if provided
      if (createPackageDto.package_additional_info) {
        const package_additional_info = JSON.parse(createPackageDto.package_additional_info);
        for (const additional_info of package_additional_info) {
          const infoData = {
            package_id: record.id,
            type: additional_info.type || 'general',
            title: additional_info.title,
            description: additional_info.description,
            is_important: additional_info.is_important !== undefined ? additional_info.is_important : false,
            sort_order: additional_info.sort_order ? Number(additional_info.sort_order) : 0,
          };

          await this.prisma.packageAdditionalInfo.create({
            data: infoData,
          });
        }
      }

      // Create PackageAvailability for package or cruise types
      if (createPackageDto.type === 'package' || createPackageDto.type === 'cruise') {
        await this.createPackageAvailability(record.id, createPackageDto);
      }

      const userDetails = await UserRepository.getUserDetails(user_id);
      if (userDetails && userDetails.type != 'admin') {
        // notify the admin that the package is created
        await NotificationRepository.createNotification({
          sender_id: user_id,
          text: 'Package has been created',
          type: 'package',
          entity_id: record.id,
        });

        this.messageGateway.server.emit('notification', {
          sender_id: user_id,
          text: 'Package has been created',
          type: 'package',
          entity_id: record.id,
        });
      }

      return {
        success: true,
        message: 'Package created successfully',
        data: record,
      };
    } catch (error) {
      // delete any uploaded files from storage on error
      if (files && files.length > 0) {
        for (const f of files) {
          await SojebStorage.delete(appConfig().storageUrl.package + f.filename);
        }
      }

      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findAll(
    user_id?: string,
    vendor_id?: string,
    filters?: {
      q?: string;
      type?: string;
    },
    pagination?: {
      page?: number;
      limit?: number;
    },
  ) {
    try {
      const where_condition = {};
      // filter using vendor id if the package is from vendor
      const userDetails = await UserRepository.getUserDetails(user_id);
      if (userDetails && userDetails.type == 'vendor') {
        where_condition['user_id'] = user_id;
      }

      if (vendor_id) {
        where_condition['user_id'] = vendor_id;
      }

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
      }

      // Calculate pagination
      const page = pagination?.page || 1;
      const limit = pagination?.limit || 10;
      const skip = (page - 1) * limit;

      // Get total count for pagination
      const total = await this.prisma.package.count({
        where: { ...where_condition },
      });

      const packages = await this.prisma.package.findMany({
        where: {
          ...where_condition,
          rejected_at: null,
        },
        skip: skip,
        take: limit,
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          status: true,
          approved_at: true,
          rejected_at: true,
          user_id: true,
          name: true,
          description: true,
          price: true,
          price_type: true,
          discount_percent: true,
          discount_amount: true,
          final_price: true,
          duration: true,
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
          package_availabilities: {
            select: {
              id: true,
              start_date: true,
              end_date: true,
              is_available: true,
              available_slots: true,
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
          rejected_at: true,
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
              review_files: {
                select: {
                  id: true,
                  file: true,
                },
              },
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
                  latitude: true,
                  longitude: true,
                  description: true,
                  address: true,
                  type: true,
                  city: true,
                  country: true,
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
              package_trip_plan_details: {
                select: {
                  id: true,
                  title: true,
                  description: true,
                  time: true,
                  notes: true,
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
          package_availabilities: {
            select: {
              id: true,
              start_date: true,
              end_date: true,
              is_available: true,
              available_slots: true,
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              email: true,
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

      // add file url review_files
      if (record && record.reviews && record.reviews.length > 0) {
        for (const review of record.reviews) {
          if (review.review_files) {
            for (const file of review.review_files) {
              file['review_file_url'] = SojebStorage.url(
                appConfig().storageUrl.review + file.file,
              );
            }
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

  async update(
    id: string,
    user_id: string,
    updatePackageDto: UpdatePackageDto,
    files: Express.Multer.File[],
  ) {
    try {
      console.log(updatePackageDto);
      const data: any = {};
      if (updatePackageDto.name !== undefined) {
        data.name = updatePackageDto.name;
      }
      if (updatePackageDto.description !== undefined) {
        data.description = updatePackageDto.description;
      }
      if (updatePackageDto.price !== undefined) {
        data.price = updatePackageDto.price;
      }
      if (updatePackageDto.duration !== undefined) {
        data.duration = updatePackageDto.duration !== null ? Number(updatePackageDto.duration) : null;
      }
      if (updatePackageDto.duration_type !== undefined) {
        data.duration_type = updatePackageDto.duration_type;
      }
      if (updatePackageDto.type !== undefined) {
        data.type = updatePackageDto.type;
      }
      if (updatePackageDto.min_adults !== undefined) {
        data.min_adults = updatePackageDto.min_adults !== null ? Number(updatePackageDto.min_adults) : null;
      }
      if (updatePackageDto.max_adults !== undefined) {
        data.max_adults = updatePackageDto.max_adults !== null ? Number(updatePackageDto.max_adults) : null;
      }
      if (updatePackageDto.min_children !== undefined) {
        data.min_children = updatePackageDto.min_children !== null ? Number(updatePackageDto.min_children) : null;
      }
      if (updatePackageDto.max_children !== undefined) {
        data.max_children = updatePackageDto.max_children !== null ? Number(updatePackageDto.max_children) : null;
      }
      if (updatePackageDto.min_infants !== undefined) {
        data.min_infants = updatePackageDto.min_infants !== null ? Number(updatePackageDto.min_infants) : null;
      }
      if (updatePackageDto.max_infants !== undefined) {
        data.max_infants = updatePackageDto.max_infants !== null ? Number(updatePackageDto.max_infants) : null;
      }
      if (updatePackageDto.cancellation_policy_id !== undefined) {
        data.cancellation_policy_id = updatePackageDto.cancellation_policy_id;
      }

      // existing package record
      const existing_package = await this.prisma.package.findUnique({
        where: { id: id },
        include: {
          package_files: true,
        },
      });

      if (!existing_package) {
        return {
          success: false,
          message: 'Package not found',
        };
      }

      const where_condition = {};
      // filter using vendor id if the package is from vendor
      const userDetails = await UserRepository.getUserDetails(user_id);
      if (userDetails && userDetails.type == 'vendor') {
        where_condition['user_id'] = user_id;
      }

      const record = await this.prisma.package.update({
        where: { id: id, ...where_condition },
        data: {
          ...data,
          updated_at: DateHelper.now(),
          rejected_at: null,
        },
      });
      // delete package images which is not included in updatePackageDto.package_files
      const package_files = (files || []).filter((f) => f.fieldname === 'package_files');
      if (package_files && package_files.length > 0) {
        // old package files
        if (existing_package && existing_package.package_files.length > 0) {
          const old_package_files = await this.prisma.packageFile.findMany({
            where: { package_id: record.id },
          });

          // delete old package file that are not in the new package files
          for (const old_package_file of old_package_files) {
            if (!package_files.some((pi) => pi.filename == old_package_file.file)) {
              await SojebStorage.delete(
                appConfig().storageUrl.package + old_package_file.file,
              );
              await this.prisma.packageFile.delete({
                where: { id: old_package_file.id, package_id: record.id },
              });
            }
          }
        }
      }

      // add package images to package
      if (package_files && package_files.length > 0) {
        const package_files_data = package_files.map((file) => ({
          file: file.filename,
          file_alt: file.originalname,
          package_id: record.id,
          type: file.mimetype,
        }));
        await this.prisma.packageFile.createMany({
          data: package_files_data,
        });
      }

      // delete trip plans which is not included in updatePackageDto.trip_plans
      if (updatePackageDto.trip_plans) {
        const trip_plans = JSON.parse(updatePackageDto.trip_plans);
        // compare trip plans with old trip plans
        const old_trip_plans = await this.prisma.packageTripPlan.findMany({
          where: { package_id: record.id },
        });
        // delete old trip plans with images that are not in the new trip plans
        for (const old_trip_plan of old_trip_plans) {
          if (!trip_plans.some((tp) => tp.id == old_trip_plan.id)) {
            await this.prisma.packageTripPlan.delete({
              where: { id: old_trip_plan.id },
            });
            // delete old trip plan images from storage
            const trip_plan_images =
              await this.prisma.packageTripPlanImage.findMany({
                where: { package_trip_plan_id: old_trip_plan.id },
              });
            for (const image of trip_plan_images) {
              await SojebStorage.delete(
                appConfig().storageUrl.package + image.image,
              );
            }
            // delete old trip plan images from database
            await this.prisma.packageTripPlanImage.deleteMany({
              where: { package_trip_plan_id: old_trip_plan.id },
            });
          }
        }

        // add new trip plans to package
        for (let index = 0; index < trip_plans.length; index++) {
          const trip_plan = trip_plans[index];
          const trip_plan_data = {
            title: trip_plan.title,
            description: trip_plan.description,
            duration: trip_plan.duration ? Number(trip_plan.duration) : null,
            duration_type: trip_plan.duration_type || null,
            package_id: record.id,
          };
          if (trip_plan.id == null) {
            const trip_plan_record = await this.prisma.packageTripPlan.create({
              data: trip_plan_data,
            });
            if (trip_plan_record) {
              // add trip plan destinations if provided
              if (trip_plan.destinations && trip_plan.destinations.length > 0) {
                for (const destination of trip_plan.destinations) {
                  await this.prisma.packageTripPlanDestination.create({
                    data: {
                      package_trip_plan_id: trip_plan_record.id,
                      destination_id: destination.id,
                    },
                  });
                }
              }

              // add trip plan images to this new trip plan via field trip_plans_{index}_images
              const fieldName = `trip_plans_${index}_images`;
              const imagesForThisTrip = (files || []).filter((f) => f.fieldname === fieldName);
              if (imagesForThisTrip.length > 0) {
                const trip_plan_images_data = imagesForThisTrip.map((image) => ({
                  image: image.filename,
                  image_alt: image.originalname,
                  package_trip_plan_id: trip_plan_record.id,
                }));
                await this.prisma.packageTripPlanImage.createMany({
                  data: trip_plan_images_data,
                });
              }
            }
          } else {
            // update trip plan
            await this.prisma.packageTripPlan.update({
              where: { id: trip_plan.id },
              data: trip_plan_data,
            });

            // Update trip plan destinations if provided
            if (trip_plan.destinations && trip_plan.destinations.length > 0) {
              // Delete existing trip plan destinations
              await this.prisma.packageTripPlanDestination.deleteMany({
                where: { package_trip_plan_id: trip_plan.id },
              });

              // Create new trip plan destinations
              for (const destination of trip_plan.destinations) {
                await this.prisma.packageTripPlanDestination.create({
                  data: {
                    package_trip_plan_id: trip_plan.id,
                    destination_id: destination.id,
                  },
                });
              }
            }

            // Update trip plan details if provided
            if (trip_plan.details && trip_plan.details.length > 0) {
              // Delete existing trip plan details
              await this.prisma.packageTripPlanDetails.deleteMany({
                where: { package_trip_plan_id: trip_plan.id },
              });

              // Create new trip plan details
              for (const detail of trip_plan.details) {
                await this.prisma.packageTripPlanDetails.create({
                  data: {
                    package_trip_plan_id: trip_plan.id,
                    title: detail.title,
                    description: detail.description,
                    time: detail.time,
                    notes: detail.notes,
                  },
                });
              }
            }

            // delete old trip plan images from storage which is not in the new trip plans
            const old_trip_plan_images =
              await this.prisma.packageTripPlanImage.findMany({
                where: { package_trip_plan_id: trip_plan.id },
              });
            for (const image of old_trip_plan_images) {
              const trip_plans_images = JSON.parse(
                updatePackageDto.trip_plans_images,
              );
              if (!trip_plans_images.some((tp) => tp.id == image.id)) {
                await SojebStorage.delete(
                  appConfig().storageUrl.package + image.image,
                );
                await this.prisma.packageTripPlanImage.delete({
                  where: {
                    id: image.id,
                    package_trip_plan_id: trip_plan.id,
                  },
                });
              }
            }

            // add new images to existing trip plan via field trip_plans_{index}_images
            const fieldName = `trip_plans_${index}_images`;
            const imagesForThisTrip = (files || []).filter((f) => f.fieldname === fieldName);
            if (imagesForThisTrip.length > 0) {
              const trip_plan_images_data = imagesForThisTrip.map((image) => ({
                image: image.filename,
                image_alt: image.originalname,
                package_trip_plan_id: trip_plan.id,
              }));
              await this.prisma.packageTripPlanImage.createMany({
                data: trip_plan_images_data,
              });
            }
          }
        }
      }

      // add tag to included_packages. check if tag already exists in package_tags table
      if (updatePackageDto.included_packages) {
        const included_packages = JSON.parse(
          updatePackageDto.included_packages,
        );
        for (const tag of included_packages) {
          const existing_tag = await this.prisma.packageTag.findFirst({
            where: {
              tag_id: tag.id,
              package_id: record.id,
              type: 'included',
            },
          });
          if (!existing_tag) {
            await this.prisma.packageTag.create({
              data: {
                tag_id: tag.id,
                package_id: record.id,
                type: 'included',
              },
            });
          }
        }
      }

      // add tag to excluded_packages. check if tag already exists in package_tags table
      if (updatePackageDto.excluded_packages) {
        const excluded_packages = JSON.parse(
          updatePackageDto.excluded_packages,
        );
        for (const tag of excluded_packages) {
          const existing_tag = await this.prisma.packageTag.findFirst({
            where: {
              tag_id: tag.id,
              package_id: record.id,
              type: 'excluded',
            },
          });
          if (!existing_tag) {
            await this.prisma.packageTag.create({
              data: {
                tag_id: tag.id,
                package_id: record.id,
                type: 'excluded',
              },
            });
          }
        }
      }

      // add traveller_type to package
      if (updatePackageDto.traveller_types) {
        const traveller_types = JSON.parse(updatePackageDto.traveller_types);
        for (const traveller_type of traveller_types) {
          const existing_traveller_type =
            await this.prisma.packageTravellerType.findFirst({
              where: {
                package_id: record.id,
                traveller_type_id: traveller_type.id,
              },
            });
          if (!existing_traveller_type) {
            await this.prisma.packageTravellerType.create({
              data: {
                package_id: record.id,
                traveller_type_id: traveller_type.id,
              },
            });
          }
        }
      }

      // add category to package
      if (updatePackageDto.package_category) {
        // const package_category = JSON.parse(createPackageDto.package_category);
        // for (const category of package_category) {
        //   await this.prisma.packageCategory.create({
        //     data: {
        //       category_id: category.id,
        //       package_id: record.id,
        //     },
        //   });
        // }
        // check if category exists
        const category = await this.prisma.category.findUnique({
          where: {
            id: updatePackageDto.package_category,
          },
        });

        if (!category) {
          return {
            success: false,
            message: 'Category not found',
          };
        }

        // check if package category already exists
        const existing_package_category =
          await this.prisma.packageCategory.findMany({
            where: {
              package_id: record.id,
            },
          });

        if (existing_package_category && existing_package_category.length > 0) {
          // delete existing package category
          await this.prisma.packageCategory.deleteMany({
            where: {
              package_id: record.id,
            },
          });
        }

        await this.prisma.packageCategory.create({
          data: {
            category_id: category.id,
            package_id: record.id,
          },
        });
      }

      // add extra services to package
      if (updatePackageDto.extra_services) {
        const extra_services = JSON.parse(updatePackageDto.extra_services);
        // delete old extra services
        await this.prisma.packageExtraService.deleteMany({
          where: { package_id: record.id },
        });
        for (const extra_service of extra_services) {
          await this.prisma.packageExtraService.create({
            data: {
              package_id: record.id,
              extra_service_id: extra_service.id,
            },
          });
        }
      }

      // add language to package
      if (updatePackageDto.languages) {
        const languages = JSON.parse(updatePackageDto.languages);
        for (const language of languages) {
          const existing_language = await this.prisma.packageLanguage.findFirst(
            {
              where: {
                language_id: language.id,
                package_id: record.id,
              },
            },
          );
          if (!existing_language) {
            await this.prisma.packageLanguage.create({
              data: {
                language_id: language.id,
                package_id: record.id,
              },
            });
          }
        }
      }

      // add destination to package
      if (updatePackageDto.destinations) {
        const destinations = JSON.parse(updatePackageDto.destinations);
        for (const destination of destinations) {
          const existing_destination =
            await this.prisma.packageDestination.findFirst({
              where: {
                destination_id: destination.id,
                package_id: record.id,
              },
            });
          if (!existing_destination) {
            await this.prisma.packageDestination.create({
              data: {
                destination_id: destination.id,
                package_id: record.id,
              },
            });
          }
        }
      }

      // Update package places if provided
      if (updatePackageDto.package_places) {
        const package_places = JSON.parse(updatePackageDto.package_places);

        // Delete existing package places
        await this.prisma.packagePlace.deleteMany({
          where: { package_id: record.id },
        });

        // Create new package places
        for (const package_place of package_places) {
          await this.prisma.packagePlace.create({
            data: {
              package: { connect: { id: record.id } },
              place: package_place.place_id
                ? { connect: { id: package_place.place_id } }
                : undefined,
              type: package_place.type || 'meeting_point',
            },
          });
        }
      }

      // Update package additional information if provided
      if (updatePackageDto.package_additional_info) {
        const package_additional_info = JSON.parse(updatePackageDto.package_additional_info);

        // Delete existing additional information
        await this.prisma.packageAdditionalInfo.deleteMany({
          where: { package_id: record.id },
        });

        // Create new additional information
        for (const additional_info of package_additional_info) {
          const infoData = {
            package_id: record.id,
            type: additional_info.type || 'general',
            title: additional_info.title,
            description: additional_info.description,
            is_important: additional_info.is_important !== undefined ? additional_info.is_important : false,
            sort_order: additional_info.sort_order ? Number(additional_info.sort_order) : 0,
          };

          await this.prisma.packageAdditionalInfo.create({
            data: infoData,
          });
        }
      }

      return {
        success: true,
        message: 'Package updated successfully',
      };
    } catch (error) {
      // delete any uploaded files from storage on error
      if (files && files.length > 0) {
        for (const f of files) {
          await SojebStorage.delete(appConfig().storageUrl.package + f.filename);
        }
      }

      return {
        success: false,
        message: error.message,
      };
    }
  }

  async updateStatus(id: string, status: number, user_id: string) {
    try {
      const where_condition = {};
      // filter using vendor id if the package is from vendor
      const userDetails = await UserRepository.getUserDetails(user_id);
      if (userDetails && userDetails.type == 'vendor') {
        where_condition['user_id'] = user_id;
      }

      const record = await this.prisma.package.findUnique({
        where: { id, ...where_condition },
      });

      if (!record) {
        return {
          success: false,
          message: 'Package not found',
        };
      }

      await this.prisma.package.update({
        where: { id, ...where_condition },
        data: { status: status },
      });

      return {
        success: true,
        message: 'Package status updated successfully',
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
      const record = await this.prisma.package.findUnique({
        where: { id },
      });
      if (!record) {
        return {
          success: false,
          message: 'Package not found',
        };
      }
      await this.prisma.package.update({
        where: { id },
        data: { approved_at: new Date(), rejected_at: null },
      });
      return {
        success: true,
        message: 'Package approved successfully',
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
      const record = await this.prisma.package.findUnique({
        where: { id },
      });
      if (!record) {
        return {
          success: false,
          message: 'Package not found',
        };
      }
      await this.prisma.package.update({
        where: { id },
        data: { approved_at: null, rejected_at: new Date() },
      });
      return {
        success: true,
        message: 'Package rejected successfully',
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
      const result = await this.prisma.$transaction(async (prisma) => {
        // delete tags
        await prisma.packageTag.deleteMany({ where: { package_id: id } });
        // delete categories
        await prisma.packageCategory.deleteMany({ where: { package_id: id } });

        // delete trip plans images
        const trip_plans = await prisma.packageTripPlan.findMany({
          where: { package_id: id },
        });
        for (const trip_plan of trip_plans) {
          const trip_plan_images = await prisma.packageTripPlanImage.findMany({
            where: { package_trip_plan_id: trip_plan.id },
          });
          for (const image of trip_plan_images) {
            await SojebStorage.delete(
              appConfig().storageUrl.package + image.image,
            );
          }
          await prisma.packageTripPlanImage.deleteMany({
            where: { package_trip_plan_id: trip_plan.id },
          });
        }
        await prisma.packageTripPlan.deleteMany({
          where: { package_id: id },
        });

        // Delete package images and package
        const packageFiles = await prisma.packageFile.findMany({
          where: { package_id: id },
        });
        for (const file of packageFiles) {
          await SojebStorage.delete(appConfig().storageUrl.package + file.file);
        }

        await prisma.package.delete({ where: { id: id } });

        return {
          success: true,
          message: 'Package deleted successfully',
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

  private async createPackageAvailability(packageId: string, createPackageDto: CreatePackageDto) {
    try {
      // Check if package_availability data is provided
      if (createPackageDto.package_availability) {
        const availabilityData = JSON.parse(createPackageDto.package_availability);

        for (const availability of availabilityData) {
          const availabilityRecord = {
            package_id: packageId,
            start_date: availability.start_date ? new Date(availability.start_date) : null,
            end_date: availability.end_date ? new Date(availability.end_date) : null,
            is_available: availability.is_available !== undefined ? availability.is_available : true,
            available_slots: availability.available_slots || 10,
          };

          await this.prisma.packageAvailability.create({
            data: availabilityRecord,
          });
        }
      } else {
        // Create default availability if no specific data provided
        // For packages/cruises, create availability for the next 365 days
        const today = new Date();
        const oneYearFromNow = new Date();
        oneYearFromNow.setFullYear(today.getFullYear() + 1);

        await this.prisma.packageAvailability.create({
          data: {
            package_id: packageId,
            start_date: today,
            end_date: oneYearFromNow,
            is_available: true,
            available_slots: 999,
          },
        });
      }
    } catch (error) {
      console.error('Error creating package availability:', error);
      // Don't throw error to avoid breaking package creation
    }
  }
}
