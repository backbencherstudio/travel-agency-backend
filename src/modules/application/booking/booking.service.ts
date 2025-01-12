import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import {
  IBookingTraveller,
  ICoupon,
  CreateBookingDto,
} from './dto/create-booking.dto';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRepository } from '../../../common/repository/user/user.repository';
import { CouponRepository } from '../../../common/repository/coupon/coupon.repository';
import { BookingRepository } from '../../../common/repository/booking/booking.repository';

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
      // user details
      // if (createBookingDto.first_name) {
      //   data.first_name = createBookingDto.first_name;
      // }
      // if (createBookingDto.last_name) {
      //   data.last_name = createBookingDto.last_name;
      // }
      if (createBookingDto.email) {
        data.email = createBookingDto.email;
      }
      if (createBookingDto.phone_number) {
        data.phone_number = createBookingDto.phone_number;
      }
      if (createBookingDto.address1) {
        data.address1 = createBookingDto.address1;
      }
      if (createBookingDto.address2) {
        data.address2 = createBookingDto.address2;
      }
      if (createBookingDto.city) {
        data.city = createBookingDto.city;
      }
      if (createBookingDto.state) {
        data.state = createBookingDto.state;
      }
      if (createBookingDto.zip_code) {
        data.zip_code = createBookingDto.zip_code;
      }
      if (createBookingDto.country) {
        data.country = createBookingDto.country;
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

      // create invoice number
      const invoice_number = await BookingRepository.createInvoiceNumber();

      // create booking
      const booking = await this.prisma.booking.create({
        data: {
          ...data,
          user_id: user_id,
          type: packageData.type,
          invoice_number: invoice_number,
        },
      });

      if (!booking) {
        return {
          success: false,
          message: 'Booking not created',
        };
      }

      // create booking-travellers
      if (createBookingDto.booking_travellers) {
        const booking_travellers: IBookingTraveller[] = JSON.parse(
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

      // apply coupon
      if (createBookingDto.coupons) {
        const coupons: ICoupon[] = JSON.parse(createBookingDto.coupons);
        for (const coupon of coupons) {
          const code = coupon['code'];

          // apply coupon
          const coupon_data = await CouponRepository.applyCoupon(
            user_id,
            code,
            packageData.id,
          );

          if (coupon_data.success) {
            const coupon_id = coupon_data.coupon.id;
            const method = coupon_data.coupon.method;
            const amount_type = coupon_data.coupon.amount_type;
            const amount = coupon_data.coupon.amount;

            await this.prisma.bookingCoupon.create({
              data: {
                user_id: user_id,
                booking_id: booking.id,
                coupon_id: coupon_id,
                method: method,
                code: code,
                amount_type: amount_type,
                amount: amount,
              },
            });
          }
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
