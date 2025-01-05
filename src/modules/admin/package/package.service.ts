import { Injectable } from '@nestjs/common';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SojebStorage } from 'src/common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';

@Injectable()
export class PackageService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async create(
    user_id: string,
    createPackageDto: CreatePackageDto,
    files: {
      package_images?: Express.Multer.File[];
      trip_plans_images?: Express.Multer.File[];
    },
  ) {
    const data: any = {};
    if (createPackageDto.name) {
      data.name = createPackageDto.name;
    }
    if (createPackageDto.description) {
      data.description = createPackageDto.description;
    }
    if (createPackageDto.price) {
      data.price = createPackageDto.price;
    }
    if (createPackageDto.duration) {
      data.duration = createPackageDto.duration;
    }
    if (createPackageDto.type) {
      data.type = createPackageDto.type;
    }
    if (createPackageDto.min_capacity) {
      data.min_capacity = Number(createPackageDto.min_capacity);
    }
    if (createPackageDto.max_capacity) {
      data.max_capacity = Number(createPackageDto.max_capacity);
    }
    if (createPackageDto.cancellation_policy_id) {
      data.cancellation_policy_id = createPackageDto.cancellation_policy_id;
    }
    if (createPackageDto.destination_id) {
      data.destination_id = createPackageDto.destination_id;
    }
    const record = await this.prisma.package.create({
      data: {
        ...data,
        user_id: user_id,
      },
    });

    // add package images to package
    if (files.package_images && files.package_images.length > 0) {
      const package_images_data = files.package_images.map((image) => ({
        image: image.path,
        image_alt: image.originalname,
        package_id: record.id,
      }));
      await this.prisma.packageImage.createMany({
        data: package_images_data,
      });
    }

    // add trip plan to package
    if (createPackageDto.trip_plans) {
      const trip_plans = JSON.parse(createPackageDto.trip_plans);
      for (const trip_plan of trip_plans) {
        const trip_plan_data = {
          title: trip_plan.title,
          description: trip_plan.description,
          package_id: record.id,
        };
        const trip_plan_record = await this.prisma.packageTripPlan.create({
          data: trip_plan_data,
        });
        // add trip plan images to trip plan
        if (files.trip_plans_images && files.trip_plans_images.length > 0) {
          const trip_plan_images_data = files.trip_plans_images.map(
            (image) => ({
              image: image.path,
              image_alt: image.originalname,
              trip_plan_id: trip_plan_record.id,
            }),
          );
          await this.prisma.packageTripPlanImage.createMany({
            data: trip_plan_images_data,
          });
        }
      }
    }

    // add tag to included_packages
    if (createPackageDto.included_packages) {
      const included_packages = JSON.parse(createPackageDto.included_packages);
      for (const tag of included_packages) {
        await this.prisma.packageTag.create({
          data: {
            tag_id: tag.id,
            package_id: record.id,
            type: 'included',
          },
        });
      }
    }

    // add tag to excluded_packages
    if (createPackageDto.excluded_packages) {
      const excluded_packages = JSON.parse(createPackageDto.excluded_packages);
      for (const tag of excluded_packages) {
        await this.prisma.packageTag.create({
          data: {
            tag_id: tag.id,
            package_id: record.id,
            type: 'excluded',
          },
        });
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

    return {
      success: true,
      message: 'Package created successfully',
    };
  }

  async findAll() {
    try {
      const packages = await this.prisma.package.findMany();
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
        where: { id: id },
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

  async update(id: string, updatePackageDto: UpdatePackageDto) {
    try {
      const data: any = {};
      if (updatePackageDto.name) {
        data.name = updatePackageDto.name;
      }
      if (updatePackageDto.description) {
        data.description = updatePackageDto.description;
      }
      if (updatePackageDto.price) {
        data.price = updatePackageDto.price;
      }
      if (updatePackageDto.duration) {
        data.duration = updatePackageDto.duration;
      }
      if (updatePackageDto.type) {
        data.type = updatePackageDto.type;
      }
      if (updatePackageDto.min_capacity) {
        data.min_capacity = Number(updatePackageDto.min_capacity);
      }
      if (updatePackageDto.max_capacity) {
        data.max_capacity = Number(updatePackageDto.max_capacity);
      }
      if (updatePackageDto.cancellation_policy_id) {
        data.cancellation_policy_id = updatePackageDto.cancellation_policy_id;
      }
      if (updatePackageDto.destination_id) {
        data.destination_id = updatePackageDto.destination_id;
      }
      if (updatePackageDto.status) {
        data.status = updatePackageDto.status;
      }

      const record = await this.prisma.package.findUnique({
        where: { id: id },
      });

      if (!record) {
        return {
          success: false,
          message: 'Package not found',
        };
      }

      if (Object.keys(data).length == 0) {
        await this.prisma.package.update({
          where: { id: id },
          data: {
            ...data,
          },
        });
      }

      // update included tag packages
      if (updatePackageDto.included_packages) {
        // delete all tags
        await this.prisma.packageTag.deleteMany({
          where: { package_id: id, type: 'included' },
        });
        const included_packages = JSON.parse(
          updatePackageDto.included_packages,
        );
        for (const tag of included_packages) {
          await this.prisma.packageTag.create({
            data: { tag_id: tag.id, package_id: id, type: 'included' },
          });
        }
      }

      // update excluded tag packages
      if (updatePackageDto.excluded_packages) {
        // delete all tags
        await this.prisma.packageTag.deleteMany({
          where: { package_id: id, type: 'excluded' },
        });
        const excluded_packages = JSON.parse(
          updatePackageDto.excluded_packages,
        );
        for (const tag of excluded_packages) {
          await this.prisma.packageTag.create({
            data: { tag_id: tag.id, package_id: id, type: 'excluded' },
          });
        }
      }

      // update categories
      if (updatePackageDto.package_category) {
        // delete all categories
        await this.prisma.packageCategory.deleteMany({
          where: { package_id: id },
        });
        const package_category = JSON.parse(updatePackageDto.package_category);
        for (const category of package_category) {
          await this.prisma.packageCategory.create({
            data: { category_id: category.id, package_id: id },
          });
        }
      }

      return {
        success: true,
        message: 'Package updated successfully',
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
        data: { approved_at: new Date() },
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
        data: { approved_at: null },
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
        const packageImages = await prisma.packageImage.findMany({
          where: { package_id: id },
        });
        for (const image of packageImages) {
          await SojebStorage.delete(
            appConfig().storageUrl.package + image.image,
          );
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
}
