import { Module } from '@nestjs/common';
import { NotificationModule } from './notification/notification.module';
import { ContactModule } from './contact/contact.module';
import { BlogModule } from './blog/blog.module';
import { FaqModule } from './faq/faq.module';
import { FooterModule } from './footer/footer.module';

@Module({
  imports: [NotificationModule, ContactModule, BlogModule, FaqModule, FooterModule],
})
export class ApplicationModule {}
