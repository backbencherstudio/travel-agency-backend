import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRepository } from 'src/common/repository/user/user.repository';
import { CouponRepository } from 'src/common/repository/coupon/coupon.repository';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';
import { BookingUtilsService } from '../../../common/services/booking-utils.service';
import {
  CreateCheckoutDto,
} from './dto/create-checkout.dto';
import { CheckAvailabilityDto } from './dto/check-availability.dto';
import { UpdateCheckoutDto } from './dto/update-checkout.dto';

@Injectable()
export class CheckoutService extends PrismaClient {
  constructor(
    private prisma: PrismaService,
    private bookingUtils: BookingUtilsService,
  ) {
    super();
  }

  async checkAvailability(checkAvailabilityDto: CheckAvailabilityDto) {
    try {
      // Validate input
      const errors = [];
      if (!checkAvailabilityDto.package_id) errors.push('Package id is required');
      if (!checkAvailabilityDto.selected_date) errors.push('Selected date is required');
      const totalTravelers = (checkAvailabilityDto.adults_count || 0) +
        (checkAvailabilityDto.children_count || 0) +
        (checkAvailabilityDto.infants_count || 0);
      if (totalTravelers === 0) errors.push('At least one traveler is required');
      if (totalTravelers > 10) errors.push('Maximum 10 travelers allowed');

      if (errors.length > 0) {
        return { success: false, message: errors.join(', '), errors };
      }

      // Get package data
      const packageData = await this.prisma.package.findUnique({
        where: { id: checkAvailabilityDto.package_id },
        select: {
          id: true,
          name: true,
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
        },
      });

      if (!packageData) {
        return { success: false, message: 'Package not found' };
      }
      if (packageData.status !== 1) {
        return { success: false, message: 'Package is not active' };
      }
      if (!packageData.approved_at) {
        return { success: false, message: 'Package is not approved' };
      }

      // Validate traveler counts
      const travelerErrors = [];
      if (checkAvailabilityDto.adults_count < (packageData.min_adults || 1)) {
        travelerErrors.push(`Minimum ${packageData.min_adults || 1} adult(s) required`);
      }
      if (checkAvailabilityDto.adults_count > (packageData.max_adults || 10)) {
        travelerErrors.push(`Maximum ${packageData.max_adults || 10} adults allowed`);
      }
      if (checkAvailabilityDto.children_count > (packageData.max_children || 9)) {
        travelerErrors.push(`Maximum ${packageData.max_children || 9} children allowed`);
      }
      if (checkAvailabilityDto.infants_count > (packageData.max_infants || 2)) {
        travelerErrors.push(`Maximum ${packageData.max_infants || 2} infants allowed`);
      }

      if (travelerErrors.length > 0) {
        return { success: false, message: travelerErrors.join(', '), errors: travelerErrors };
      }

      // Check availability
      const availability = await this.bookingUtils.validatePackageAvailability(
        checkAvailabilityDto.package_id,
        checkAvailabilityDto.selected_date,
        packageData.type,
        totalTravelers
      );

      if (!availability.is_available) {
        return { success: false, message: availability.validation_message };
      }

      return {
        success: true,
        message: 'Package is available',
        data: {
          is_available: true,
          available_slots: availability.available_slots,
          validation_message: 'Package is available',
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async create(user_id: string, createCheckoutDto: CreateCheckoutDto) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        // Validate user
        const user = await UserRepository.getUserDetails(user_id);
        if (!user) return { success: false, message: 'User not found' };
        if (user.status !== 1) return { success: false, message: 'User account is not active' };

        // Validate input
        const errors = [];
        if (!createCheckoutDto.package_id) errors.push('Package id is required');
        if (!createCheckoutDto.selected_date) errors.push('Selected date is required');
        if (errors.length > 0) return { success: false, message: errors.join(', '), errors };

        // Validate selected date
        const selectedDate = new Date(createCheckoutDto.selected_date);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (selectedDate < today) return { success: false, message: 'Selected date cannot be in the past' };
        const maxDate = new Date();
        maxDate.setFullYear(maxDate.getFullYear() + 2);
        if (selectedDate > maxDate) return { success: false, message: 'Selected date cannot be more than 2 years in the future' };

        // Get package data
        const packageData = await prisma.package.findUnique({
          where: { id: createCheckoutDto.package_id },
          select: {
            id: true,
            name: true,
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

        if (!packageData) return { success: false, message: 'Package not found' };
        if (!packageData.approved_at) return { success: false, message: 'Package is not approved' };

        // Validate traveler counts
        const totalTravelers = (createCheckoutDto.adults_count || 0) +
          (createCheckoutDto.children_count || 0) +
          (createCheckoutDto.infants_count || 0);
        const travelerErrors = [];
        if (createCheckoutDto.adults_count < (packageData.min_adults || 1)) {
          travelerErrors.push(`Minimum ${packageData.min_adults || 1} adult(s) required`);
        }
        if (createCheckoutDto.adults_count > (packageData.max_adults || 10)) {
          travelerErrors.push(`Maximum ${packageData.max_adults || 10} adults allowed`);
        }
        if (createCheckoutDto.children_count > (packageData.max_children || 9)) {
          travelerErrors.push(`Maximum ${packageData.max_children || 9} children allowed`);
        }
        if (createCheckoutDto.infants_count > (packageData.max_infants || 2)) {
          travelerErrors.push(`Maximum ${packageData.max_infants || 2} infants allowed`);
        }
        if (totalTravelers > 10) travelerErrors.push('Maximum 10 travelers allowed');

        if (travelerErrors.length > 0) {
          return { success: false, message: travelerErrors.join(', '), errors: travelerErrors };
        }

        // Check availability
        const availability = await this.bookingUtils.validatePackageAvailability(
          createCheckoutDto.package_id,
          createCheckoutDto.selected_date,
          packageData.type,
          totalTravelers
        );
        if (!availability.is_available) {
          return { success: false, message: availability.validation_message };
        }

        // Calculate prices
        const pricePerPerson = packageData.final_price || packageData.price;
        const totalPrice = Number(pricePerPerson) * totalTravelers;
        const discountAmount = createCheckoutDto.discount_amount || 0;
        const finalPrice = Math.max(0, totalPrice - discountAmount);

        // Create checkout
        const checkoutData = {
          user_id,
          vendor_id: user.type === 'vendor' ? user.id : packageData.user_id,
          email: createCheckoutDto.email,
          phone_number: createCheckoutDto.phone_number,
          address1: createCheckoutDto.address1,
          address2: createCheckoutDto.address2,
          city: createCheckoutDto.city,
          state: createCheckoutDto.state,
          zip_code: createCheckoutDto.zip_code,
          country: createCheckoutDto.country,
        };

        const checkout = await prisma.checkout.create({ data: checkoutData });

        // Create checkout item
        const checkoutItemData = {
          checkout_id: checkout.id,
          package_id: createCheckoutDto.package_id,
          selected_date: new Date(createCheckoutDto.selected_date),
          start_date: createCheckoutDto.start_date ? new Date(createCheckoutDto.start_date) : null,
          end_date: createCheckoutDto.end_date ? new Date(createCheckoutDto.end_date) : null,
          adults_count: createCheckoutDto.adults_count || 0,
          children_count: createCheckoutDto.children_count || 0,
          infants_count: createCheckoutDto.infants_count || 0,
          total_travelers: totalTravelers,
          price_per_person: pricePerPerson,
          total_price: totalPrice,
          discount_amount: discountAmount,
          final_price: finalPrice,
          availability_id: availability.availability_id || 'availability-check',
        };

        await prisma.checkoutItem.create({ data: checkoutItemData });

        // Create extra services
        if (createCheckoutDto.extra_services) {
          const services = Array.isArray(createCheckoutDto.extra_services)
            ? createCheckoutDto.extra_services
            : JSON.parse(createCheckoutDto.extra_services);
          for (const service of services) {
            await prisma.checkoutExtraService.create({
              data: {
                package_id: createCheckoutDto.package_id,
                checkout_id: checkout.id,
                extra_service_id: service.id,
              },
            });
          }
        }

        // Create travelers
        if (createCheckoutDto.checkout_travellers?.length > 0) {
          for (const traveler of createCheckoutDto.checkout_travellers) {
            await prisma.checkoutTraveller.create({
              data: {
                checkout_id: checkout.id,
                full_name: traveler.full_name,
                type: traveler.type,
                age: traveler.age,
                gender: traveler.gender,
                first_name: traveler.first_name,
                last_name: traveler.last_name,
                phone_number: traveler.phone_number,
                address1: traveler.address1,
                address2: traveler.address2,
                email: traveler.email,
              },
            });
          }
        }

        return { success: true, message: 'Checkout created successfully', data: checkout };
      });
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async update(id: string, user_id: string, updateCheckoutDto: UpdateCheckoutDto) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        // Validate ownership
        const checkout = await prisma.checkout.findUnique({
          where: { id },
          select: { user_id: true },
        });
        if (!checkout) return { success: false, message: 'Checkout not found' };
        if (checkout.user_id !== user_id) {
          return { success: false, message: 'You are not authorized to modify this checkout' };
        }

        // Prepare update data
        const data = {};
        if (updateCheckoutDto.phone_number) data['phone_number'] = updateCheckoutDto.phone_number;
        if (updateCheckoutDto.address1) data['address1'] = updateCheckoutDto.address1;
        if (updateCheckoutDto.address2) data['address2'] = updateCheckoutDto.address2;
        if (updateCheckoutDto.city) data['city'] = updateCheckoutDto.city;
        if (updateCheckoutDto.state) data['state'] = updateCheckoutDto.state;
        if (updateCheckoutDto.zip_code) data['zip_code'] = updateCheckoutDto.zip_code;
        if (updateCheckoutDto.country) data['country'] = updateCheckoutDto.country;

        // Update checkout
        await prisma.checkout.update({
          where: { id },
          data,
        });

        // Handle extra services
        if (updateCheckoutDto.extra_services) {
          await prisma.checkoutExtraService.deleteMany({ where: { checkout_id: id } });
          const services = Array.isArray(updateCheckoutDto.extra_services)
            ? updateCheckoutDto.extra_services
            : JSON.parse(updateCheckoutDto.extra_services);
          for (const service of services) {
            await prisma.checkoutExtraService.create({
              data: {
                package_id: updateCheckoutDto.package_id,
                checkout_id: id,
                extra_service_id: service.id,
              },
            });
          }
        }

        // Handle payment method
        if (updateCheckoutDto.payment_methods) {
          const paymentMethod = updateCheckoutDto.payment_methods;
          const expMonth = Number(paymentMethod.expiry_date.split('/')[0]);
          const expYear = Number(paymentMethod.expiry_date.split('/')[1]);

          const paymentMethodId = await StripePayment.createPaymentMethod({
            card: {
              number: paymentMethod.number,
              exp_month: expMonth,
              exp_year: expYear,
              cvc: paymentMethod.cvc,
            },
            billing_details: {
              name: paymentMethod.name,
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
            await StripePayment.attachCustomerPaymentMethodId({
              customer_id: userDetails.billing_id,
              payment_method_id: paymentMethodId.id,
            });
            await StripePayment.setCustomerDefaultPaymentMethodId({
              customer_id: userDetails.billing_id,
              payment_method_id: paymentMethodId.id,
            });
          }
        }

        return { success: true, message: 'Checkout updated successfully' };
      });
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async findAll(user_id: string, page: number = 1, limit: number = 10) {
    try {
      const skip = (page - 1) * limit;
      const where = { user_id, deleted_at: null };

      const [checkouts, total] = await Promise.all([
        this.prisma.checkout.findMany({
          where,
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
            checkout_travellers: { select: { full_name: true, type: true, age: true } },
            checkout_extra_services: {
              select: { extra_service: { select: { id: true, name: true, price: true } } },
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
                        destination: { select: { id: true, name: true, country: { select: { id: true, name: true } } } },
                      },
                    },
                    package_availabilities: {
                      where: { status: 1, deleted_at: null, is_available: true },
                      select: { id: true, start_date: true, end_date: true, available_slots: true, is_available: true },
                      orderBy: { created_at: 'desc' },
                    },
                  },
                },
              },
            },
            temp_redeems: {
              select: { id: true, coupon: { select: { id: true, code: true, name: true, amount: true, amount_type: true } } },
            },
          },
        }),
        this.prisma.checkout.count({ where }),
      ]);

      const totalPages = Math.ceil(total / limit);
      return {
        success: true,
        data: {
          checkouts,
          pagination: { page, limit, total, totalPages, hasNextPage: page < totalPages, hasPreviousPage: page > 1 },
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async findOne(id: string) {
    try {
      const checkout = await this.prisma.checkout.findUnique({
        where: { id },
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
          checkout_travellers: { select: { full_name: true, type: true } },
          checkout_extra_services: { select: { extra_service: true } },
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
                  duration_type: true,
                  price: true,
                  duration: true,
                  type: true,
                  package_destinations: {
                    select: {
                      destination: { select: { id: true, name: true, country: { select: { id: true, name: true } } } },
                    },
                  },
                  package_availabilities: {
                    where: { status: 1, deleted_at: null, is_available: true },
                    select: { id: true, start_date: true, end_date: true, available_slots: true, is_available: true },
                    orderBy: { created_at: 'desc' },
                  },
                },
              },
            },
          },
          temp_redeems: {
            select: { id: true, coupon: { select: { id: true, code: true, name: true, amount: true, amount_type: true } } },
          },
        },
      });

