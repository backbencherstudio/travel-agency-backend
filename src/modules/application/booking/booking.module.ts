import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { BookingUtilsService } from '../../../common/services/booking-utils.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { MessageGateway } from '../../chat/message/message.gateway';
import { CancellationCalculatorService } from '../../../common/services/cancellation-calculator.service';
import { PaymentModule } from '../../payment/payment.module';

@Module({
  imports: [PrismaModule, PaymentModule],
  controllers: [BookingController],
  providers: [BookingService, BookingUtilsService, MessageGateway, CancellationCalculatorService],
  exports: [BookingService],
})
export class BookingModule { }
