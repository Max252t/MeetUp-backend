import { DomainEvent } from './base';

export interface MessageSentData {
  messageId: string;
  conversationId: string;
  senderId: string;
  recipientId: string;
  sentAt: string;
}

export interface ConversationCreatedData {
  conversationId: string;
  participants: string[];
  createdAt: string;
}

export type MessageSentEvent = DomainEvent<MessageSentData>;
export type ConversationCreatedEvent = DomainEvent<ConversationCreatedData>;
