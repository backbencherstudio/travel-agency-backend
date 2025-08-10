import { Injectable } from '@nestjs/common';
import { StripePayment } from '../../../common/lib/Payment/stripe/StripePayment';

@Injectable()
export class StripeService {
  async handleWebhook(rawBody: string, sig: string | string[]) {
    return StripePayment.handleWebhook(rawBody, sig);
  }

  /**
   * Create payment intent for any payment method type
   */
  async createPaymentIntentForMethod(params: {
    amount: number;
    currency: string;
    customer_id: string;
    metadata?: any;
    paymentMethodType: 'stripe' | 'google_pay' | 'apple_pay';
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
   * @deprecated Use createPaymentIntentForMethod with paymentMethodType: 'google_pay'
   */
  async createGooglePayPaymentIntent(params: {
    amount: number;
    currency: string;
    customer_id: string;
    metadata?: any;
  }) {
    return this.createPaymentIntentForMethod({
      ...params,
      paymentMethodType: 'google_pay',
    });
  }

  /**
   * @deprecated Use createPaymentIntentForMethod with paymentMethodType: 'apple_pay'
   */
  async createApplePayPaymentIntent(params: {
    amount: number;
    currency: string;
    customer_id: string;
    metadata?: any;
  }) {
    return this.createPaymentIntentForMethod({
      ...params,
      paymentMethodType: 'apple_pay',
    });
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

  /**
   * @deprecated Use createPaymentIntentForMethod with paymentMethodType: 'stripe'
   */
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
