import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { ChatEnv } from '../../config/chat.config';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [{
    provide: REDIS_CLIENT,
    useFactory: (config: ConfigService<ChatEnv>) => new Redis(config.get('REDIS_URL', { infer: true })!),
    inject: [ConfigService],
  }],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
