import { Inject, Injectable } from '@nestjs/common';
import { JetStreamClient, StringCodec } from 'nats';
import { JETSTREAM_CLIENT } from '../../nats/nats.module';
import { NATS_SUBJECTS } from '@meetup/shared-config';
import { ProfileUpdatedData, InterestsChangedData } from '@meetup/events';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class ProfilePublisher {
  private readonly sc = StringCodec();

  constructor(@Inject(JETSTREAM_CLIENT) private readonly js: JetStreamClient) {}

  async publishProfileUpdated(data: ProfileUpdatedData): Promise<void> {
    const event = { id: uuidv4(), type: NATS_SUBJECTS.PROFILE_UPDATED, occurredAt: new Date().toISOString(), data };
    await this.js.publish(NATS_SUBJECTS.PROFILE_UPDATED, this.sc.encode(JSON.stringify(event)));
  }

  async publishInterestsChanged(data: InterestsChangedData): Promise<void> {
    const event = { id: uuidv4(), type: NATS_SUBJECTS.INTERESTS_CHANGED, occurredAt: new Date().toISOString(), data };
    await this.js.publish(NATS_SUBJECTS.INTERESTS_CHANGED, this.sc.encode(JSON.stringify(event)));
  }
}
