import {
  Controller,
  Get,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
  Query,
} from '@nestjs/common';
import { BookingService } from './booking.service';
import { UpdateBookingDto } from './dto/update-booking.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Role } from 'src/common/guard/role/role.enum';
import { Roles } from 'src/common/guard/role/roles.decorator';
import { RolesGuard } from 'src/common/guard/role/roles.guard';
import { JwtAuthGuard } from 'src/modules/auth/guards/jwt-auth.guard';
import { Request } from 'express';

@ApiBearerAuth()
@ApiTags('Booking')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN, Role.VENDOR)
@Controller('admin/booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) {}

  @ApiOperation({ summary: 'Get all bookings' })
  @Get()
  async findAll(@Req() req: Request, @Query() query: { q: string }) {
    try {
      const user_id = req.user.userId;
      const q = query.q;
      const bookings = await this.bookingService.findAll({ user_id, q });

      return bookings;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Get booking by id' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const booking = await this.bookingService.findOne(id);
      return booking;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateBookingDto: UpdateBookingDto,
  ) {
    try {
      const booking = await this.bookingService.update(id, updateBookingDto);
      return booking;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const booking = await this.bookingService.remove(id);
      return booking;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
