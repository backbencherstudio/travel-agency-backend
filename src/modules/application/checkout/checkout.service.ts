import { Injectable } from '@nestjs/common';
import {
  CreateCheckoutDto,
  IBookingTraveller,
  ICoupon,
  IExtraService,
} from './dto/create-checkout.dto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRepository } from 'src/common/repository/user/user.repository';
import { CouponRepository } from 'src/common/repository/coupon/coupon.repository';

@Injectable()
export class CheckoutService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async create(user_id: string, createCheckoutDto: CreateCheckoutDto) {
    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        const data: any = {};
        if (createCheckoutDto.package_id) {
          data.package_id = createCheckoutDto.package_id;
        } else {
          return {
            success: false,
            message: 'Package id is required',
          };
        }

        if (createCheckoutDto.start_date) {
          data.start_date = createCheckoutDto.start_date;
        }
        if (createCheckoutDto.end_date) {
          data.end_date = createCheckoutDto.end_date;
        }
        // user details
        // if (createCheckoutDto.first_name) {
        //   data.first_name = createCheckoutDto.first_name;
        // }
        // if (createCheckoutDto.last_name) {
        //   data.last_name = createCheckoutDto.last_name;
        // }
        if (createCheckoutDto.email) {
          data.email = createCheckoutDto.email;
        }
        if (createCheckoutDto.phone_number) {
          data.phone_number = createCheckoutDto.phone_number;
        }
        if (createCheckoutDto.address1) {
          data.address1 = createCheckoutDto.address1;
        }
        if (createCheckoutDto.address2) {
          data.address2 = createCheckoutDto.address2;
        }
        if (createCheckoutDto.city) {
          data.city = createCheckoutDto.city;
        }
        if (createCheckoutDto.state) {
          data.state = createCheckoutDto.state;
        }
        if (createCheckoutDto.zip_code) {
          data.zip_code = createCheckoutDto.zip_code;
        }
        if (createCheckoutDto.country) {
          data.country = createCheckoutDto.country;
        }

        const packageData = await prisma.package.findUnique({
          where: {
            id: createCheckoutDto.package_id,
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

        if (createCheckoutDto.extra_services) {
          let extra_services: IExtraService[];
          if (createCheckoutDto.extra_services instanceof Array) {
            extra_services = createCheckoutDto.extra_services;
          } else {
            extra_services = JSON.parse(createCheckoutDto.extra_services);
          }
          for (const extra_service of extra_services) {
            await prisma.packageExtraService.create({
              data: {
                package_id: createCheckoutDto.package_id,
                extra_service_id: extra_service.id,
              },
            });
          }
        }

        // create checkout
        const checkout = await prisma.checkout.create({
          data: {
            ...data,
            user_id: user_id,
            type: packageData.type,
          },
        });

        if (!checkout) {
          return {
            success: false,
            message: 'Checkout not created',
          };
        }

        // create checkout items
        await prisma.checkoutItem.create({
          data: {
            checkout_id: checkout.id,
            package_id: createCheckoutDto.package_id,
            start_date: createCheckoutDto.start_date,
            end_date: createCheckoutDto.end_date,
          },
        });

        // create booking-travellers
        if (createCheckoutDto.booking_travellers) {
          let booking_travellers: IBookingTraveller[];
          if (createCheckoutDto.extra_services instanceof Array) {
            booking_travellers = createCheckoutDto.booking_travellers;
          } else {
            booking_travellers = JSON.parse(
              createCheckoutDto.booking_travellers,
            );
          }
          for (const traveller of booking_travellers) {
            await prisma.checkoutTraveller.create({
              data: {
                checkout_id: checkout.id,
                full_name: traveller.full_name,
                type: traveller.type,
              },
            });
          }
        }

        // apply coupon
        if (createCheckoutDto.coupons) {
          let coupons: ICoupon[];
          if (createCheckoutDto.extra_services instanceof Array) {
            coupons = createCheckoutDto.coupons;
          } else {
            coupons = JSON.parse(createCheckoutDto.coupons);
          }
          for (const coupon of coupons) {
            const code = coupon['code'];

            // apply coupon
            await CouponRepository.applyCoupon({
              user_id,
              coupon_code: code,
              package_id: packageData.id,
              checkout_id: checkout.id,
            });
          }
        }

        return {
          success: true,
          message: 'Checkout created successfully.',
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

  async findOne(id: string) {
    try {
      const packageData = await this.prisma.package.findUnique({
        where: { id: id },
        select: {
          id: true,
          name: true,
          price: true,
          destination: {
            select: {
              id: true,
              name: true,
              country: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
      });
      return {
        success: true,
        data: {
          currency: 'USD',
          package: packageData,
          fees: 50,
        },
      };
    } catch (error) {
      throw new Error(error.message);
    }
  }
}
