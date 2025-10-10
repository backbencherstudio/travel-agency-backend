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
        quantity = 1,
    }: {
        user_id: string;
        code: string;
        checkout_id: string;
        quantity?: number; // quantity of gift cards to use (default 1)
    }) {
        try {
            const giftCard = await prisma.giftCard.findFirst({
                where: { code },
            });
            
            if (!giftCard) {
                return { success: false, message: 'Gift card not found' };
            }
            // Find gift card purchase by code
            const giftCardPurchase = await prisma.giftCardPurchase.findFirst({
                where: {
                    gift_card_id: giftCard.id,
                //    payment_status: 'succeeded'
                },
                include: {
                    gift_card: true,
                },
            });

            if (!giftCardPurchase) {
                return { success: false, message: 'Gift card not found or not paid' };
            }

            // Check if user has enough quantity available
            const availableQuantity = giftCardPurchase.quantity || 1;
            if (quantity > availableQuantity) {
                return { success: false, message: `Only ${availableQuantity} gift card(s) available` };
            }

            const totalAmount = Number(giftCardPurchase.gift_card.amount || 0) * quantity;
            console.log("Using", quantity, "gift cards for total amount:", totalAmount);

            // Upsert temporary checkout gift card record (acts as temp redeem)
            const existing = await prisma.checkoutGiftCard.findFirst({
                where: {
                    checkout_id,
                    gift_card_purchase_id: giftCardPurchase.id,
                    user_id
                },
            });

            let record;
            if (existing) {
                record = await prisma.checkoutGiftCard.update({
                    where: { id: existing.id },
                    data: {
                        quantity: quantity,
                    },
                });
            } else {
                record = await prisma.checkoutGiftCard.create({
                    data: {
                        checkout_id,
                        gift_card_purchase_id: giftCardPurchase.id,
                        user_id,
                        quantity: quantity,
                    },
                });
            }

            return {
                success: true,
                message: 'Gift card applied successfully',
                data: {
                    checkout_gift_card: record,
                    gift_card: {
                        id: giftCardPurchase.gift_card.id,
                        code: giftCardPurchase.gift_card.code,
                        amount: giftCardPurchase.gift_card.amount,
                        quantity: quantity,
                        total_amount: totalAmount,
                    },
                },
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }
}


