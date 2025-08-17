import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { BookingService } from '../../application/booking/booking.service';
import { AIService } from './ai.service';

export interface ChatbotResponse {
    message: string;
    type: 'text' | 'quick_replies' | 'booking_form' | 'package_list' | 'payment_info';
    data?: any;
    quickReplies?: string[];
    confidence?: number;
    intent?: string;
}

export interface ChatbotContext {
    userId: string;
    conversationId: string;
    lastIntent?: string;
    userPreferences?: any;
    bookingInProgress?: boolean;
    currentStep?: string;
}

@Injectable()
export class ChatbotService {
    constructor(
        private prisma: PrismaService,
        private bookingService: BookingService,
        private aiService: AIService,
    ) { }

    async processMessage(userId: string, message: string, conversationId: string): Promise<ChatbotResponse> {
        const context = await this.getOrCreateContext(userId, conversationId);

        console.log('Chatbot processing:', { userId, message, context });

        try {
            // Use AI service for intelligent response generation
            const aiResponse = await this.aiService.generateResponse(userId, message, context);

            // Update context with AI-detected intent
            context.lastIntent = aiResponse.intent;
            await this.updateContext(userId, conversationId, context);

            // If AI confidence is high, use AI response
            if (aiResponse.confidence > 0.7) {
                return {
                    message: aiResponse.message,
                    type: 'quick_replies',
                    quickReplies: aiResponse.quickReplies,
                    confidence: aiResponse.confidence,
                    intent: aiResponse.intent,
                };
            }

            // Fallback to rule-based responses for low confidence
            return await this.fallbackToRuleBased(message, context);
        } catch (error) {
            console.error('AI processing failed, falling back to rule-based:', error);
            return await this.fallbackToRuleBased(message, context);
        }
    }

