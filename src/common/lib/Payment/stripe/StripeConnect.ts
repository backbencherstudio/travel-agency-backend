import stripe from 'stripe';
import appConfig from '../../../../config/app.config';

let stripeInstance: stripe = null;

/**
 * Get or create Stripe instance (lazy initialization)
 */
function getStripeInstance(): stripe {
    if (!stripeInstance) {
        const STRIPE_SECRET_KEY = appConfig().payment.stripe.secret_key;
        if (!STRIPE_SECRET_KEY) {
            throw new Error('STRIPE_SECRET_KEY environment variable is not set');
        }
        stripeInstance = new stripe(STRIPE_SECRET_KEY, {
            apiVersion: '2024-12-18.acacia',
        });
    }
    return stripeInstance;
}

/**
 * Stripe Connect service for escrow system
 * Handles vendor Connect accounts, manual capture, transfers, and application fees
 */
export class StripeConnect {
    /**
     * Create a Stripe Connect account for a vendor
     * @param params Vendor information
     * @returns Stripe Connect account
     */
    static async createConnectAccount(params: {
        email: string;
        country: string;
        type?: 'express' | 'standard' | 'custom';
    }): Promise<stripe.Account> {
        try {
            const account = await getStripeInstance().accounts.create({
                type: params.type || 'express',
                country: params.country,
                email: params.email,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
            });

            return account;
        } catch (error) {
            console.error('Error creating Stripe Connect account:', error);
            throw error;
        }
    }

    /**
     * Create account link for onboarding vendor to Stripe Connect
     * @param accountId Stripe Connect account ID
     * @param returnUrl URL to return after onboarding
     * @param refreshUrl URL to refresh if onboarding expires
     * @returns Account link
     */
    static async createAccountLink(
        accountId: string,
        returnUrl: string,
        refreshUrl: string,
    ): Promise<stripe.AccountLink> {
        try {
            const accountLink = await getStripeInstance().accountLinks.create({
                account: accountId,
                return_url: returnUrl,
                refresh_url: refreshUrl,
                type: 'account_onboarding',
            });

            return accountLink;
        } catch (error) {
            console.error('Error creating account link:', error);
            throw error;
        }
    }

    /**
     * Create PaymentIntent with manual capture for escrow
     * Funds will be held until manually captured
     * @param params Payment intent parameters
     * @returns PaymentIntent
     */
    static async createPaymentIntentWithManualCapture(params: {
        amount: number; // in cents
        currency: string;
        customer_id: string;
        metadata?: stripe.MetadataParam;
        on_behalf_of?: string; // Stripe Connect account ID
        transfer_data?: {
            destination: string; // Stripe Connect account ID
            amount?: number; // Amount to transfer to connected account
        };
        application_fee_amount?: number; // Platform commission in cents
    }): Promise<stripe.PaymentIntent> {
        try {
            const paymentIntent = await getStripeInstance().paymentIntents.create({
                amount: params.amount,
                currency: params.currency,
                customer: params.customer_id,
                capture_method: 'manual', // Manual capture for escrow
                metadata: params.metadata,
                on_behalf_of: params.on_behalf_of,
                transfer_data: params.transfer_data,
                application_fee_amount: params.application_fee_amount,
            });

            return paymentIntent;
        } catch (error) {
            console.error('Error creating payment intent with manual capture:', error);
            throw error;
        }
    }

    /**
     * Confirm and capture PaymentIntent to hold funds in escrow
     * @param paymentIntentId PaymentIntent ID
     * @returns Confirmed PaymentIntent
     */
    static async confirmPaymentIntent(
        paymentIntentId: string,
    ): Promise<stripe.PaymentIntent> {
        try {
            const paymentIntent = await getStripeInstance().paymentIntents.confirm(paymentIntentId);
            return paymentIntent;
        } catch (error) {
            console.error('Error confirming payment intent:', error);
            throw error;
        }
    }

