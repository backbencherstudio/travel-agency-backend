import { Module } from '@nestjs/common';
import { FaqModule } from './faq/faq.module';
import { PackageModule } from './package/package.module';
import { CategoryModule } from './category/category.module';

@Module({
  imports: [FaqModule, PackageModule, CategoryModule],
})
export class AdminModule {}
