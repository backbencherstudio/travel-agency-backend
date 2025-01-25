import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRepository } from 'src/common/repository/user/user.repository';

@Injectable()
export class PaymentTransactionService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async findAll(user_id?: string) {
    try {
      const userDetails = await UserRepository.getUserDetails(user_id);

      const whereClause = {};
      if (userDetails.type == 'vendor') {
        whereClause['user_id'] = user_id;
      }

      const paymentTransactions = await this.prisma.paymentTransaction.findMany(
        {
          where: {
            ...whereClause,
          },
          select: {
            id: true,
            reference_number: true,
            status: true,
            provider: true,
            paid_amount: true,
            paid_currency: true,
            booking: {
              select: {
                id: true,
                invoice_number: true,
                status: true,
                total_amount: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone_number: true,
              },
            },
          },
        },
      );
      return {
        success: true,
        data: paymentTransactions,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findOne(id: string, user_id?: string) {
    try {
      const userDetails = await UserRepository.getUserDetails(user_id);

      const whereClause = {};
      if (userDetails.type == 'vendor') {
        whereClause['user_id'] = user_id;
      }

      const paymentTransaction =
        await this.prisma.paymentTransaction.findUnique({
          where: {
            id: id,
            ...whereClause,
          },
          select: {
            id: true,
            reference_number: true,
            status: true,
            provider: true,
            paid_amount: true,
            paid_currency: true,
            booking: {
              select: {
                id: true,
                invoice_number: true,
                status: true,
                total_amount: true,
              },
            },
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone_number: true,
              },
            },
          },
        });

      if (!paymentTransaction) {
        return {
          success: false,
          message: 'Payment transaction not found',
        };
      }

      return {
        success: true,
        data: paymentTransaction,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async remove(id: string, user_id?: string) {
    try {
      const userDetails = await UserRepository.getUserDetails(user_id);

      const whereClause = {};
      if (userDetails.type == 'vendor') {
        whereClause['user_id'] = user_id;
      }

      const paymentTransaction =
        await this.prisma.paymentTransaction.findUnique({
          where: {
            id: id,
            ...whereClause,
          },
        });

      if (!paymentTransaction) {
        return {
          success: false,
          message: 'Payment transaction not found',
        };
      }

      await this.prisma.paymentTransaction.delete({
        where: {
          id: id,
        },
      });

      return {
        success: true,
        message: 'Payment transaction deleted successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
