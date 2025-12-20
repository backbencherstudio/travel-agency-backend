import { Injectable } from '@nestjs/common';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { PrismaClient } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { UserRepository } from '../../../common/repository/user/user.repository';
import { SojebStorage } from '../../../common/lib/Disk/SojebStorage';
import appConfig from '../../../config/app.config';
import { EscrowService } from 'src/modules/payment/escrow/escrow.service';

@Injectable()
export class BookingService extends PrismaClient {
  constructor(
    private prisma: PrismaService,
     private escrowService: EscrowService,
  ) {
    super();
  }

  async findAll({
    user_id,
    q,
    status = null,
    approve,
    page = 1,
    limit = 10,
  }: {
    user_id?: string;
    q?: string;
    status?: string;
    approve?: string;
    page?: number;
    limit?: number;
  }) {
    try {
      const where_condition: any = {};

      if (user_id) {
        const userDetails = await UserRepository.getUserDetails(user_id);
        if (userDetails && userDetails.type === 'vendor') {
          where_condition['vendor_id'] = user_id;
        }
      }

      if (q) {
        where_condition['OR'] = [
          { invoice_number: { contains: q, mode: 'insensitive' } },
          { user: { is: { name: { contains: q, mode: 'insensitive' } } } },
          {
            booking_items: {
              some: {
                package: { is: { name: { contains: q, mode: 'insensitive' } } },
              },
            },
          },
        ];
      }


      if (status) {
        where_condition['status'] = status;
      }

      if (approve) {
        where_condition['approved_at'] =
          approve === 'approved' ? { not: null } : null;
      }

      const skip = (page - 1) * limit;

      const [bookings, total] = await this.prisma.$transaction([
        this.prisma.booking.findMany({
          where: where_condition,
          orderBy: {
            created_at: 'desc',
          },
          skip,
          take: limit,
          select: {
            id: true,
            invoice_number: true,
            email: true,
            phone_number: true,
            address1: true,
            address2: true,
            city: true,
            state: true,
            zip_code: true,
            country: true,
            total_amount: true,
            status: true,
            payment_status: true,
            booking_items: {
              select: {
                package: {
                  select: {
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
            created_at: true,
            updated_at: true,
          },
        }),
        this.prisma.booking.count({
          where: where_condition,
        }),
      ]);

      // add avatar url
      bookings.forEach((booking) => {
        if (booking.user && booking.user.avatar) {
          booking.user['avatar_url'] = SojebStorage.url(
            appConfig().storageUrl.avatar + booking.user.avatar,
          );
        }
      });

      const totalPages = Math.ceil(total / limit);

      return {
        success: true,
        data: bookings,
        pagination: {
          page,
          limit,
          total,
          totalPages,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
        },
      };

    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async findOne(id: string) {
    try {
      const booking = await this.prisma.booking.findUnique({
        where: { id },
        select: {
          id: true,
          invoice_number: true,
          status: true,
          vendor_id: true,
          user_id: true,
          type: true,
          booking_type: true,
          total_amount: true,
          payment_status: true,
          payment_raw_status: true,
          paid_amount: true,
          paid_currency: true,
          first_name: true,
          last_name: true,
          email: true,
          phone_number: true,
          address1: true,
          address2: true,
          city: true,
          state: true,
          comments: true,
          user: {
            select: {
              name: true,
              email: true,
              avatar: true,
            },
          },
          booking_items: {
            select: {
              package: {
                select: {
                  id: true,
                  name: true,
                  price: true,
                },
              },
            },
          },
          booking_extra_services: {
            select: {
              extra_service: {
                select: {
                  name: true,
                  price: true,
                },
              },
            },
          },
          booking_travellers: {
            select: {
              full_name: true,
              type: true,
            },
          },
          booking_coupons: {
            select: {
              coupon: {
                select: {
                  name: true,
                  amount: true,
                  amount_type: true,
                },
              },
            },
          },
          payment_transactions: {
            select: {
              amount: true,
              currency: true,
              paid_amount: true,
              paid_currency: true,
              status: true,
            },
          },
          created_at: true,
          updated_at: true,
        },
      });

      if (!booking) {
        return {
          success: false,
          message: 'Booking not found',
        };
      }

      // add avatar url
      if (booking.user && booking.user.avatar) {
        booking.user['avatar_url'] = SojebStorage.url(
          appConfig().storageUrl.avatar + booking.user.avatar,
        );
      }

      return {
        success: true,
        data: booking,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async update(id: string, updateBookingDto: UpdateBookingDto) {
    try {
      // check if exists
      const existBooking = await this.prisma.booking.findUnique({
        where: { id },
      });
      if (!existBooking) {
        return {
          success: false,
          message: 'Booking not found',
        };
      }

      const booking = await this.prisma.booking.update({
        where: { id },
        data: updateBookingDto,
      });

      return {
        success: true,
        data: booking,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async updateStatus(id: string, updateBookingDto: UpdateBookingDto) {
    try {
      // check if exists
      const existBooking = await this.prisma.booking.findUnique({
        where: { id },
      });
      if (!existBooking) {
        return {
          success: false,
          message: 'Booking not found',
        };
      }

      await this.prisma.booking.update({
        where: { id },
        data: updateBookingDto,
      });

      // send notification
      // await NotificationRepository.createNotification({
      //   sender_id: booking.user_id,
      //   receiver_id: booking.vendor_id,
      //   text: 'Your booking has been updated',
      //   type: 'booking',
      // });

      return {
        success: true,
        message: 'Booking status updated',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async remove(id: string) {
    try {
      const booking = await this.prisma.booking.delete({
        where: { id },
      });

      return {
        success: true,
        data: booking,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

   /**
   * Mark booking as complete (admin/vendor action)
   * Triggers final payout for packages
   */
  async markBookingComplete(
    bookingId: string,
    userId: string,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    userType?: string,
  ): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      // Check if user is admin or vendor
      const user = await UserRepository.getUserDetails(userId);
      if (!user) {
        return { success: false, message: 'User not found' };
      }

      const isAdmin = user.type === 'admin' || user.type === 'su_admin';
      const isVendor = user.type === 'vendor';

      const booking = await this.prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          booking_items: {
            include: {
              package: true,
            },
          },
        },
      });

      if (!booking) {
        return { success: false, message: 'Booking not found' };
      }

      // Check permissions
      if (!isAdmin && !(isVendor && booking.vendor_id === userId)) {
        return {
          success: false,
          message: 'Unauthorized to mark booking as complete',
        };
      }

      if (booking.status === 'complete') {
        return {
          success: false,
          message: 'Booking already marked as complete',
        };
      }

      // Update booking status to vendor-completed (awaiting client confirmation)
      await this.prisma.booking.update({
        where: { id: bookingId },
        data: {
          status: 'vendor_completed',
        },
      });

      // Packages use event-based payout.
      // Final release should be triggered by client confirmation
      // (application booking confirm) or auto-confirmation cron.
      // No payout execution on admin/vendor "complete" to avoid premature release.

      return {
        success: true,
        message: 'Booking marked as completed by vendor; awaiting client confirmation',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Failed to mark booking as complete',
      };
    }
  }
}
