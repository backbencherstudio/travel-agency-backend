import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CommissionIntegrationService } from '../../admin/sales-commission/commission-integration.service';
import { SalesCommissionService } from '../../admin/sales-commission/sales-commission.service';
import { EscrowService } from '../escrow.service';

@Module({
  imports: [PrismaModule],
  controllers: [StripeController],
  providers: [StripeService, CommissionIntegrationService, SalesCommissionService, EscrowService],
})
export class StripeModule { }
