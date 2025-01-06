import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { ConversationService } from './conversation.service';
import { CreateConversationDto } from './dto/create-conversation.dto';
import { UpdateConversationDto } from './dto/update-conversation.dto';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';

@ApiBearerAuth()
@ApiTags('Conversation')
@UseGuards(JwtAuthGuard)
@Controller('chat/conversation')
export class ConversationController {
  constructor(private readonly conversationService: ConversationService) {}

  @ApiOperation({ summary: 'Create conversation' })
  @Post()
  async create(@Body() createConversationDto: CreateConversationDto) {
    try {
      const conversation = await this.conversationService.create(
        createConversationDto,
      );
      return conversation;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Get all conversations' })
  @Get()
  async findAll() {
    try {
      const conversations = await this.conversationService.findAll();
      return conversations;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Get a conversation by id' })
  @Get(':id')
  async findOne(@Param('id') id: string) {
    try {
      const conversation = await this.conversationService.findOne(id);
      return conversation;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Update a conversation' })
  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Body() updateConversationDto: UpdateConversationDto,
  ) {
    try {
      const conversation = await this.conversationService.update(
        id,
        updateConversationDto,
      );
      return conversation;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }

  @ApiOperation({ summary: 'Delete a conversation' })
  @Delete(':id')
  async remove(@Param('id') id: string) {
    try {
      const conversation = await this.conversationService.remove(id);
      return conversation;
    } catch (error) {
      return {
        success: false,
        message: error.message,
      };
    }
  }
}
