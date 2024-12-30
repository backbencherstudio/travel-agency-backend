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
    package_images?: Express.Multer.File[],
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

    if (package_images && package_images.length > 0) {
      const package_images_data = package_images.map((image) => ({
        image: image.path,
        image_alt: image.originalname,
        package_id: record.id,
      }));
      await this.prisma.packageImage.createMany({
        data: package_images_data,
      });
    }

    // TODO: add tag

    return {
      success: true,
      message: 'Package created successfully',
    };
  }

  findAll() {
    return `This action returns all package`;
  }

  findOne(id: number) {
    return `This action returns a #${id} package`;
  }

  update(id: number, updatePackageDto: UpdatePackageDto) {
    return `This action updates a #${id} package`;
  }

  remove(id: number) {
    return `This action removes a #${id} package`;
  }
}
