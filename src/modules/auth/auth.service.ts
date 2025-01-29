// external imports
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
//internal imports
import { PrismaService } from '../../prisma/prisma.service';
import { UserRepository } from '../../common/repository/user/user.repository';
import { MailService } from '../../mail/mail.service';
import { UcodeRepository } from '../../common/repository/ucode/ucode.repository';
import { UpdateUserDto } from './dto/update-user.dto';
import appConfig from '../../config/app.config';
import { SojebStorage } from '../../common/lib/Disk/SojebStorage';
import { DateHelper } from '../../common/helper/date.helper';
import { StripePayment } from 'src/common/lib/Payment/stripe/StripePayment';

@Injectable()
export class AuthService extends PrismaClient {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailService: MailService,
  ) {
    super();
  }

  async me(userId: string) {
    try {
      const user = await this.prisma.user.findFirst({
        where: {
          id: userId,
        },
        select: {
          id: true,
          name: true,
          email: true,
          avatar: true,
          address: true,
          phone_number: true,
          type: true,
          gender: true,
          date_of_birth: true,
          created_at: true,
        },
      });

      if (!user) {
        return {
          success: false,
          message: 'User not found',
        };
      }

      if (user.avatar) {
        user['avatar_url'] = SojebStorage.url(
          appConfig().storageUrl.avatar + user.avatar,
        );
      }

      if (user) {
        return {
          success: true,
          data: user,
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async convertToVendor(user_id: string) {
    try {
      const response = await UserRepository.convertTo(user_id, 'vendor');

      return response;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async updateUser(
    userId: string,
    updateUserDto: UpdateUserDto,
    image?: Express.Multer.File,
  ) {
    try {
      const data: any = {};
      if (updateUserDto.name) {
        data.name = updateUserDto.name;
      }
      if (updateUserDto.phone_number) {
        data.phone_number = updateUserDto.phone_number;
      }
      if (updateUserDto.address) {
        data.address = updateUserDto.address;
      }
      if (updateUserDto.gender) {
        data.gender = updateUserDto.gender;
      }
      if (updateUserDto.date_of_birth) {
        data.date_of_birth = DateHelper.format(updateUserDto.date_of_birth);
      }
      if (image) {
        // delete old image from storage
        const oldImage = await this.prisma.user.findFirst({
          where: { id: userId },
          select: { avatar: true },
        });
        if (oldImage.avatar) {
          await SojebStorage.delete(
            appConfig().storageUrl.avatar + oldImage.avatar,
          );
        }
        data.avatar = image.filename;
      }
      const user = await UserRepository.getUserDetails(userId);
      if (user) {
        await this.prisma.user.update({
          where: { id: userId },
          data: {
            ...data,
          },
        });

        return {
          success: true,
          message: 'User updated successfully',
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async validateUser(email: string, pass: string): Promise<any> {
    const _password = pass;
    const user = await this.prisma.user.findFirst({
      where: {
        email: email,
      },
    });

    if (user) {
      const _isValidPassword = await UserRepository.validatePassword({
        email: email,
        password: _password,
      });
      if (_isValidPassword) {
        const { password, ...result } = user;
        return result;
      } else {
        throw new UnauthorizedException('Password not matched');
      }
    } else {
      throw new UnauthorizedException('Email not found');
    }
  }

  async login({ email, userId }) {
    try {
      const payload = { email: email, sub: userId };
      const token = this.jwtService.sign(payload);

      const user = await UserRepository.getUserDetails(userId);

      return {
        success: true,
        message: 'Logged in successfully',
        authorization: {
          token: token,
          type: 'bearer',
        },
        type: user.type,
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async register({
    name,
    email,
    password,
    type,
  }: {
    name: string;
    email: string;
    password: string;
    type?: string;
  }) {
    try {
      // Check if email already exist
      const userEmailExist = await UserRepository.exist({
        field: 'email',
        value: String(email),
      });

      if (userEmailExist) {
        return {
          statusCode: 401,
          message: 'Email already exist',
        };
      }

      const user = await UserRepository.createUser({
        name: name,
        email: email,
        password: password,
        type: type,
      });

      if (user == null && user.success == false) {
        return {
          success: false,
          message: 'Failed to create account',
        };
      }

      // create stripe customer account
      const stripeCustomer = await StripePayment.createCustomer({
        user_id: user.data.id,
        email: email,
        name: name,
      });

      if (stripeCustomer) {
        await this.prisma.user.update({
          where: {
            id: user.data.id,
          },
          data: {
            billing_id: stripeCustomer.id,
          },
        });
      }

      // create otp code
      const token = await UcodeRepository.createToken({
        userId: user.data.id,
        isOtp: true,
      });

      // send otp code to email
      await this.mailService.sendOtpCodeToEmail({
        email: email,
        name: name,
        otp: token,
      });

      return {
        success: true,
        message: 'We have sent an OTP code to your email',
      };
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async forgotPassword(email) {
    try {
      const user = await UserRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const token = await UcodeRepository.createToken({
          userId: user.id,
          isOtp: true,
        });

        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: user.name,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent an OTP code to your email',
        };
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async resetPassword({ email, token, password }) {
    try {
      const user = await UserRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const existToken = await UcodeRepository.validateToken({
          email: email,
          token: token,
        });

        if (existToken) {
          await UserRepository.changePassword({
            email: email,
            password: password,
          });

          // delete otp code
          await UcodeRepository.deleteToken({
            email: email,
            token: token,
          });

          return {
            success: true,
            message: 'Password updated successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async verifyEmail({ email, token }) {
    try {
      const user = await UserRepository.exist({
        field: 'email',
        value: email,
      });

      if (user) {
        const existToken = await UcodeRepository.validateToken({
          email: email,
          token: token,
        });

        if (existToken) {
          await this.prisma.user.update({
            where: {
              id: user.id,
            },
            data: {
              email_verified_at: new Date(Date.now()),
            },
          });

          // delete otp code
          // await UcodeRepository.deleteToken({
          //   email: email,
          //   token: token,
          // });

          return {
            success: true,
            message: 'Email verified successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async resendVerificationEmail(email: string) {
    try {
      const user = await UserRepository.getUserByEmail(email);

      if (user) {
        // create otp code
        const token = await UcodeRepository.createToken({
          userId: user.id,
          isOtp: true,
        });

        // send otp code to email
        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: user.name,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent a verification code to your email',
        };
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async changePassword({ user_id, oldPassword, newPassword }) {
    try {
      const user = await UserRepository.getUserDetails(user_id);

      if (user) {
        const _isValidPassword = await UserRepository.validatePassword({
          email: user.email,
          password: oldPassword,
        });
        if (_isValidPassword) {
          await UserRepository.changePassword({
            email: user.email,
            password: newPassword,
          });

          return {
            success: true,
            message: 'Password updated successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid password',
          };
        }
      } else {
        return {
          success: false,
          message: 'Email not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async requestEmailChange(user_id: string, email: string) {
    try {
      const user = await UserRepository.getUserDetails(user_id);
      if (user) {
        const token = await UcodeRepository.createToken({
          userId: user.id,
          isOtp: true,
          email: email,
        });

        await this.mailService.sendOtpCodeToEmail({
          email: email,
          name: email,
          otp: token,
        });

        return {
          success: true,
          message: 'We have sent an OTP code to your email',
        };
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  async changeEmail({
    user_id,
    new_email,
    token,
  }: {
    user_id: string;
    new_email: string;
    token: string;
  }) {
    try {
      const user = await UserRepository.getUserDetails(user_id);

      if (user) {
        const existToken = await UcodeRepository.validateToken({
          email: new_email,
          token: token,
          forEmailChange: true,
        });

        if (existToken) {
          await UserRepository.changeEmail({
            user_id: user.id,
            new_email: new_email,
          });

          // delete otp code
          await UcodeRepository.deleteToken({
            email: new_email,
            token: token,
          });

          return {
            success: true,
            message: 'Email updated successfully',
          };
        } else {
          return {
            success: false,
            message: 'Invalid token',
          };
        }
      } else {
        return {
          success: false,
          message: 'User not found',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
