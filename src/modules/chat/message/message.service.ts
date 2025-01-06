import { Injectable } from '@nestjs/common';
import { CreateMessageDto } from './dto/create-message.dto';
import { MessageStatus, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { ChatRepository } from 'src/common/repository/chat/chat.repository';

@Injectable()
export class MessageService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async create(user_id: string, createMessageDto: CreateMessageDto) {
    try {
      const data: any = {};

      if (createMessageDto.conversation_id) {
        data.conversation_id = createMessageDto.conversation_id;
      }

      if (createMessageDto.receiver_id) {
        data.receiver_id = createMessageDto.receiver_id;
      }

      if (createMessageDto.message) {
        data.message = createMessageDto.message;
      }

      const message = await this.prisma.message.create({
        data: {
          ...data,
          status: MessageStatus.SENT,
          sender_id: user_id,
        },
      });

      return {
        success: true,
        data: message,
        message: 'Message sent successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findAll({
    user_id,
    conversation_id,
  }: {
    user_id: string;
    conversation_id: string;
  }) {
    try {
      const conversation = await this.prisma.conversation.findFirst({
        where: {
          AND: [
            {
              id: conversation_id,
            },
            {
              OR: [{ creator_id: user_id }, { participant_id: user_id }],
            },
          ],
        },
      });

      if (!conversation) {
        return {
          success: false,
          message: 'Conversation not found',
        };
      }

      const messages = await this.prisma.message.findMany({
        where: {
          conversation_id: conversation_id,
        },
        orderBy: {
          created_at: 'asc',
        },
      });

      return {
        success: true,
        data: messages,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async updateMessageStatus(message_id: string, status: MessageStatus) {
    await ChatRepository.updateMessageStatus(message_id, status);
  }

  async readMessage(message_id: string) {
    await ChatRepository.updateMessageStatus(message_id, MessageStatus.READ);
  }
}
