import { Module } from '@nestjs/common';
import { CommentModule } from './comment/comment.module';
import { NotificationModule } from './notification/notification.module';

@Module({
  imports: [CommentModule, NotificationModule],
})
export class ApplicationModule {}
