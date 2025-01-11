import { Injectable } from '@nestjs/common';
import { BookingTraveller, CreateBookingDto } from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRepository } from 'src/common/repository/user/user.repository';

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

      if (createBookingDto.start_date) {
        data.start_date = createBookingDto.start_date;
      }

      if (createBookingDto.end_date) {
        data.end_date = createBookingDto.end_date;
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

      // add vendor id if the package is from vendor
      const userDetails = await UserRepository.getUserDetails(
        packageData.user_id,
      );
      if (userDetails && userDetails.type == 'vendor') {
        data.vendor_id = userDetails.id;
      }

      if (createBookingDto.extra_services) {
        const extra_services = JSON.parse(createBookingDto.extra_services);
        for (const extra_service of extra_services) {
          await this.prisma.packageExtraService.create({
            data: {
              package_id: createBookingDto.package_id,
              extra_service_id: extra_service.id,
            },
          });
        }
      }

      const booking = await this.prisma.booking.create({
        data: {
          ...data,
          user_id: user_id,
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
