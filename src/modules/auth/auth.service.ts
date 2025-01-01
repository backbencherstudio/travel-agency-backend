// external imports
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
//internal imports
import { PrismaService } from '../../prisma/prisma.service';
import { UserRepository } from '../../common/repository/user/user.repository';
import { MailService } from '../../mail/mail.service';
import { UcodeRepository } from '../../common/repository/ucode/ucode.repository';

@Injectable()
export class AuthService extends PrismaClient {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
    private mailService: MailService,
  ) {
    super();
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
    const payload = { email: email, sub: userId };
    const token = this.jwtService.sign(payload);
    return {
      success: true,
      message: 'Logged in successfully',
      authorization: {
        token: token,
        type: 'bearer',
      },
    };
  }

  async register({ name, email, password }) {
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
      });

      if (user == null) {
        return {
          success: false,
          message: 'Failed to create account',
        };
      }

      // create otp code
      const token = await UcodeRepository.createToken({
        userId: user.id,
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
        message: 'Failed to create account',
      };
    }
  }

  async forgotPassword(email) {
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
  }

  async resetPassword({ email, token, password }) {
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
  }

  async verifyEmail({ email, token }) {
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
  }

  async resendVerificationEmail(email: string) {
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
  }

  async changePassword({ email, oldPassword, newPassword }) {
    const user = await UserRepository.getUserByEmail(email);

    if (user) {
      const _isValidPassword = await UserRepository.validatePassword({
        email: email,
        password: oldPassword,
      });
      if (_isValidPassword) {
        await UserRepository.changePassword({
          email: email,
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
  }
}
