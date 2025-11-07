import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { OpenAIService } from './openai.service';

export interface AIResponse {
    message: string;
    confidence: number;
    intent: string;
    entities: any[];
    quickReplies?: string[];
}

@Injectable()
export class AIService {
    constructor(
        private prisma: PrismaService,
        private openaiService: OpenAIService,
    ) { }

    async generateResponse(
        userId: string,
        message: string,
        conversationContext: any,
    ): Promise<AIResponse> {
        try {
            // Get user context
            const user = await this.getUserContext(userId);

            // Get relevant data for context
            const contextData = await this.getContextData();

            // Create prompt for OpenAI
            const prompt = this.createPrompt(message, user, contextData, conversationContext);

            // Call OpenAI API
            const aiResponseText = await this.openaiService.generateResponse(prompt);

            // Parse the AI response
            const aiResponse = this.openaiService.parseAIResponse(aiResponseText);

            return this.processAIResponse(aiResponse);
        } catch (error) {
            console.error('AI Service Error:', error);
            return this.getFallbackResponse();
        }
    }

    private async getUserContext(userId: string) {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                id: true,
                name: true,
                email: true,
                type: true,
                user_bookings: {
                    select: {
                        id: true,
                        status: true,
                        booking_type: true,
                        total_amount: true,
                        final_price: true,
                        payment_status: true,
                        booking_date_time: true,
                        booking_items: {
                            select: {
                                package: {
                                    select: {
                                        name: true,
                                        type: true,
                                    }
                                }
                            }
                        }
                    },
                    orderBy: { created_at: 'desc' },
                    take: 5,
                },
                reviews: {
                    select: {
                        rating_value: true,
                        comment: true,
                        package: {
                            select: {
                                name: true,
                            }
                        }
                    },
                    orderBy: { created_at: 'desc' },
                    take: 3,
                }
            }
        });

        return user;
    }

    private async getContextData() {
        // Get popular packages
        const popularPackages = await this.prisma.package.findMany({
            where: {
                status: 1,
                approved_at: { not: null },
            },
            select: {
                id: true,
                name: true,
                description: true,
                price: true,
                final_price: true,
                type: true,
                duration: true,
                package_destinations: {
                    select: {
                        destination: {
                            select: {
                                name: true,
                                country: {
                                    select: {
                                        name: true,
                                    }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: { reviews: { _count: 'desc' } },
            take: 10,
        });

        // Get destinations
        const destinations = await this.prisma.destination.findMany({
            select: {
                id: true,
                name: true,
                country: {
                    select: {
                        name: true,
                    }
                }
            },
            take: 20,
        });

        // Get FAQ data
        const faqs = await this.prisma.faq.findMany({
            where: { status: 1 },
            select: {
                question: true,
                answer: true,
            },
            take: 10,
        });

        return {
            popularPackages,
            destinations,
            faqs,
        };
    }

    private createPrompt(
        message: string,
        user: any,
        contextData: any,
        conversationContext: any,
    ): string {
        const userInfo = user ? `
User Information:
- Name: ${user.name || 'Unknown'}
- Email: ${user.email || 'Unknown'}
- Type: ${user.type || 'user'}
- Previous Bookings: ${user.user_bookings?.length || 0}
- Reviews Given: ${user.reviews?.length || 0}
` : '';

        const bookingHistory = user?.user_bookings?.length > 0 ? `
Recent Bookings:
${user.user_bookings.map(booking =>
            `- ${booking.booking_items[0]?.package?.name || 'Unknown Package'} (${booking.status}, $${booking.final_price})`
        ).join('\n')}
` : '';

        const popularPackages = contextData.popularPackages?.length > 0 ? `
Popular Packages:
${contextData.popularPackages.map(pkg =>
            `- ${pkg.name} (${pkg.type}, $${pkg.final_price || pkg.price}, ${pkg.duration} days)`
        ).join('\n')}
` : '';

        const destinations = contextData.destinations?.length > 0 ? `
Available Destinations:
${contextData.destinations.map(dest =>
            `- ${dest.name}, ${dest.country?.name || 'Unknown'}`
        ).join('\n')}
` : '';

        const faqs = contextData.faqs?.length > 0 ? `
Common Questions:
${contextData.faqs.map(faq =>
            `Q: ${faq.question}\nA: ${faq.answer}`
        ).join('\n\n')}
` : '';

        return `You are an AI travel assistant for a travel agency. You help users with booking travel packages, answering questions about destinations, payments, and general travel inquiries.

${userInfo}
${bookingHistory}
${popularPackages}
${destinations}
${faqs}

Conversation Context:
- Last Intent: ${conversationContext.lastIntent || 'None'}
- Booking in Progress: ${conversationContext.bookingInProgress || false}
- Current Step: ${conversationContext.currentStep || 'None'}

User Message: "${message}"

Please provide a helpful, friendly response that:
1. Addresses the user's question or request
2. Uses the available context data when relevant
3. Suggests relevant packages or destinations if appropriate
4. Provides quick reply options for follow-up questions
5. Maintains a conversational, helpful tone

Response should be in JSON format:
{
  "message": "Your response message",
  "confidence": 0.95,
  "intent": "detected_intent",
  "entities": [],
  "quickReplies": ["option1", "option2", "option3"]
}`;
    }

    private processAIResponse(aiResponse: any): AIResponse {
        return {
            message: aiResponse.message,
            confidence: aiResponse.confidence,
            intent: aiResponse.intent,
            entities: aiResponse.entities || [],
            quickReplies: aiResponse.quickReplies || [],
        };
    }

    private getFallbackResponse(): AIResponse {
        return {
            message: "I'm sorry, I'm having trouble understanding that right now. 🤔 I can help you with booking travel packages, finding destinations, payment information, and more. What would you like to know?",
            confidence: 0.5,
            intent: "unknown",
            entities: [],
            quickReplies: ["Find packages", "Payment info", "Contact support", "Help"],
        };
    }

    async extractEntities(message: string): Promise<any[]> {
        // Extract entities like dates, locations, prices, etc.
        const entities = [];

        // Extract dates
        const datePatterns = [
            /\b(today|tomorrow|next week|next month)\b/gi,
            /\b(\d{1,2}\/\d{1,2}\/\d{4})\b/g,
            /\b(\d{1,2}-\d{1,2}-\d{4})\b/g,
        ];

        datePatterns.forEach(pattern => {
            const matches = message.match(pattern);
            if (matches) {
                entities.push({
                    type: 'date',
                    value: matches[0],
                    confidence: 0.9,
                });
            }
        });

        // Extract prices
        const pricePattern = /\$(\d+(?:\.\d{2})?)/g;
        const priceMatches = message.match(pricePattern);
        if (priceMatches) {
            entities.push({
                type: 'price',
                value: priceMatches[0],
                confidence: 0.95,
            });
        }

        // Extract numbers (for travelers, duration, etc.)
        const numberPattern = /\b(\d+)\b/g;
        const numberMatches = message.match(numberPattern);
        if (numberMatches) {
            entities.push({
                type: 'number',
                value: numberMatches[0],
                confidence: 0.8,
            });
        }

        return entities;
    }
} 