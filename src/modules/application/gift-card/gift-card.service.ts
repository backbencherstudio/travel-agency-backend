import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { UnifiedPaymentService } from '../../payment/unified-payment.service';
import { UserRepository } from '../../../common/repository/user/user.repository';
import { PurchaseGiftCardDto } from './dto/purchase-gift-card.dto';
import { NotificationRepository } from '../../../common/repository/notification/notification.repository';
import { MessageGateway } from '../../chat/message/message.gateway';

@Injectable()
export class GiftCardService {
    constructor(
        private prisma: PrismaService,
        private unifiedPaymentService: UnifiedPaymentService,
        private messageGateway: MessageGateway,
    ) { }


    /**
     * Get all gift cards
     */
    async findAll(
        { q = null, status = null }: { q?: string; status?: number },
        pagination?: { page?: number; limit?: number },
    ) {
        try {
            const where: any = { deleted_at: null };

            if (q) {
                where.OR = [
                    { code: { contains: q, mode: 'insensitive' } },
                    { title: { contains: q, mode: 'insensitive' } },
                ];
            }

            if (status !== null && status !== undefined) {
                where.status = status;
            }

            const page = pagination?.page || 1;
            const limit = pagination?.limit || 10;
            const skip = (page - 1) * limit;

            const [giftCards, total] = await Promise.all([
                this.prisma.giftCard.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { created_at: 'desc' },
                }),
                this.prisma.giftCard.count({ where }),
            ]);

            const totalPages = Math.ceil(total / limit);
            const hasNextPage = page < totalPages;
            const hasPreviousPage = page > 1;

            // Transform data to exclude gift card codes (for browsing only)
            const transformedGiftCards = giftCards.map(giftCard => ({
                id: giftCard.id,
                amount: Number(giftCard.amount),
                currency: giftCard.currency,
                title: giftCard.title,
                message: giftCard.message,
                design_type: giftCard.design_type,
                status: giftCard.status,
                created_at: giftCard.created_at,
                updated_at: giftCard.updated_at,
            }));

