import stripe from 'stripe';
import appConfig from '../../../../config/app.config';
import { Fetch } from '../../Fetch';
import fs from 'fs';

const STRIPE_SECRET_KEY = appConfig().payment.stripe.secret_key;
const Stripe = new stripe(STRIPE_SECRET_KEY, {
  apiVersion: '2024-12-18.acacia',
});

const STRIPE_WEBHOOK_SECRET = appConfig().payment.stripe.webhook_secret;
/**
 * Stripe payment method helper
 */
export class StripePayment {
  static async createPaymentMethod({
    card,
    billing_details,
  }: {
    card: stripe.PaymentMethodCreateParams.Card;
    billing_details: stripe.PaymentMethodCreateParams.BillingDetails;
  }): Promise<stripe.PaymentMethod> {
    const paymentMethod = await Stripe.paymentMethods.create({
      card: {
        number: card.number,
        exp_month: card.exp_month,
        exp_year: card.exp_year,
        cvc: card.cvc,
      },
      billing_details: billing_details,
    });
    return paymentMethod;
  }

  /**
   * Add customer to stripe
   * @param email
   * @returns
   */
  static async createCustomer({
    user_id,
    name,
    email,
  }: {
    user_id: string;
    name: string;
    email: string;
  }): Promise<stripe.Customer> {
    const customer = await Stripe.customers.create({
      name: name,
      email: email,
      metadata: {
        user_id: user_id,
      },
      description: 'New Customer',
    });
    return customer;
  }

  static async attachCustomerPaymentMethodId({
    customer_id,
    payment_method_id,
  }: {
    customer_id: string;
    payment_method_id: string;
  }): Promise<stripe.PaymentMethod> {
    const customer = await Stripe.paymentMethods.attach(payment_method_id, {
      customer: customer_id,
    });
    return customer;
  }

  static async setCustomerDefaultPaymentMethodId({
    customer_id,
    payment_method_id,
  }: {
    customer_id: string;
    payment_method_id: string;
  }): Promise<stripe.Customer> {
    const customer = await Stripe.customers.update(customer_id, {
      invoice_settings: {
        default_payment_method: payment_method_id,
      },
    });
    return customer;
  }

  static async updateCustomer({
    customer_id,
    name,
    email,
  }: {
    customer_id: string;
    name: string;
    email: string;
  }): Promise<stripe.Customer> {
    const customer = await Stripe.customers.update(customer_id, {
      name: name,
      email: email,
    });
    return customer;
  }

  /**
   * Get customer using id
   * @param id
   * @returns
   */
  static async getCustomerByID(id: string): Promise<stripe.Customer> {
    const customer = await Stripe.customers.retrieve(id);
    return customer as stripe.Customer;
  }

  /**
   * Create billing portal session
   * @param customer
   * @returns
   */
  static async createBillingSession(customer: string) {
    const session = await Stripe.billingPortal.sessions.create({
      customer: customer,
      return_url: appConfig().app.url,
    });
    return session;
  }

  /**
   * Get Stripe account information
   */
  static async getAccountInfo(): Promise<any> {
    try {
      const account = await Stripe.accounts.retrieve();
      console.log('Stripe account info:', {
        id: account.id,
        country: account.country,
        default_currency: account.default_currency,
        business_type: account.business_type,
        charges_enabled: account.charges_enabled,
        payouts_enabled: account.payouts_enabled
      });
      return account;
    } catch (error) {
      console.error('Error getting Stripe account info:', error);
      throw error;
    }
  }

  /**
   * Create payment intent with configurable payment method options
   */
  static async createPaymentIntent({
    amount,
    currency,
    customer_id,
    metadata,
    paymentMethodType = 'stripe',
  }: {
    amount: number;
    currency: string;
    customer_id: string;
    metadata?: stripe.MetadataParam;
    paymentMethodType?: 'stripe';
  }): Promise<stripe.PaymentIntent> {
    console.log(`Creating ${paymentMethodType} payment intent:`, {
      amount,
      currency,
      customer_id,
      metadata,
      paymentMethodType
    });

    // Optional: Get account info for debugging (non-blocking)
    try {
      await this.getAccountInfo();
    } catch (error) {
      console.warn('Could not get account info:', error.message);
    }

    // Configure payment method options (Stripe only)
    const paymentConfig = this.getPaymentConfiguration();

    const stripeParams: stripe.PaymentIntentCreateParams = {
      amount: amount * 100, // amount in cents
      currency: currency,
      customer: customer_id,
      payment_method_types: paymentConfig.payment_method_types,
      metadata: {
        ...metadata,
        payment_method: paymentMethodType,
      },
      ...paymentConfig.options,
    };

    console.log('Stripe.paymentIntents.create called with:', stripeParams);

    try {
      const result = await Stripe.paymentIntents.create(stripeParams);
      console.log('Stripe.paymentIntents.create result:', {
        id: result.id,
        amount: result.amount,
        currency: result.currency,
        status: result.status,
        payment_method_types: result.payment_method_types,
        client_secret: result.client_secret ? 'present' : 'missing',
        confirmation_method: result.confirmation_method,
        capture_method: result.capture_method
      });
      return result;
    } catch (error) {
      console.error('Stripe.paymentIntents.create error:', {
        error: error.message,
        code: error.code,
        decline_code: error.decline_code,
        param: error.param,
        paymentMethodType
      });
      throw error;
    }
  }

