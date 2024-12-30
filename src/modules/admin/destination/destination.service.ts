import { Injectable } from '@nestjs/common';
import { CreateDestinationDto } from './dto/create-destination.dto';
import { UpdateDestinationDto } from './dto/update-destination.dto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';

@Injectable()
export class DestinationService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async create(
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
      const destination = await this.prisma.destination.create({
        data: data,
      });

      // save destination images
      if (images) {
        const destination_images_data = images.map((image) => ({
          image: image.path,
          image_alt: image.originalname,
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
      const destinations = await this.prisma.destination.findMany();
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
      if (updateDestinationDto.destination_images) {
        data.destination_images = updateDestinationDto.destination_images;
      }
      await this.prisma.destination.update({
        where: { id },
        data: data,
      });

      // save destination images
      if (images) {
        const destination_images_data = images.map((image) => ({
          image: image.path,
          image_alt: image.originalname,
          destination_id: id,
        }));

        await this.prisma.destinationImage.createMany({
          data: destination_images_data,
        });

        // delete old destination images
        const old_destination_images =
          await this.prisma.destinationImage.findMany({
            where: { destination_id: id },
          });
        old_destination_images.forEach((image) => {
          SojebStorage.disk('destination').delete(image.image);
        });
        await this.prisma.destinationImage.deleteMany({
          where: { destination_id: id },
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
      if (destination.destination_images) {
        destination.destination_images.forEach((image) => {
          fs.unlinkSync(image);
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
