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
              id: true,
              image: true,
            },
          },
        },
      });

      // add image url
      destinations.forEach((destination) => {
        destination.destination_images.forEach((image) => {
          image['image_url'] = SojebStorage.url(
            appConfig().storageUrl.destination + image.image,
          );
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
              id: true,
              image: true,
            },
          },
        },
      });

      // add image url
      destination.destination_images.forEach((image) => {
        image['image_url'] = SojebStorage.url(
          appConfig().storageUrl.destination + image.image,
        );
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
        // // delete old destination images
        // const old_destination_images =
        //   await this.prisma.destinationImage.findMany({
        //     where: { destination_id: id },
        //   });
        // old_destination_images.forEach(async (image) => {
        //   await SojebStorage.delete(image.image);
        // });
        // await this.prisma.destinationImage.deleteMany({
        //   where: { destination_id: id },
        // });

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

  async approve(id: string) {
    try {
      const destination = await this.prisma.destination.findUnique({
        where: { id },
      });
      if (!destination) {
        return {
          success: false,
          message: 'Destination not found',
        };
      }
      await this.prisma.destination.update({
        where: { id },
        data: { approved_at: new Date() },
      });
      return {
        success: true,
        message: 'Destination approved successfully',
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
      await this.prisma.destination.update({
        where: { id },
        data: { approved_at: null },
      });
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async removeImage(id: string) {
    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        const destination_image = await prisma.destinationImage.findUnique({
          where: { id },
        });
        if (!destination_image) {
          return {
            success: false,
            message: 'Destination image not found',
          };
        }
        await SojebStorage.delete(
          appConfig().storageUrl.destination + destination_image.image,
        );
        await prisma.destinationImage.delete({
          where: { id },
        });
        return {
          success: true,
          message: 'Destination image deleted successfully',
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

  async remove(id: string) {
    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        // Fetch destination and associated images
        const destination = await prisma.destination.findUnique({
          where: { id },
        });
        if (!destination) {
          throw new Error('Destination not found');
        }

        const destinationImages = await prisma.destinationImage.findMany({
          where: { destination_id: id },
        });

        // Delete images from storage
        for (const image of destinationImages) {
          await SojebStorage.delete(
            appConfig().storageUrl.destination + image.image,
          );
        }

        // Delete destination images and destination
        await prisma.destinationImage.deleteMany({
          where: { destination_id: id },
        });
        await prisma.destination.delete({ where: { id } });

        return {
          success: true,
          message: 'Destination deleted successfully',
        };
      });

      return result;
    } catch (error) {
      return {
        success: false,
        message:
          error.message || 'An error occurred while deleting the destination',
      };
    }
  }
}
