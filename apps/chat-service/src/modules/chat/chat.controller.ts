import { Controller, Get, Param, Query, Headers, Post, Body } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { ChatRepository } from './chat.repository';
import { buildCursorPage } from '@meetup/db-kit';
import { IsString } from 'class-validator';

class StartConversationDto {
  @IsString() targetUserId: string;
}

@ApiTags('chat')
@ApiBearerAuth()
@Controller('v1/chat')
export class ChatController {
  constructor(private readonly repo: ChatRepository) {}

  @Get('conversations')
  @ApiOperation({ summary: 'List own conversations' })
  getConversations(@Headers('x-user-id') userId: string) {
    return this.repo.getUserConversations(userId);
  }

  @Post('conversations')
  @ApiOperation({ summary: 'Start or get conversation with another user' })
  startConversation(
    @Headers('x-user-id') userId: string,
    @Body() dto: StartConversationDto,
  ) {
    return this.repo.findOrCreateConversation(userId, dto.targetUserId);
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get message history (cursor-based pagination)' })
  @ApiQuery({ name: 'cursor', required: false })
  @ApiQuery({ name: 'limit', required: false })
  async getMessages(
    @Param('conversationId') conversationId: string,
    @Query('cursor') cursor?: string,
    @Query('limit') limit = 50,
  ) {
    const messages = await this.repo.getMessages(conversationId, cursor, Number(limit));
    return buildCursorPage(messages, Number(limit));
  }
}
