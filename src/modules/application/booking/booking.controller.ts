import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
  Req,
  Query,
  Body,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { BookingService } from './booking.service';
import { CreateBookingDto } from './dto/create-booking.dto';
import { CheckCancellationDto } from './dto/check-cancellation.dto';

@ApiBearerAuth()
@ApiTags('Booking')
@UseGuards(JwtAuthGuard)
@Controller('booking')
export class BookingController {
  constructor(private readonly bookingService: BookingService) { }

  @ApiOperation({ summary: 'Create booking' })
  @Post()
  async create(
    @Req() req: Request,
    @Body() createBookingDto: CreateBookingDto,
  ) {
    try {
      const user_id = req.user.userId;
      const booking = await this.bookingService.create(
        user_id,
        createBookingDto
      );
      return booking;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Get all bookings' })
  @Get()
  async findAll(
    @Req() req: Request,
    @Query() query: { q?: string; status?: number; approve?: string },
  ) {
    try {
      const user_id = req.user.userId;
      const q = query.q;
      const status = query.status;
      const approve = query.approve;
      const bookings = await this.bookingService.findAll({
        user_id,
        q,
        status,
        approve,
      });

      return bookings;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Get one booking' })
  @Get(':id')
  async findOne(@Req() req: Request, @Param('id') id: string) {
    try {
      const user_id = req.user.userId;
      const booking = await this.bookingService.findOne(id, user_id);

      return booking;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Process payment for reserved booking' })
  @Post(':id/process-payment')
  async processReservedPayment(@Req() req: Request, @Param('id') id: string) {
    try {
      const user_id = req.user.userId;
      const result = await this.bookingService.processReservedPayment(id, user_id);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Download invoice' })
  @Get('invoice/:paymentIntentId/download')
  async downloadInvoice(@Param('paymentIntentId') paymentIntentId: string) {
    try {
      const result = await this.bookingService.downloadInvoice(paymentIntentId);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Send invoice to email' })
  @Post('invoice/:paymentIntentId/send-email')
  async sendInvoiceToEmail(@Param('paymentIntentId') paymentIntentId: string) {
    try {
      const result = await this.bookingService.sendInvoiceToEmail(paymentIntentId);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Check cancellation eligibility',
    description: 'Check if a user can cancel their booking based on booking_id'
  })
  @Post('check-cancellation-eligibility')
  async checkCancellationEligibility(@Body() checkCancellationDto: CheckCancellationDto, @Req() req: Request) {
    try {
      const user_id = req.user.userId;
      const result = await this.bookingService.checkCancellationEligibility(checkCancellationDto, user_id);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({
    summary: 'Cancel booking',
    description: 'Cancel a booking if it meets the cancellation criteria (24 hours before tour start)'
  })
  @Post('cancel-booking')
  async cancelBooking(@Body() checkCancellationDto: CheckCancellationDto, @Req() req: Request) {
    try {
      const user_id = req.user.userId;
      const result = await this.bookingService.cancelBooking(checkCancellationDto, user_id);
      return result;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
