import { Module } from '@nestjs/common';
import { BookingService } from './booking.service';
import { BookingController } from './booking.controller';
import { BookingUtilsService } from '../../../common/services/booking-utils.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { MessageGateway } from '../../chat/message/message.gateway';

@Module({
  imports: [PrismaModule],
  controllers: [BookingController],
  providers: [BookingService, BookingUtilsService, MessageGateway],
})
export class BookingModule { }
