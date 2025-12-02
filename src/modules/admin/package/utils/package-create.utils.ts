import { PrismaService } from '../../../../prisma/prisma.service';
import { CreatePackageDto } from '../dto/create-package.dto';

export class PackageCreateUtils {
  static async createPackageFiles(
    prisma: PrismaService,
    packageId: string,
    files: Express.Multer.File[],
  ) {
    try {
      const packageFiles = (files || []).filter((f) => f.fieldname === 'package_files');
      if (packageFiles && packageFiles.length > 0) {
        const package_files_data = packageFiles.map((file) => ({
          file: file.filename,
          file_alt: file.originalname,
          package_id: packageId,
          type: file.mimetype,
        }));
        await prisma.packageFile.createMany({
          data: package_files_data,
        });
      }
    } catch (error) {
      console.error('Error creating package files:', error);
    }
  }

  static async createTripPlans(
    prisma: PrismaService,
    packageId: string,
    createPackageDto: CreatePackageDto,
    files: Express.Multer.File[],
  ) {
    try {
      if (createPackageDto.trip_plans) {
        const trip_plans = JSON.parse(createPackageDto.trip_plans);
        for (let index = 0; index < trip_plans.length; index++) {
          const trip_plan = trip_plans[index];
          const trip_plan_data = {
            title: trip_plan.title,
            description: trip_plan.description,
            duration: trip_plan.duration ? Number(trip_plan.duration) : null,
            duration_type: trip_plan.duration_type || null,
            package_id: packageId,
          };
          const trip_plan_record = await prisma.packageTripPlan.create({
            data: trip_plan_data,
          });
          if (trip_plan_record) {
            // add trip plan destinations if provided
            if (trip_plan.destinations && trip_plan.destinations.length > 0) {
              for (const destination of trip_plan.destinations) {
                await prisma.packageTripPlanDestination.create({
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
                await prisma.packageTripPlanDetails.create({
                  data: {
                    package_trip_plan_id: trip_plan_record.id,
                    title: detail.title,
                    description: detail.description,
                    time: PackageCreateUtils.parseDetailTime(detail.time),
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
              await prisma.packageTripPlanImage.createMany({
                data: trip_plan_images_data,
              });
            }
          }
        }
      }
    } catch (error) {
      console.error('Error creating trip plans:', error);
    }
  }

  static async createExtraServices(
    prisma: PrismaService,
    packageId: string,
    createPackageDto: CreatePackageDto,
  ) {
    try {
      if (createPackageDto.extra_services) {
        const extra_services = JSON.parse(createPackageDto.extra_services);
        for (const extra_service of extra_services) {
          await prisma.packageExtraService.create({
            data: {
              package_id: packageId,
              extra_service_id: extra_service.id,
            },
          });
        }
      }
    } catch (error) {
      console.error('Error creating extra services:', error);
    }
  }

  static async createDestinations(
    prisma: PrismaService,
    packageId: string,
    createPackageDto: CreatePackageDto,
  ) {
    try {
      if (createPackageDto.destinations) {
        const destinations = JSON.parse(createPackageDto.destinations);
        for (const destination of destinations) {
          const existing_destination =
            await prisma.packageDestination.findFirst({
              where: {
                destination_id: destination.id,
                package_id: packageId,
              },
            });
          if (!existing_destination) {
            await prisma.packageDestination.create({
              data: {
                destination_id: destination.id,
                package_id: packageId,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error('Error creating destinations:', error);
    }
  }

  static async createIncludedTags(
    prisma: PrismaService,
    packageId: string,
    createPackageDto: CreatePackageDto,
  ) {
    try {
      if (createPackageDto.included_packages) {
        const included_packages = JSON.parse(
          createPackageDto.included_packages,
        );
        for (const tag of included_packages) {
          const existing_tag = await prisma.packageTag.findFirst({
            where: {
              tag_id: tag.id,
              package_id: packageId,
              type: 'included',
            },
          });
          if (!existing_tag) {
            await prisma.packageTag.create({
              data: {
                tag_id: tag.id,
                package_id: packageId,
                type: 'included',
              },
            });
          }
        }
      }
    } catch (error) {
      console.error('Error creating included tags:', error);
    }
  }

  static async createExcludedTags(
    prisma: PrismaService,
    packageId: string,
    createPackageDto: CreatePackageDto,
  ) {
    try {
      if (createPackageDto.excluded_packages) {
        const excluded_packages = JSON.parse(
          createPackageDto.excluded_packages,
        );
        for (const tag of excluded_packages) {
          const existing_tag = await prisma.packageTag.findFirst({
            where: {
              tag_id: tag.id,
              package_id: packageId,
              type: 'excluded',
            },
          });
          if (!existing_tag) {
            await prisma.packageTag.create({
              data: {
                tag_id: tag.id,
                package_id: packageId,
                type: 'excluded',
              },
            });
          }
        }
      }
    } catch (error) {
      console.error('Error creating excluded tags:', error);
    }
  }

  static async createTravellerTypes(
    prisma: PrismaService,
    packageId: string,
    createPackageDto: CreatePackageDto,
  ) {
    try {
      if (createPackageDto.traveller_types) {
        const traveller_types = JSON.parse(createPackageDto.traveller_types);
        for (const traveller_type of traveller_types) {
          const existing_traveller_type =
            await prisma.packageTravellerType.findFirst({
              where: {
                package_id: packageId,
                traveller_type_id: traveller_type.id,
              },
            });
          if (!existing_traveller_type) {
            await prisma.packageTravellerType.create({
              data: {
                package_id: packageId,
                traveller_type_id: traveller_type.id,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error('Error creating traveller types:', error);
    }
  }

  static async createLanguages(
    prisma: PrismaService,
    packageId: string,
    createPackageDto: CreatePackageDto,
  ) {
    try {
      if (createPackageDto.languages) {
        const languages = JSON.parse(createPackageDto.languages);
        for (const language of languages) {
          const existing_language = await prisma.packageLanguage.findFirst(
            {
              where: {
                language_id: language.id,
                package_id: packageId,
              },
            },
          );
          if (!existing_language) {
            await prisma.packageLanguage.create({
              data: {
                language_id: language.id,
                package_id: packageId,
              },
            });
          }
        }
      }
    } catch (error) {
      console.error('Error creating languages:', error);
    }
  }

  static async createCategory(
    prisma: PrismaService,
    packageId: string,
    createPackageDto: CreatePackageDto,
  ) {
    try {
      if (createPackageDto.package_category) {
        // check if category exists
        const category = await prisma.category.findUnique({
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

        await prisma.packageCategory.create({
          data: {
            category_id: category.id,
            package_id: packageId,
          },
        });
      }
      return { success: true };
    } catch (error) {
      console.error('Error creating category:', error);
      return {
        success: false,
        message: error.message,
      };
    }
  }

  static async createPackagePlaces(
    prisma: PrismaService,
    packageId: string,
    createPackageDto: CreatePackageDto,
  ) {
    try {
      if (createPackageDto.package_places) {
        const package_places = JSON.parse(createPackageDto.package_places);
        for (const package_place of package_places) {
          await prisma.packagePlace.create({
            data: {
              package: { connect: { id: packageId } },
              place: package_place.place_id
                ? { connect: { id: package_place.place_id } }
                : undefined,
              type: package_place.type || 'meeting_point',
            },
          });
        }
      }
    } catch (error) {
      console.error('Error creating package places:', error);
    }
  }

  static async createAdditionalInfo(
    prisma: PrismaService,
    packageId: string,
    createPackageDto: CreatePackageDto,
  ) {
    try {
      if (createPackageDto.package_additional_info) {
        const package_additional_info = JSON.parse(createPackageDto.package_additional_info);
        for (const additional_info of package_additional_info) {
          const infoData = {
            package_id: packageId,
            type: additional_info.type || 'general',
            title: additional_info.title,
            description: additional_info.description,
            is_important: additional_info.is_important !== undefined ? additional_info.is_important : false,
            sort_order: additional_info.sort_order ? Number(additional_info.sort_order) : 0,
          };

          await prisma.packageAdditionalInfo.create({
            data: infoData,
          });
        }
      }
    } catch (error) {
      console.error('Error creating additional info:', error);
    }
  }

  static async createPackageAvailability(
    prisma: PrismaService,
    packageId: string,
    createPackageDto: CreatePackageDto,
  ) {
    try {
      // Check if package_availability data is provided
      if (createPackageDto.package_availability) {
        const availabilityData = JSON.parse(createPackageDto.package_availability);

        for (const availability of availabilityData) {
          const availabilityRecord = {
            package_id: packageId,
            start_date: availability.start_date ? new Date(availability.start_date) : null,
            end_date: availability.end_date ? new Date(availability.end_date) : null,
            duration: availability.duration ? Number(availability.duration) : null,
            duration_type: availability.duration_type || null,
            is_available: availability.is_available !== undefined ? availability.is_available : true,
            available_slots: availability.available_slots || 10,
          };

          await prisma.packageAvailability.create({
            data: availabilityRecord,
          });
        }
      } else {
        // Create default availability if no specific data provided
        // For packages/cruises, create availability for the next 365 days
        const today = new Date();

        await prisma.packageAvailability.create({
          data: {
            package_id: packageId,
            start_date: today,
            duration: 1,
            duration_type: 'day',
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

  static parseDetailTime(
    value: string | number | null | undefined,
  ): number | null {
    if (value === null || value === undefined || value === '') {
      return null;
    }

    if (typeof value === 'number' && !isNaN(value)) {
      return value;
    }

    if (typeof value === 'string') {
      const numericValue = parseInt(value.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(numericValue)) {
        return numericValue;
      }
    }

    return null;
  }
}

