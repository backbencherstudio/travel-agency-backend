import { Module } from '@nestjs/common';
import { NotificationModule } from './notification/notification.module';
import { ContactModule } from './contact/contact.module';

@Module({
  imports: [NotificationModule, ContactModule],
})
export class ApplicationModule {}
