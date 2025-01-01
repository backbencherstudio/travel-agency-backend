import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class NotificationRepository {
  static async createNotification({
    sender_id,
    receiver_id,
    text,
    type,
  }: {
    sender_id: string;
    receiver_id: string;
    text: string;
    type: 'message' | 'task' | 'project' | 'comment';
  }) {
    const notificationEvent = await prisma.notificationEvent.create({
      data: {
        type: type,
        text: text,
      },
    });

    const notification = await prisma.notification.create({
      data: {
        sender_id: sender_id,
        receiver_id: receiver_id,
        notification_event_id: notificationEvent.id,
      },
    });

    return notification;
  }
}
