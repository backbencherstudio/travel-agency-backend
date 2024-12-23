// external imports
import { Injectable, UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';
import { PrismaClient } from '@prisma/client';
//internal imports
import { PrismaService } from '../../prisma/prisma.service';
import { UserRepository } from '../../common/repository/user/user.repository';

@Injectable()
export class AuthService extends PrismaClient {
  constructor(
    private jwtService: JwtService,
    private prisma: PrismaService,
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
      const _isValidPassword = await bcrypt.compare(_password, user.password);
      if (_isValidPassword) {
        const { password, ...result } = user;
        return result;
      } else {
        throw new UnauthorizedException('Password not matched');
      }
    }
    return null;
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

      await UserRepository.createUser({
        name: name,
        email: email,
        password: password,
      });

      return {
        success: true,
        message: 'Account created successfully',
      };
    } catch (error) {
      return {
        success: false,
        message: 'Failed to create account',
      };
    }
  }
}
