import {
    WebSocketGateway,
    SubscribeMessage,
    MessageBody,
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { OnModuleInit } from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import appConfig from '../../../config/app.config';
import { ChatbotService } from './chatbot.service';

@WebSocketGateway({
    cors: {
        origin: [
            'http://localhost:3000',
            'http://127.0.0.1:5500',
            'http://localhost:5173',
            'https://travel-agency-client-roan.vercel.app',
            'https://nirob.signalsmind.com',
            process.env.CLIENT_APP_URL || 'http://localhost:5173'
        ],
        credentials: true,
    },
    namespace: '/chatbot',
})
export class ChatbotGateway
    implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit {
    @WebSocketServer()
    server: Server;

    constructor(private chatbotService: ChatbotService) { }

    // Map to store connected clients
    public clients = new Map<string, string>(); // userId -> socketId

    onModuleInit() { }

    afterInit() {
        console.log('Chatbot WebSocket server started');
    }

    async handleConnection(client: Socket) {
        try {
            // More robust client validation
            if (!client) {
                console.error('Client object is null or undefined in handleConnection');
                return;
            }

            // Check if client has handshake and auth
            const auth = client.handshake?.auth || {};
            const token = auth.token;

            if (!token) {
                console.error('No token provided in client auth');
                if (client.emit) {
                    client.emit('connect_error', { message: 'No token provided' });
                }
                client.disconnect();
                console.log('No token provided for chatbot');
                return;
            }

            try {
                const decoded: any = jwt.verify(token, appConfig().jwt.secret);
                const userId = decoded.sub;
                if (!userId) {
                    if (client.emit) {
                        client.emit('connect_error', { message: 'Invalid token' });
                    }
                    client.disconnect();
                    console.log('Invalid token for chatbot');
                    return;
                }

                this.clients.set(userId, client.id);
                await client.join(`user_${userId}`); // Join user-specific room

                console.log(`Chatbot user ${userId} connected`);

                // Send welcome message
                if (this.server && client.id) {
                    this.server.to(client.id).emit('chatbot_message', {
                        type: 'welcome',
                        message: 'Hello! 👋 I\'m your travel assistant. How can I help you today?',
                        timestamp: new Date().toISOString(),
                    });
                }
            } catch (jwtError) {
                if (jwtError.name === 'TokenExpiredError') {
                    if (client.emit) {
                        client.emit('connect_error', { message: 'jwt expired' });
                    }
                    console.log('JWT token expired for chatbot connection');
                } else if (jwtError.name === 'JsonWebTokenError') {
                    if (client.emit) {
                        client.emit('connect_error', { message: 'invalid token' });
                    }
                    console.log('Invalid JWT token for chatbot connection');
                } else {
                    if (client.emit) {
                        client.emit('connect_error', { message: 'Authentication failed' });
                    }
                    console.log('JWT verification failed for chatbot connection');
                }
                client.disconnect();
            }
        } catch (error) {
            if (client && client.emit) {
                client.emit('connect_error', { message: 'Connection failed' });
            }
            if (client) {
                client.disconnect();
            }
            console.error('Error handling chatbot connection:', error);
        }
    }

    async handleDisconnect(client: Socket) {
        try {
            // More robust client validation
            if (!client) {
                console.error('Client object is null or undefined in handleDisconnect');
                return;
            }

            const userId = [...this.clients.entries()].find(
                ([, socketId]) => socketId === client.id,
            )?.[0];
            if (userId) {
                this.clients.delete(userId);
                console.log(`Chatbot user ${userId} disconnected`);
            }
        } catch (error) {
            console.error('Error handling chatbot disconnection:', error);
        }
    }

    @SubscribeMessage('chatbot_message')
    async handleChatbotMessage(
        client: Socket,
        @MessageBody() body: { message: string; conversationId?: string },
    ) {
        try {
            // More robust client validation
            if (!client) {
                console.error('Client object is null or undefined');
                return;
            }

            // Check if client has handshake and auth
            const auth = client.handshake?.auth || {};
            const token = auth.token;

            if (!token) {
                console.error('No token provided in client auth');
                if (client.emit) {
                    client.emit('error', { message: 'No token provided' });
                }
                return;
            }

            try {
                const decoded: any = jwt.verify(token, appConfig().jwt.secret);
                const userId = decoded.sub;

                if (!userId) {
                    if (client.emit) {
                        client.emit('error', { message: 'Unauthorized' });
                    }
                    return;
                }

                const conversationId = body.conversationId || `conv_${userId}_${Date.now()}`;
                const userMessage = body.message;

                // Save user message
                await this.chatbotService.saveChatMessage(userId, conversationId, userMessage, false);

                // Process message and get bot response
                const botResponse = await this.chatbotService.processMessage(userId, userMessage, conversationId);

                // Save bot response
                await this.chatbotService.saveChatMessage(userId, conversationId, botResponse.message, true);

                // Send bot response to client
                if (client && client.emit) {
                    client.emit('chatbot_response', {
                        ...botResponse,
                        conversationId,
                        timestamp: new Date().toISOString(),
                    });
                }

                console.log('Chatbot processed message:', { userId, message: userMessage, response: botResponse.type });

            } catch (jwtError) {
                console.error('JWT verification failed:', jwtError.message);
                if (client.emit) {
                    client.emit('error', { message: 'Invalid token' });
                }
            }

        } catch (error) {
            console.error('Error processing chatbot message:', error);
            if (client && client.emit) {
                client.emit('error', { message: 'Failed to process message' });
            }
        }
    }

    @SubscribeMessage('chatbot_quick_reply')
    async handleQuickReply(
        client: Socket,
        @MessageBody() body: { reply: string; conversationId: string },
    ) {
        try {
            // More robust client validation
            if (!client) {
                console.error('Client object is null or undefined');
                return;
            }

            // Check if client has handshake and auth
            const auth = client.handshake?.auth || {};
            const token = auth.token;

            if (!token) {
                console.error('No token provided in client auth');
                if (client.emit) {
                    client.emit('error', { message: 'No token provided' });
                }
                return;
            }

            try {
                const decoded: any = jwt.verify(token, appConfig().jwt.secret);
                const userId = decoded.sub;

                if (!userId) {
                    if (client.emit) {
                        client.emit('error', { message: 'Unauthorized' });
                    }
                    return;
                }

                const { reply, conversationId } = body;

                // Save user's quick reply
                await this.chatbotService.saveChatMessage(userId, conversationId, reply, false);

                // Process the quick reply
                const botResponse = await this.chatbotService.processMessage(userId, reply, conversationId);

                // Save bot response
                await this.chatbotService.saveChatMessage(userId, conversationId, botResponse.message, true);

                // Send bot response to client
                if (client && client.emit) {
                    client.emit('chatbot_response', {
                        ...botResponse,
                        conversationId,
                        timestamp: new Date().toISOString(),
                    });
                }

            } catch (jwtError) {
                console.error('JWT verification failed:', jwtError.message);
                if (client.emit) {
                    client.emit('error', { message: 'Invalid token' });
                }
            }

        } catch (error) {
            console.error('Error processing quick reply:', error);
            if (client && client.emit) {
                client.emit('error', { message: 'Failed to process quick reply' });
            }
        }
    }

    @SubscribeMessage('chatbot_start_conversation')
    async handleStartConversation(client: Socket) {
        try {
            // More robust client validation
            if (!client) {
                console.error('Client object is null or undefined');
                return;
            }

            // Check if client has handshake and auth
            const auth = client.handshake?.auth || {};
            const token = auth.token;

            if (!token) {
                console.error('No token provided in client auth');
                if (client.emit) {
                    client.emit('error', { message: 'No token provided' });
                }
                return;
            }

            try {
                const decoded: any = jwt.verify(token, appConfig().jwt.secret);
                const userId = decoded.sub;

                if (!userId) {
                    if (client.emit) {
                        client.emit('error', { message: 'Unauthorized' });
                    }
                    return;
                }

                const conversationId = `conv_${userId}_${Date.now()}`;

                // Send welcome message
                const welcomeResponse = await this.chatbotService.processMessage(userId, 'hello', conversationId);

                // Save bot response
                await this.chatbotService.saveChatMessage(userId, conversationId, welcomeResponse.message, true);

                // Send welcome response to client
                if (client && client.emit) {
                    client.emit('chatbot_response', {
                        ...welcomeResponse,
                        conversationId,
                        timestamp: new Date().toISOString(),
                    });
                }

                console.log('Chatbot conversation started:', { userId, conversationId });

            } catch (jwtError) {
                console.error('JWT verification failed:', jwtError.message);
                if (client.emit) {
                    client.emit('error', { message: 'Invalid token' });
                }
            }

        } catch (error) {
            console.error('Error starting conversation:', error);
            if (client && client.emit) {
                client.emit('error', { message: 'Failed to start conversation' });
            }
        }
    }
} 