            return {
                success: true,
                data: transformedGiftCards,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNextPage,
                    hasPreviousPage,
                },
            };
        } catch (error) {
            return { success: false, message: error.message };
        }
    }

    /**
     * Find gift card by ID (for user to view before purchase)
     */
    async findGiftCardById(id: string) {
        try {
            const giftCard = await this.prisma.giftCard.findUnique({
                where: { id },
            });

            if (!giftCard) {
                return { success: false, message: 'Gift card not found' };
            }

            return {
                success: true,
                data: {
                    id: giftCard.id,
                    amount: Number(giftCard.amount),
                    currency: giftCard.currency,
                    title: giftCard.title,
                    message: giftCard.message,
                    design_type: giftCard.design_type,
                    status: giftCard.status,
                    created_at: giftCard.created_at,
                    updated_at: giftCard.updated_at,
                }
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    /**
     * Get user's purchased gift cards
     */
    async getUserPurchasedGiftCards(
        userId: string,
        pagination?: { page?: number; limit?: number },
        filters?: { status?: string; payment_status?: string }
    ) {
        try {
            const page = pagination?.page || 1;
            const limit = pagination?.limit || 10;
            const skip = (page - 1) * limit;

            const where: any = {
                user_id: userId,
                deleted_at: null,
                payment_status: 'succeeded',
            };

            if (filters?.status) {
                where.status = filters.status;
            }

            if (filters?.payment_status) {
                where.payment_status = filters.payment_status;
            }

            const [giftCardPurchases, total] = await Promise.all([
                this.prisma.giftCardPurchase.findMany({
                    where,
                    skip,
                    take: limit,
                    orderBy: { created_at: 'desc' },
                    include: {
                        gift_card: {
                            select: {
                                id: true,
                                code: true,
                                amount: true,
                                currency: true,
                                title: true,
                                message: true,
                                design_type: true,
                            }
                        },
                        payment_transactions: {
                            select: {
                                id: true,
                                status: true,
                                amount: true,
                                currency: true,
                                created_at: true,
                            }
                        }
                    }
                }),
                this.prisma.giftCardPurchase.count({ where }),
            ]);

            const totalPages = Math.ceil(total / limit);
            const hasNextPage = page < totalPages;
            const hasPreviousPage = page > 1;

            // Transform data for better response format
            const transformedData = giftCardPurchases.map(purchase => ({
                id: purchase.id,
                gift_card: {
                    id: purchase.gift_card.id,
                    ...(purchase.payment_status === 'succeeded' && { code: purchase.gift_card.code }),
                    amount: Number(purchase.gift_card.amount),
                    currency: purchase.gift_card.currency,
                    title: purchase.gift_card.title,
                    message: purchase.gift_card.message,
                    design_type: purchase.gift_card.design_type,
                },
                quantity: purchase.quantity,
                total_amount: purchase.paid_amount,
                currency: purchase.paid_currency,
                payment_status: purchase.payment_status,
                payment_raw_status: purchase.payment_raw_status,
                payment_provider: purchase.payment_provider,
                payment_reference_number: purchase.payment_reference_number,
                status: purchase.status,
                created_at: purchase.created_at,
                updated_at: purchase.updated_at,
                payment_transactions: purchase.payment_transactions.map(transaction => ({
                    id: transaction.id,
                    status: transaction.status,
                    amount: Number(transaction.amount),
                    currency: transaction.currency,
                    created_at: transaction.created_at,
                }))
            }));

            return {
                success: true,
                data: transformedData,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages,
                    hasNextPage,
                    hasPreviousPage,
                },
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    /**
 * Purchase existing gift card
 */
    async purchaseGiftCard(userId: string, purchaseDto: PurchaseGiftCardDto) {
        try {
            return await this.prisma.$transaction(async (prisma) => {
                // Validate user
                const user = await UserRepository.getUserDetails(userId);
                if (!user) {
                    return { success: false, message: 'User not found' };
                }

                // Get existing gift card
                const existingGiftCard = await prisma.giftCard.findUnique({
                    where: { id: purchaseDto.gift_card_id }
                });

                if (!existingGiftCard) {
                    return { success: false, message: 'Gift card not found' };
                }

                const quantity = purchaseDto.quantity || 1;
                const totalAmount = Number(existingGiftCard.amount) * quantity;

                // Create GiftCardPurchase record first (for payment reference)
                const giftCardPurchase = await prisma.giftCardPurchase.create({
                    data: {
                        user_id: userId,
                        gift_card_id: existingGiftCard.id,
                        quantity: quantity,
                        payment_status: 'pending',
                        paid_amount: totalAmount,
                        paid_currency: existingGiftCard.currency,
                        payment_provider: 'stripe',
                    }
                });

                // Process payment
                const paymentResult = await this.unifiedPaymentService.processGiftCardPayment(
                    userId,
                    {
                        gift_card_id: existingGiftCard.id,
                        amount: totalAmount,
                        currency: existingGiftCard.currency,
                        payment_method: purchaseDto.payment_method,
                    }
                );

                if (!paymentResult.success) {
                    return paymentResult;
                }

                // Update gift card purchase with payment details
                await prisma.giftCardPurchase.update({
                    where: { id: giftCardPurchase.id },
                    data: {
                        payment_status: 'succeeded',
                        payment_raw_status: 'succeeded',
                        payment_reference_number: paymentResult.payment_reference,
                    }
                });

                // Create payment transaction record
                await prisma.paymentTransaction.create({
                    data: {
                        user_id: userId,
                        gift_card_purchase_id: giftCardPurchase.id,
                        provider: 'stripe',
                        reference_number: paymentResult.payment_reference,
                        status: 'succeeded',
                        raw_status: 'succeeded',
                        amount: totalAmount,
                        currency: existingGiftCard.currency,
                        paid_amount: totalAmount,
                        paid_currency: existingGiftCard.currency,
                    }
                });

                // Notify admins about gift card purchase
                await NotificationRepository.createNotification({
                    sender_id: userId,
                    text: `Gift card purchased: ${existingGiftCard.code} x${quantity} for $${totalAmount}`,
                    type: 'payment_transaction',
                    entity_id: giftCardPurchase.id,
                });

                this.messageGateway.server.emit('notification', {
                    sender_id: userId,
                    text: `Gift card purchased: ${existingGiftCard.code} x${quantity} for $${totalAmount}`,
                    type: 'payment_transaction',
                    entity_id: giftCardPurchase.id,
                });

                return {
                    success: true,
                    message: `Gift card(s) purchased successfully (${quantity} x $${Number(existingGiftCard.amount)} = $${totalAmount})`,
                    data: {
                        gift_card_purchase: {
                            id: giftCardPurchase.id,
                            gift_card: {
                                id: existingGiftCard.id,
                                ...(paymentResult.success && { code: existingGiftCard.code }),
                                amount: Number(existingGiftCard.amount),
                                currency: existingGiftCard.currency,
                                title: existingGiftCard.title,
                                message: existingGiftCard.message,
                                design_type: existingGiftCard.design_type,
                            },
                            quantity: quantity,
                            total_amount: totalAmount,
                            payment_status: 'succeeded',
                            payment_reference: paymentResult.payment_reference,
                            created_at: giftCardPurchase.created_at,
                        },
                        payment_reference: paymentResult.payment_reference,
                    }
                };
            });
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
}
