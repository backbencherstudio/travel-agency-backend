import { Module } from '@nestjs/common';
import { NotificationModule } from './notification/notification.module';
import { ContactModule } from './contact/contact.module';
import { BlogModule } from './blog/blog.module';
import { FaqModule } from './faq/faq.module';
import { FooterModule } from './footer/footer.module';
import { PackageModule } from './package/package.module';

@Module({
  imports: [NotificationModule, ContactModule, BlogModule, FaqModule, FooterModule, PackageModule],
})
export class ApplicationModule {}
