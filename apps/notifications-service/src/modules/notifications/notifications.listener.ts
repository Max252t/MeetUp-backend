import { Inject, Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { NatsConnection, StringCodec } from 'nats';
import { NATS_CLIENT } from '../nats/nats.module';
import { NATS_SUBJECTS } from '@meetup/shared-config';
import { MessageSentEvent } from '@meetup/events';
import { NotificationsService } from './notifications.service';

@Injectable()
export class NotificationsListener implements OnModuleInit {
  private readonly logger = new Logger(NotificationsListener.name);
  private readonly sc = StringCodec();

  constructor(
    @Inject(NATS_CLIENT) private readonly nc: NatsConnection,
    private readonly notificationsService: NotificationsService,
  ) {}

  async onModuleInit() {
    const js = this.nc.jetstream();
    const jsm = await this.nc.jetstreamManager();

    for (const subject of [NATS_SUBJECTS.MESSAGE_SENT, NATS_SUBJECTS.MATCH_CREATED]) {
      await jsm.streams.add({ name: subject.replace(/\./g, '_'), subjects: [subject] }).catch(() => {});
    }

    const msgSub = await js.subscribe(NATS_SUBJECTS.MESSAGE_SENT);
    (async () => {
      for await (const msg of msgSub) {
        try {
          const event: MessageSentEvent = JSON.parse(this.sc.decode(msg.data));
          await this.notificationsService.sendPush({
            userId: event.data.recipientId,
            title: 'Новое сообщение',
            body: 'У вас новое сообщение в MeetUp',
            data: { conversationId: event.data.conversationId, type: 'message' },
          });
          msg.ack();
        } catch (err) {
          this.logger.error(err);
          msg.nak();
        }
      }
    })();
  }
}
