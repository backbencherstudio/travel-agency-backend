import { Module } from '@nestjs/common';
import { StripeModule } from './stripe/stripe.module';
import { UnifiedPaymentService } from './unified-payment.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { StripeService } from './stripe/stripe.service';

@Module({
  imports: [StripeModule, PrismaModule],
  providers: [UnifiedPaymentService, StripeService],
  exports: [UnifiedPaymentService],
})
export class PaymentModule { }
