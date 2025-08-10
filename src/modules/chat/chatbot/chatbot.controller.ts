import {
    Controller,
    Post,
    Body,
    Get,
    Param,
    UseGuards,
    Request,
    HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ChatbotService } from './chatbot.service';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiTags('Chatbot')
@Controller('chatbot')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ChatbotController {
    constructor(private chatbotService: ChatbotService) { }

    @Post('message')
    @ApiOperation({ summary: 'Send a message to the chatbot' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Message processed successfully',
        schema: {
            type: 'object',
            properties: {
                success: { type: 'boolean' },
                data: {
                    type: 'object',
                    properties: {
                        message: { type: 'string' },
                        type: { type: 'string' },
                        quickReplies: { type: 'array', items: { type: 'string' } },
                        conversationId: { type: 'string' },
                        timestamp: { type: 'string' },
                    },
                },
            },
        },
    })
    async sendMessage(
        @Request() req,
        @Body() body: { message: string; conversationId?: string },
    ) {
        try {
            const userId = req.user.userId;
            const conversationId = body.conversationId || `conv_${userId}_${Date.now()}`;
            const userMessage = body.message;

            // Save user message
            await this.chatbotService.saveChatMessage(userId, conversationId, userMessage, false);

            // Process message and get bot response
            const botResponse = await this.chatbotService.processMessage(userId, userMessage, conversationId);

            // Save bot response
            await this.chatbotService.saveChatMessage(userId, conversationId, botResponse.message, true);

            return {
                success: true,
                data: {
                    ...botResponse,
                    conversationId,
                    timestamp: new Date().toISOString(),
                },
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    @Post('quick-reply')
    @ApiOperation({ summary: 'Send a quick reply to the chatbot' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Quick reply processed successfully',
    })
    async sendQuickReply(
        @Request() req,
        @Body() body: { reply: string; conversationId: string },
    ) {
        try {
            const userId = req.user.sub;
            const { reply, conversationId } = body;

            // Save user's quick reply
            await this.chatbotService.saveChatMessage(userId, conversationId, reply, false);

            // Process the quick reply
            const botResponse = await this.chatbotService.processMessage(userId, reply, conversationId);

            // Save bot response
            await this.chatbotService.saveChatMessage(userId, conversationId, botResponse.message, true);

            return {
                success: true,
                data: {
                    ...botResponse,
                    conversationId,
                    timestamp: new Date().toISOString(),
                },
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    @Post('start-conversation')
    @ApiOperation({ summary: 'Start a new conversation with the chatbot' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Conversation started successfully',
    })
    async startConversation(@Request() req) {
        try {
            const userId = req.user.sub;
            const conversationId = `conv_${userId}_${Date.now()}`;

            // Send welcome message
            const welcomeResponse = await this.chatbotService.processMessage(userId, 'hello', conversationId);

            return {
                success: true,
                data: {
                    ...welcomeResponse,
                    conversationId,
                    timestamp: new Date().toISOString(),
                },
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    @Get('conversation/:conversationId')
    @ApiOperation({ summary: 'Get conversation history' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Conversation history retrieved successfully',
    })
    async getConversationHistory(
        @Request() req,
        @Param('conversationId') conversationId: string,
    ) {
        try {
            const userId = req.user.sub;

            // Get conversation messages
            const messages = await this.chatbotService.getConversationHistory(userId, conversationId);

            return {
                success: true,
                data: {
                    conversationId,
                    messages,
                },
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }

    @Get('conversations')
    @ApiOperation({ summary: 'Get user conversation list' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Conversation list retrieved successfully',
    })
    async getUserConversations(@Request() req) {
        try {
            const userId = req.user.sub;

            // Get user's conversations
            const conversations = await this.chatbotService.getUserConversations(userId);

            return {
                success: true,
                data: conversations,
            };
        } catch (error) {
            return {
                success: false,
                message: error.message,
            };
        }
    }
} 