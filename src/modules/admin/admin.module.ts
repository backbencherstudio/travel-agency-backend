import { Module } from '@nestjs/common';
import { FaqModule } from './faq/faq.module';
import { PackageModule } from './package/package.module';
import { CategoryModule } from './category/category.module';
import { TagModule } from './tag/tag.module';
import { PackageCancellationPolicyModule } from './package-cancellation-policy/package-cancellation-policy.module';
import { DestinationModule } from './destination/destination.module';
import { CountryModule } from './country/country.module';
import { BlogModule } from './blog/blog.module';
import { ContactModule } from './contact/contact.module';

@Module({
  imports: [FaqModule, PackageModule, CategoryModule, TagModule, PackageCancellationPolicyModule, DestinationModule, CountryModule, BlogModule, ContactModule],
})
export class AdminModule {}
