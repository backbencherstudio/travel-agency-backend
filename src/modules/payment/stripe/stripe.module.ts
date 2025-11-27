import { Module } from '@nestjs/common';
import { StripeService } from './stripe.service';
import { StripeController } from './stripe.controller';
import { PrismaModule } from '../../../prisma/prisma.module';
import { CommissionModule } from '../commission/commission.module';
import { EscrowService } from '../escrow/escrow.service';
import { EscrowExceptionsService } from '../escrow/escrow-exceptions.service';

@Module({
  imports: [PrismaModule, CommissionModule],
  controllers: [StripeController],
  providers: [StripeService, EscrowService, EscrowExceptionsService],
})
export class StripeModule { }
