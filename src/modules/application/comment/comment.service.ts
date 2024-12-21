import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationGateway } from '../notification/notification.gateway';
import { NotificationRepository } from 'src/common/repository/notification/project.repository';

@Injectable()
export class CommentService extends PrismaClient {
  constructor(
    private prisma: PrismaService,
    private readonly notificationGateway: NotificationGateway,
  ) {
    super();
  }

  async create(user_id: string, createCommentDto: CreateCommentDto) {
    const comment = await this.comment.create({
      data: {
        content: createCommentDto.content,
        user_id: user_id,
        task_id: createCommentDto.task_id,
      },
    });

    // get user_id from task id
    const task = await this.prisma.task.findUnique({
      where: {
        id: createCommentDto.task_id,
      },
    });

    // Create notification
    const notificationMessage = 'New comment created';

    await NotificationRepository.createNotification({
      sender_id: user_id,
      receiver_id: task.assigned_to,
      text: notificationMessage,
      type: 'comment',
    });

    // Emit notification to assigned member
    this.notificationGateway.server
      .to(task.assigned_to)
      .emit('receiveNotification', {
        message: notificationMessage,
      });
    // end create notification

    return comment;
  }

  async findAll(task_id: string) {
    const comments = await this.comment.findMany({
      where: {
        task_id: task_id,
      },
      select: {
        id: true,
        content: true,
        created_at: true,
        updated_at: true,
      },
    });
    return comments;
  }

  findOne(id: number) {
    return `This action returns a #${id} comment`;
  }

  update(id: number, updateCommentDto: UpdateCommentDto) {
    return `This action updates a #${id} comment`;
  }

  async remove(id: string, user_id: string) {
    const comment = await this.comment.findUnique({
      where: {
        id: id,
      },
    });

    if (!comment) {
      return {
        success: false,
        message: 'Comment not found',
      };
    }

    if (comment.user_id != user_id) {
      return {
        success: false,
        message: 'You are not authorized to delete this comment',
      };
    }

    await this.comment.delete({
      where: {
        id: id,
      },
    });

    return {
      success: true,
      message: 'Comment deleted successfully',
    };
  }
}
