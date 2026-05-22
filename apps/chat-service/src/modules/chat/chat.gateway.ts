import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Inject, Injectable } from '@nestjs/common';
import Redis from 'ioredis';
import { REDIS_CLIENT } from '../redis/redis.module';
import { ChatRepository } from './chat.repository';
import { ChatPublisher } from './events/chat.publisher';
import { REDIS_KEYS } from '@meetup/shared-config';
import { buildCursorPage } from '@meetup/db-kit';

const PRESENCE_TTL = 30;

@Injectable()
@WebSocketGateway({
  cors: { origin: '*' },
  namespace: '/chat',
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer() server!: Server;

  constructor(
    private readonly repo: ChatRepository,
    private readonly publisher: ChatPublisher,
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
  ) {}

  async handleConnection(client: Socket) {
    const userId = client.handshake.auth['userId'] as string | undefined;
    if (!userId) { client.disconnect(); return; }

    client.data['userId'] = userId;
    await this.redis.setex(REDIS_KEYS.PRESENCE(userId), PRESENCE_TTL, '1');
    client.join(`user:${userId}`);
  }

  async handleDisconnect(client: Socket) {
    const userId = client.data['userId'] as string | undefined;
    if (userId) await this.redis.del(REDIS_KEYS.PRESENCE(userId));
  }

  @SubscribeMessage('join_conversation')
  async joinConversation(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string },
  ) {
    client.join(`conv:${data.conversationId}`);
    return { event: 'joined', data: { conversationId: data.conversationId } };
  }

  @SubscribeMessage('send_message')
  async sendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; content: string; isEncrypted?: boolean },
  ) {
    const senderId = client.data['userId'] as string;
    const message = await this.repo.saveMessage(
      data.conversationId,
      senderId,
      data.content,
      data.isEncrypted,
    );

    const conversation = await this.repo.getConversation(data.conversationId);
    const recipientId = conversation?.participants.find((p: string) => p !== senderId);

    this.server.to(`conv:${data.conversationId}`).emit('new_message', message);

    await this.publisher.publishMessageSent({
      messageId: message.id,
      conversationId: data.conversationId,
      senderId,
      recipientId: recipientId ?? '',
      sentAt: message.createdAt.toISOString(),
    });

    return { event: 'message_sent', data: message };
  }

  @SubscribeMessage('typing')
  async typing(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { conversationId: string; isTyping: boolean },
  ) {
    const userId = client.data['userId'] as string;
    const key = REDIS_KEYS.TYPING(data.conversationId, userId);
    if (data.isTyping) {
      await this.redis.setex(key, 5, '1');
    } else {
      await this.redis.del(key);
    }
    client.to(`conv:${data.conversationId}`).emit('typing', { userId, isTyping: data.isTyping });
  }
}
