import { Module } from '@nestjs/common';
import { ChatbotService } from './chatbot.service';
import { ChatbotController } from './chatbot.controller';
import { ChatbotGateway } from './chatbot.gateway';
import { AIService } from './ai.service';
import { DeepSeekService } from './deepseek.service';
import { PrismaModule } from '../../../prisma/prisma.module';
import { BookingModule } from '../../application/booking/booking.module';
import { PackageModule } from '../../application/package/package.module';

@Module({
    imports: [PrismaModule, BookingModule, PackageModule],
    controllers: [ChatbotController],
    providers: [ChatbotService, ChatbotGateway, AIService, DeepSeekService],
    exports: [ChatbotService],
})
export class ChatbotModule { } 