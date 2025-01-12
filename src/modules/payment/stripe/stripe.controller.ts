import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Req,
  Headers,
} from '@nestjs/common';
import { StripeService } from './stripe.service';
import { Request } from 'express';

@Controller('stripe')
export class StripeController {
  constructor(private readonly stripeService: StripeService) {}

  @Post('webhook')
  async handleWebhook(
    @Headers('stripe-signature') signature: string,
    @Req() req: Request,
  ) {
    try {
      const payload = req.rawBody.toString();
      const event = await this.stripeService.handleWebhook(signature, payload);
      return { received: true };
    } catch (error) {
      return { received: false };
    }
  }
}
