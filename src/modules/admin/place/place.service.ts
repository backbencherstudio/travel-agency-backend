import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class PlaceService {
  constructor(private prisma: PrismaService) { }

  async create(createPlaceDto: any) {
    try {
      const record = await this.prisma.place.create({
        data: {
          name: createPlaceDto.name,
          address: createPlaceDto.address,
          description: createPlaceDto.description,
          latitude: createPlaceDto.latitude,
          longitude: createPlaceDto.longitude,
          type: createPlaceDto.type,
          city: createPlaceDto.city,
          country: createPlaceDto.country,
        },
      });

      return {
        success: true,
        message: 'Place created successfully',
        data: record,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findAll(filters?: {
    q?: string;
    type?: string;
    city?: string;
    country?: string;
  }) {
    try {
      const where_condition = {};

      if (filters) {
        if (filters.q) {
          where_condition['OR'] = [
            {
              name: {
                contains: filters.q,
                mode: 'insensitive',
              },
            },
            {
              address: {
                contains: filters.q,
                mode: 'insensitive',
              },
            },
            {
              description: {
                contains: filters.q,
                mode: 'insensitive',
              },
            },
          ];
        }
        if (filters.type) {
          where_condition['type'] = filters.type;
        }
        if (filters.city) {
          where_condition['city'] = filters.city;
        }
        if (filters.country) {
          where_condition['country'] = filters.country;
        }
      }

      const places = await this.prisma.place.findMany({
        where: { ...where_condition, status: 1 },
        orderBy: { created_at: 'desc' },
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          name: true,
          address: true,
          description: true,
          latitude: true,
          longitude: true,
          type: true,
          city: true,
          country: true,
          status: true,
        },
      });

      return {
        success: true,
        data: places,
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
      const record = await this.prisma.place.findUnique({
        where: { id },
        select: {
          id: true,
          created_at: true,
          updated_at: true,
          name: true,
          address: true,
          description: true,
          latitude: true,
          longitude: true,
          type: true,
          city: true,
          country: true,
          status: true,
        },
      });

      if (!record) {
        return {
          success: false,
          message: 'Place not found',
        };
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

  async update(id: string, updatePlaceDto: any) {
    try {
      const existing_place = await this.prisma.place.findUnique({
        where: { id },
      });

      if (!existing_place) {
        return {
          success: false,
          message: 'Place not found',
        };
      }

      const data: any = {};
      if (updatePlaceDto.name) {
        data.name = updatePlaceDto.name;
      }
      if (updatePlaceDto.address) {
        data.address = updatePlaceDto.address;
      }
      if (updatePlaceDto.description) {
        data.description = updatePlaceDto.description;
      }
      if (updatePlaceDto.latitude) {
        data.latitude = updatePlaceDto.latitude;
      }
      if (updatePlaceDto.longitude) {
        data.longitude = updatePlaceDto.longitude;
      }
      if (updatePlaceDto.type) {
        data.type = updatePlaceDto.type;
      }
      if (updatePlaceDto.city) {
        data.city = updatePlaceDto.city;
      }
      if (updatePlaceDto.country) {
        data.country = updatePlaceDto.country;
      }

      const record = await this.prisma.place.update({
        where: { id },
        data: {
          ...data,
          updated_at: new Date(),
        },
      });

      return {
        success: true,
        message: 'Place updated successfully',
        data: record,
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
      const existing_place = await this.prisma.place.findUnique({
        where: { id },
      });

      if (!existing_place) {
        return {
          success: false,
          message: 'Place not found',
        };
      }

      // Check if place is being used in any packages
      const package_places = await this.prisma.packagePlace.findMany({
        where: { place_id: id },
      });

      if (package_places.length > 0) {
        return {
          success: false,
          message: 'Cannot delete place as it is being used in packages',
        };
      }

      await this.prisma.place.delete({
        where: { id },
      });

      return {
        success: true,
        message: 'Place deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
