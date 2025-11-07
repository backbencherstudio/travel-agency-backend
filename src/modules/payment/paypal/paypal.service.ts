import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import appConfig from '../../../config/app.config';

export interface PayPalOrder {
    id: string;
    status: string;
    intent: string;
    payment_source: any;
    purchase_units: Array<{
        reference_id: string;
        amount: {
            currency_code: string;
            value: string;
        };
        payee: {
            email_address: string;
        };
    }>;
    create_time: string;
    update_time: string;
    links: Array<{
        href: string;
        rel: string;
        method: string;
    }>;
}

export interface PayPalPaymentData {
    amount: number;
    currency: string;
    booking_id: string;
    user_id: string;
    return_url: string;
    cancel_url: string;
}

@Injectable()
export class PayPalService {
    private readonly clientId: string;
    private readonly clientSecret: string;
    private readonly baseUrl: string;
    private accessToken: string | null = null;
    private tokenExpiry: number = 0;

    constructor(private prisma: PrismaService) {
        const config = appConfig();
        this.clientId = config.payment?.paypal?.client_id || '';
        this.clientSecret = config.payment?.paypal?.client_secret || '';
        this.baseUrl = config.payment?.paypal?.sandbox
            ? 'https://api-m.sandbox.paypal.com'
            : 'https://api-m.paypal.com';

        // Validate configuration
        if (!this.clientId || !this.clientSecret) {
            console.error('PayPal credentials are missing! Check your .env file.');
        }
    }

    private async getAccessToken(): Promise<string> {
        // Check if we have a valid token
        if (this.accessToken && Date.now() < this.tokenExpiry) {
            return this.accessToken;
        }

        try {
            const response = await fetch(`${this.baseUrl}/v1/oauth2/token`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'Authorization': `Basic ${Buffer.from(`${this.clientId}:${this.clientSecret}`).toString('base64')}`,
                },
                body: 'grant_type=client_credentials',
            });

            if (!response.ok) {
                throw new Error(`PayPal OAuth failed: ${response.status} ${response.statusText}`);
            }

            const data = await response.json();
            this.accessToken = data.access_token;
            this.tokenExpiry = Date.now() + (data.expires_in * 1000) - 60000; // Expire 1 minute early

