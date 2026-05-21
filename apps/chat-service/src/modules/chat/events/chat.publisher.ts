import { Inject, Injectable } from '@nestjs/common';
import { JetStreamClient, StringCodec } from 'nats';
import { JETSTREAM_CLIENT } from '../../nats/nats.module';
import { NATS_SUBJECTS } from '@meetup/shared-config';
import { MessageSentData, ConversationCreatedData } from '@meetup/events';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ChatPublisher {
  private readonly sc = StringCodec();

  constructor(@Inject(JETSTREAM_CLIENT) private readonly js: JetStreamClient) {}

  async publishMessageSent(data: MessageSentData): Promise<void> {
    const event = { id: uuidv4(), type: NATS_SUBJECTS.MESSAGE_SENT, occurredAt: new Date().toISOString(), data };
    await this.js.publish(NATS_SUBJECTS.MESSAGE_SENT, this.sc.encode(JSON.stringify(event)));
  }

  async publishConversationCreated(data: ConversationCreatedData): Promise<void> {
    const event = { id: uuidv4(), type: NATS_SUBJECTS.CONVERSATION_CREATED, occurredAt: new Date().toISOString(), data };
    await this.js.publish(NATS_SUBJECTS.CONVERSATION_CREATED, this.sc.encode(JSON.stringify(event)));
  }
}
