import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { SalesCommissionService } from './sales-commission.service';
import { SalesCommissionController } from './sales-commission.controller';
import { CommissionIntegrationService } from './commission-integration.service';

@Module({
  imports: [PrismaModule],
  controllers: [SalesCommissionController],
  providers: [SalesCommissionService, CommissionIntegrationService],
  exports: [SalesCommissionService, CommissionIntegrationService],
})
export class SalesCommissionModule { }
