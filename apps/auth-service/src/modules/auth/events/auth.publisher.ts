import { Inject, Injectable } from '@nestjs/common';
import { JetStreamClient, StringCodec } from 'nats';
import { JETSTREAM_CLIENT } from '../../nats/nats.module';
import { NATS_SUBJECTS } from '@meetup/shared-config';
import { UserRegisteredData, UserDeletedData } from '@meetup/events';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthPublisher {
  private readonly sc = StringCodec();

  constructor(@Inject(JETSTREAM_CLIENT) private readonly js: JetStreamClient) {}

  async publishUserRegistered(data: UserRegisteredData): Promise<void> {
    const event = { id: uuidv4(), type: NATS_SUBJECTS.USER_REGISTERED, occurredAt: new Date().toISOString(), data };
    await this.js.publish(NATS_SUBJECTS.USER_REGISTERED, this.sc.encode(JSON.stringify(event)));
  }

  async publishUserDeleted(data: UserDeletedData): Promise<void> {
    const event = { id: uuidv4(), type: NATS_SUBJECTS.USER_DELETED, occurredAt: new Date().toISOString(), data };
    await this.js.publish(NATS_SUBJECTS.USER_DELETED, this.sc.encode(JSON.stringify(event)));
  }
}
