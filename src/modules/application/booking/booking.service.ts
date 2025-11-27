import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BookingRepository } from '../../../common/repository/booking/booking.repository';

import { UserRepository } from '../../../common/repository/user/user.repository';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import appConfig from '../../../config/app.config';
import { NotificationRepository } from '../../../common/repository/notification/notification.repository';
import { MessageGateway } from '../../../modules/chat/message/message.gateway';
import { BookingUtilsService } from '../../../common/services/booking-utils.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CheckCancellationDto } from './dto/check-cancellation.dto';
import { CancellationStatusDto } from './dto/cancellation-status.dto';
import { CancellationCalculatorService } from '../../../common/services/cancellation-calculator.service';
import { UnifiedPaymentService } from '../../payment/unified/unified-payment.service';
import { PaymentMethodType } from '../checkout/dto/payment-method.dto';
import { EscrowService } from '../../payment/escrow/escrow.service';

@Injectable()
export class BookingService {
  constructor(
    private prisma: PrismaService,
    private bookingUtils: BookingUtilsService,
    private messageGateway: MessageGateway,
    private cancellationCalculator: CancellationCalculatorService,
    private unifiedPaymentService: UnifiedPaymentService,
    private escrowService: EscrowService,
  ) { }

  async create(userId: string, createBookingDto: CreateBookingDto) {
    try {
      // First, create the booking within a transaction
      const bookingResult = await this.prisma.$transaction(async (prisma) => {
        // Validate user
        if (!userId) return { success: false, message: 'User not found' };
        const user = await UserRepository.getUserDetails(userId);
        if (!user) return { success: false, message: 'User not found' };

        // Fetch and validate checkout
        const checkout = await prisma.checkout.findUnique({
          where: { id: createBookingDto.checkout_id },
          include: {
            checkout_extra_services: { include: { extra_service: true } },
            checkout_items: { include: { package: true } },
            checkout_travellers: true,
            temp_redeems: { include: { coupon: true } },
            checkout_gift_cards: { include: { gift_card_purchase: { include: { gift_card: true } } } },
          },
        });
        if (!checkout) return { success: false, message: 'Checkout not found' };

        // Calculate traveler counts
        const travelerCounts = this.calculateTravelerCounts(checkout.checkout_travellers);

        // Calculate prices
        let totalPrice = 0;
        for (const item of checkout.checkout_items) {
          totalPrice += Number(item.final_price || item.total_price || 0);
        }
        for (const service of checkout.checkout_extra_services) {
          totalPrice += Number(service.extra_service.price || 0);
        }
        if (totalPrice <= 0) return { success: false, message: 'Invalid total price' };

        // Calculate coupon discounts
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

        // Add gift card discounts
        for (const checkoutGiftCard of checkout.checkout_gift_cards) {
          const quantity = checkoutGiftCard.quantity || 1;
          const giftCardAmount = Number(checkoutGiftCard.gift_card_purchase?.gift_card?.amount || 0);
          const giftCardDiscount = giftCardAmount * quantity;
          totalDiscount += giftCardDiscount;
          appliedCoupons.push({
            id: checkoutGiftCard.gift_card_purchase?.gift_card?.id,
            code: checkoutGiftCard.gift_card_purchase?.gift_card?.code,
            name: checkoutGiftCard.gift_card_purchase?.gift_card?.title || 'Gift Card',
            amount: giftCardDiscount,
            amount_type: 'fixed',
            discount_amount: giftCardDiscount,
            type: 'gift_card',
            quantity: quantity,
          });
        }
        const finalPrice = Math.max(0, totalPrice - totalDiscount);

        // Validate final price
        if (finalPrice <= 0) {
          return { success: false, message: 'Invalid final price. Please check your booking details.' };
        }

        // Reserve package slots
        for (const item of checkout.checkout_items) {
          if (item.package.type === 'package' || item.package.type === 'cruise') {
            const reservation = await this.bookingUtils.reservePackageSlots(
              item.package_id,
              item.selected_date.toISOString().split('T')[0],
              item.package.type,
              travelerCounts.total_travelers
            );
            if (!reservation.success) return { success: false, message: reservation.message };
          }
        }

        // Create booking
        const bookingType = createBookingDto.booking_type || 'book';
        const isImmediatePayment = bookingType === 'book';
        const paymentMethod = createBookingDto.payment_method || { type: PaymentMethodType.STRIPE, data: { amount: finalPrice, currency: 'usd' } };

        const bookingData = {
          user_id: userId,
          vendor_id: checkout.vendor_id || checkout.checkout_items[0].package.user_id,
          invoice_number: await BookingRepository.createInvoiceNumber(),
          total_amount: totalPrice,
          discount_amount: totalDiscount,
          final_price: finalPrice,
          adults_count: travelerCounts.adults_count,
          children_count: travelerCounts.children_count,
          infants_count: travelerCounts.infants_count,
          total_travelers: travelerCounts.total_travelers,
          type: createBookingDto.type || 'tour',
          booking_type: bookingType,
          payment_status: isImmediatePayment ? 'pending' : 'reserved',
          booking_date_time: new Date(),
          place_id: checkout.place_id || null,
          email: checkout.email,
          phone_number: checkout.phone_number,
          address1: checkout.address1,
          address2: checkout.address2,
          city: checkout.city,
          state: checkout.state,
          zip_code: checkout.zip_code,
          country: checkout.country,
          comments: createBookingDto.comments,
        };

        const booking = await prisma.booking.create({ data: bookingData });

        // Create booking items
        for (const item of checkout.checkout_items) {
          await prisma.bookingItem.create({
            data: {
              booking_id: booking.id,
              package_id: item.package_id,
              selected_date: item.selected_date,
              adults_count: item.adults_count,
              children_count: item.children_count,
              infants_count: item.infants_count,
              total_travelers: item.total_travelers,
              price_per_person: item.price_per_person,
              total_price: item.total_price,
              discount_amount: item.discount_amount,
              final_price: item.final_price,
              start_date: item.start_date,
              end_date: item.end_date,
              included_packages: item.included_packages,
              excluded_packages: item.excluded_packages,
              extra_services: item.extra_services,
              availability_id: item.availability_id,
              quantity: item.total_travelers || 1,
              price: item.final_price || item.total_price,
            },
          });
        }

        // Create booking extra services
        for (const service of checkout.checkout_extra_services) {
          await prisma.bookingExtraService.create({
            data: {
              booking_id: booking.id,
              extra_service_id: service.extra_service_id,
              price: service.extra_service.price,
            },
          });
        }

        // Create booking travelers
        for (const traveler of checkout.checkout_travellers) {
          await prisma.bookingTraveller.create({
            data: {
              booking_id: booking.id,
              full_name: traveler.full_name,
              type: traveler.type,
              age: traveler.age,
              gender: traveler.gender,
              first_name: traveler.first_name,
              last_name: traveler.last_name,
              email: traveler.email,
              phone_number: traveler.phone_number,
              address1: traveler.address1,
              address2: traveler.address2,
              city: traveler.city,
              state: traveler.state,
              zip_code: traveler.zip_code,
              country: traveler.country,
              price_per_person: traveler.price_per_person,
              discount_amount: traveler.discount_amount,
              final_price: traveler.final_price,
            },
          });
        }

        // Create booking coupons
        for (const tempRedeem of checkout.temp_redeems) {
          await prisma.bookingCoupon.create({
            data: {
              user_id: userId,
              booking_id: booking.id,
              coupon_id: tempRedeem.coupon_id,
              method: tempRedeem.coupon.method || 'code',
              code: tempRedeem.coupon.code,
              amount_type: tempRedeem.coupon.amount_type || 'percentage',
              amount: tempRedeem.coupon.amount,
            },
          });
        }

        // Create booking gift cards and process gift card transactions
        for (const checkoutGiftCard of checkout.checkout_gift_cards) {
          const quantity = checkoutGiftCard.quantity || 1;
          const giftCardAmount = Number(checkoutGiftCard.gift_card_purchase?.gift_card?.amount || 0);
          const amountUsed = giftCardAmount * quantity;

          // Create booking gift card record
          await prisma.bookingGiftCard.create({
            data: {
              booking_id: booking.id,
              gift_card_purchase_id: checkoutGiftCard.gift_card_purchase_id,
              user_id: userId,
              quantity: quantity,
              amount_used: amountUsed,
            },
          });
        }

        // Create booking availability
        for (const item of checkout.checkout_items) {
          const packageAvailability = await prisma.packageAvailability.findFirst({
            where: {
              package_id: item.package_id,
              status: 1,
              deleted_at: null,
              is_available: true,
              OR: [
                { start_date: item.selected_date, end_date: null },
                { start_date: { lte: item.selected_date }, end_date: { gte: item.selected_date } },
                { start_date: null, end_date: { gte: item.selected_date } },
                { start_date: { lte: item.selected_date }, end_date: null },
                { start_date: null, end_date: null },
              ],
            },
            orderBy: { created_at: 'desc' },
          });

          await prisma.bookingAvailability.create({
            data: {
              booking_id: booking.id,
              package_id: item.package_id,
              selected_date: item.selected_date,
              requested_adults: item.adults_count,
              requested_children: item.children_count,
              requested_infants: item.infants_count,
              requested_total: item.total_travelers,
              is_available: true,
              available_slots: packageAvailability?.available_slots || 0,
              remaining_slots: (packageAvailability?.available_slots || 0) - (item.total_travelers || 0),
              price_per_person: item.price_per_person,
              total_price: item.total_price,
              validation_message: 'Booking confirmed with slot reservation',
            },
          });
        }

        // Handle reserved payment (non-immediate)
        if (!isImmediatePayment) {
          await prisma.paymentTransaction.create({
            data: {
              user_id: userId,
              booking_id: booking.id,
              reference_number: `RESERVE-${booking.id}`,
              amount: finalPrice,
              currency: 'usd',
              status: 'reserved',
              provider: paymentMethod.type,
            },
          });
        }

        // Delete checkout
        await prisma.checkout.delete({ where: { id: createBookingDto.checkout_id } });

        // Return booking data for payment processing
        return {
          success: true,
          booking,
          bookingType,
          paymentMethod,
          finalPrice,
          totalPrice,
          totalDiscount,
          isImmediatePayment,
        };
      });

      if (!bookingResult.success) {
        return bookingResult;
      }

      const { booking, bookingType, paymentMethod, finalPrice, totalPrice, totalDiscount, isImmediatePayment } = bookingResult;

      // Handle immediate payment outside the transaction
      let paymentResult: { success: boolean; data?: any } = { success: true };
      if (isImmediatePayment) {
        // Ensure minimum payment amount for Stripe (50 cents for USD)
        const minimumAmount = 0.50; // $0.50 minimum for USD
        const paymentAmount = Math.max(finalPrice, minimumAmount);

        // Use UnifiedPaymentService for all payment methods
        paymentResult = await this.unifiedPaymentService.processPayment(userId, {
          booking_id: booking.id,
          payment_method: {
            type: paymentMethod.type,
            data: {
              amount: paymentAmount,
              currency: 'usd',
            },
          },
        });

        if (!paymentResult.success) {
          return { success: false, message: paymentResult['message'] || 'Payment failed' };
        }

        // Consume/delete gift card purchases after successful payment
        await this.consumeGiftCardsAfterPayment(booking.id);
      }

      // Create notification
      await NotificationRepository.createNotification({
        sender_id: userId,
        receiver_id: booking.vendor_id,
        text: 'New booking created',
        type: 'booking',
        entity_id: booking.id,
      });

      // Send real-time notification
      this.messageGateway.server.emit('notification', {
        sender_id: userId,
        receiver_id: booking.vendor_id,
        text: 'New booking created',
        type: 'booking',
        entity_id: booking.id,
      });

      return {
        success: true,
        message: bookingType === 'book'
          ? 'Booking created successfully. Please complete payment.'
          : 'Booking reserved successfully. Payment will be required later.',
        data: {
          booking_id: booking.id,
          booking_type: bookingType,
          payment_status: booking.payment_status,
          payment_method: paymentMethod.type,
          ...(paymentResult.data && { client_secret: paymentResult.data.client_secret }),
          total_amount: totalPrice,
          discount_amount: totalDiscount,
          final_price: finalPrice,
          currency: 'usd',
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  /**
   * Consume/delete gift card purchases after successful payment
   */
  private async consumeGiftCardsAfterPayment(bookingId: string) {
    try {
      // Get all gift cards used in this booking
      const bookingGiftCards = await this.prisma.bookingGiftCard.findMany({
        where: {
          booking_id: bookingId,
          deleted_at: null
        },
        include: {
          gift_card_purchase: true
        }
      });

      // Mark gift card purchases as consumed/deleted
      for (const bookingGiftCard of bookingGiftCards) {
        if (bookingGiftCard.gift_card_purchase) {
          await this.prisma.giftCardPurchase.update({
            where: { id: bookingGiftCard.gift_card_purchase.id },
            data: {
              deleted_at: new Date(),
              status: 0, // Mark as inactive/consumed
            }
          });

          // Also mark the gift card itself as consumed
          await this.prisma.giftCard.update({
            where: { id: bookingGiftCard.gift_card_purchase.gift_card_id },
            data: {
              deleted_at: new Date(),
              status: 0, // Mark as inactive/consumed
            }
          });
        }
      }

      console.log(`Successfully consumed ${bookingGiftCards.length} gift card(s) for booking ${bookingId}`);
    } catch (error) {
      console.error('Error consuming gift cards after payment:', error);
      // Don't throw error here as the booking is already created and payment is successful
      // Just log the error for debugging
    }
  }

  async findAll(params: {
    user_id?: string;
    q?: string;
    status?: number;
    approve?: string;
    page?: number;  // Add page parameter
    limit?: number; // Add limit parameter
  }) {
    try {
      const { page = 1, limit = 10 } = params; // Set default values for page and limit

      const where = { user_id: params.user_id };

      if (params.q) {
        where['OR'] = [
          { invoice_number: { contains: params.q, mode: 'insensitive' } },
          { user: { is: { name: { contains: params.q, mode: 'insensitive' } } } },
          {
            booking_items: {
              some: {
                package: { is: { name: { contains: params.q, mode: 'insensitive' } } },
              },
            },
          },
        ];
      }
      if (params.status) where['status'] = Number(params.status);
      if (params.approve) where['approved_at'] = params.approve === 'approved' ? { not: null } : null;

      // Calculate skip value for pagination
      const skip = (page - 1) * limit;

      // Get total count for pagination
      const total = await this.prisma.booking.count({
        where,
      });

      // Fetch bookings with pagination applied
      const bookings = await this.prisma.booking.findMany({
        where,
        orderBy: { created_at: 'desc' },
        skip,   // Apply skip for pagination
        take: limit,  // Apply limit for pagination
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
          total_amount: true,
          discount_amount: true,
          final_price: true,
          payment_status: true,
          status: true,
          type: true,
          booking_type: true,
          booking_date_time: true,
          payment_transactions: { select: { status: true, amount: true, currency: true } },
          booking_items: { select: { package: { select: { name: true } } } },
          booking_coupons: {
            select: {
              id: true,
              method: true,
              code: true,
              amount_type: true,
              amount: true,
              coupon: { select: { name: true, amount: true, amount_type: true } },
            },
          },
          booking_gift_cards: {
            select: {
              id: true,
              quantity: true,
              amount_used: true,
              gift_card_purchase: {
                select: {
                  gift_card: { select: { code: true, title: true } }
                }
              },
            },
          },
          user: { select: { id: true, name: true } },
          created_at: true,
          updated_at: true,
        },
      });

      const totalPages = Math.ceil(total / limit); // Calculate total pages

      return {
        success: true,
        data: bookings,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }


  async findOne(id: string, userId: string) {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id, user_id: userId },
        select: {
          id: true,
          invoice_number: true,
          status: true,
          vendor_id: true,
          user_id: true,
          type: true,
          booking_type: true,
          total_amount: true,
          discount_amount: true,
          final_price: true,
          payment_status: true,
          payment_raw_status: true,
          paid_amount: true,
          paid_currency: true,
          email: true,
          phone_number: true,
          address1: true,
          address2: true,
          city: true,
          state: true,
          zip_code: true,
          country: true,
          user: { select: { name: true, email: true, avatar: true } },
          booking_items: {
            select: {
              start_date: true,
              end_date: true,
              package: {
                select: {
                  id: true,
                  created_at: true,
                  updated_at: true,
                  status: true,
                  approved_at: true,
                  user_id: true,
                  name: true,
                  description: true,
                  price: true,
                  duration: true,
                  type: true,
                  user: { select: { id: true, name: true, type: true } },
                  package_languages: { select: { language: { select: { id: true, name: true } } } },
                  package_destinations: {
                    select: {
                      destination: { select: { id: true, name: true, country: { select: { id: true, name: true } } } },
                    },
                  },
                  cancellation_policy_id: true,
                  package_categories: { select: { category: { select: { id: true, name: true } } } },
                  package_files: { select: { id: true, file: true } },
                  reviews: {
                    select: {
                      id: true,
                      package_id: true,
                      rating_value: true,
                      comment: true,
                      created_at: true,
                      updated_at: true,
                      user: { select: { id: true, name: true, avatar: true } },
                    },
                  },
                },
              },
            },
          },
          booking_extra_services: { select: { extra_service: { select: { name: true, price: true } } } },
          booking_travellers: { select: { full_name: true, type: true } },
          booking_coupons: {
            select: {
              id: true,
              method: true,
              code: true,
              amount_type: true,
              amount: true,
              created_at: true,
              coupon: {
                select: {
                  id: true,
                  name: true,
                  description: true,
                  amount: true,
                  amount_type: true,
                  method: true,
                  code: true,
                  coupon_type: true,
                  coupon_ids: true,
                  starts_at: true,
                  expires_at: true,
                  min_type: true,
                  min_amount: true,
                  min_quantity: true,
                },
              },
            },
          },
          booking_gift_cards: {
            select: {
              id: true,
              quantity: true,
              amount_used: true,
              applied_at: true,
              gift_card_purchase: {
                select: {
                  gift_card: {
                    select: {
                      id: true,
                      code: true,
                      title: true,
                      message: true,
                      amount: true,
                      currency: true,
                    },
                  },
                },
              },
            },
          },
          payment_transactions: {
            select: { amount: true, currency: true, paid_amount: true, paid_currency: true, status: true },
          },
          place_point: {
            select: {
              place: {
                select: {
                  name: true,
                  type: true,
                  latitude: true,
                  longitude: true
                }
              }
            }
          },
          created_at: true,
          updated_at: true,
        },
      });

      if (!booking) return { success: false, message: 'Booking not found' };

      // Add avatar and image URLs
      if (booking.user?.avatar) {
        booking.user['avatar_url'] = SojebStorage.url(appConfig().storageUrl.avatar + booking.user.avatar);
      }
      for (const bookingItem of booking.booking_items) {
        for (const file of bookingItem.package.package_files) {
          if (file.file) {
            file['image_url'] = SojebStorage.url(appConfig().storageUrl.package + file.file);
          }
        }

        // Calculate average rating
        const reviews = bookingItem.package.reviews;
        const averageRating = reviews.length > 0
          ? reviews.reduce((sum, review) => sum + review.rating_value, 0) / reviews.length
          : 0;
        bookingItem.package['average_rating'] = averageRating;
      }

      // Add reviews count
      booking['reviews_count'] = await this.prisma.review.count({
        where: { package_id: booking.booking_items[0]?.package.id },
      });

      return { success: true, data: booking };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async processReservedPayment(bookingId: string, userId: string) {
    try {
      return await this.prisma.$transaction(async (prisma) => {
        const booking = await prisma.booking.findUnique({
          where: { id: bookingId, user_id: userId, payment_status: 'reserved' },
          include: { payment_transactions: { where: { status: 'reserved' } } },
        });
        if (!booking) return { success: false, message: 'Reserved booking not found or already paid' };

        const finalPrice = Number(booking.final_price || booking.total_amount);
        const paymentAmount = Math.max(finalPrice, 50);

        // Use UnifiedPaymentService for consistent payment processing
        const paymentResult = await this.unifiedPaymentService.processPayment(userId, {
          booking_id: booking.id,
          payment_method: {
            type: PaymentMethodType.STRIPE,
            data: {
              amount: paymentAmount,
              currency: 'usd',
            },
          },
        });

        if (!paymentResult.success) {
          return { success: false, message: paymentResult['message'] || 'Payment failed' };
        }

        const paymentIntent = paymentResult.data;

        await prisma.paymentTransaction.update({
          where: { id: booking.payment_transactions[0].id },
          data: {
            reference_number: paymentIntent.id,
            amount: finalPrice,
            status: 'pending',
            provider: 'stripe',
          },
        });

        await prisma.booking.update({
          where: { id: bookingId },
          data: { payment_status: 'pending' },
        });

        return {
          success: true,
          message: 'Payment intent created for reserved booking',
          data: {
            client_secret: paymentIntent.client_secret,
            booking_id: booking.id,
            booking_type: booking.booking_type,
            total_amount: finalPrice,
            currency: 'usd',
          },
        };
      });
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async downloadInvoice(paymentIntentId: string) {
    try {
      // Import StripePayment only for specific utility functions
      const { StripePayment } = await import('../../../common/lib/Payment/stripe/StripePayment');
      const invoice = await StripePayment.downloadInvoiceFile(paymentIntentId);
      return { success: true, data: invoice };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async sendInvoiceToEmail(paymentIntentId: string) {
    try {
      // Import StripePayment only for specific utility functions
      const { StripePayment } = await import('../../../common/lib/Payment/stripe/StripePayment');
      await StripePayment.sendInvoiceToEmail(paymentIntentId);
      return { success: true, message: 'Invoice sent successfully' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  private calculateTravelerCounts(checkoutTravellers: any[]) {
    const counts = { adults_count: 0, children_count: 0, infants_count: 0, total_travelers: 0 };
    if (!checkoutTravellers || !checkoutTravellers.length) return counts;

    for (const traveler of checkoutTravellers) {
      counts.total_travelers++;
      switch (traveler.type?.toLowerCase()) {
        case 'adult':
          counts.adults_count++;
          break;
        case 'child':
          counts.children_count++;
          break;
        case 'infant':
          counts.infants_count++;
          break;
        default:
          counts.adults_count++;
      }
    }
    return counts;
  }

  async checkCancellationEligibility(
    checkCancellationDto: CheckCancellationDto, user_id: string
  ) {
    try {
      // Get booking with package and availability information
      const booking = await this.prisma.booking.findFirst({
        where: {
          id: checkCancellationDto.booking_id,
          user_id: user_id,
          deleted_at: null,
        },
        include: {
          booking_items: {
            select: {
              package: {
                select: {
                  id: true,
                  name: true,
                  cancellation_policy_id: true,
                  cancellation_policy: {
                    select: {
                      id: true,
                      policy: true,
                      description: true,
                    },
                  },
                },
              },
            },
            take: 1,
          },
          booking_availabilities: {
            select: {
              selected_date: true,
            },
            take: 1,
          },
        },
      });

      if (!booking) {
        return {
          success: false,
          message: 'Booking not found or access denied',
        };
      }

      // Check if booking is already cancelled
      if (booking.status === 'cancelled') {
        return {
          success: false,
          message: 'Booking is already cancelled',
        };
      }

      // Get package information
      const bookingItem = booking.booking_items[0];
      if (!bookingItem || !bookingItem.package) {
        return {
          success: false,
          message: 'Package information not found',
        };
      }

      // Get tour start time from booking availability
      const availability = booking.booking_availabilities[0];
      if (!availability || !availability.selected_date) {
        return {
          success: false,
          message: 'Tour start date not found',
        };
      }

      // Use selected date as tour start (assuming 9 AM start time)
      const tourStartDate = new Date(availability.selected_date);
      tourStartDate.setHours(9, 0, 0, 0); // Default to 9 AM

      // Default timezone (can be enhanced to get from destination later)
      const destinationTimezone = 'America/Mexico_City'; // Default timezone

      // Calculate cancellation deadline using the calculator service
      const calculation = this.cancellationCalculator.calculateCancellationDeadline(
        tourStartDate,
        destinationTimezone,
        24, // 24 hours cancellation window
      );

      // Get policy text
      const policyText = this.cancellationCalculator.getCancellationPolicyText(
        calculation.canCancel,
        calculation.hoursRemaining,
        destinationTimezone,
      );

      const response: CancellationStatusDto = {
        can_cancel: calculation.canCancel,
        cancellation_deadline: calculation.cancellationDeadline.toISOString(),
        cancellation_deadline_display: calculation.cancellationDeadlineDisplay,
        hours_remaining: calculation.hoursRemaining,
        is_non_refundable: calculation.isNonRefundable,
        policy_description: policyText.description,
        tour_start_time: tourStartDate.toISOString(),
        destination_timezone: destinationTimezone,
        booking_status: booking.status,
        package_name: bookingItem.package.name,
      };

      return {
        success: true,
        data: response,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async cancelBooking(
    checkCancellationDto: CheckCancellationDto,
    user_id: string,
  ): Promise<{ success: boolean; data?: any; message?: string }> {
    try {
      // First check if booking can be cancelled
      const eligibilityCheck = await this.checkCancellationEligibility(checkCancellationDto, user_id);

      if (!eligibilityCheck.success) {
        return eligibilityCheck;
      }

      if (!eligibilityCheck.data.can_cancel) {
        return {
          success: false,
          message: 'Booking cannot be cancelled. It is non-refundable.',
        };
      }

      // Get booking with all related data
      const booking = await this.prisma.booking.findFirst({
        where: {
          id: checkCancellationDto.booking_id,
          user_id: user_id,
          deleted_at: null,
        },
        include: {
          booking_items: {
            select: {
              package: {
                select: {
                  id: true,
                  name: true,
                  type: true,
                },
              },
              selected_date: true,
              total_travelers: true,
            },
          },
          payment_transactions: {
            where: {
              status: { in: ['succeeded', 'pending'] },
            },
            orderBy: { created_at: 'desc' },
            take: 1,
          },
        },
      });

      if (!booking) {
        return {
          success: false,
          message: 'Booking not found or access denied',
        };
      }

      // Check if booking is already cancelled
      if (booking.status === 'cancelled') {
        return {
          success: false,
          message: 'Booking is already cancelled',
        };
      }

      return await this.prisma.$transaction(async (prisma) => {
        // Update booking status to cancelled
        await prisma.booking.update({
          where: { id: booking.id },
          data: { status: 'cancelled' },
        });

        // Update payment transaction status
        if (booking.payment_transactions.length > 0) {
          const latestTransaction = booking.payment_transactions[0];

          if (latestTransaction.status === 'succeeded') {
            // Process refund if payment was successful
            try {
              // Call Stripe to process the refund
              const { StripePayment } = await import('../../../common/lib/Payment/stripe/StripePayment');
              const refund = await StripePayment.createRefund({
                payment_intent_id: latestTransaction.reference_number,
              });
              // payment_status: 'refunded'
              await prisma.booking.update({
                where: { id: booking.id },
                data: { payment_status: 'refunded' },
              });
              // update payment calculation
              const commissionCalculation = await prisma.commissionCalculation.findFirst({
                where: { booking_id: booking.id },  // Use booking_id as condition
              });

              if (commissionCalculation) {
                // Update commission status to 'refunded'
                await prisma.commissionCalculation.update({
                  where: { id: commissionCalculation.id },  // Use the unique id of the commission calculation
                  data: { commission_status: 'refunded' },
                });
              }
              // Update transaction status to refunded
              await prisma.paymentTransaction.update({
                where: { id: latestTransaction.id },
                data: { status: 'refunded' },
              });
              console.log(`Refund processed for payment: ${latestTransaction.reference_number}, refund id: ${refund.id}`);
            } catch (refundError) {
              console.error('Refund processing failed:', refundError);
              // Continue with cancellation even if refund fails
            }
          } else if (latestTransaction.status === 'pending') {
            // Cancel pending payment
            await prisma.paymentTransaction.update({
              where: { id: latestTransaction.id },
              data: { status: 'cancelled' },
            });
          }
        }

        // Release package slots back to availability
        for (const item of booking.booking_items) {
          if (item.package.type === 'package' || item.package.type === 'cruise') {
            // Find the package availability for the selected date
            const packageAvailability = await prisma.packageAvailability.findFirst({
              where: {
                package_id: item.package.id,
                status: 1,
                deleted_at: null,
                OR: [
                  { start_date: item.selected_date, end_date: null },
                  { start_date: { lte: item.selected_date }, end_date: { gte: item.selected_date } },
                  { start_date: null, end_date: { gte: item.selected_date } },
                  { start_date: { lte: item.selected_date }, end_date: null },
                  { start_date: null, end_date: null },
                ],
              },
            });

            if (packageAvailability) {
              // Increase available slots
              await prisma.packageAvailability.update({
                where: { id: packageAvailability.id },
                data: {
                  available_slots: {
                    increment: item.total_travelers || 1,
                  },
                },
              });
            }
          }
        }

        // Create notification for vendor
        await prisma.notificationEvent.create({
          data: {
            type: 'booking',
            text: `Booking ${booking.invoice_number} has been cancelled`,
          },
        }).then(async (event) => {
          await prisma.notification.create({
            data: {
              sender_id: user_id,
              receiver_id: booking.vendor_id,
              notification_event_id: event.id,
              entity_id: booking.id,
            },
          });
        });

        return {
          success: true,
          message: 'Booking cancelled successfully',
          data: {
            booking_id: booking.id,
            invoice_number: booking.invoice_number,
            cancellation_time: new Date().toISOString(),
            refund_processed: booking.payment_transactions.length > 0 &&
              booking.payment_transactions[0].status === 'succeeded',
          },
        };
      });
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  /**
   * Client confirms tour completion
   * Updates booking status and triggers payout for daily tours
   */
  async clientConfirmTour(bookingId: string, userId: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId, user_id: userId },
        include: {
          booking_items: {
            include: {
              package: true,
            },
          },
        },
      });

      if (!booking) {
        return { success: false, message: 'Booking not found or access denied' };
      }

      if (booking.status !== 'confirmed') {
        return {
          success: false,
          message: 'Booking must be confirmed before client confirmation',
        };
      }

      if (booking.client_confirmed_at) {
        return {
          success: false,
          message: 'Tour already confirmed by client',
        };
      }

      // Update booking with client confirmation
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          client_confirmed_at: new Date(),
          status: 'complete',
          completed_at: new Date(),
        },
      });

      // Check if it's a daily tour (weekly payout) or package (event-based)
      const isDailyTour = booking.booking_items.some(
        (item) =>
          item.package?.duration_type === 'hours' &&
          (item.package?.duration || 0) <= 24,
      );

      if (isDailyTour && booking.payout_schedule === 'weekly') {
        // For daily tours, funds will be released on next Monday via weekly payout
        // No immediate release needed
      } else {
        // For packages, trigger final release
        await this.escrowService.processFinalRelease(bookingId);
      }

      return {
        success: true,
        message: 'Tour confirmed by client successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to confirm tour',
      };
    }
  }

  /**
   * Mark booking as complete (admin/vendor action)
   * Triggers final payout for packages
   */
  async markBookingComplete(
    bookingId: string,
    userId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userType?: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Check if user is admin or vendor
      const user = await UserRepository.getUserDetails(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      const isAdmin = user.type === 'admin' || user.type === 'su_admin';
      const isVendor = user.type === 'vendor';

      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          booking_items: {
            include: {
              package: true,
            },
          },
        },
      });

      if (!booking) {
        return { success: false, message: 'Booking not found' };
      }

      // Check permissions
      if (!isAdmin && !(isVendor && booking.vendor_id === userId)) {
        return {
          success: false,
          message: 'Unauthorized to mark booking as complete',
        };
      }

      if (booking.status === 'complete') {
        return {
          success: false,
          message: 'Booking already marked as complete',
        };
      }

      // Update booking status
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'complete',
          completed_at: new Date(),
        },
      });

      // Check if it's a package (event-based payout)
      const isPackage = booking.booking_items.some(
        (item) =>
          item.package?.duration_type === 'days' ||
          (item.package?.duration_type === 'hours' &&
            (item.package?.duration || 0) > 24),
      );

      if (isPackage && booking.payout_schedule === 'event_based') {
        // Trigger final release for packages
        await this.escrowService.processFinalRelease(bookingId);
      }

      return {
        success: true,
        message: 'Booking marked as complete successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to mark booking as complete',
      };
    }
  }
}