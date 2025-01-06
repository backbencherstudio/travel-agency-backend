import { PrismaClient, MessageStatus } from '@prisma/client';

const prisma = new PrismaClient();

export class ChatRepository {
  /**
   * Update message status
   * @returns
   */
  static async updateMessageStatus(message_id: string, status: MessageStatus) {
    await prisma.message.update({
      where: {
        id: message_id,
      },
      data: {
        status,
      },
    });
  }

  /**
   * Update user status
   * @returns
   */
  static async updateUserStatus(user_id: string, status: string) {
    return await prisma.user.update({
      where: { id: user_id },
      data: {
        availability: status,
      },
    });
  }
}
