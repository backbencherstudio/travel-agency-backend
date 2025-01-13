import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export class TransactionRepository {
  /**
   * Create transaction
   * @returns
   */
  static async createTransaction({ booking_id }: { booking_id: string }) {
    const data = {
      booking_id: booking_id,
      status: 'pending',
    };
    return await prisma.paymentTransaction.create({
      data,
    });
  }
  /**
   * Update like count
   * @returns
   */
  static async updateTransaction(
    reference_number: string,
    status: string = 'pending',
  ) {
    return await prisma.paymentTransaction.updateMany({
      where: {
        reference_number: reference_number,
      },
      data: {
        status,
      },
    });
  }
}