    private detectIntent(message: string): string {
        // Greeting patterns
        if (this.matchesPattern(message, ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'])) {
            return 'greeting';
        }

        // Booking patterns
        if (this.matchesPattern(message, ['book', 'booking', 'reserve', 'reservation', 'travel', 'trip', 'vacation'])) {
            return 'booking_inquiry';
        }

        // Payment patterns
        if (this.matchesPattern(message, ['payment', 'pay', 'credit card', 'debit card', 'google pay', 'apple pay', 'paypal', 'refund'])) {
            return 'payment_question';
        }

        // Package search patterns
        if (this.matchesPattern(message, ['package', 'tour', 'destination', 'where', 'what', 'search', 'find'])) {
            return 'package_search';
        }

        // Price patterns
        if (this.matchesPattern(message, ['price', 'cost', 'how much', 'expensive', 'cheap', 'budget'])) {
            return 'price_inquiry';
        }

        // Cancellation patterns
        if (this.matchesPattern(message, ['cancel', 'cancellation', 'refund', 'policy'])) {
            return 'cancellation_policy';
        }

        // Contact patterns
        if (this.matchesPattern(message, ['contact', 'phone', 'email', 'support', 'help'])) {
            return 'contact_info';
        }

        // Help patterns
        if (this.matchesPattern(message, ['help', 'assist', 'support', 'what can you do'])) {
            return 'help';
        }

        // Booking status patterns
        if (this.matchesPattern(message, ['status', 'my booking', 'confirmation', 'track'])) {
            return 'booking_status';
        }

        return 'unknown';
    }

    private matchesPattern(message: string, patterns: string[]): boolean {
        return patterns.some(pattern => message.includes(pattern));
    }

    private async getOrCreateContext(userId: string, conversationId: string): Promise<ChatbotContext> {
        // Try to get existing context from database
        const existingContext = await this.prisma.chatbotContext.findUnique({
            where: { userId_conversationId: { userId, conversationId } }
        });

        if (existingContext) {
            return {
                userId,
                conversationId,
                lastIntent: existingContext.lastIntent,
                userPreferences: JSON.parse(existingContext.userPreferences),
                bookingInProgress: existingContext.bookingInProgress,
                currentStep: existingContext.currentStep,
            };
        }

        // Create new context
        const newContext: ChatbotContext = {
            userId,
            conversationId,
            bookingInProgress: false,
        };

        await this.prisma.chatbotContext.create({
            data: {
                userId,
                conversationId,
                lastIntent: null,
                userPreferences: JSON.stringify({}),
                bookingInProgress: false,
                currentStep: null,
            }
        });

        return newContext;
    }

    private async updateContext(userId: string, conversationId: string, context: ChatbotContext): Promise<void> {
        await this.prisma.chatbotContext.upsert({
            where: { userId_conversationId: { userId, conversationId } },
            update: {
                lastIntent: context.lastIntent,
                userPreferences: context.userPreferences ? JSON.stringify(context.userPreferences) : JSON.stringify({}),
                bookingInProgress: context.bookingInProgress,
                currentStep: context.currentStep,
            },
            create: {
                userId,
                conversationId,
                lastIntent: context.lastIntent,
                userPreferences: context.userPreferences ? JSON.stringify(context.userPreferences) : JSON.stringify({}),
                bookingInProgress: context.bookingInProgress || false,
                currentStep: context.currentStep,
            }
        });
    }

    private handleGreeting(): ChatbotResponse {
        return {
            message: `Hello! 👋 I'm your travel assistant. I can help you with:\n\n• 📅 Booking travel packages\n• 💳 Payment information\n• 🔍 Finding destinations\n• 📞 Contact support\n• ❓ General questions\n\nWhat would you like to know?`,
            type: 'quick_replies',
            quickReplies: [
                'Book a trip',
                'Find packages',
                'Payment info',
                'Contact support',
                'Help'
            ]
        };
    }

    private handleBookingInquiry(): ChatbotResponse {
        return {
            message: `Great! I'd love to help you book your trip! 🎉\n\nTo get started, I need a few details:\n\n• Where would you like to go?\n• When do you want to travel?\n• How many people?\n• What's your budget?\n\nYou can also browse our available packages first.`,
            type: 'quick_replies',
            quickReplies: [
                'Browse packages',
                'Tell me about a destination',
                'Check availability',
                'Speak to agent'
            ]
        };
    }

    private handlePaymentQuestion(): ChatbotResponse {
        return {
            message: `💳 Payment Information:\n\nWe accept multiple payment methods:\n\n• 💳 Credit/Debit Cards (Visa, MasterCard, Amex)\n• 📱 Google Pay\n• 🍎 Apple Pay\n• 💙 PayPal\n\nAll payments are processed securely through Stripe.\n\nNeed help with a specific payment method?`,
            type: 'quick_replies',
            quickReplies: [
                'Credit/Debit Card',
                'Google Pay/Apple Pay',
                'PayPal',
                'Refund policy',
                'Payment security'
            ]
        };
    }

    private async handlePackageSearch(): Promise<ChatbotResponse> {
        // Extract destination from message
        const destinations = await this.prisma.destination.findMany({
            take: 5,
            include: {
                package_destinations: {
                    include: {
                        package: {
                            where: { status: 1, approved_at: { not: null } },
                            select: {
                                id: true,
                                name: true,
                                price: true,
                                final_price: true,
                                type: true,
                            }
                        }
                    }
                }
            }
        });

        if (destinations.length === 0) {
            return {
                message: `I couldn't find any packages at the moment. Please try again later or contact our support team for assistance.`,
                type: 'text'
            };
        }

        const packageList = destinations.map(dest => {
            const packages = dest.package_destinations
                .map(pd => pd.package)
                .filter(pkg => pkg !== null)
                .slice(0, 3);

            const packageText = packages.length > 0
                ? packages.map(pkg => `   • ${pkg.name} - $${pkg.final_price || pkg.price}`).join('\n')
                : '   • No packages available';

            return `📍 ${dest.name}\n${packageText}`;
        }).join('\n\n');

        return {
            message: `Here are some popular destinations and packages:\n\n${packageList}\n\nWould you like to know more about any specific package?`,
            type: 'quick_replies',
            quickReplies: destinations.slice(0, 3).map(dest => dest.name)
        };
    }

    private handlePriceInquiry(): ChatbotResponse {
        return {
            message: `💰 Pricing Information:\n\nOur packages start from $50 and vary based on:\n\n• Destination\n• Duration\n• Number of travelers\n• Season\n• Package type\n\nMost packages range from $100-$500 per person.\n\nWould you like to see specific package prices?`,
            type: 'quick_replies',
            quickReplies: [
                'See package prices',
                'Budget-friendly options',
                'Luxury packages',
                'Group discounts'
            ]
        };
    }

    private handleCancellationPolicy(): ChatbotResponse {
        return {
            message: `📋 Cancellation Policy:\n\n• 🕐 24+ hours before: Full refund\n• ⏰ 2-24 hours before: 50% refund\n• 🚫 Less than 2 hours: No refund\n\nRefunds are processed within 5-7 business days.\n\nNeed to cancel a booking?`,
            type: 'quick_replies',
            quickReplies: [
                'Cancel my booking',
                'Refund status',
                'Modify booking',
                'Contact support'
            ]
        };
    }

    private handleContactInfo(): ChatbotResponse {
        return {
            message: `📞 Contact Information:\n\n• 📧 Email: support@travelagency.com\n• 📱 Phone: +1 (555) 123-4567\n• 💬 Live Chat: Available 24/7\n• 🕐 Hours: Monday-Sunday, 9 AM - 9 PM EST\n\nHow can we help you today?`,
            type: 'quick_replies',
            quickReplies: [
                'Email support',
                'Call us',
                'Live chat',
                'Back to booking'
            ]
        };
    }

    private handleHelp(): ChatbotResponse {
        return {
            message: `🤖 How can I help you?\n\nI can assist with:\n\n📅 **Booking**\n• Find packages\n• Check availability\n• Make reservations\n\n💳 **Payments**\n• Payment methods\n• Refunds\n• Security\n\n📋 **Account**\n• Booking status\n• Cancellations\n• Modifications\n\n📞 **Support**\n• Contact information\n• FAQs\n• Live chat\n\nWhat do you need help with?`,
            type: 'quick_replies',
            quickReplies: [
                'Booking help',
                'Payment help',
                'Account help',
                'Contact support'
            ]
        };
    }

    private async handleBookingStatus(context: ChatbotContext, userId: string): Promise<ChatbotResponse> {
        try {
            const bookings = await this.bookingService.findAll({ user_id: userId });

            if (!bookings.success || bookings.data.length === 0) {
                return {
                    message: `You don't have any bookings yet. Would you like to book your first trip? 🎉`,
                    type: 'quick_replies',
                    quickReplies: ['Book now', 'Browse packages', 'Help']
                };
            }

            const recentBookings = bookings.data.slice(0, 3);
            const bookingList = recentBookings.map(booking =>
                `📋 ${booking.invoice_number}\n   Status: ${booking.status}\n   Payment: ${booking.payment_status}\n   Amount: $${booking.final_price}`
            ).join('\n\n');

            return {
                message: `Here are your recent bookings:\n\n${bookingList}\n\nNeed to manage any of these bookings?`,
                type: 'quick_replies',
                quickReplies: [
                    'View all bookings',
                    'Cancel booking',
                    'Modify booking',
                    'Payment help'
                ]
            };
        } catch (error) {
            console.error('Error accessing bookings:', error);
            return {
                message: `I'm having trouble accessing your bookings right now. Please try again or contact support.`,
                type: 'text'
            };
        }
    }

    private handleRefundRequest(): ChatbotResponse {
        return {
            message: `🔄 Refund Information:\n\nTo request a refund:\n\n1. 📋 Provide your booking ID\n2. 📅 Tell us your travel date\n3. 💬 Explain the reason\n4. ⏰ We'll process within 24 hours\n\nRefunds take 5-7 business days to appear.\n\nReady to start your refund request?`,
            type: 'quick_replies',
            quickReplies: [
                'Start refund request',
                'Check refund status',
                'Cancellation policy',
                'Contact support'
            ]
        };
    }

    private handleUnknownIntent(): ChatbotResponse {
        return {
            message: `I'm not sure I understood that. 🤔\n\nI can help you with:\n\n• 📅 Booking travel packages\n• 💳 Payment questions\n• 🔍 Finding destinations\n• 📞 Contact support\n\nWhat would you like to know?`,
            type: 'quick_replies',
            quickReplies: [
                'Book a trip',
                'Payment info',
                'Find packages',
                'Contact support',
                'Help'
            ]
        };
    }

    private async fallbackToRuleBased(message: string, context: ChatbotContext): Promise<ChatbotResponse> {
        const intent = this.detectIntent(message.toLowerCase());

        // Update context with current intent
        context.lastIntent = intent;
        await this.updateContext(context.userId, context.conversationId, context);

        switch (intent) {
            case 'greeting':
                return this.handleGreeting();

            case 'booking_inquiry':
                return this.handleBookingInquiry();

            case 'payment_question':
                return this.handlePaymentQuestion();

            case 'package_search':
                return await this.handlePackageSearch();

            case 'price_inquiry':
                return this.handlePriceInquiry();

            case 'cancellation_policy':
                return this.handleCancellationPolicy();

            case 'contact_info':
                return this.handleContactInfo();

            case 'help':
                return this.handleHelp();

            case 'booking_status':
                return await this.handleBookingStatus(context, context.userId);

            case 'refund_request':
                return this.handleRefundRequest();

            default:
                return this.handleUnknownIntent();
        }
    }

    async saveChatMessage(userId: string, conversationId: string, message: string, isBot: boolean = false): Promise<void> {
        await this.prisma.chatMessage.create({
            data: {
                conversation_id: conversationId,
                sender_id: isBot ? 'bot' : userId,
                message,
                message_type: 'text',
                is_bot: isBot,
            }
        });
    }

    async getConversationHistory(userId: string, conversationId: string): Promise<any[]> {
        const messages = await this.prisma.chatMessage.findMany({
            where: {
                conversation_id: conversationId,
            },
            orderBy: {
                created_at: 'asc',
            },
            select: {
                id: true,
                sender_id: true,
                message: true,
                message_type: true,
                is_bot: true,
                created_at: true,
            },
        });

        return messages;
    }

    async getUserConversations(userId: string): Promise<any[]> {
        // Get unique conversations for the user
        const conversations = await this.prisma.chatMessage.groupBy({
            by: ['conversation_id'],
            where: {
                sender_id: userId,
            },
            _count: {
                id: true,
            },
            _max: {
                created_at: true,
            },
        });

        // Get the last message for each conversation
        const conversationsWithLastMessage = await Promise.all(
            conversations.map(async (conv) => {
                const lastMessage = await this.prisma.chatMessage.findFirst({
                    where: {
                        conversation_id: conv.conversation_id,
                    },
                    orderBy: {
                        created_at: 'desc',
                    },
                    select: {
                        message: true,
                        created_at: true,
                        is_bot: true,
                    },
                });

                return {
                    conversationId: conv.conversation_id,
                    messageCount: conv._count.id,
                    lastMessage: lastMessage?.message,
                    lastMessageTime: lastMessage?.created_at,
                    lastMessageIsBot: lastMessage?.is_bot,
                };
            })
        );

        return conversationsWithLastMessage.sort((a, b) =>
            new Date(b.lastMessageTime).getTime() - new Date(a.lastMessageTime).getTime()
        );
    }

    
} 