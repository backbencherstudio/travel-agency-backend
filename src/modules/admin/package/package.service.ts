import { Injectable } from '@nestjs/common';
import { CreatePackageDto } from './dto/create-package.dto';
import { UpdatePackageDto } from './dto/update-package.dto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

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
    if (createPackageDto.capacity) {
      data.capacity = createPackageDto.capacity;
    }
    if (createPackageDto.cancellation_policy_id) {
      data.cancellation_policy_id = createPackageDto.cancellation_policy_id;
    }
    if (createPackageDto.distination_id) {
      data.distination_id = createPackageDto.distination_id;
    }
    if (createPackageDto.package_categories) {
      data.package_categories = createPackageDto.package_categories;
    }
    if (createPackageDto.package_tags) {
      data.package_tags = createPackageDto.package_tags;
    }
    const record = await this.prisma.package.create({
      data: {
        ...data,
        user_id: user_id,
        // cancellation_policy_id: createPackageDto.cancellation_policy_id,
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
    if (createPackageDto.trip_plans && createPackageDto.trip_plans.length > 0) {
      // const trip_plans = JSON.parse(createPackageDto.trip_plans);
      for (const trip_plan of createPackageDto.trip_plans) {
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

    // add tag to package
    if (
      createPackageDto.package_tags &&
      createPackageDto.package_tags.length > 0
    ) {
      for (const tag of createPackageDto.package_tags) {
        await this.prisma.packageTag.create({
          data: {
            tag_id: tag.id,
            package_id: record.id,
          },
        });
      }
    }
    // add category to package
    if (
      createPackageDto.package_categories &&
      createPackageDto.package_categories.length > 0
    ) {
      for (const category of createPackageDto.package_categories) {
        await this.prisma.packageCategory.create({
          data: {
            category_id: category.id,
            package_id: record.id,
          },
        });
      }
    }

    return {
      success: true,
      message: 'Package created successfully',
    };
  }

  async findAll() {
    return await this.prisma.package.findMany();
  }

  async findOne(id: string) {
    return await this.prisma.package.findUnique({
      where: { id: id },
    });
  }

  update(id: string, updatePackageDto: UpdatePackageDto) {
    return `This action updates a #${id} package`;
  }

  remove(id: string) {
    return `This action removes a #${id} package`;
  }
}
