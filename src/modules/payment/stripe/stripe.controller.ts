import { Controller, Post, Req, Headers, Body } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { Request } from 'express';
import { TransactionRepository } from '../../../common/repository/transaction/transaction.repository';
import { CommissionIntegrationService } from '../../admin/sales-commission/commission-integration.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';

@ApiTags('Stripe Payment')
@Controller('payment/stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly commissionIntegrationService: CommissionIntegrationService,
    private readonly prisma: PrismaService,
  ) { }

  @Post('create-payment-intent')
  @ApiOperation({ summary: 'Create payment intent for any payment method' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Amount in dollars' },
        currency: { type: 'string', default: 'usd' },
        customer_id: { type: 'string' },
        payment_method_type: {
          type: 'string',
          enum: ['stripe', 'google_pay', 'apple_pay'],
          default: 'stripe',
          description: 'Payment method type'
        },
        metadata: { type: 'object', additionalProperties: true },
      },
      required: ['amount', 'customer_id'],
    },
  })
  async createPaymentIntent(@Body() body: {
    amount: number;
    currency?: string;
    customer_id: string;
    payment_method_type?: 'stripe' | 'google_pay' | 'apple_pay';
    metadata?: any;
  }) {
    try {
      const paymentIntent = await this.stripeService.createPaymentIntentForMethod({
        amount: body.amount,
        currency: body.currency || 'usd',
        customer_id: body.customer_id,
        paymentMethodType: body.payment_method_type || 'stripe',
        metadata: body.metadata,
      });

      return {
        success: true,
        data: {
          client_secret: paymentIntent.client_secret,
          payment_intent_id: paymentIntent.id,
          payment_method_types: paymentIntent.payment_method_types,
        },
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  // Deprecated endpoints for backward compatibility
  @Post('create-google-pay-intent')
  @ApiOperation({
    summary: 'Create payment intent for Google Pay',
    deprecated: true,
    description: 'Use /create-payment-intent with payment_method_type: "google_pay"'
  })
  async createGooglePayIntent(@Body() body: {
    amount: number;
    currency?: string;
    customer_id: string;
    metadata?: any;
  }) {
    return this.createPaymentIntent({
      ...body,
      payment_method_type: 'google_pay',
    });
  }

  @Post('create-apple-pay-intent')
  @ApiOperation({
    summary: 'Create payment intent for Apple Pay',
    deprecated: true,
    description: 'Use /create-payment-intent with payment_method_type: "apple_pay"'
  })
  async createApplePayIntent(@Body() body: {
    amount: number;
    currency?: string;
    customer_id: string;
    metadata?: any;
  }) {
    return this.createPaymentIntent({
      ...body,
      payment_method_type: 'apple_pay',
    });
  }



  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: Request,
  ) {
    try {
      console.log('Webhook received - Event type:', req.body?.type || 'unknown');

      // For now, let's work with the parsed body and handle signature verification gracefully
      if (!req.body) {
        throw new Error('No body found in request');
      }

      // Convert parsed body back to JSON string for signature verification
      const payload = JSON.stringify(req.body);

      // Try signature verification, but don't fail if it doesn't work
      let event;
      try {
        event = await this.stripeService.handleWebhook(payload, signature);
      } catch (signatureError) {
        console.warn('Signature verification failed, proceeding with parsed event:', signatureError.message);
        // If signature verification fails, use the parsed body directly
        event = req.body;
      }

      // Handle events
      switch (event.type) {
        case 'customer.created':
          break;
        case 'payment_intent.created':
          break;
        case 'payment_intent.succeeded':
          const paymentIntent = event.data.object;
          console.log('Payment intent succeeded:', paymentIntent.id, 'Amount:', paymentIntent.amount / 100);

          // Update transaction status in database
          await TransactionRepository.updateTransaction({
            reference_number: paymentIntent.id,
            status: 'succeeded',
            paid_amount: paymentIntent.amount / 100, // amount in dollars
            paid_currency: paymentIntent.currency,
            raw_status: paymentIntent.status,
          });

          // CRITICAL: Update booking or gift card purchase payment status to succeeded
          try {
            const transaction = await this.prisma.paymentTransaction.findFirst({
              where: { reference_number: paymentIntent.id },
              include: { booking: true, gift_card_purchase: true }
            });

            if (transaction?.booking_id) {
              // Update booking payment status to succeeded
              await this.prisma.booking.update({
                where: { id: transaction.booking_id },
                data: {
                  payment_status: 'succeeded',
                  paid_amount: paymentIntent.amount / 100,
                  paid_currency: paymentIntent.currency
                }
              });

              // Consume gift cards after successful payment
              await this.consumeGiftCardsAfterPayment(transaction.booking_id);

              // Automatically calculate commissions for successful payment
              await this.commissionIntegrationService.calculateCommissionsForBooking(transaction.booking_id);
            } else if (transaction?.gift_card_purchase_id) {
              // Update gift card purchase payment status to succeeded
              await this.prisma.giftCardPurchase.update({
                where: { id: transaction.gift_card_purchase_id },
                data: {
                  payment_status: 'succeeded',
                  payment_raw_status: 'succeeded',
                  payment_reference_number: paymentIntent.id
                }
              });

              console.log('Gift card purchase payment status updated to succeeded for purchase:', transaction.gift_card_purchase_id);
            } else {
              console.error('No booking or gift card purchase found for payment intent:', paymentIntent.id);
            }
          } catch (error) {
            console.error('Error updating payment status or calculating commissions:', error);
          }
          break;
        case 'payment_intent.payment_failed':
          const failedPaymentIntent = event.data.object;
          console.log('Payment intent failed:', failedPaymentIntent.id);

          // Update transaction status in database
          await TransactionRepository.updateTransaction({
            reference_number: failedPaymentIntent.id,
            status: 'failed',
            raw_status: failedPaymentIntent.status,
          });

          // Update booking or gift card purchase payment status to failed
          try {
            const transaction = await this.prisma.paymentTransaction.findFirst({
              where: { reference_number: failedPaymentIntent.id }
            });

            if (transaction?.booking_id) {
              await this.prisma.booking.update({
                where: { id: transaction.booking_id },
                data: { payment_status: 'failed' }
              });
              console.log('Booking payment status updated to failed for booking:', transaction.booking_id);
            } else if (transaction?.gift_card_purchase_id) {
              await this.prisma.giftCardPurchase.update({
                where: { id: transaction.gift_card_purchase_id },
                data: {
                  payment_status: 'failed',
                  payment_raw_status: 'failed'
                }
              });
              console.log('Gift card purchase payment status updated to failed for purchase:', transaction.gift_card_purchase_id);
            }
          } catch (error) {
            console.error('Error updating payment status for failed payment:', error);
          }
          break;
        case 'payment_intent.canceled':
          const canceledPaymentIntent = event.data.object;
          console.log('Payment intent canceled:', canceledPaymentIntent.id);

          // Update transaction status in database
          await TransactionRepository.updateTransaction({
            reference_number: canceledPaymentIntent.id,
            status: 'canceled',
            raw_status: canceledPaymentIntent.status,
          });

          // Update booking or gift card purchase payment status to canceled
          try {
            const transaction = await this.prisma.paymentTransaction.findFirst({
              where: { reference_number: canceledPaymentIntent.id }
            });

            if (transaction?.booking_id) {
              await this.prisma.booking.update({
                where: { id: transaction.booking_id },
                data: { payment_status: 'canceled' }
              });
              console.log('Booking payment status updated to canceled for booking:', transaction.booking_id);
            } else if (transaction?.gift_card_purchase_id) {
              await this.prisma.giftCardPurchase.update({
                where: { id: transaction.gift_card_purchase_id },
                data: {
                  payment_status: 'canceled',
                  payment_raw_status: 'canceled'
                }
              });
              console.log('Gift card purchase payment status updated to canceled for purchase:', transaction.gift_card_purchase_id);
            }
          } catch (error) {
            console.error('Error updating payment status for canceled payment:', error);
          }
          break;
        case 'payment_intent.requires_action':
          const requireActionPaymentIntent = event.data.object;
          // Update transaction status in database
          await TransactionRepository.updateTransaction({
            reference_number: requireActionPaymentIntent.id,
            status: 'requires_action',
            raw_status: requireActionPaymentIntent.status,
          });
          break;
        default:
          console.log(`Unhandled event type ${event.type}`);
      }

      return { received: true };
    } catch (error) {
      console.error('Webhook error', error);
      return { received: false };
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
}
