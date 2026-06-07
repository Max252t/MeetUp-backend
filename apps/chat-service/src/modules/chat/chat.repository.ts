import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '../../generated/prisma';

@Injectable()
export class ChatRepository extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }

  async findOrCreateConversation(participantA: string, participantB: string) {
    const sorted = [participantA, participantB].sort();
    const existing = await this.conversation.findFirst({
      where: { participants: { hasEvery: sorted } },
    });
    if (existing) return existing;
    return this.conversation.create({ data: { participants: sorted } });
  }

  async getConversation(conversationId: string) {
    return this.conversation.findUnique({ where: { id: conversationId } });
  }

  async saveMessage(conversationId: string, senderId: string, content: string, isEncrypted = false) {
    return this.message.create({ data: { conversationId, senderId, content, isEncrypted } });
  }

  async getMessages(conversationId: string, cursor?: string, limit = 50) {
    return this.message.findMany({
      where: {
        conversationId,
        ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      take: limit + 1,
    });
  }

  async getUserConversations(userId: string) {
    return this.conversation.findMany({
      where: { participants: { has: userId } },
      orderBy: { createdAt: 'desc' },
    });
  }
}
