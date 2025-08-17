import { Module } from '@nestjs/common';
import { CheckoutService } from './checkout.service';
import { CheckoutController } from './checkout.controller';
import { BookingUtilsService } from '../../../common/services/booking-utils.service';
import { PrismaModule } from '../../../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [CheckoutController],
  providers: [CheckoutService, BookingUtilsService],
})
export class CheckoutModule { }
