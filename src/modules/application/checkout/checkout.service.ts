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
import { UpdateCheckoutDto } from './dto/update-checkout.dto';

@Injectable()
export class CheckoutService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async create(user_id: string, createCheckoutDto: CreateCheckoutDto) {
    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        const data = {};
        if (!createCheckoutDto.package_id) {
          return {
            success: false,
            message: 'Package id is required',
          };
        }
        // user details
        if (createCheckoutDto.email) {
          data['email'] = createCheckoutDto.email;
        }
        if (createCheckoutDto.phone_number) {
          data['phone_number'] = createCheckoutDto.phone_number;
        }
        if (createCheckoutDto.address1) {
          data['address1'] = createCheckoutDto.address1;
        }
        if (createCheckoutDto.address2) {
          data['address2'] = createCheckoutDto.address2;
        }
        if (createCheckoutDto.city) {
          data['city'] = createCheckoutDto.city;
        }
        if (createCheckoutDto.state) {
          data['state'] = createCheckoutDto.state;
        }
        if (createCheckoutDto.zip_code) {
          data['zip_code'] = createCheckoutDto.zip_code;
        }
        if (createCheckoutDto.country) {
          data['country'] = createCheckoutDto.country;
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

        const package_user_id = packageData.user_id;

        // add vendor id if the package is from vendor
        const userDetails =
          await UserRepository.getUserDetails(package_user_id);
        if (userDetails && userDetails.type == 'vendor') {
          data['vendor_id'] = userDetails.id;
        }

        // create checkout
        const checkout = await prisma.checkout.create({
          data: {
            ...data,
            user_id: user_id,
          },
        });

        if (!checkout) {
          return {
            success: false,
            message: 'Checkout not created',
          };
        }

        if (createCheckoutDto.extra_services) {
          let extra_services: IExtraService[];
          if (createCheckoutDto.extra_services instanceof Array) {
            extra_services = createCheckoutDto.extra_services;
          } else {
            extra_services = JSON.parse(createCheckoutDto.extra_services);
          }
          for (const extra_service of extra_services) {
            await prisma.checkoutExtraService.create({
              data: {
                package_id: createCheckoutDto.package_id,
                checkout_id: checkout.id,
                extra_service_id: extra_service.id,
              },
            });
          }
        }

        const checkoutItemData = {};

        if (createCheckoutDto.package_id) {
          checkoutItemData['package_id'] = createCheckoutDto.package_id;
        }
        if (createCheckoutDto.start_date) {
          checkoutItemData['start_date'] = createCheckoutDto.start_date;
        }
        if (createCheckoutDto.end_date) {
          checkoutItemData['end_date'] = createCheckoutDto.end_date;
        }

        // create checkout items
        await prisma.checkoutItem.create({
          data: {
            ...checkoutItemData,
            checkout_id: checkout.id,
            package_id: createCheckoutDto.package_id,
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

        return {
          success: true,
          message: 'Checkout created successfully.',
          data: checkout,
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

  async update(
    id: string,
    user_id: string,
    updateCheckoutDto: UpdateCheckoutDto,
  ) {
    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        const data: any = {};
        // user details
        // if (createCheckoutDto.first_name) {
        //   data.first_name = createCheckoutDto.first_name;
        // }
        // if (createCheckoutDto.last_name) {
        //   data.last_name = createCheckoutDto.last_name;
        // }
        if (updateCheckoutDto.email) {
          data.email = updateCheckoutDto.email;
        }
        if (updateCheckoutDto.phone_number) {
          data.phone_number = updateCheckoutDto.phone_number;
        }
        if (updateCheckoutDto.address1) {
          data.address1 = updateCheckoutDto.address1;
        }
        if (updateCheckoutDto.address2) {
          data.address2 = updateCheckoutDto.address2;
        }
        if (updateCheckoutDto.city) {
          data.city = updateCheckoutDto.city;
        }
        if (updateCheckoutDto.state) {
          data.state = updateCheckoutDto.state;
        }
        if (updateCheckoutDto.zip_code) {
          data.zip_code = updateCheckoutDto.zip_code;
        }
        if (updateCheckoutDto.country) {
          data.country = updateCheckoutDto.country;
        }

        const checkoutExists = await prisma.checkout.findUnique({
          where: {
            id: id,
          },
          select: {
            checkout_items: {
              select: {
                package_id: true,
                start_date: true,
                end_date: true,
                package: {
                  select: {
                    id: true,
                    user_id: true,
                    type: true,
                  },
                },
              },
            },
          },
        });

        if (!checkoutExists) {
          return {
            success: false,
            message: 'Checkout not found',
          };
        }

        const package_id = checkoutExists.checkout_items[0].package_id;

        if (updateCheckoutDto.extra_services) {
          let extra_services: IExtraService[];
          if (updateCheckoutDto.extra_services instanceof Array) {
            extra_services = updateCheckoutDto.extra_services;
          } else {
            extra_services = JSON.parse(updateCheckoutDto.extra_services);
          }
          for (const extra_service of extra_services) {
            await prisma.packageExtraService.create({
              data: {
                package_id: package_id,
                extra_service_id: extra_service.id,
              },
            });
          }
        }

        // create checkout
        const checkout = await prisma.checkout.update({
          where: {
            id: id,
          },
          data: {
            ...data,
          },
        });

        if (!checkout) {
          return {
            success: false,
            message: 'Checkout not created',
          };
        }

        // create booking-travellers
        if (updateCheckoutDto.booking_travellers) {
          let booking_travellers: IBookingTraveller[];
          if (updateCheckoutDto.extra_services instanceof Array) {
            booking_travellers = updateCheckoutDto.booking_travellers;
          } else {
            booking_travellers = JSON.parse(
              updateCheckoutDto.booking_travellers,
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

        return {
          success: true,
          message: 'Checkout updated successfully.',
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
      const checkoutData = await this.prisma.checkout.findUnique({
        where: { id: id },
        select: {
          id: true,
          email: true,
          phone_number: true,
          address1: true,
          address2: true,
          zip_code: true,
          state: true,
          city: true,
          country: true,
          checkout_travellers: {
            select: {
              full_name: true,
              type: true,
            },
          },
          checkout_extra_services: {
            select: {
              extra_service: true,
            },
          },
          checkout_items: {
            select: {
              start_date: true,
              end_date: true,
              package: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  price: true,
                  duration: true,
                  destination: {
                    select: {
                      id: true,
                      name: true,
                      country: {
                        select: {
                          name: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });

      if (!checkoutData) {
        return {
          success: false,
          message: 'Checkout not found',
        };
      }

      // get reviews for the package
      const reviews = await this.prisma.review.findMany({
        where: {
          package_id: checkoutData.checkout_items[0].package.id,
        },
        select: {
          id: true,
          rating_value: true,
          comment: true,
        },
      });

      // calculate avarage rating
      let totalRating = 0;
      let totalReviews = 0;
      for (const review of reviews) {
        totalRating += review.rating_value;
        totalReviews++;
      }

      const averageRating = totalRating / totalReviews;

      checkoutData['average_rating'] = averageRating;

      return {
        success: true,
        data: {
          currency: 'USD',
          checkout: checkoutData,
          fees: 50,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async applyCoupon(user_id: string, coupons: ICoupon[], checkout_id: string) {
    try {
      const checkout = await this.prisma.checkout.findUnique({
        where: {
          id: checkout_id,
        },
        select: {
          id: true,
          checkout_items: {
            select: {
              package_id: true,
            },
          },
          checkout_extra_services: {
            select: {
              extra_service_id: true,
            },
          },
        },
      });

      if (!checkout) {
        return {
          success: false,
          message: 'Checkout not found',
        };
      }

      if (!checkout.checkout_items || checkout.checkout_items.length == 0) {
        return {
          success: false,
          message: 'Checkout items not found',
        };
      }

      // apply coupon
      if (coupons) {
        if (coupons instanceof Array) {
          coupons = coupons;
        } else {
          coupons = JSON.parse(coupons);
        }
        for (const coupon of coupons) {
          const code = coupon['code'];

          // apply coupon
          await CouponRepository.applyCoupon({
            user_id,
            coupon_code: code,
            package_id: checkout.checkout_items[0].package_id,
            checkout_id: checkout.id,
          });
        }
      }

      return {
        success: true,
        message: 'Coupon applied successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
