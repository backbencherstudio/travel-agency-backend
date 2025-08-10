import { Module } from '@nestjs/common';
import { ConversationModule } from './conversation/conversation.module';
import { MessageModule } from './message/message.module';
import { UserModule } from './user/user.module';
import { ChatbotModule } from './chatbot/chatbot.module';

@Module({
  imports: [ConversationModule, MessageModule, UserModule, ChatbotModule],
})
export class ChatModule { }
