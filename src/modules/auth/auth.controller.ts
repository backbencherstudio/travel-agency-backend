import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Patch,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { Request } from 'express';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { diskStorage } from 'multer';
import { FileInterceptor } from '@nestjs/platform-express';
import appConfig from 'src/config/app.config';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @ApiOperation({ summary: 'Get user details' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async me(@Req() req: Request) {
    try {
      const user_id = req.user.userId;

      const response = await this.authService.me(user_id);

      return response;
    } catch (error) {
      return {
        success: false,
        message: 'Failed to fetch user details',
      };
    }
  }

  @ApiOperation({ summary: 'Register a user' })
  @Post('register')
  async create(@Body() data: CreateUserDto) {
    const name = data.name;
    const email = data.email;
    const password = data.password;

    if (!name) {
      throw new HttpException('Name not provided', HttpStatus.UNAUTHORIZED);
    }
    if (!email) {
      throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
    }
    if (!password) {
      throw new HttpException('Password not provided', HttpStatus.UNAUTHORIZED);
    }

    return await this.authService.register({
      name: name,
      email: email,
      password: password,
    });
  }

  @ApiOperation({ summary: 'Login user' })
  @UseGuards(LocalAuthGuard)
  @Post('login')
  async login(@Req() req: Request) {
    const user_id = req.user.userId;
    const user_email = req.user.email;

    return await this.authService.login({
      userId: user_id,
      email: user_email,
    });
  }

  @ApiOperation({ summary: 'Update user' })
  @ApiBearerAuth()
  @UseGuards(JwtAuthGuard)
  @Patch('update')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination:
          appConfig().storageUrl.rootUrl + appConfig().storageUrl.avatar,
        filename: (req, file, cb) => {
          const randomName = Array(32)
            .fill(null)
            .map(() => Math.round(Math.random() * 16).toString(16))
            .join('');
          return cb(null, `${randomName}${file.originalname}`);
        },
      }),
    }),
  )
  async updateUser(
    @Req() req: Request,
    @Body() data: UpdateUserDto,
    @UploadedFile() image: Express.Multer.File,
  ) {
    try {
      const user_id = req.user.userId;
      const response = await this.authService.updateUser(user_id, data, image);
      return response;
    } catch (error) {
      return {
        success: false,
        message: 'Failed to update user',
      };
    }
  }

  @ApiOperation({ summary: 'Forgot password' })
  @Post('forgot-password')
  async forgotPassword(@Body() data) {
    const email = data.email;
    if (!email) {
      throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
    }
    return await this.authService.forgotPassword(email);
  }

  @ApiOperation({ summary: 'Reset password' })
  @Post('reset-password')
  async resetPassword(@Body() data) {
    const email = data.email;
    const token = data.token;
    const password = data.password;
    if (!email) {
      throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
    }
    if (!token) {
      throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
    }
    if (!password) {
      throw new HttpException('Password not provided', HttpStatus.UNAUTHORIZED);
    }
    return await this.authService.resetPassword({
      email: email,
      token: token,
      password: password,
    });
  }

  @ApiOperation({ summary: 'Verify email' })
  @Post('verify-email')
  async verifyEmail(@Body() data: VerifyEmailDto) {
    const email = data.email;
    const token = data.token;
    if (!email) {
      throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
    }
    if (!token) {
      throw new HttpException('Token not provided', HttpStatus.UNAUTHORIZED);
    }
    return await this.authService.verifyEmail({
      email: email,
      token: token,
    });
  }

  @ApiOperation({ summary: 'Resend verification email' })
  @Post('resend-verification-email')
  async resendVerificationEmail(@Body() data) {
    const email = data.email;
    if (!email) {
      throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
    }
    return await this.authService.resendVerificationEmail(email);
  }

  @ApiOperation({ summary: 'Change password' })
  @Post('change-password')
  async changePassword(@Body() data) {
    const email = data.email;
    const oldPassword = data.oldPassword;
    const newPassword = data.newPassword;
    if (!email) {
      throw new HttpException('Email not provided', HttpStatus.UNAUTHORIZED);
    }
    if (!oldPassword) {
      throw new HttpException(
        'Old password not provided',
        HttpStatus.UNAUTHORIZED,
      );
    }
    if (!newPassword) {
      throw new HttpException(
        'New password not provided',
        HttpStatus.UNAUTHORIZED,
      );
    }
    return await this.authService.changePassword({
      email: email,
      oldPassword: oldPassword,
      newPassword: newPassword,
    });
  }
}
