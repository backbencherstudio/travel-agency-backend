import { Module } from '@nestjs/common';
import { CancellationPolicyService } from './cancellation-policy.service';
import { CancellationPolicyController } from './cancellation-policy.controller';

@Module({
  controllers: [CancellationPolicyController],
  providers: [CancellationPolicyService],
  exports: [CancellationPolicyService],
})
export class CancellationPolicyModule { }
