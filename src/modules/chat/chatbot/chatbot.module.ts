import { Module } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ChatbotController } from './chatbot.controller';
import { ChatbotGateway } from './chatbot.gateway';
import { AIService } from './ai.service';
import { OpenAIService } from './openai.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { BookingModule } from '../../application/booking/booking.module';
import { PackageModule } from '../../application/package/package.module';

@Module({
    imports: [PrismaModule, BookingModule, PackageModule],
    controllers: [ChatbotController],
    providers: [ChatbotService, ChatbotGateway, AIService, OpenAIService],
    exports: [ChatbotService],
})
export class ChatbotModule { } 