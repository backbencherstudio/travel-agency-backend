import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreatePackageTripPlanDto } from './dto/create-package-trip-plan.dto';
import { UpdatePackageTripPlanDto } from './dto/update-package-trip-plan.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import appConfig from '../../../config/app.config';

@Injectable()
export class PackageTripPlanService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async create(
    package_id: string,
    createPackageTripPlanDto: CreatePackageTripPlanDto,
    images?: Express.Multer.File[],
  ) {
    try {
      // check if package exists
      const record = await this.prisma.package.findUnique({
        where: { id: package_id },
      });
      if (!record) {
        return {
          success: false,
          message: 'Package not found',
        };
      }

      // create trip plan
      const trip_plan = await this.prisma.packageTripPlan.create({
        data: {
          ...createPackageTripPlanDto,
          package_id,
        },
      });

      // save trip plan images
      if (images && images.length > 0) {
        const trip_plan_images_data = images.map((image) => ({
          image: image.filename,
          package_trip_plan_id: trip_plan.id,
        }));
        await this.prisma.packageTripPlanImage.createMany({
          data: trip_plan_images_data,
        });
      }

      return {
        success: true,
        message: 'Trip plan created successfully',
      };
    } catch (error) {
      // delete trip plan images from storage
      if (images && images.length > 0) {
        for (const image of images) {
          await SojebStorage.delete(
            appConfig().storageUrl.packageTripPlan + image.filename,
          );
        }
      }

      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findAll() {
    try {
      const package_trip_plans = await this.prisma.packageTripPlan.findMany({
        select: {
          id: true,
          title: true,
          description: true,
          package_id: true,
          package_trip_plan_images: {
            select: {
              image: true,
            },
          },
        },
      });

      // add image url to trip plan
      if (package_trip_plans && package_trip_plans.length > 0) {
        for (const trip_plan of package_trip_plans) {
          if (
            trip_plan.package_trip_plan_images &&
            trip_plan.package_trip_plan_images.length > 0
          ) {
            for (const image of trip_plan.package_trip_plan_images) {
              image['image_url'] = SojebStorage.url(
                appConfig().storageUrl.packageTripPlan + image.image,
              );
            }
          }
        }
      }
      return {
        success: true,
        data: package_trip_plans,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findOne(id: string, package_id: string) {
    try {
      const trip_plan = await this.prisma.packageTripPlan.findUnique({
        where: { id: id, package_id: package_id },
        select: {
          id: true,
          title: true,
          description: true,
          package_id: true,
          package_trip_plan_images: {
            select: {
              image: true,
            },
          },
        },
      });

      // add image url to trip plan
      if (
        trip_plan.package_trip_plan_images &&
        trip_plan.package_trip_plan_images.length > 0
      ) {
        for (const image of trip_plan.package_trip_plan_images) {
          image['image_url'] = SojebStorage.url(
            appConfig().storageUrl.packageTripPlan + image.image,
          );
        }
      }

      if (!trip_plan) {
        return {
          success: false,
          message: 'Trip plan not found',
        };
      }
      return {
        success: true,
        data: trip_plan,
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
    package_id: string,
    updatePackageTripPlanDto: UpdatePackageTripPlanDto,
    images?: Express.Multer.File[],
  ) {
    try {
      const trip_plan = await this.prisma.packageTripPlan.findUnique({
        where: { id, package_id },
      });
      if (!trip_plan) {
        return {
          success: false,
          message: 'Trip plan not found',
        };
      }
      await this.prisma.packageTripPlan.update({
        where: { id, package_id },
        data: updatePackageTripPlanDto,
      });

      // save trip plan images
      if (images && images.length > 0) {
        const trip_plan_images_data = images.map((image) => ({
          image: image.filename,
          package_trip_plan_id: trip_plan.id,
        }));
        await this.prisma.packageTripPlanImage.createMany({
          data: trip_plan_images_data,
        });
      }

      return {
        success: true,
        message: 'Trip plan updated successfully',
      };
    } catch (error) {
      // delete trip plan images from storage
      if (images && images.length > 0) {
        for (const image of images) {
          await SojebStorage.delete(
            appConfig().storageUrl.packageTripPlan + image.filename,
          );
        }
      }
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async remove(id: string, package_id: string) {
    try {
      const trip_plan = await this.prisma.packageTripPlan.findUnique({
        where: { id, package_id },
        include: {
          package_trip_plan_images: true,
        },
      });

      if (!trip_plan) {
        return {
          success: false,
          message: 'Trip plan not found',
        };
      }
      await this.prisma.packageTripPlan.delete({
        where: { id, package_id },
      });

      // delete trip plan images from storage
      if (
        trip_plan.package_trip_plan_images &&
        trip_plan.package_trip_plan_images.length > 0
      ) {
        for (const image of trip_plan.package_trip_plan_images) {
          await SojebStorage.delete(
            appConfig().storageUrl.packageTripPlan + image.image,
          );
        }
      }

      return {
        success: true,
        message: 'Trip plan deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
