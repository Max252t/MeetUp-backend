import { Module } from '@nestjs/common';
import { ChatController } from './chat.controller';
import { ChatGateway } from './chat.gateway';
import { ChatRepository } from './chat.repository';
import { ChatPublisher } from './events/chat.publisher';

@Module({
  controllers: [ChatController],
  providers: [ChatGateway, ChatRepository, ChatPublisher],
})
export class ChatModule {}
