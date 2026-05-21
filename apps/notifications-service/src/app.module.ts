import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { NatsModule } from './modules/nats/nats.module';
import { validateNotificationsEnv } from './config/notifications.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateNotificationsEnv }),
    NatsModule,
    NotificationsModule,
  ],
})
export class AppModule {}
