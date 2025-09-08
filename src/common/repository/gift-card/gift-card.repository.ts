import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class GiftCardRepository {
    /**
     * Apply a gift card code to a checkout (temporary redeem before booking)
     */
    static async applyGiftCardToCheckout({
        user_id,
        code,
        checkout_id,
        amount_to_use,
    }: {
        user_id: string;
        code: string;
        checkout_id: string;
        amount_to_use?: number; // optional; if not provided will use available balance
    }) {
        try {

           
            // Find gift card by code
            const giftCard = await prisma.giftCard.findFirst({
                where: { code },
                include: {
                    gift_card_transactions: true,
                },
            });

            if (!giftCard) {
                return { success: false, message: 'Gift card not found' };
            }

            // Check expiration
            if (giftCard.expires_at && new Date() > giftCard.expires_at) {
                return { success: false, message: 'Gift card has expired' };
            }

            // Compute current balance from transactions
            let balance = Number(giftCard.amount || 0);
            for (const txn of giftCard.gift_card_transactions) {
                const amt = Number(txn.amount || 0);
                if (txn.transaction_type === 'redemption') balance -= amt;
                if (txn.transaction_type === 'refund' || txn.transaction_type === 'adjustment') balance += amt; // basic handling
            }
            if (balance <= 0) {
                return { success: false, message: 'Gift card has no remaining balance' };
            }

            const useAmount = Math.max(0, Math.min(typeof amount_to_use === 'number' ? amount_to_use : balance, balance));
            if (useAmount <= 0) {
                return { success: false, message: 'Invalid gift card amount to apply' };
            }

            console.log("useAmount", useAmount);

            // Upsert temporary checkout gift card record (acts as temp redeem)
            const existing = await prisma.checkoutGiftCard.findFirst({
                where: { checkout_id, gift_card_id: giftCard.id, user_id },
            });

            let record;
            if (existing) {
                record = await prisma.checkoutGiftCard.update({
                    where: { id: existing.id },
                    data: {
                        amount_to_use: useAmount,
                        balance_at_checkout: balance,
                    },
                });
            } else {
                record = await prisma.checkoutGiftCard.create({
                    data: {
                        checkout_id,
                        gift_card_id: giftCard.id,
                        user_id,
                        amount_to_use: useAmount,
                        balance_at_checkout: balance,
                    },
                });
            }

            return {
                success: true,
                message: 'Gift card applied successfully',
                data: {
                    checkout_gift_card: record,
                    gift_card: {
                        id: giftCard.id,
                        code: giftCard.code,
                        balance,
                    },
                },
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}


