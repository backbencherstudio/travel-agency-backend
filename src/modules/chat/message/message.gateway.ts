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
import { MessageService } from './message.service';
import * as jwt from 'jsonwebtoken';
import { MessageStatus } from '@prisma/client';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
})
export class MessageGateway
  implements
    OnGatewayInit,
    OnGatewayConnection,
    OnGatewayDisconnect,
    OnModuleInit
{
  @WebSocketServer()
  server: Server;

  constructor(private readonly messageService: MessageService) {}

  // Map to store connected clients
  private clients = new Map<string, string>(); // userId -> socketId

  onModuleInit() {}

  afterInit(server: Server) {
    console.log('Websocket server started');
  }

  // implement jwt token validation
  async handleConnection(client: Socket, ...args: any[]) {
    try {
      const token = client.handshake.headers.authorization?.split(' ')[1];
      if (!token) {
        client.disconnect();
        console.log('No token provided');
        return;
      }

      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const userId = decoded.userId;
      // const userId = client.handshake.query.userId as string;
      if (userId) {
        this.clients.set(userId, client.id);
        console.log(`User ${userId} connected with socket ${client.id}`);
      }
    } catch (error) {
      client.disconnect();
      console.error('Error handling connection:', error);
    }
  }

  handleDisconnect(client: Socket) {
    // console.log('client disconnected!', client.id);
    const userId = [...this.clients.entries()].find(
      ([, socketId]) => socketId === client.id,
    )?.[0];
    if (userId) {
      this.clients.delete(userId);
      console.log(`User ${userId} disconnected`);
    }
  }

  @SubscribeMessage('joinRoom')
  handleRoomJoin(client: Socket, room: string) {
    client.join(room);
    client.emit('joinedRoom', room);
  }

  @SubscribeMessage('sendMessage')
  async listenForMessages(@MessageBody() body: { to: string; data: any }) {
    await this.messageService.create(body.to, body.data);
    this.server.to(body.to).emit('message', { from: body.to, data: body.data });
  }

  @SubscribeMessage('updateMessageStatus')
  async updateMessageStatus(
    client: Socket,
    @MessageBody() body: { message_id: string; status: MessageStatus },
  ) {
    await this.messageService.updateMessageStatus(body.message_id, body.status);
    // notify the sender that the message has been sent
    this.server.to(client.id).emit('messageStatusUpdated', {
      message_id: body.message_id,
      status: body.status,
    });
  }

  @SubscribeMessage('typing')
  handleTyping(client: Socket, @MessageBody() body: { to: string; data: any }) {
    this.server
      .to(body.to)
      .emit('userTyping', { from: body.to, data: body.data });
  }

  @SubscribeMessage('stopTyping')
  handleStopTyping(
    client: Socket,
    @MessageBody() body: { to: string; data: any },
  ) {
    this.server
      .to(body.to)
      .emit('userStoppedTyping', { from: body.to, data: body.data });
  }
}
