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
                    include: {
                        purchaser: { select: { id: true, name: true, email: true } },
                        recipient: { select: { id: true, name: true, email: true } },
                    },
                }),
                this.prisma.giftCard.count({ where }),
            ]);

            const totalPages = Math.ceil(total / limit);
            const hasNextPage = page < totalPages;
            const hasPreviousPage = page > 1;

            return {
                success: true,
                data: giftCards,
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
                include: {
                    purchaser: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        }
                    },
                    recipient: {
                        select: {
                            id: true,
                            name: true,
                            email: true,
                        }
                    }
                }
            });

            if (!giftCard) {
                return { success: false, message: 'Gift card not found' };
            }

            // Check if gift card is already purchased
            if (giftCard.purchaser_id) {
                return { success: false, message: 'Gift card has already been purchased' };
            }

            // Check if gift card is expired
            if (giftCard.expires_at && new Date() > giftCard.expires_at) {
                return { success: false, message: 'Gift card has expired' };
            }

            return {
                success: true,
                data: {
                    id: giftCard.id,
                    code: giftCard.code,
                    amount: Number(giftCard.amount),
                    currency: giftCard.currency,
                    title: giftCard.title,
                    message: giftCard.message,
                    design_type: giftCard.design_type,
                    expires_at: giftCard.expires_at,
                    created_at: giftCard.created_at,
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
 * Purchase existing gift card
 */
    async purchaseGiftCard(userId: string, giftCardId: string, purchaseDto: PurchaseGiftCardDto) {
        try {
            return await this.prisma.$transaction(async (prisma) => {
                // Validate user
                const user = await UserRepository.getUserDetails(userId);
                if (!user) {
                    return { success: false, message: 'User not found' };
                }

                // Get existing gift card
                const existingGiftCard = await prisma.giftCard.findUnique({
                    where: { id: giftCardId }
                });

                if (!existingGiftCard) {
                    return { success: false, message: 'Gift card not found' };
                }

                // Check if gift card is already purchased
                if (existingGiftCard.purchaser_id) {
                    return { success: false, message: 'Gift card has already been purchased' };
                }

                // Check if gift card is expired
                if (existingGiftCard.expires_at && new Date() > existingGiftCard.expires_at) {
                    return { success: false, message: 'Gift card has expired' };
                }

                // Process payment
                const paymentResult = await this.unifiedPaymentService.processGiftCardPayment(
                    userId,
                    {
                        gift_card_id: existingGiftCard.id,
                        amount: Number(existingGiftCard.amount),
                        currency: existingGiftCard.currency,
                        payment_method: purchaseDto.payment_method,
                    }
                );

                if (!paymentResult.success) {
                    return paymentResult;
                }

                // Update gift card with purchaser information
                const updatedGiftCard = await prisma.giftCard.update({
                    where: { id: existingGiftCard.id },
                    data: {
                        purchaser_id: userId,
                        issued_at: new Date(),
                    }
                });

                // Create transaction record
                await prisma.giftCardTransaction.create({
                    data: {
                        gift_card_id: existingGiftCard.id,
                        user_id: userId,
                        transaction_type: 'purchase',
                        amount: Number(existingGiftCard.amount),
                        balance_before: 0,
                        balance_after: Number(existingGiftCard.amount),
                        description: 'Gift card purchase',
                        reference_number: paymentResult.payment_reference,
                        payment_method: purchaseDto.payment_method.type,
                    }
                });

                // Notify admins about gift card purchase
                await NotificationRepository.createNotification({
                    sender_id: userId,
                    text: `Gift card purchased: ${existingGiftCard.code} for $${Number(existingGiftCard.amount)}`,
                    type: 'payment_transaction',
                    entity_id: existingGiftCard.id,
                });

                this.messageGateway.server.emit('notification', {
                    sender_id: userId,
                    text: `Gift card purchased: ${existingGiftCard.code} for $${Number(existingGiftCard.amount)}`,
                    type: 'payment_transaction',
                    entity_id: existingGiftCard.id,
                });

                return {
                    success: true,
                    message: 'Gift card purchased successfully',
                    data: {
                        gift_card: {
                            id: updatedGiftCard.id,
                            code: updatedGiftCard.code,
                            amount: Number(updatedGiftCard.amount),
                            currency: updatedGiftCard.currency,
                            title: updatedGiftCard.title,
                            message: updatedGiftCard.message,
                            expires_at: updatedGiftCard.expires_at,
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
