import { Module } from '@nestjs/common';
import { NotificationModule } from './notification/notification.module';
import { ContactModule } from './contact/contact.module';
import { BlogModule } from './blog/blog.module';

@Module({
  imports: [NotificationModule, ContactModule, BlogModule],
})
export class ApplicationModule {}
