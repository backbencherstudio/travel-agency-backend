import { Injectable } from '@nestjs/common';
import { StripePayment } from '../../../common/lib/Payment/stripe/StripePayment';

@Injectable()
export class StripeService {
  async handleWebhook(rawBody: string, sig: string | string[]) {
    return StripePayment.handleWebhook(rawBody, sig);
  }

  /**
   * Create payment intent (Stripe only)
   */
  async createPaymentIntentForMethod(params: {
    amount: number;
    currency: string;
    customer_id: string;
    metadata?: any;
    paymentMethodType: 'stripe';
  }) {
    console.log('StripeService.createPaymentIntentForMethod called with:', params);
    try {
      const result = await StripePayment.createPaymentIntent({
        amount: params.amount,
        currency: params.currency,
        customer_id: params.customer_id,
        metadata: params.metadata,
        paymentMethodType: params.paymentMethodType,
      });
      console.log('StripeService.createPaymentIntentForMethod result:', {
        id: result.id,
        amount: result.amount,
        currency: result.currency,
        status: result.status,
        payment_method_types: result.payment_method_types
      });
      return result;
    } catch (error) {
      console.error('StripeService.createPaymentIntentForMethod error:', error);
      throw error;
    }
  }



  /**
   * Create Stripe customer
   */
  async createCustomer(params: {
    user_id: string;
    name: string;
    email: string;
  }) {
    return StripePayment.createCustomer(params);
  }

  async createPaymentIntent(params: {
    amount: number;
    currency: string;
    customer_id: string;
    metadata?: any;
  }): Promise<any> {
    return this.createPaymentIntentForMethod({
      ...params,
      paymentMethodType: 'stripe',
    });
  }

  /**
   * Create refund for a payment intent
   */
  async createRefund(params: {
    payment_intent_id: string;
    amount?: number;
  }) {
    return StripePayment.createRefund(params);
  }
}
