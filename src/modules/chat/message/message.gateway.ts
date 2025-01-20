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
import { MessageStatus } from '@prisma/client';
import * as jwt from 'jsonwebtoken';
import { MessageService } from './message.service';
import appConfig from '../../../config/app.config';
import { ChatRepository } from 'src/common/repository/chat/chat.repository';

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

  constructor(
    private readonly messageService: MessageService,
    // private jwtService: JwtService,
  ) {}

  // Map to store connected clients
  private clients = new Map<string, string>(); // userId -> socketId

  onModuleInit() {}

  afterInit(server: Server) {
    console.log('Websocket server started');
  }

  // implement jwt token validation
  async handleConnection(client: Socket, ...args: any[]) {
    console.log('new connection!', client.id);
    console.log('header', client.handshake.auth.token);
    try {
      // const token = client.handshake.headers.authorization?.split(' ')[1];
      const token = client.handshake.auth.token;
      if (!token) {
        client.disconnect();
        console.log('No token provided');
        return;
      }

      const decoded: any = jwt.verify(token, appConfig().jwt.secret);
      // const decoded: any = this.jwtService.verify(token);
      const userId = decoded.userId;
      // const userId = client.handshake.query.userId as string;
      if (userId) {
        this.clients.set(userId, client.id);
        console.log(`User ${userId} connected with socket ${client.id}`);

        // await this.messageService.updateUserStatus(userId, 'online');
        await ChatRepository.updateUserStatus(userId, 'online');
        // notify the user that the user is online
        this.server.to(client.id).emit('userStatusChange', {
          user_id: userId,
          status: 'online',
        });
      }
    } catch (error) {
      client.disconnect();
      console.error('Error handling connection:', error);
    }
  }

  async handleDisconnect(client: Socket) {
    // console.log('client disconnected!', client.id);
    const userId = [...this.clients.entries()].find(
      ([, socketId]) => socketId === client.id,
    )?.[0];
    if (userId) {
      this.clients.delete(userId);
      console.log(`User ${userId} disconnected`);

      await this.messageService.updateUserStatus(userId, 'offline');
      // notify the user that the user is offline
      this.server.to(client.id).emit('userStatusChange', {
        user_id: userId,
        status: 'offline',
      });
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
