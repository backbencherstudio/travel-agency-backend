import { Injectable } from '@nestjs/common';
import {
  CreateCheckoutDto,
  IExtraService,
  IPaymentMethod,
} from './dto/create-checkout.dto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRepository } from 'src/common/repository/user/user.repository';
import { CouponRepository } from 'src/common/repository/coupon/coupon.repository';
import { UpdateCheckoutDto } from './dto/update-checkout.dto';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';
import { CheckoutRepository } from 'src/common/repository/checkout/checkout.repository';
import { BookingUtilsService } from '../../../common/services/booking-utils.service';

@Injectable()
export class CheckoutService extends PrismaClient {
  constructor(
    private prisma: PrismaService,
    private bookingUtils: BookingUtilsService,
  ) {
    super();
  }

  async create(user_id: string, createCheckoutDto: CreateCheckoutDto) {
    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        // Enhanced validation
        const initialValidationErrors = [];

        // Check if user exists and is active
        const existingUserDetails = await UserRepository.getUserDetails(user_id);
        if (!existingUserDetails) {
          initialValidationErrors.push('User not found');
        } else if (existingUserDetails.status !== 1) {
          initialValidationErrors.push('User account is not active');
        }

        // Validate required fields
        if (!createCheckoutDto.package_id) {
          initialValidationErrors.push('Package id is required');
        }

        if (!createCheckoutDto.selected_date) {
          initialValidationErrors.push('Selected date is required');
        }

        // Check if we have traveler counts (required for checkout)
        const hasTravelerCounts = (createCheckoutDto.adults_count || 0) + (createCheckoutDto.children_count || 0) + (createCheckoutDto.infants_count || 0) > 0;

        if (!hasTravelerCounts) {
          initialValidationErrors.push('At least one traveler is required (adults_count, children_count, or infants_count)');
        }

        // Return validation errors if any
        if (initialValidationErrors.length > 0) {
          return {
            success: false,
            message: initialValidationErrors.join(', '),
            errors: initialValidationErrors,
          };
        }

        // Get package data with enhanced validation
        const packageData = await prisma.package.findUnique({
          where: {
            id: createCheckoutDto.package_id,
          },
          select: {
            id: true,
            name: true,
            description: true,
            price: true,
            final_price: true,
            type: true,
            status: true,
            approved_at: true,
            min_adults: true,
            max_adults: true,
            min_children: true,
            max_children: true,
            min_infants: true,
            max_infants: true,
            user_id: true,
            duration: true,
            duration_type: true,
          },
        });

        if (!packageData) {
          return {
            success: false,
            message: 'Package not found',
          };
        }

        // Validate package status
        if (packageData.status !== 1) {
          return {
            success: false,
            message: 'Package is not active',
          };
        }

        if (!packageData.approved_at) {
          return {
            success: false,
            message: 'Package is not approved',
          };
        }

        // Enhanced date validation
        const selectedDate = new Date(createCheckoutDto.selected_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Check if selected date is in the past
        if (selectedDate < today) {
          return {
            success: false,
            message: 'Selected date cannot be in the past',
          };
        }

        // Check if selected date is too far in the future (optional - 2 years)
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 2);
        if (selectedDate > maxDate) {
          return {
            success: false,
            message: 'Selected date cannot be more than 2 years in the future',
          };
        }

        // Enhanced traveler validation using shared utils
        const adults_count = createCheckoutDto.adults_count || 0;
        const children_count = createCheckoutDto.children_count || 0;
        const infants_count = createCheckoutDto.infants_count || 0;
        const total_travelers = adults_count + children_count + infants_count;

        // Validate traveler counts against package constraints
        const validationErrors = [];

        // Check minimum requirements
        if (adults_count < (packageData.min_adults || 1)) {
          validationErrors.push(`Minimum ${packageData.min_adults || 1} adult(s) required`);
        }

        // Check maximum limits
        if (adults_count > (packageData.max_adults || 10)) {
          validationErrors.push(`Maximum ${packageData.max_adults || 10} adults allowed`);
        }

        if (children_count > (packageData.max_children || 9)) {
          validationErrors.push(`Maximum ${packageData.max_children || 9} children allowed`);
        }

        if (infants_count > (packageData.max_infants || 2)) {
          validationErrors.push(`Maximum ${packageData.max_infants || 2} infants allowed`);
        }

        // Check total travelers limit (max 10 as per UI)
        if (total_travelers > 10) {
          validationErrors.push('Maximum 10 travelers total allowed');
        }

        // For checkout phase, we only work with traveler counts
        // Detailed traveler information will be collected during booking phase

        // Return validation errors if any
        if (validationErrors.length > 0) {
          return {
            success: false,
            message: validationErrors.join(', '),
            errors: validationErrors,
          };
        }

        // Check package availability using shared utils
        const availabilityValidation = await this.bookingUtils.validatePackageAvailability(
          createCheckoutDto.package_id,
          createCheckoutDto.selected_date,
          packageData.type
        );

        if (!availabilityValidation.is_available) {
          return {
            success: false,
            message: availabilityValidation.validation_message,
          };
        }

        // Create availability object for consistency
        const availability = {
          id: 'availability-check',
          available_slots: availabilityValidation.available_slots,
          is_available: availabilityValidation.is_available,
        };

        // Check if enough slots are available
        if (availability.available_slots && availability.available_slots < total_travelers) {
          return {
            success: false,
            message: `Only ${availability.available_slots} slots available for selected date`,
          };
        }

        // Calculate prices
        const price_per_person = packageData.final_price || packageData.price;
        const total_price = Number(price_per_person) * total_travelers;
        const discount_amount = createCheckoutDto.discount_amount || 0;
        const final_price = total_price - discount_amount;

        // Get vendor information
        const package_user_id = packageData.user_id;
        if (!package_user_id) {
          return {
            success: false,
            message: 'Package owner not found',
          };
        }

        const userDetails = await UserRepository.getUserDetails(package_user_id);
        if (!userDetails) {
          return {
            success: false,
            message: 'Package owner not found',
          };
        }

        const checkoutData: any = {
          user_id: user_id,
        };

        // Add vendor id if the package is from vendor
        if (userDetails.type === 'vendor') {
          checkoutData.vendor_id = userDetails.id;
        }

        // Add contact information if provided
        if (createCheckoutDto.first_name) checkoutData.first_name = createCheckoutDto.first_name;
        if (createCheckoutDto.last_name) checkoutData.last_name = createCheckoutDto.last_name;
        if (createCheckoutDto.email) checkoutData.email = createCheckoutDto.email;
        if (createCheckoutDto.phone_number) checkoutData.phone_number = createCheckoutDto.phone_number;
        if (createCheckoutDto.address1) checkoutData.address1 = createCheckoutDto.address1;
        if (createCheckoutDto.address2) checkoutData.address2 = createCheckoutDto.address2;
        if (createCheckoutDto.city) checkoutData.city = createCheckoutDto.city;
        if (createCheckoutDto.state) checkoutData.state = createCheckoutDto.state;
        if (createCheckoutDto.zip_code) checkoutData.zip_code = createCheckoutDto.zip_code;
        if (createCheckoutDto.country) checkoutData.country = createCheckoutDto.country;

        // Create checkout
        const checkout = await prisma.checkout.create({
          data: checkoutData,
        });

        if (!checkout) {
          return {
            success: false,
            message: 'Checkout not created',
          };
        }

        // Create checkout item with new fields
        const checkoutItemData: any = {
          checkout_id: checkout.id,
          package_id: createCheckoutDto.package_id,
          selected_date: new Date(createCheckoutDto.selected_date),
          adults_count,
          children_count,
          infants_count,
          total_travelers,
          price_per_person,
          total_price,
          discount_amount,
          final_price,
          availability_id: availability.id,
        };

        // Add date range for multi-day packages
        if (createCheckoutDto.start_date) {
          checkoutItemData.start_date = new Date(createCheckoutDto.start_date);
        }
        if (createCheckoutDto.end_date) {
          checkoutItemData.end_date = new Date(createCheckoutDto.end_date);
        }

        // Add package details
        if (createCheckoutDto.included_packages) {
          checkoutItemData.included_packages = createCheckoutDto.included_packages;
        }
        if (createCheckoutDto.excluded_packages) {
          checkoutItemData.excluded_packages = createCheckoutDto.excluded_packages;
        }
        if (createCheckoutDto.extra_services) {
          checkoutItemData.extra_services = createCheckoutDto.extra_services;
        }

        // Create checkout item
        await prisma.checkoutItem.create({
          data: checkoutItemData,
        });

        // Note: Availability validation is done above, no need to create availability records
        // since we're not using the packageAvailability model

        // Create extra services if provided
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

        // Note: No detailed traveler information is created during checkout
        // Traveler details will be collected during booking phase

        // Return checkout with calculated information
        const createdCheckout = await prisma.checkout.findUnique({
          where: { id: checkout.id },
          include: {
            checkout_items: {
              include: {
                package: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                    final_price: true,
                  },
                },
              },
            },
            checkout_travellers: true,
            checkout_extra_services: {
              include: {
                extra_service: true,
              },
            },

          },
        });

        return {
          success: true,
          message: 'Checkout created successfully.',
          data: {
            ...createdCheckout,
            calculated_prices: {
              price_per_person,
              total_price,
              discount_amount,
              final_price,
              travelers_summary: {
                adults: adults_count,
                children: children_count,
                infants: infants_count,
                total: total_travelers,
              },
            },
          },
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
        // if (updateCheckoutDto.email) {
        //   data.email = updateCheckoutDto.email;
        // } else {
        //   return {
        //     success: false,
        //     message: 'Email is required',
        //   };
        // }
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

        // Note: No detailed traveler information is updated during checkout
        // Traveler details will be collected during booking phase

        // create user payment methods
        if (updateCheckoutDto.payment_methods) {
          const payment_method: IPaymentMethod =
            updateCheckoutDto.payment_methods;

          const exp_month = Number(payment_method.expiry_date.split('/')[0]);
          const exp_year = Number(payment_method.expiry_date.split('/')[1]);

          const paymentMethodId = await StripePayment.createPaymentMethod({
            card: {
              number: payment_method.number,
              exp_month: exp_month,
              exp_year: exp_year,
              cvc: payment_method.cvc,
            },
            billing_details: {
              name: payment_method.name,
              // email: updateCheckoutDto.email,
              address: {
                city: updateCheckoutDto.city,
                country: updateCheckoutDto.country,
                line1: updateCheckoutDto.address1,
                line2: updateCheckoutDto.address2,
                postal_code: updateCheckoutDto.zip_code,
                state: updateCheckoutDto.state,
              },
            },
          });

          if (paymentMethodId) {
            const userDetails = await UserRepository.getUserDetails(user_id);

            // attach payment method to stripe customer
            await StripePayment.attachCustomerPaymentMethodId({
              customer_id: userDetails.billing_id,
              payment_method_id: paymentMethodId.id,
            });

            // make it default payment method
            await StripePayment.setCustomerDefaultPaymentMethodId({
              customer_id: userDetails.billing_id,
              payment_method_id: paymentMethodId.id,
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

  async findAll(user_id: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;

      const [checkouts, total] = await Promise.all([
        this.prisma.checkout.findMany({
          where: {
            user_id: user_id,
            deleted_at: null
          },
          skip,
          take: limit,
          orderBy: { created_at: 'desc' },
          select: {
            id: true,
            created_at: true,
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
                age: true,
              },
            },
            checkout_extra_services: {
              select: {
                extra_service: {
                  select: {
                    id: true,
                    name: true,
                    price: true,
                  },
                },
              },
            },
            checkout_items: {
              select: {
                selected_date: true,
                start_date: true,
                end_date: true,
                adults_count: true,
                children_count: true,
                infants_count: true,
                total_travelers: true,
                price_per_person: true,
                total_price: true,
                discount_amount: true,
                final_price: true,
                package: {
                  select: {
                    id: true,
                    name: true,
                    description: true,
                    price: true,
                    final_price: true,
                    duration: true,
                    duration_type: true,
                    type: true,
                    package_destinations: {
                      select: {
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
                    },
                  },
                },
              },
            },
            temp_redeems: {
              select: {
                id: true,
                coupon: {
                  select: {
                    id: true,
                    code: true,
                    name: true,
                    amount: true,
                    amount_type: true,
                  },
                },
              },
            },

          },
        }),
        this.prisma.checkout.count({
          where: {
            user_id: user_id,
            deleted_at: null
          },
        }),
      ]);

      const totalPages = Math.ceil(total / limit);
      const hasNextPage = page < totalPages;
      const hasPreviousPage = page > 1;

      return {
        success: true,
        data: {
          checkouts,
          pagination: {
            page,
            limit,
            total,
            totalPages,
            hasNextPage,
            hasPreviousPage,
          },
        },
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
              selected_date: true,
              start_date: true,
              end_date: true,
              package: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  price: true,
                  duration: true,
                  package_destinations: {
                    select: {
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
                  },
                },
              },
            },
          },
          temp_redeems: {
            select: {
              id: true,
              coupon: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                  amount: true,
                  amount_type: true,
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

  async applyCoupon({
    user_id,
    code,
    // coupons,
    checkout_id,
  }: {
    user_id: string;
    code: string;
    // coupons: ICoupon[];
    checkout_id: string;
  }) {
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
      const applyCoupon = await CouponRepository.applyCoupon({
        user_id: user_id,
        coupon_code: code,
        package_id: checkout.checkout_items[0].package_id,
        checkout_id: checkout.id,
      });

      const couponPrice = await CheckoutRepository.calculateCoupon(checkout_id);

      return {
        success: applyCoupon.success,
        message: applyCoupon.message,
        data: couponPrice,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async removeCoupon({
    coupon_id,
    user_id,
    checkout_id,
  }: {
    coupon_id: string;
    user_id: string;
    checkout_id: string;
  }) {
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

      // remove coupon
      const removeCoupon = await CouponRepository.removeCouponById({
        coupon_id: coupon_id,
        user_id: user_id,
        checkout_id: checkout.id,
      });

      const couponPrice = await CheckoutRepository.calculateCoupon(checkout_id);

      return {
        success: removeCoupon.success,
        message: removeCoupon.message,
        data: couponPrice,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }



  async remove(id: string, user_id: string) {
    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        // Check if checkout exists and belongs to user
        const checkout = await prisma.checkout.findUnique({
          where: {
            id: id,
          },
          select: {
            id: true,
            user_id: true,
            status: true,
          },
        });

        if (!checkout) {
          return {
            success: false,
            message: 'Checkout not found',
          };
        }

        // Verify ownership
        if (checkout.user_id !== user_id) {
          return {
            success: false,
            message: 'You are not authorized to delete this checkout',
          };
        }

        // Check if checkout can be deleted (not already processed)
        if (checkout.status && checkout.status !== 1) {
          return {
            success: false,
            message: 'Cannot delete checkout that has been processed',
          };
        }

        // Soft delete the checkout (set deleted_at)
        const deletedCheckout = await prisma.checkout.update({
          where: {
            id: id,
          },
          data: {
            deleted_at: new Date(),
          },
        });

        return {
          success: true,
          message: 'Checkout deleted successfully',
          data: {
            id: deletedCheckout.id,
            deleted_at: deletedCheckout.deleted_at,
          },
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
}
