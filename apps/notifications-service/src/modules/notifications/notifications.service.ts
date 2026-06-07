import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '../../generated/prisma';
import * as admin from 'firebase-admin';
import { NotificationsEnv } from '../../config/notifications.config';

interface PushPayload {
  userId: string;
  title: string;
  body: string;
  data?: Record<string, string>;
}

@Injectable()
export class NotificationsService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(NotificationsService.name);
  private fcmApp?: admin.app.App;

  constructor(private readonly config: ConfigService<NotificationsEnv>) {
    super();
    const projectId = config.get('FIREBASE_PROJECT_ID', { infer: true });
    const credentials = config.get('FIREBASE_CREDENTIALS', { infer: true });
    if (projectId && credentials) {
      this.fcmApp = admin.initializeApp({
        credential: admin.credential.cert(JSON.parse(credentials)),
        projectId,
      });
    }
  }

  async onModuleInit() { await this.$connect(); }
  async onModuleDestroy() { await this.$disconnect(); }

  async registerDeviceToken(userId: string, token: string, platform: string) {
    return this.deviceToken.upsert({
      where: { token },
      create: { userId, token, platform },
      update: { userId, platform },
    });
  }

  async removeDeviceToken(token: string) {
    return this.deviceToken.delete({ where: { token } }).catch(() => {});
  }

  async sendPush(payload: PushPayload): Promise<void> {
    const tokens = await this.deviceToken.findMany({ where: { userId: payload.userId } });
    if (tokens.length === 0) return;

    for (const device of tokens) {
      let fcmMsgId: string | undefined;
      let status = 'sent';

      try {
        if (this.fcmApp) {
          const result = await admin.messaging(this.fcmApp).send({
            token: device.token,
            notification: { title: payload.title, body: payload.body },
            data: payload.data,
          });
          fcmMsgId = result;
        } else {
          this.logger.warn('FCM not configured — push skipped');
          status = 'skipped';
        }
      } catch (err) {
        this.logger.error({ err, token: device.token }, 'FCM send failed');
        status = 'failed';
      }

      await this.notificationLog.create({
        data: { userId: payload.userId, title: payload.title, body: payload.body, data: payload.data, status, fcmMsgId },
      });
    }
  }
}
