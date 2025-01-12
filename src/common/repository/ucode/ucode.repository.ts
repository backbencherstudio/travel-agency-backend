import { PrismaClient } from '@prisma/client';
import { DateHelper } from '../../../common/helper/date.helper';
import { v4 as uuid } from 'uuid';
import { UserRepository } from '../user/user.repository';
import { randomInt } from 'crypto';

const prisma = new PrismaClient();

export class UcodeRepository {
  /**
   * create ucode token
   * @returns
   */
  static async createToken({
    userId,
    expired_at = null,
    isOtp = false,
  }): Promise<string> {
    // OTP valid for 5 minutes
    const otpExpiryTime = 5 * 60 * 1000;
    expired_at = new Date(Date.now() + otpExpiryTime);

    const userDetails = await UserRepository.getUserDetails(userId);
    if (userDetails && userDetails.email) {
      let token: string;
      if (isOtp) {
        // create 6 digit otp code
        // token = String(Math.floor(100000 + Math.random() * 900000));
        token = String(randomInt(100000, 1000000));
      } else {
        token = uuid();
      }
      const data = await prisma.ucode.create({
        data: {
          user_id: userId,
          token: token,
          email: userDetails.email,
          expired_at: expired_at,
        },
      });
      return data.token;
    } else {
      return null;
    }
  }

  /**
   * validate ucode token
   * @returns
   */
  static async validateToken({ email, token }) {
    const userDetails = await UserRepository.exist({
      field: 'email',
      value: email,
    });
    if (userDetails && userDetails.email) {
      const date = DateHelper.now().toISOString();
      const existToken = await prisma.ucode.findFirst({
        where: {
          AND: {
            token: token,
            email: email,
          },
        },
      });
      if (existToken) {
        if (existToken.expired_at) {
          const data = await prisma.ucode.findFirst({
            where: {
              AND: [
                {
                  token: token,
                },
                {
                  email: email,
                },
                {
                  expired_at: {
                    gte: date,
                  },
                },
              ],
            },
          });
          if (data) {
            // delete this token
            // await prisma.ucode.delete({
            //   where: {
            //     id: data.id,
            //   },
            // });
            return true;
          } else {
            return false;
          }
        } else {
          // delete this token
          await prisma.ucode.delete({
            where: {
              id: existToken.id,
            },
          });
          return true;
        }
      }
    } else {
      return false;
    }
  }

  /**
   * delete ucode token
   * @returns
   */
  static async deleteToken({ email, token }) {
    await prisma.ucode.deleteMany({
      where: {
        AND: [{ email: email }, { token: token }],
      },
    });
  }
}
