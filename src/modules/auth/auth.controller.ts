import {
  Body,
  Controller,
  HttpException,
  HttpStatus,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { LocalAuthGuard } from './guards/local-auth.guard';
import { CreateUserDto } from './dto/create-user.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

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
  async login(@Req() req) {
    const user = req.user;
    return await this.authService.login({
      userId: user.id,
      email: user.email,
    });
  }
}
