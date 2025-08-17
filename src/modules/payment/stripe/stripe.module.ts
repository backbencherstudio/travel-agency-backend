import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CommissionIntegrationService } from '../../admin/sales-commission/commission-integration.service';
import { SalesCommissionService } from '../../admin/sales-commission/sales-commission.service';

@Module({
  imports: [PrismaModule],
  controllers: [StripeController],
  providers: [StripeService, CommissionIntegrationService, SalesCommissionService],
})
export class StripeModule { }
