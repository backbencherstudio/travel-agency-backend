import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import appConfig from 'src/config/app.config';

@Injectable()
export class DestinationService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async create(
    user_id: string,
    createDestinationDto: CreateDestinationDto,
    images?: Express.Multer.File[],
  ) {
    try {
      const data: any = {};
      if (createDestinationDto.name) {
        data.name = createDestinationDto.name;
      }
      if (createDestinationDto.description) {
        data.description = createDestinationDto.description;
      }
      if (createDestinationDto.country_id) {
        data.country_id = createDestinationDto.country_id;
      }
      const destination = await this.prisma.destination.create({
        data: {
          ...data,
          user_id: user_id,
        },
      });

      // save destination images
      if (images) {
        const destination_images_data = images.map((image) => ({
          image: image.filename,
          // image_alt: image.originalname,
          destination_id: destination.id,
        }));
        await this.prisma.destinationImage.createMany({
          data: destination_images_data,
        });
      }

      return {
        success: true,
        message: 'Destination created successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findAll() {
    try {
      const destinations = await this.prisma.destination.findMany({
        select: {
          id: true,
          name: true,
          description: true,
          country: {
            select: {
              id: true,
              name: true,
              flag: true,
            },
          },
          created_at: true,
          updated_at: true,
          approved_at: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          destination_images: {
            select: {
              image: true,
            },
          },
        },
      });

      // add image url
      destinations.forEach((destination) => {
        destination.destination_images.forEach((image) => {
          image['image_url'] =
            appConfig().app.url +
            appConfig().storageUrl.rootUrlPublic +
            appConfig().storageUrl.destination +
            image.image;
        });
      });
      return {
        success: true,
        data: destinations,
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
      const destination = await this.prisma.destination.findUnique({
        where: { id },
        select: {
          id: true,
          name: true,
          description: true,
          country: {
            select: {
              id: true,
              name: true,
              flag: true,
            },
          },
          created_at: true,
          updated_at: true,
          approved_at: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          destination_images: {
            select: {
              image: true,
            },
          },
        },
      });

      // add image url
      destination.destination_images.forEach((image) => {
        image['image_url'] =
          appConfig().app.url +
          appConfig().storageUrl.rootUrlPublic +
          appConfig().storageUrl.destination +
          image.image;
      });

      return {
        success: true,
        data: destination,
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
    updateDestinationDto: UpdateDestinationDto,
    images?: Express.Multer.File[],
  ) {
    try {
      const data: any = {};
      if (updateDestinationDto.name) {
        data.name = updateDestinationDto.name;
      }
      if (updateDestinationDto.description) {
        data.description = updateDestinationDto.description;
      }
      if (updateDestinationDto.country_id) {
        data.country_id = updateDestinationDto.country_id;
      }
      await this.prisma.destination.update({
        where: { id, user_id },
        data: data,
      });

      // save destination images
      if (images) {
        // delete old destination images
        const old_destination_images =
          await this.prisma.destinationImage.findMany({
            where: { destination_id: id },
          });
        old_destination_images.forEach(async (image) => {
          await SojebStorage.delete(image.image);
        });
        await this.prisma.destinationImage.deleteMany({
          where: { destination_id: id },
        });

        // save destination images
        const destination_images_data = images.map((image) => ({
          image: image.path,
          image_alt: image.originalname,
          destination_id: id,
        }));

        await this.prisma.destinationImage.createMany({
          data: destination_images_data,
        });
      }

      return {
        success: true,
        message: 'Destination updated successfully',
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
      // delete destination images
      const destination = await this.prisma.destination.findUnique({
        where: { id },
      });
      if (destination) {
        // delete destination images
        const destination_images = await this.prisma.destinationImage.findMany({
          where: { destination_id: id },
        });
        destination_images.forEach(async (image) => {
          await SojebStorage.delete(image.image);
        });
        await this.prisma.destinationImage.deleteMany({
          where: { destination_id: id },
        });
      }
      await this.prisma.destination.delete({
        where: { id },
      });
      return {
        success: true,
        message: 'Destination deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