  /**
   * Get payment configuration for Stripe payment intents
   * Using automatic confirmation but without attaching payment_method
   * This ensures payment intent stays in 'requires_payment_method' status
   * until user confirms payment on frontend
   */
  private static getPaymentConfiguration() {
    return {
      payment_method_types: ['card'],
      options: {
        capture_method: 'automatic' as stripe.PaymentIntentCreateParams.CaptureMethod,
        confirmation_method: 'automatic' as stripe.PaymentIntentCreateParams.ConfirmationMethod,
        // Note: We don't attach payment_method here, so it won't auto-confirm
        // Payment will be confirmed when user completes payment on frontend
      },
    };
  }



  /**
   * Create stripe hosted checkout session
   * @param customer
   * @param price
   * @returns
   */
  static async createCheckoutSession(customer: string, price: string) {
    const success_url = `${appConfig().app.url
      }/success?session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url = `${appConfig().app.url}/failed`;

    const session = await Stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer: customer,
      line_items: [
        {
          price: price,
          quantity: 1,
        },
      ],
      subscription_data: {
        trial_period_days: 14,
      },
      success_url: success_url,
      cancel_url: cancel_url,
      // automatic_tax: { enabled: true },
    });
    return session;
  }

  /**
   * Calculate taxes
   * @param amount
   * @returns
   */
  static async calculateTax({
    amount,
    currency,
    customer_details,
  }: {
    amount: number;
    currency: string;
    customer_details: stripe.Tax.CalculationCreateParams.CustomerDetails;
  }): Promise<stripe.Tax.Calculation> {
    const taxCalculation = await Stripe.tax.calculations.create({
      currency: currency,
      customer_details: customer_details,
      line_items: [
        {
          amount: amount * 100,
          tax_behavior: 'exclusive',
          reference: 'tax_calculation',
        },
      ],
    });
    return taxCalculation;
  }

  // create a tax transaction
  static async createTaxTransaction(
    tax_calculation: string,
  ): Promise<stripe.Tax.Transaction> {
    const taxTransaction = await Stripe.tax.transactions.createFromCalculation({
      calculation: tax_calculation,
      reference: 'tax_transaction',
    });
    return taxTransaction;
  }

  // download invoice using payment intent id
  static async downloadInvoiceUrl(
    payment_intent_id: string,
  ): Promise<string | null> {
    const invoice = await Stripe.invoices.retrieve(payment_intent_id);
    // check if the invoice has  areceipt url
    if (invoice.hosted_invoice_url) {
      return invoice.hosted_invoice_url;
    }
    return null;
  }

  // download invoice using payment intent id
  static async downloadInvoiceFile(payment_intent_id: string) {
    const invoice = await Stripe.invoices.retrieve(payment_intent_id);

    if (invoice.hosted_invoice_url) {
      const response = await Fetch.get(invoice.hosted_invoice_url, {
        responseType: 'stream',
      });

      // save the response to a file
      return fs.writeFileSync('receipt.pdf', response.data);
    } else {
      return null;
    }
  }

  // send invoice to email using payment intent id
  static async sendInvoiceToEmail(payment_intent_id: string) {
    const invoice = await Stripe.invoices.sendInvoice(payment_intent_id);
    return invoice;
  }

  /**
   * Create a refund for a payment intent
   */
  static async createRefund({
    payment_intent_id,
    amount,
  }: {
    payment_intent_id: string;
    amount?: number; // amount in cents (optional, refund full if not provided)
  }): Promise<stripe.Refund> {
    return Stripe.refunds.create({
      payment_intent: payment_intent_id,
      ...(amount ? { amount } : {}),
    });
  }

  /**
   * Retrieve payment intent by ID from Stripe
   * Useful for manual status verification and sync
   */
  static async getPaymentIntent(payment_intent_id: string): Promise<stripe.PaymentIntent> {
    return await Stripe.paymentIntents.retrieve(payment_intent_id);
  }

  static handleWebhook(rawBody: string, sig: string | string[]): stripe.Event {
    const event = Stripe.webhooks.constructEvent(
      rawBody,
      sig,
      STRIPE_WEBHOOK_SECRET,
    );
    return event;
  }
}
