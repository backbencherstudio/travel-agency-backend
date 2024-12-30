import { Module } from '@nestjs/common';
import { FaqModule } from './faq/faq.module';
import { PackageModule } from './package/package.module';
import { CategoryModule } from './category/category.module';
import { TagModule } from './tag/tag.module';
import { PackageCancellationPolicyModule } from './package-cancellation-policy/package-cancellation-policy.module';

@Module({
  imports: [FaqModule, PackageModule, CategoryModule, TagModule, PackageCancellationPolicyModule],
})
export class AdminModule {}
