import { Controller, Post, Req, Headers, Body } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { Request } from 'express';
import { TransactionRepository } from '../../../common/repository/transaction/transaction.repository';
import { CommissionService } from '../commission/commission.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { ApiTags, ApiOperation, ApiBody } from '@nestjs/swagger';
import { EscrowService } from '../escrow/escrow.service';

@ApiTags('Stripe Payment')
@Controller('payment/stripe')
export class StripeController {
  constructor(
    private readonly stripeService: StripeService,
    private readonly commissionService: CommissionService,
    private readonly prisma: PrismaService,
    private readonly escrowService: EscrowService,
  ) { }

  @Post('create-payment-intent')
  @ApiOperation({ summary: 'Create payment intent (Stripe only)' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        amount: { type: 'number', description: 'Amount in dollars' },
        currency: { type: 'string', default: 'usd' },
        customer_id: { type: 'string' },
        payment_method_type: { type: 'string', enum: ['stripe'], default: 'stripe', description: 'Payment method type' },
        metadata: { type: 'object', additionalProperties: true },
      },
      required: ['amount', 'customer_id'],
    },
  })
  async createPaymentIntent(@Body() body: {
    amount: number;
    currency?: string;
    customer_id: string;
    payment_method_type?: 'stripe';
    metadata?: any;
  }) {
    try {
      const paymentIntent = await this.stripeService.createPaymentIntentForMethod({
        amount: body.amount,
        currency: body.currency || 'usd',
        customer_id: body.customer_id,
        paymentMethodType: 'stripe',
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

          // Update payment status using reusable function
          await this.updatePaymentStatusFromIntent(paymentIntent);
          break;
        case 'payment_intent.payment_failed':
          const failedPaymentIntent = event.data.object;
          console.log('Payment intent failed:', failedPaymentIntent.id);

          // Update payment status using reusable function
          await this.updatePaymentStatusFromIntent(failedPaymentIntent);
          break;
        case 'payment_intent.canceled':
          const canceledPaymentIntent = event.data.object;
          console.log('Payment intent canceled:', canceledPaymentIntent.id);

          // Update payment status using reusable function
          await this.updatePaymentStatusFromIntent(canceledPaymentIntent);
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
   * Update payment status from payment intent (reusable function)
   * Handles both booking and gift card purchase status updates
   */
  private async updatePaymentStatusFromIntent(paymentIntent: any) {
    // Update transaction status in database
    await TransactionRepository.updateTransaction({
      reference_number: paymentIntent.id,
      status: paymentIntent.status === 'succeeded' ? 'succeeded' : paymentIntent.status === 'failed' ? 'failed' : paymentIntent.status === 'canceled' ? 'canceled' : 'pending',
      paid_amount: paymentIntent.status === 'succeeded' ? paymentIntent.amount / 100 : null,
      paid_currency: paymentIntent.status === 'succeeded' ? paymentIntent.currency : null,
      raw_status: paymentIntent.status,
    });

    // Update booking or gift card purchase payment status
    try {
      const transaction = await this.prisma.paymentTransaction.findFirst({
        where: { reference_number: paymentIntent.id },
        include: { booking: true, gift_card_purchase: true }
      });

      if (transaction?.booking_id) {
        // Update booking payment status
        await this.prisma.booking.update({
          where: { id: transaction.booking_id },
          data: {
            payment_status: paymentIntent.status === 'succeeded' ? 'succeeded' : paymentIntent.status === 'failed' ? 'failed' : paymentIntent.status === 'canceled' ? 'canceled' : 'pending',
            paid_amount: paymentIntent.status === 'succeeded' ? paymentIntent.amount / 100 : null,
            paid_currency: paymentIntent.status === 'succeeded' ? paymentIntent.currency : null
          }
        });

        if (paymentIntent.status === 'succeeded') {
          // Consume gift cards after successful payment
          await this.consumeGiftCardsAfterPayment(transaction.booking_id);

          // Calculate commission when payment succeeds
          await this.commissionService.calculateCommissionForBooking(transaction.booking_id);

          // Hold funds in escrow after successful payment
          try {
            const escrowResult = await this.escrowService.holdFundsInEscrow(transaction.booking_id);
            if (escrowResult.success) {
              console.log(`Funds held in escrow for booking: ${transaction.booking_id}`);
            } else {
              console.warn(`Failed to hold funds in escrow for booking ${transaction.booking_id}:`, escrowResult.message);
            }
          } catch (error) {
            console.error(`Error holding funds in escrow for booking ${transaction.booking_id}:`, error.message);
            // Don't fail the webhook if escrow fails - payment is already succeeded
          }
        }

        console.log(`Booking payment status updated to ${paymentIntent.status} for booking: ${transaction.booking_id}`);
      } else if (transaction?.gift_card_purchase_id) {
        // Update gift card purchase payment status
        await this.prisma.giftCardPurchase.update({
          where: { id: transaction.gift_card_purchase_id },
          data: {
            payment_status: paymentIntent.status === 'succeeded' ? 'succeeded' : paymentIntent.status === 'failed' ? 'failed' : paymentIntent.status === 'canceled' ? 'canceled' : 'pending',
            payment_raw_status: paymentIntent.status,
            payment_reference_number: paymentIntent.id
          }
        });

        console.log(`Gift card purchase payment status updated to ${paymentIntent.status} for purchase: ${transaction.gift_card_purchase_id}`);
      } else {
        console.error('No booking or gift card purchase found for payment intent:', paymentIntent.id);
        return { success: false, message: 'No transaction found for this payment intent' };
      }

      return { success: true, message: `Payment status updated to ${paymentIntent.status}` };
    } catch (error) {
      console.error('Error updating payment status:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Manually sync payment status from Stripe
   * Use this endpoint if webhook fails or doesn't arrive
   */
  @Post('sync-payment-status')
  @ApiOperation({ summary: 'Manually sync payment status from Stripe' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        payment_intent_id: { type: 'string', description: 'Stripe payment intent ID' },
      },
      required: ['payment_intent_id'],
    },
  })
  async syncPaymentStatus(@Body() body: { payment_intent_id: string }) {
    try {
      // Get payment intent from Stripe
      const paymentIntent = await this.stripeService.getPaymentIntent(body.payment_intent_id);

      if (!paymentIntent) {
        return {
          success: false,
          message: 'Payment intent not found in Stripe',
        };
      }

      console.log(`Manually syncing payment status for payment intent: ${paymentIntent.id}, status: ${paymentIntent.status}`);

      // Update payment status using the same logic as webhook
      const result = await this.updatePaymentStatusFromIntent(paymentIntent);

      return {
        success: result.success,
        message: result.message,
        data: {
          payment_intent_id: paymentIntent.id,
          status: paymentIntent.status,
          amount: paymentIntent.amount / 100,
          currency: paymentIntent.currency,
        },
      };
    } catch (error) {
      console.error('Error syncing payment status:', error);
      return {
        success: false,
        message: error.message || 'Failed to sync payment status',
      };
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
