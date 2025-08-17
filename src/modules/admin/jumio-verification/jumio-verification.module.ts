import { Module } from '@nestjs/common';
import { PrismaModule } from '../../../prisma/prisma.module';
import { JumioVerificationService } from './jumio-verification.service';
import { JumioVerificationController } from './jumio-verification.controller';
import { JumioWebhookController } from './jumio-webhook.controller';
import { JumioService } from '../../../common/lib/Jumio/JumioService';

@Module({
  imports: [PrismaModule],
  controllers: [JumioVerificationController, JumioWebhookController],
  providers: [JumioVerificationService, JumioService],
  exports: [JumioVerificationService],
})
export class JumioVerificationModule { }