    /**
     * Capture a PaymentIntent (for manual capture method)
     * This actually charges the customer and holds funds
     * @param paymentIntentId PaymentIntent ID
     * @param amountToCapture Optional amount to capture (partial capture)
     * @returns Captured PaymentIntent
     */
    static async capturePaymentIntent(
        paymentIntentId: string,
        amountToCapture?: number,
    ): Promise<stripe.PaymentIntent> {
        try {
            const paymentIntent = await getStripeInstance().paymentIntents.capture(
                paymentIntentId,
                amountToCapture ? { amount_to_capture: amountToCapture } : {},
            );
            return paymentIntent;
        } catch (error) {
            console.error('Error capturing payment intent:', error);
            throw error;
        }
    }

    /**
     * Create a transfer to vendor's Stripe Connect account
     * Used to release funds from escrow to vendor
     * @param params Transfer parameters
     * @returns Transfer object
     */
    static async createTransfer(params: {
        amount: number; // Amount in cents to transfer
        currency: string;
        destination: string; // Stripe Connect account ID
        source_transaction?: string; // PaymentIntent ID to transfer from
        metadata?: stripe.MetadataParam;
    }): Promise<stripe.Transfer> {
        try {
            const transfer = await getStripeInstance().transfers.create({
                amount: params.amount,
                currency: params.currency,
                destination: params.destination,
                source_transaction: params.source_transaction,
                metadata: params.metadata,
            });

            return transfer;
        } catch (error) {
            console.error('Error creating transfer:', error);
            throw error;
        }
    }

    /**
     * Get application fee details
     * Note: Application fees are automatically created when using PaymentIntent with application_fee_amount
     * You cannot create them separately - they are created as part of the payment flow
     * @param feeId Application fee ID
     * @returns ApplicationFee details
     */
    static async getApplicationFee(feeId: string): Promise<stripe.ApplicationFee> {
        try {
            // Application fees can only be retrieved, not created directly
            // They are created automatically when using application_fee_amount in PaymentIntent
            const applicationFee = await getStripeInstance().applicationFees.retrieve(feeId);
            return applicationFee;
        } catch (error) {
            console.error('Error retrieving application fee:', error);
            throw error;
        }
    }

    /**
     * Create a refund (partial or full)
     * @param params Refund parameters
     * @returns Refund object
     */
    static async createRefund(params: {
        payment_intent_id: string;
        amount?: number; // Amount in cents to refund (partial refund if specified)
        reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
        metadata?: stripe.MetadataParam;
    }): Promise<stripe.Refund> {
        try {
            const refund = await getStripeInstance().refunds.create({
                payment_intent: params.payment_intent_id,
                amount: params.amount, // If not specified, full refund
                reason: params.reason,
                metadata: params.metadata,
            });

            return refund;
        } catch (error) {
            console.error('Error creating refund:', error);
            throw error;
        }
    }

    /**
     * Get Stripe Connect account details
     * @param accountId Stripe Connect account ID
     * @returns Account details
     */
    static async getConnectAccount(
        accountId: string,
    ): Promise<stripe.Account> {
        try {
            const account = await getStripeInstance().accounts.retrieve(accountId);
            return account;
        } catch (error) {
            console.error('Error retrieving Connect account:', error);
            throw error;
        }
    }

    /**
     * Get transfer details
     * @param transferId Transfer ID
     * @returns Transfer details
     */
    static async getTransfer(transferId: string): Promise<stripe.Transfer> {
        try {
            const transfer = await getStripeInstance().transfers.retrieve(transferId);
            return transfer;
        } catch (error) {
            console.error('Error retrieving transfer:', error);
            throw error;
        }
    }

    /**
     * Get PaymentIntent details
     * @param paymentIntentId PaymentIntent ID
     * @returns PaymentIntent details
     */
    static async getPaymentIntent(
        paymentIntentId: string,
    ): Promise<stripe.PaymentIntent> {
        try {
            const paymentIntent = await getStripeInstance().paymentIntents.retrieve(
                paymentIntentId,
            );
            return paymentIntent;
        } catch (error) {
            console.error('Error retrieving payment intent:', error);
            throw error;
        }
    }
}

