import { Module } from '@nestjs/common';
import { StripeModule } from './stripe/stripe.module';
import { PayPalModule } from './paypal/paypal.module';
import { UnifiedPaymentService } from './unified-payment.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { StripeService } from './stripe/stripe.service';
import { PayPalService } from './paypal/paypal.service';

@Module({
  imports: [StripeModule, PayPalModule, PrismaModule],
  providers: [UnifiedPaymentService, StripeService, PayPalService],
  exports: [UnifiedPaymentService],
})
export class PaymentModule { }