            return this.accessToken;
        } catch (error) {
            console.error('PayPal access token error:', error);
            throw new Error('Failed to get PayPal access token');
        }
    }

    async createOrder(paymentData: PayPalPaymentData): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            const accessToken = await this.getAccessToken();

            const orderData = {
                intent: 'CAPTURE',
                purchase_units: [
                    {
                        reference_id: paymentData.booking_id,
                        description: `Travel Package Booking - ${paymentData.booking_id}`,
                        amount: {
                            currency_code: paymentData.currency.toUpperCase(),
                            value: paymentData.amount.toFixed(2),
                        },
                        custom_id: paymentData.user_id,
                    },
                ],
                application_context: {
                    return_url: paymentData.return_url,
                    cancel_url: paymentData.cancel_url,
                    brand_name: 'Travel Agency',
                    landing_page: 'LOGIN',
                    user_action: 'PAY_NOW',
                    shipping_preference: 'NO_SHIPPING',
                },
            };

            const response = await fetch(`${this.baseUrl}/v2/checkout/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify(orderData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`PayPal order creation failed: ${errorData.message || response.statusText}`);
            }

            const order: PayPalOrder = await response.json();

            return {
                success: true,
                data: {
                    order_id: order.id,
                    approval_url: order.links.find(link => link.rel === 'approve')?.href,
                    status: order.status,
                },
            };
        } catch (error) {
            console.error('PayPal create order error:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    async captureOrder(orderId: string): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            const accessToken = await this.getAccessToken();

            const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}/capture`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`PayPal capture failed: ${errorData.message || response.statusText}`);
            }

            const captureData = await response.json();

            return {
                success: true,
                data: {
                    capture_id: captureData.purchase_units[0]?.payments?.captures?.[0]?.id,
                    status: captureData.status,
                    amount: captureData.purchase_units[0]?.payments?.captures?.[0]?.amount,
                    transaction_id: captureData.id,
                },
            };
        } catch (error) {
            console.error('PayPal capture order error:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    async getOrderDetails(orderId: string): Promise<{ success: boolean; data?: PayPalOrder; error?: string }> {
        try {
            const accessToken = await this.getAccessToken();

            const response = await fetch(`${this.baseUrl}/v2/checkout/orders/${orderId}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`PayPal get order failed: ${errorData.message || response.statusText}`);
            }

            const order: PayPalOrder = await response.json();

            return {
                success: true,
                data: order,
            };
        } catch (error) {
            console.error('PayPal get order error:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    async refundPayment(captureId: string, amount?: number, currency: string = 'USD'): Promise<{ success: boolean; data?: any; error?: string }> {
        try {
            const accessToken = await this.getAccessToken();

            const refundData: any = {
                note_to_payer: 'Refund for travel package booking',
            };

            if (amount) {
                refundData.amount = {
                    currency_code: currency,
                    value: amount.toFixed(2),
                };
            }

            const response = await fetch(`${this.baseUrl}/v2/payments/captures/${captureId}/refund`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${accessToken}`,
                },
                body: JSON.stringify(refundData),
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(`PayPal refund failed: ${errorData.message || response.statusText}`);
            }

            const refundResult = await response.json();

            return {
                success: true,
                data: {
                    refund_id: refundResult.id,
                    status: refundResult.status,
                    amount: refundResult.amount,
                },
            };
        } catch (error) {
            console.error('PayPal refund error:', error);
            return {
                success: false,
                error: error.message,
            };
        }
    }

    async completePayPalPayment(orderId: string, userId: string): Promise<{ success: boolean; message?: string; data?: any }> {
        try {
            console.log('Completing PayPal payment for order:', orderId);

            // Get the transaction record
            const transaction = await this.prisma.paymentTransaction.findFirst({
                where: {
                    reference_number: orderId,
                    user_id: userId,
                    provider: 'paypal',
                    status: 'pending',
                },
                include: {
                    booking: true,
                },
            });

            if (!transaction) {
                return { success: false, message: 'PayPal transaction not found' };
            }

            // Capture the PayPal order
            const captureResult = await this.captureOrder(orderId);
            if (!captureResult.success) {
                console.error('PayPal order capture failed:', captureResult.error);
                return { success: false, message: captureResult.error };
            }

            console.log('PayPal order captured successfully:', captureResult.data);

            // Update transaction status
            await this.prisma.paymentTransaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'succeeded',
                    raw_status: 'COMPLETED',
                    paid_amount: transaction.amount,
                    paid_currency: transaction.currency,
                },
            });

            // Update booking payment status
            await this.prisma.booking.update({
                where: { id: transaction.booking_id },
                data: {
                    payment_status: 'succeeded',
                    paid_amount: transaction.amount,
                    paid_currency: transaction.currency,
                },
            });

            console.log('PayPal payment completed successfully for booking:', transaction.booking_id);

            return {
                success: true,
                message: 'PayPal payment completed successfully',
                data: {
                    order_id: orderId,
                    transaction_id: transaction.id,
                    booking_id: transaction.booking_id,
                    amount: transaction.amount,
                    currency: transaction.currency,
                },
            };
        } catch (error) {
            console.error('completePayPalPayment error:', error);
            return { success: false, message: error.message };
        }
    }

    /**
     * Handle PayPal webhook events
     */
    async handlePaymentCompleted(event: any) {
        try {
            const captureId = event.resource?.id;
            const orderId = event.resource.supplementary_data?.related_ids?.order_id;
            const amount = event.resource?.amount?.value;
            const currency = event.resource?.amount?.currency_code;

            if (!orderId) {
                return;
            }

            // Find the payment transaction by PayPal order ID
            const transaction = await this.prisma.paymentTransaction.findFirst({
                where: {
                    reference_number: orderId,
                    provider: 'paypal',
                    status: 'pending'
                },
                include: {
                    booking: true
                }
            });

            if (!transaction) {
                return;
            }

            // Update payment transaction status
            await this.prisma.paymentTransaction.update({
                where: { id: transaction.id },
                data: {
                    status: 'succeeded',
                    raw_status: 'completed',
                    paid_amount: parseFloat(amount),
                    paid_currency: currency,
                    updated_at: new Date()
                }
            });

            // Update booking status and payment status
            if (transaction.booking) {
                await this.prisma.booking.update({
                    where: { id: transaction.booking.id },
                    data: {
                        status: 'confirmed',
                        payment_status: 'succeeded',
                        payment_raw_status: 'completed',
                        paid_amount: parseFloat(amount),
                        paid_currency: currency,
                        payment_reference_number: captureId,
                        updated_at: new Date()
                    }
                });

                // Consume gift cards after successful payment
                await this.consumeGiftCardsAfterPayment(transaction.booking.id);
            }
        } catch (error) {
            console.error('Error handling payment completed webhook:', error);
        }
    }

    async handlePaymentDenied(event: any) {
        try {
            const orderId = event.resource.supplementary_data?.related_ids?.order_id;

            if (!orderId) {
                return;
            }

            // Update payment transaction status
            await this.prisma.paymentTransaction.updateMany({
                where: {
                    reference_number: orderId,
                    provider: 'paypal',
                    status: 'pending'
                },
                data: {
                    status: 'failed',
                    raw_status: 'denied',
                    updated_at: new Date()
                }
            });

            // Update booking status
            await this.prisma.booking.updateMany({
                where: {
                    id: {
                        in: await this.prisma.paymentTransaction.findMany({
                            where: {
                                reference_number: orderId,
                                provider: 'paypal'
                            },
                            select: { booking_id: true }
                        }).then(txs => txs.map(tx => tx.booking_id))
                    }
                },
                data: {
                    status: 'cancelled',
                    payment_status: 'failed',
                    payment_raw_status: 'denied',
                    updated_at: new Date()
                }
            });
        } catch (error) {
            console.error('Error handling payment denied webhook:', error);
        }
    }

    async handlePaymentRefunded(event: any) {
        try {
            const orderId = event.resource.supplementary_data?.related_ids?.order_id;

            if (!orderId) {
                return;
            }

            // Update payment transaction status
            await this.prisma.paymentTransaction.updateMany({
                where: {
                    reference_number: orderId,
                    provider: 'paypal'
                },
                data: {
                    status: 'refunded',
                    raw_status: 'refunded',
                    updated_at: new Date()
                }
            });

            // Update booking status
            await this.prisma.booking.updateMany({
                where: {
                    payment_reference_number: orderId
                },
                data: {
                    status: 'cancelled',
                    payment_status: 'refunded',
                    updated_at: new Date()
                }
            });
        } catch (error) {
            console.error('Error handling payment refunded webhook:', error);
        }
    }

    /**
     * Verify webhook signature for production security
     */
    async verifyWebhookSignature(): Promise<boolean> {
        try {
            // For now, return true (implement proper verification in production)
            // You should implement PayPal's webhook signature verification here
            return true;
        } catch (error) {
            console.error('Webhook signature verification failed:', error);
            return false;
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
