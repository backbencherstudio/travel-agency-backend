import { Injectable } from '@nestjs/common';
import { BookingTraveller, CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class BookingService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async create(user_id: string, createBookingDto: CreateBookingDto) {
    try {
      const data: any = {};
      if (createBookingDto.package_id) {
        data.package_id = createBookingDto.package_id;
      } else {
        return {
          success: false,
          message: 'Package id is required',
        };
      }

      const packageData = await this.prisma.package.findUnique({
        where: {
          id: createBookingDto.package_id,
        },
      });

      if (!packageData) {
        return {
          success: false,
          message: 'Package not found',
        };
      }

      const booking = await this.prisma.booking.create({
        data: {
          ...data,
          user_id: user_id,
          vendor_id: packageData.user_id,
          type: packageData.type,
        },
      });

      if (!booking) {
        return {
          success: false,
          message: 'Booking not created',
        };
      }

      // create booking travellers
      if (createBookingDto.booking_travellers) {
        const booking_travellers: BookingTraveller[] = JSON.parse(
          createBookingDto.booking_travellers,
        );
        for (const traveller of booking_travellers) {
          await this.prisma.bookingTraveller.create({
            data: {
              booking_id: booking.id,
              full_name: traveller.full_name,
              type: traveller.type,
            },
          });
        }
      }

      return {
        success: true,
        message: 'Booking created successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  findAll() {
    return `This action returns all booking`;
  }

  findOne(id: number) {
    return `This action returns a #${id} booking`;
  }

  update(id: number, updateBookingDto: UpdateBookingDto) {
    return `This action updates a #${id} booking`;
  }

  remove(id: number) {
    return `This action removes a #${id} booking`;
  }
}
