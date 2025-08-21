import { Injectable } from '@nestjs/common';
import appConfig from 'src/config/app.config';

export interface OpenAIRequest {
    model: string;
    messages: Array<{
        role: 'system' | 'user' | 'assistant';
        content: string;
    }>;
    temperature?: number;
    max_tokens?: number;
}

export interface OpenAIResponse {
    id: string;
    object: string;
    created: number;
    model: string;
    choices: Array<{
        index: number;
        message: {
            role: string;
            content: string;
        };
        finish_reason: string;
    }>;
    usage: {
        prompt_tokens: number;
        completion_tokens: number;
        total_tokens: number;
    };
}

@Injectable()
export class OpenAIService {
    private readonly apiUrl = 'https://api.openai.com/v1/chat/completions';
    private readonly model = 'gpt-3.5-turbo';

    constructor() { }

    async generateResponse(prompt: string): Promise<string> {
        try {
            const apiKey = appConfig().openai.apiKey
        
            if (!apiKey) {
                console.error('OpenAI API key not configured, using fallback response');
                return this.getFallbackResponse(prompt);
            }

            const requestBody: OpenAIRequest = {
                model: this.model,
                messages: [
                    {
                        role: 'system',
                        content: 'You are a helpful AI travel assistant. Provide concise, friendly responses in JSON format with message, confidence, intent, and quickReplies fields.'
                    },
                    {
                        role: 'user',
                        content: prompt
                    }
                ],
                temperature: 0.7,
                max_tokens: 500,
            };

            const response = await fetch(this.apiUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`,
                },
                body: JSON.stringify(requestBody),
            });
            console.log('OpenAI response status:', response.status);
            
            if (!response.ok) {
                if (response.status === 401) {
                    console.warn('OpenAI API key is invalid or expired, using fallback response');
                    return this.getFallbackResponse(prompt);
                }
                throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
            }

            const data: OpenAIResponse = await response.json();
            const content = data.choices[0]?.message?.content;

            if (!content) {
                throw new Error('No content received from OpenAI API');
            }

            return content;
        } catch (error) {
            console.error('OpenAI API Error:', error);
            return this.getFallbackResponse(prompt);
        }
    }

    private getFallbackResponse(prompt: string): string {
        // Parse the prompt to understand what the user is asking
        const lowerPrompt = prompt.toLowerCase();

        if (lowerPrompt.includes('hello') || lowerPrompt.includes('hi')) {
            return JSON.stringify({
                message: "Hello! 👋 I'm your AI travel assistant. I can help you find amazing travel packages, answer questions about destinations, and assist with bookings. What would you like to explore today?",
                confidence: 0.95,
                intent: "greeting",
                entities: [],
                quickReplies: ["Find packages", "Popular destinations", "My bookings", "Help"]
            });
        }

        if (lowerPrompt.includes('book') || lowerPrompt.includes('reserve')) {
            return JSON.stringify({
                message: "Great! I'd love to help you book your next adventure! 🎉 I can see we have some amazing packages available. Would you like to explore our popular destinations or tell me more about what you're looking for?",
                confidence: 0.90,
                intent: "booking_inquiry",
                entities: [],
                quickReplies: ["Show me packages", "Tell me about destinations", "What's popular?", "My budget is..."]
            });
        }

        if (lowerPrompt.includes('payment') || lowerPrompt.includes('pay')) {
            return JSON.stringify({
                message: "💳 Payment Information: We accept multiple payment methods including Credit/Debit Cards, Google Pay, Apple Pay, and PayPal. All payments are processed securely through Stripe. What specific payment method would you like to know more about?",
                confidence: 0.88,
                intent: "payment_question",
                entities: [],
                quickReplies: ["Credit/Debit Card", "Google Pay/Apple Pay", "PayPal", "Payment security", "Refund policy"]
            });
        }

        // Default response
        return JSON.stringify({
            message: "I'm here to help you plan your perfect trip! 🗺️ I can assist with finding packages, answering questions about destinations, helping with bookings, and more. What would you like to know?",
            confidence: 0.75,
            intent: "general_inquiry",
            entities: [],
            quickReplies: ["Find packages", "Popular destinations", "Payment info", "My bookings", "Help"]
        });
    }

    parseAIResponse(response: string): any {
        try {
            // Try to parse as JSON first
            const parsed = JSON.parse(response);
            return parsed;
        } catch (error) {
            console.error('Error parsing AI response:', error);
            // If not JSON, treat as plain text
            return {
                message: response,
                confidence: 0.8,
                intent: "general_inquiry",
                entities: [],
                quickReplies: ["Find packages", "Help", "Contact support"]
            };
        }
    }
} 