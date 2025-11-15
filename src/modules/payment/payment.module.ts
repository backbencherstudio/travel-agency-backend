import { Module } from '@nestjs/common';
import { StripeModule } from './stripe/stripe.module';
import { UnifiedPaymentService } from './unified-payment.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { StripeService } from './stripe/stripe.service';
import { EscrowService } from './escrow.service';
import { EscrowExceptionsService } from './escrow-exceptions.service';
import { PayoutSchedulerService } from './payout-scheduler.service';
import { EscrowController } from './escrow.controller';
import { CommissionIntegrationService } from '../admin/sales-commission/commission-integration.service';
import { SalesCommissionService } from '../admin/sales-commission/sales-commission.service';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [StripeModule, PrismaModule, ScheduleModule.forRoot()],
  controllers: [EscrowController],
  providers: [
    UnifiedPaymentService,
    StripeService,
    EscrowService,
    EscrowExceptionsService,
    PayoutSchedulerService,
    CommissionIntegrationService,
    SalesCommissionService,
  ],
  exports: [UnifiedPaymentService, EscrowService],
})
export class PaymentModule { }
