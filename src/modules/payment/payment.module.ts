import { Module } from '@nestjs/common';
import { StripeModule } from './stripe/stripe.module';
import { UnifiedPaymentService } from './unified/unified-payment.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { StripeService } from './stripe/stripe.service';
import { EscrowService } from './escrow/escrow.service';
import { EscrowExceptionsService } from './escrow/escrow-exceptions.service';
import { PayoutSchedulerService } from './escrow/payout-scheduler.service';
import { EscrowController } from './escrow/escrow.controller';
import { CommissionModule } from './commission/commission.module';
import { ScheduleModule } from '@nestjs/schedule';
import { UnifiedPaymentDashboardService } from './dashboard/unified-payment-dashboard.service';
import { UnifiedPaymentDashboardController } from './dashboard/unified-payment-dashboard.controller';

@Module({
  imports: [StripeModule, PrismaModule, CommissionModule, ScheduleModule.forRoot()],
  controllers: [EscrowController, UnifiedPaymentDashboardController],
  providers: [
    UnifiedPaymentService,
    StripeService,
    EscrowService,
    EscrowExceptionsService,
    PayoutSchedulerService,
    UnifiedPaymentDashboardService,
  ],
  exports: [UnifiedPaymentService, EscrowService, UnifiedPaymentDashboardService],
})
export class PaymentModule { }
