import { Module } from '@nestjs/common';
import { GiftCardService } from './gift-card.service';
import { GiftCardController } from './gift-card.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { PaymentModule } from '../../payment/payment.module';
import { ChatModule } from '../../chat/chat.module';

@Module({
  imports: [PrismaModule, PaymentModule, ChatModule],
  controllers: [GiftCardController],
  providers: [GiftCardService],
})
export class GiftCardModule { }
