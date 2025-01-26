import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateBookingDto } from './dto/create-booking.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { BookingRepository } from '../../../common/repository/booking/booking.repository';
import { StripePayment } from '../../../common/lib/Payment/stripe/StripePayment';
import { CheckoutRepository } from '../../../common/repository/checkout/checkout.repository';
import { UserRepository } from 'src/common/repository/user/user.repository';

@Injectable()
export class BookingService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async create(
    user_id: string,
    checkout_id: string,
    createBookingDto: CreateBookingDto,
  ) {
    try {
      const result = await this.prisma.$transaction(async (prisma) => {
        const checkout = await prisma.checkout.findUnique({
          where: {
            id: checkout_id,
          },
          include: {
            checkout_extra_services: true,
            checkout_items: {
              include: {
                package: true,
              },
            },
            checkout_travellers: true,
          },
        });

        if (!checkout) {
          return {
            success: false,
            message: 'Checkout not found',
          };
        }

        if (!user_id) {
          return {
            success: false,
            message: 'User not found',
          };
        }

        const data = {};
        // user details
        if (checkout.email) {
          data['email'] = checkout.email;
        }
        if (checkout.phone_number) {
          data['phone_number'] = checkout.phone_number;
        }
        if (checkout.address1) {
          data['address1'] = checkout.address1;
        }
        if (checkout.address2) {
          data['address2'] = checkout.address2;
        }
        if (checkout.city) {
          data['city'] = checkout.city;
        }
        if (checkout.state) {
          data['state'] = checkout.state;
        }
        if (checkout.zip_code) {
          data['zip_code'] = checkout.zip_code;
        }
        if (checkout.country) {
          data['country'] = checkout.country;
        }

        // create invoice number
        const invoice_number = await BookingRepository.createInvoiceNumber();
        const total_price =
          await CheckoutRepository.calculateTotalPrice(checkout_id);

        // create booking
        const booking = await prisma.booking.create({
          data: {
            ...data,
            invoice_number: invoice_number,
            user_id: user_id,
          },
        });

        if (checkout.checkout_extra_services.length > 0) {
          for (const extra_service of checkout.checkout_extra_services) {
            await prisma.bookingExtraService.create({
              data: {
                booking_id: booking.id,
                extra_service_id: extra_service.id,
              },
            });
          }
        }

        // create booking-items
        for (const item of checkout.checkout_items) {
          await prisma.bookingItem.create({
            data: {
              booking_id: booking.id,
              package_id: item.package_id,
              start_date: item.start_date,
              end_date: item.end_date,
              price: item.package.price,
            },
          });
        }

        // create booking-travellers
        for (const traveller of checkout.checkout_travellers) {
          await prisma.bookingTraveller.create({
            data: {
              booking_id: booking.id,
              full_name: traveller.full_name,
              type: traveller.type,
            },
          });
        }

        // apply coupon
        if (checkout.user_id) {
          const temp_redeems = await prisma.tempRedeem.findMany({
            where: {
              user_id: checkout.user_id,
              checkout_id: checkout.id,
            },
          });

          if (temp_redeems.length > 0) {
            for (const redeem of temp_redeems) {
              await prisma.bookingCoupon.create({
                data: {
                  booking_id: booking.id,
                  coupon_id: redeem.coupon_id,
                },
              });
            }
          }
        }

        const userDetails = await UserRepository.getUserDetails(user_id);

        const currency = 'usd';
        // calculate tax
        const tax_calculation = await StripePayment.calculateTax({
          amount: total_price,
          currency: currency,
          customer_id: userDetails.billing_id,
        });

        // create payment intent
        const paymentIntent = await StripePayment.createPaymentIntent({
          amount: total_price,
          currency: currency,
          customer_id: userDetails.billing_id,
          metadata: {
            tax_calculation: tax_calculation.id,
          },
        });

        // create transaction
        await prisma.paymentTransaction.create({
          data: {
            booking_id: booking.id,
            reference_number: paymentIntent.id,
            amount: total_price,
            currency: 'usd',
            status: 'pending',
          },
        });
        // await TransactionRepository.createTransaction({
        //   booking_id: booking.id,
        //   reference_number: paymentIntent.id,
        //   amount: total_price,
        //   currency: 'usd',
        //   status: 'pending',
        // });

        // delete checkout
        await prisma.checkout.delete({
          where: {
            id: checkout.id,
          },
        });

        return {
          success: true,
          message: 'Booking created successfully.',
          data: {
            client_secret: paymentIntent.client_secret,
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

  async findAll(user_id: string) {
    try {
      const bookings = await this.booking.findMany({
        where: {
          user_id: user_id,
        },
        select: {
          id: true,
          invoice_number: true,
          email: true,
          phone_number: true,
          address1: true,
          address2: true,
          city: true,
          state: true,
          zip_code: true,
          country: true,
          created_at: true,
          updated_at: true,
        },
      });

      return {
        success: true,
        data: bookings,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findOne(id: string, user_id: string) {
    try {
      const booking = await this.booking.findUnique({
        where: {
          id: id,
          user_id: user_id,
        },
        select: {
          id: true,
          invoice_number: true,
          email: true,
          phone_number: true,
          address1: true,
          address2: true,
          city: true,
          state: true,
          zip_code: true,
          country: true,
          created_at: true,
          updated_at: true,
        },
      });

      if (!booking) {
        return {
          success: false,
          message: 'Booking information not found',
        };
      }

      return {
        success: true,
        data: booking,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
