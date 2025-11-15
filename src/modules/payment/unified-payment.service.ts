import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { StripeService } from './stripe/stripe.service';
import { UserRepository } from '../../common/repository/user/user.repository';
import { PaymentMethodType, ProcessPaymentDto } from '../application/checkout/dto/payment-method.dto';

export interface GiftCardPaymentDto {
    gift_card_id: string;
    amount: number;
    currency: string;
    payment_method: {
        type: 'stripe';
        data: any;
    };
}

@Injectable()
export class UnifiedPaymentService {
    constructor(
        private prisma: PrismaService,
        private stripeService: StripeService
    ) { }

    /**
     * Process payment for a booking
     * Creates payment intent and transaction record
     * Payment status will be updated via webhook when payment actually completes
     */
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

            // Handle payment method (Stripe only)
            switch (type) {
                case PaymentMethodType.STRIPE:
                    paymentResult = await this.processStripePayment(type, data, user, booking);
                    break;
                default:
                    return { success: false, message: 'Unsupported payment method' };
            }

            if (!paymentResult.success) {
                return paymentResult;
            }

            // Payment status will be updated by webhook when payment actually completes
            // Keep status as 'pending' until webhook confirms payment success

            return {
                success: true,
                message: 'Payment intent created successfully. Please complete payment on the frontend.',
                data: paymentResult.data,
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Process Stripe payment for booking
     * Creates payment intent and transaction record
     * Payment status will be updated via webhook when payment completes
     */
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

            // Create payment intent using Stripe service
            const paymentIntent = await this.stripeService.createPaymentIntentForMethod({
                amount: data.amount,
                currency: data.currency,
                customer_id: user.billing_id,
                paymentMethodType: 'stripe',
                metadata: {
                    booking_id: booking.id,
                    user_id: user.id,
                    payment_method: 'stripe',
                },
            });

            // Check payment intent status - if succeeded immediately, log warning
            // Payment status should only be updated via webhook, not here
            if (paymentIntent.status === 'succeeded') {
                console.warn(`⚠️ Payment Intent ${paymentIntent.id} created with 'succeeded' status immediately. This should not happen. Status will be updated via webhook.`);
                console.warn('⚠️ If webhook is disabled, use /api/payment/stripe/sync-payment-status endpoint to manually sync status.');
            }

            // Always create transaction with 'pending' status initially
            // Status will be updated by webhook when payment actually completes
            await this.prisma.paymentTransaction.create({
                data: {
                    user_id: user.id,
                    booking_id: booking.id,
                    provider: 'stripe',
                    reference_number: paymentIntent.id,
                    amount: data.amount,
                    currency: data.currency,
                    status: 'pending', // Always start with pending, webhook will update
                    raw_status: paymentIntent.status, // Store Stripe's raw status for reference
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

    /**
     * Get payment configuration for frontend
     * Returns Stripe publishable key for client-side payment processing
     */
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

    /**
     * Get available payment methods
     * Returns list of supported payment methods (currently Stripe only)
     */
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

            // Handle payment method (Stripe only)
            switch (type) {
                case 'stripe':
                    paymentResult = await this.processStripeGiftCardPayment(type, data, user, amount, currency, gift_card_id);
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
     * Process Stripe payment for gift card purchase
     * Creates or retrieves Stripe customer, then creates payment intent
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

                // Update user billing_id in database
                await this.prisma.user.update({
                    where: { id: user.id },
                    data: { billing_id: customerId }
                });
            }

            // Create payment intent for gift card purchase
            const paymentIntent = await this.stripeService.createPaymentIntentForMethod({
                amount: Math.round(amount * 100), // Convert to cents
                currency: currency.toLowerCase(),
                customer_id: customerId,
                paymentMethodType: 'stripe',
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

} 