import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ChatModule } from './modules/chat/chat.module';
import { RedisModule } from './modules/redis/redis.module';
import { NatsModule } from './modules/nats/nats.module';
import { validateChatEnv } from './config/chat.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateChatEnv }),
    RedisModule,
    NatsModule,
    ChatModule,
  ],
})
export class AppModule {}
