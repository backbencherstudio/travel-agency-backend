import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeService } from './stripe/stripe.service';
import { PayPalService } from './paypal/paypal.service';
import { UserRepository } from '../../common/repository/user/user.repository';
import { PaymentMethodType, ProcessPaymentDto } from '../application/checkout/dto/payment-method.dto';

export interface GiftCardPaymentDto {
    gift_card_id: string;
    amount: number;
    currency: string;
    payment_method: {
        type: 'stripe' | 'paypal' | 'google_pay' | 'apple_pay';
        data: any;
    };
}

@Injectable()
export class UnifiedPaymentService {
    constructor(
        private prisma: PrismaService,
        private stripeService: StripeService,
        private paypalService: PayPalService
    ) { }

    async processPayment(userId: string, paymentData: ProcessPaymentDto) {
        try {
            const { booking_id, payment_method } = paymentData;
            const { type, data } = payment_method;

            // Get booking details
            const booking = await this.prisma.booking.findUnique({
                where: { id: booking_id, user_id: userId },
            });

            if (!booking) {
                return { success: false, message: 'Booking not found or access denied' };
            }

            // Get user details
            const user = await UserRepository.getUserDetails(userId);
            if (!user) {
                return { success: false, message: 'User not found' };
            }

            let paymentResult: any;

            // Handle different payment methods
            switch (type) {
                case PaymentMethodType.STRIPE:
                case PaymentMethodType.GOOGLE_PAY:
                case PaymentMethodType.APPLE_PAY:
                    paymentResult = await this.processStripePayment(type, data, user, booking);
                    break;
                case PaymentMethodType.PAYPAL:
                    paymentResult = await this.processPayPalPayment(data, user, booking);
                    break;
                default:
                    return { success: false, message: 'Unsupported payment method' };
            }

            if (!paymentResult.success) {
                return paymentResult;
            }

            // Update booking payment status based on payment method
            if (type === PaymentMethodType.PAYPAL) {
                // For PayPal, keep status as pending until payment is actually completed
                // The status will be updated when the PayPal webhook or capture endpoint is called
            } else {
                // For Stripe payments, mark as succeeded immediately
                await this.prisma.booking.update({
                    where: { id: booking_id },
                    data: { payment_status: 'succeeded' },
                });
            }

            return {
                success: true,
                message: type === PaymentMethodType.PAYPAL
                    ? 'PayPal payment initiated. Please complete the payment on PayPal.'
                    : 'Payment processed successfully',
                data: paymentResult.data,
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    private async processStripePayment(paymentType: PaymentMethodType, data: any, user: any, booking: any) {
        try {
            // Validate user billing_id
            if (!user.billing_id) {
                return { success: false, message: 'User billing information not found. Please update your billing details.' };
            }

            // Validate amount
            if (!data.amount || data.amount <= 0) {
                return { success: false, message: 'Invalid payment amount' };
            }

            // Validate currency
            if (!data.currency) {
                return { success: false, message: 'Currency is required' };
            }

            // Map PaymentMethodType to string for Stripe service
            const paymentMethodTypeMap = {
                [PaymentMethodType.STRIPE]: 'stripe',
                [PaymentMethodType.GOOGLE_PAY]: 'google_pay',
                [PaymentMethodType.APPLE_PAY]: 'apple_pay',
            };

            const stripePaymentMethodType = paymentMethodTypeMap[paymentType] as 'stripe' | 'google_pay' | 'apple_pay';
            if (!stripePaymentMethodType) {
                return { success: false, message: 'Unsupported payment method' };
            }

            // Create payment intent using unified method
            const paymentIntent = await this.stripeService.createPaymentIntentForMethod({
                amount: data.amount,
                currency: data.currency,
                customer_id: user.billing_id,
                paymentMethodType: stripePaymentMethodType,
                metadata: {
                    booking_id: booking.id,
                    user_id: user.id,
                    payment_method: stripePaymentMethodType,
                },
            });

            // Create transaction record
            await this.prisma.paymentTransaction.create({
                data: {
                    user_id: user.id,
                    booking_id: booking.id,
                    provider: 'stripe',
                    reference_number: paymentIntent.id,
                    amount: data.amount,
                    currency: data.currency,
                    status: 'pending',
                    raw_status: paymentIntent.status,
                },
            });

            return {
                success: true,
                data: {
                    client_secret: paymentIntent.client_secret,
                    payment_intent_id: paymentIntent.id,
                    payment_method_type: paymentType,
                },
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    private async processPayPalPayment(data: any, user: any, booking: any) {
        try {
            // Validate amount
            if (!data.amount || data.amount <= 0) {
                return { success: false, message: 'Invalid payment amount' };
            }

            // Validate currency
            if (!data.currency) {
                return { success: false, message: 'Currency is required' };
            }

            // Create PayPal order
            const paypalResult = await this.paypalService.createOrder({
                amount: data.amount,
                currency: data.currency,
                booking_id: booking.id,
                user_id: user.id,
                return_url: `${process.env.CLIENT_APP_URL || 'http://localhost:3000'}/payment/success`,
                cancel_url: `${process.env.CLIENT_APP_URL || 'http://localhost:3000'}/payment/cancel`,
            });

            if (!paypalResult.success) {
                return { success: false, message: paypalResult.error };
            }

            // Create transaction record
            const transaction = await this.prisma.paymentTransaction.create({
                data: {
                    user_id: user.id,
                    booking_id: booking.id,
                    provider: 'paypal',
                    reference_number: paypalResult.data.order_id,
                    amount: data.amount,
                    currency: data.currency,
                    status: 'pending',
                    raw_status: 'CREATED',
                },
            });

            return {
                success: true,
                data: {
                    order_id: paypalResult.data.order_id,
                    approval_url: paypalResult.data.approval_url,
                    payment_method_type: PaymentMethodType.PAYPAL,
                    transaction_id: transaction.id,
                    // Return a client_secret-like identifier for consistency with Stripe
                    client_secret: `paypal_${paypalResult.data.order_id}`,
                },
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    async getPaymentConfiguration() {
        return {
            success: true,
            data: {
                stripe: {
                    publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
                },
            },
        };
    }

    async getAvailablePaymentMethods() {
        return {
            success: true,
            data: {
                payment_methods: [
                    {
                        type: PaymentMethodType.STRIPE,
                        name: 'Credit/Debit Card',
                        description: 'Pay with Visa, Mastercard, American Express',
                        icon: 'credit-card',
                        provider: 'stripe',
                    },
                    {
                        type: PaymentMethodType.PAYPAL,
                        name: 'PayPal',
                        description: 'Pay with your PayPal account',
                        icon: 'paypal',
                        provider: 'paypal',
                    },
                    {
                        type: PaymentMethodType.GOOGLE_PAY,
                        name: 'Google Pay',
                        description: 'Pay with Google Pay',
                        icon: 'google-pay',
                        provider: 'stripe',
                    },
                    {
                        type: PaymentMethodType.APPLE_PAY,
                        name: 'Apple Pay',
                        description: 'Pay with Apple Pay',
                        icon: 'apple-pay',
                        provider: 'stripe',
                    },
                ],
            },
        };
    }

    /**
     * Process gift card payment
     */
    async processGiftCardPayment(userId: string, paymentData: GiftCardPaymentDto) {
        try {
            const { gift_card_id, amount, currency, payment_method } = paymentData;
            const { type, data } = payment_method;

            // Get user details
            const user = await UserRepository.getUserDetails(userId);
            if (!user) {
                return { success: false, message: 'User not found' };
            }

            let paymentResult: any;

            // Handle different payment methods
            switch (type) {
                case 'stripe':
                case 'google_pay':
                case 'apple_pay':
                    paymentResult = await this.processStripeGiftCardPayment(type, data, user, amount, currency, gift_card_id);
                    break;
                case 'paypal':
                    paymentResult = await this.processPayPalGiftCardPayment(data, user, amount, currency, gift_card_id);
                    break;
                default:
                    return { success: false, message: 'Unsupported payment method' };
            }

            if (!paymentResult.success) {
                return paymentResult;
            }

            return {
                success: true,
                message: 'Payment processed successfully',
                payment_reference: paymentResult.payment_reference,
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    /**
     * Process Stripe payment for gift card
     */
    private async processStripeGiftCardPayment(
        type: string,
        data: any,
        user: any,
        amount: number,
        currency: string,
        gift_card_id: string
    ) {
        try {
            // Create or get Stripe customer
            let customerId = user.billing_id;
            if (!customerId) {
                // Create Stripe customer if not exists
                const customer = await this.stripeService.createCustomer({
                    user_id: user.id,
                    email: user.email,
                    name: user.name,
                });
                customerId = customer.id;

                // Update user billing_id
                await this.prisma.user.update({
                    where: { id: user.id },
                    data: { billing_id: customerId }
                });
            }

            // Create payment intent
            const paymentIntent = await this.stripeService.createPaymentIntentForMethod({
                amount: Math.round(amount * 100), // Convert to cents
                currency: currency.toLowerCase(),
                customer_id: customerId,
                paymentMethodType: type as 'stripe' | 'google_pay' | 'apple_pay',
                metadata: {
                    gift_card_id: gift_card_id,
                    user_id: user.id,
                    type: 'gift_card_purchase'
                }
            });

            return {
                success: true,
                payment_reference: paymentIntent.client_secret,
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    /**
     * Process PayPal payment for gift card
     */
    private async processPayPalGiftCardPayment(
        data: any,
        user: any,
        amount: number,
        currency: string,
        gift_card_id: string
    ) {
        try {
            // Create PayPal order
            const order = await this.paypalService.createOrder({
                amount: amount,
                currency: currency,
                booking_id: gift_card_id, // Using gift_card_id as reference
                user_id: user.id,
                return_url: `${process.env.CLIENT_APP_URL || 'http://localhost:5173'}/gift-cards/success`,
                cancel_url: `${process.env.CLIENT_APP_URL || 'http://localhost:5173'}/gift-cards/cancel`,
            });

            return {
                success: true,
                payment_reference: order.data?.id || 'paypal_order',
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

} 