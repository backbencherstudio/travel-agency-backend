import { Controller } from '@nestjs/common';
import { GiftCardService } from './gift-card.service';

@Controller('gift-card')
export class GiftCardController {
  constructor(private readonly giftCardService: GiftCardService) { }
}
