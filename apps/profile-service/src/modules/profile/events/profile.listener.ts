import { Inject, Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { NatsConnection, StringCodec } from 'nats';
import { NATS_CLIENT } from '../../nats/nats.module';
import { NATS_SUBJECTS } from '@meetup/shared-config';
import { UserRegisteredEvent, UserDeletedEvent } from '@meetup/events';
import { ProfileService } from '../profile.service';

@Injectable()
export class ProfileListener implements OnModuleInit {
  private readonly logger = new Logger(ProfileListener.name);
  private readonly sc = StringCodec();

  constructor(
    @Inject(NATS_CLIENT) private readonly nc: NatsConnection,
    private readonly profileService: ProfileService,
  ) {}

  async onModuleInit() {
    this.subscribeUserRegistered();
    this.subscribeUserDeleted();
  }

  private subscribeUserRegistered() {
    const sub = this.nc.subscribe(NATS_SUBJECTS.USER_REGISTERED);
    (async () => {
      for await (const msg of sub) {
        try {
          const event: UserRegisteredEvent = JSON.parse(this.sc.decode(msg.data));
          await this.profileService.createDefault(event.data.userId, '');
          this.logger.log(`Created default profile for user ${event.data.userId}`);
        } catch (err) {
          this.logger.error('Error handling UserRegistered', err);
        }
      }
    })();
  }

  private subscribeUserDeleted() {
    const sub = this.nc.subscribe(NATS_SUBJECTS.USER_DELETED);
    (async () => {
      for await (const msg of sub) {
        try {
          const event: UserDeletedEvent = JSON.parse(this.sc.decode(msg.data));
          await this.profileService.deactivate(event.data.userId);
          this.logger.log(`Deactivated profile for user ${event.data.userId}`);
        } catch (err) {
          this.logger.error('Error handling UserDeleted', err);
        }
      }
    })();
  }
}
