import { Module } from '@nestjs/common';
import { FaqModule } from './faq/faq.module';

@Module({
  imports: [FaqModule],
})
export class AdminModule {}
