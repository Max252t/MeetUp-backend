import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { NatsConnection, StringCodec } from 'nats';
import { NATS_CLIENT } from '../nats/nats.module';
import { NATS_SUBJECTS } from '@meetup/shared-config';
import { ProfileUpdatedEvent, UserDeletedEvent } from '@meetup/events';
import { SearchService } from './search.service';

@Injectable()
export class SearchListener implements OnModuleInit {
  private readonly sc = StringCodec();

  constructor(
    @Inject(NATS_CLIENT) private readonly nc: NatsConnection,
    private readonly searchService: SearchService,
  ) {}

  async onModuleInit() {
    const js = this.nc.jetstream();
    const jsm = await this.nc.jetstreamManager();

    // Ensure streams exist
    for (const subject of [NATS_SUBJECTS.PROFILE_UPDATED, NATS_SUBJECTS.USER_DELETED]) {
      await jsm.streams.add({ name: subject.replace(/\./g, '_'), subjects: [subject] }).catch(() => {});
    }

    const profileSub = await js.subscribe(NATS_SUBJECTS.PROFILE_UPDATED);
    (async () => {
      for await (const msg of profileSub) {
        try {
          const event: ProfileUpdatedEvent = JSON.parse(this.sc.decode(msg.data));
          await this.searchService.indexProfile({
            userId: event.data.userId,
            displayName: '',
            city: event.data.city,
            country: event.data.country,
            gender: event.data.gender,
            birthDate: event.data.birthDate,
            interests: event.data.interests ?? [],
            bio: event.data.bio,
            isActive: true,
            updatedAt: event.data.updatedAt,
          });
          msg.ack();
        } catch {
          msg.nak();
        }
      }
    })();

    const deleteSub = await js.subscribe(NATS_SUBJECTS.USER_DELETED);
    (async () => {
      for await (const msg of deleteSub) {
        try {
          const event: UserDeletedEvent = JSON.parse(this.sc.decode(msg.data));
          await this.searchService.deleteProfile(event.data.userId);
          msg.ack();
        } catch {
          msg.nak();
        }
      }
    })();
  }
}
