import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRepository } from '../../../common/repository/user/user.repository';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import appConfig from '../../../config/app.config';

@Injectable()
export class PaymentTransactionService extends PrismaClient {
  constructor(private prisma: PrismaService) {
    super();
  }

  async getPaymentDashboard(user_id: string) {
    const userDetails = await UserRepository.getUserDetails(user_id);

    const whereClause: any = {
      deleted_at: null,
    };

    if (userDetails.type === 'vendor') {
      whereClause.user_id = user_id;
    }

    // Summary
    const [totalEarningsAgg, pendingAgg, lastPayment] = await Promise.all([
      this.prisma.paymentTransaction.aggregate({
        where: {
          ...whereClause,
          status: 'succeeded',
        },
        _sum: { paid_amount: true },
      }),
      this.prisma.paymentTransaction.aggregate({
        where: {
          ...whereClause,
          status: 'pending',
        },
        _sum: { paid_amount: true },
      }),
      this.prisma.paymentTransaction.findFirst({
        where: {
          ...whereClause,
          status: 'succeeded',
        },
        orderBy: {
          created_at: 'desc',
        },
        select: {
          paid_amount: true,
        },
      }),
    ]);

    const summary = {
      total_earnings: Number(totalEarningsAgg._sum.paid_amount || 0),
      pending_payments: Number(pendingAgg._sum.paid_amount || 0),
      last_payment: Number(lastPayment?.paid_amount || 0),
    };

    // History (Latest 10)
    const paymentTransactions = await this.prisma.paymentTransaction.findMany({
      where: whereClause,
      take: 10,
      orderBy: { created_at: 'desc' },
      select: {
        id: true,
        created_at: true,
        paid_amount: true,
        booking: {
          select: {
            id: true,
            invoice_number: true,
            status: true,
            user: {
              select: {
                id: true,
                name: true,
                avatar: true,
              },
            },
          },
        },
      },
    });

    const history = paymentTransactions.map((tx) => ({
      booking_id: `#${tx.booking?.invoice_number || tx.booking?.id}`,
      traveler_name: tx.booking?.user?.name || 'Unknown',
      status: tx.booking?.status || 'Unknown',
      avatar_url: tx.booking?.user?.avatar
        ? SojebStorage.url(appConfig().storageUrl.avatar + tx.booking.user.avatar)
        : null,
      amount: Number(tx.paid_amount || 0),
      date: tx.created_at,
      transaction_id: tx.id,
    }));

    return {
      success: true,
      data: {
        summary,
        history,
      },
    };
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
            amount: true,
            currency: true,
            paid_amount: true,
            paid_currency: true,
            created_at: true,
            updated_at: true,
            booking: {
              select: {
                id: true,
                invoice_number: true,
                status: true,
                total_amount: true,
                booking_items: {
                  select: {
                    id: true,
                    package: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                  },
                },
              },
            },
          },
        },
      );

      // add avatar url
      for (const paymentTransaction of paymentTransactions) {
        if (
          paymentTransaction.booking &&
          paymentTransaction.booking.user &&
          paymentTransaction.booking.user.avatar
        ) {
          paymentTransaction.booking.user['avatar_url'] = SojebStorage.url(
            appConfig().storageUrl.avatar +
            paymentTransaction.booking.user.avatar,
          );
        }
      }

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
            amount: true,
            currency: true,
            paid_amount: true,
            paid_currency: true,
            created_at: true,
            updated_at: true,
            booking: {
              select: {
                id: true,
                invoice_number: true,
                status: true,
                total_amount: true,
                booking_items: {
                  select: {
                    id: true,
                    package: {
                      select: {
                        id: true,
                        name: true,
                      },
                    },
                  },
                },
                user: {
                  select: {
                    id: true,
                    name: true,
                    avatar: true,
                  },
                },
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

      // add avatar url
      if (
        paymentTransaction.booking &&
        paymentTransaction.booking.user &&
        paymentTransaction.booking.user.avatar
      ) {
        paymentTransaction.booking.user['avatar_url'] = SojebStorage.url(
          appConfig().storageUrl.avatar +
          paymentTransaction.booking.user.avatar,
        );
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