      if (!checkout) return { success: false, message: 'Checkout not found' };

      // Calculate prices
      const prices = await this.calculateCheckoutPrices(id);
      const averageRating = await this.calculateAverageRating(checkout.checkout_items[0]?.package.id || '');

      return {
        success: true,
        data: { currency: 'USD', checkout, calculated_prices: prices, average_rating: averageRating },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async applyCoupon({ user_id, code, checkout_id }: { user_id: string; code: string; checkout_id: string }) {
    try {
      const checkout = await this.prisma.checkout.findUnique({
        where: { id: checkout_id },
        select: { id: true, checkout_items: { select: { package_id: true } } },
      });

      if (!checkout || !checkout.checkout_items.length) {
        return { success: false, message: 'Checkout or items not found' };
      }

      const applyCoupon = await CouponRepository.applyCoupon({
        user_id,
        coupon_code: code,
        package_id: checkout.checkout_items[0].package_id,
        checkout_id,
      });

      const prices = await this.calculateCheckoutPrices(checkout_id);
      return { success: applyCoupon.success, message: applyCoupon.message, data: prices };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async removeCoupon({ coupon_id, user_id, checkout_id }: { coupon_id: string; user_id: string; checkout_id: string }) {
    try {
      const checkout = await this.prisma.checkout.findUnique({
        where: { id: checkout_id },
        select: { id: true },
      });

      if (!checkout) return { success: false, message: 'Checkout not found' };

      const removeCoupon = await CouponRepository.removeCouponById({
        coupon_id,
        user_id,
        checkout_id,
      });

      const prices = await this.calculateCheckoutPrices(checkout_id);
      return { success: removeCoupon.success, message: removeCoupon.message, data: prices };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async remove(id: string, user_id: string) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        const checkout = await prisma.checkout.findUnique({
          where: { id },
          select: { user_id: true, status: true },
        });

        if (!checkout) return { success: false, message: 'Checkout not found' };
        if (checkout.user_id !== user_id) {
          return { success: false, message: 'You are not authorized to delete this checkout' };
        }
        if (checkout.status !== 1) {
          return { success: false, message: 'Cannot delete processed checkout' };
        }

        const deletedCheckout = await prisma.checkout.update({
          where: { id },
          data: { deleted_at: new Date() },
        });

        return {
          success: true,
          message: 'Checkout deleted successfully',
          data: { id: deletedCheckout.id, deleted_at: deletedCheckout.deleted_at },
        };
      });
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  private async calculateAverageRating(packageId: string): Promise<number> {
    try {
      const reviews = await this.prisma.review.findMany({
        where: { package_id: packageId },
        select: { rating_value: true },
      });

      if (!reviews.length) return 0;
      const totalRating = reviews.reduce((sum, review) => sum + review.rating_value, 0);
      return totalRating / reviews.length;
    } catch {
      return 0;
    }
  }

  private async calculateCheckoutPrices(checkoutId: string) {
    try {
      const checkout = await this.prisma.checkout.findFirst({
        where: { id: checkoutId },
        include: {
          checkout_items: { include: { package: true } },
          checkout_extra_services: { include: { extra_service: true } },
          temp_redeems: { include: { coupon: true } },
        },
      });

      if (!checkout) {
        return {
          price_per_person: '0',
          total_price: 0,
          discount_amount: 0,
          final_price: 0,
          travelers_summary: { adults: 0, children: 0, infants: 0, total: 0 },
          applied_coupons: [],
        };
      }

      let totalPrice = 0;
      let pricePerPerson = 0;
      const travelersSummary = { adults: 0, children: 0, infants: 0, total: 0 };

      for (const item of checkout.checkout_items) {
        totalPrice += Number(item.final_price || item.total_price || 0);
        travelersSummary.adults += item.adults_count || 0;
        travelersSummary.children += item.children_count || 0;
        travelersSummary.infants += item.infants_count || 0;
        travelersSummary.total += item.total_travelers || 0;
        if (item.package && travelersSummary.total > 0) {
          pricePerPerson = Number(item.package.price || 0);
        }
      }

      for (const service of checkout.checkout_extra_services) {
        totalPrice += Number(service.extra_service.price || 0);
      }

      let totalDiscount = 0;
      const appliedCoupons = [];
      for (const tempRedeem of checkout.temp_redeems) {
        const coupon = tempRedeem.coupon;
        let couponDiscount = 0;
        if (coupon.amount_type === 'percentage') {
          couponDiscount = (totalPrice * Number(coupon.amount)) / 100;
        } else if (coupon.amount_type === 'fixed') {
          couponDiscount = Math.min(Number(coupon.amount), totalPrice);
        }
        totalDiscount += couponDiscount;
        appliedCoupons.push({
          id: coupon.id,
          code: coupon.code,
          name: coupon.name,
          amount: coupon.amount,
          amount_type: coupon.amount_type,
          discount_amount: couponDiscount,
        });
      }

      const finalPrice = Math.max(0, totalPrice - totalDiscount);
      return {
        price_per_person: pricePerPerson.toString(),
        total_price: totalPrice,
        discount_amount: totalDiscount,
        final_price: finalPrice,
        travelers_summary: travelersSummary,
        applied_coupons: appliedCoupons,
      };
    } catch {
      return {
        price_per_person: '0',
        total_price: 0,
        discount_amount: 0,
        final_price: 0,
        travelers_summary: { adults: 0, children: 0, infants: 0, total: 0 },
        applied_coupons: [],
      };
    }
  }
}