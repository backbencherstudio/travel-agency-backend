import { Module } from '@nestjs/common';
import { GiftCardService } from './gift-card.service';
import { GiftCardController } from './gift-card.controller';

@Module({
  controllers: [GiftCardController],
  providers: [GiftCardService],
})
export class GiftCardModule { }
