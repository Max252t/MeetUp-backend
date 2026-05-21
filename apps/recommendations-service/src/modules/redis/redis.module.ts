import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';
import { RecsEnv } from '../../config/recs.config';

export const REDIS_CLIENT = 'REDIS_CLIENT';

@Global()
@Module({
  providers: [{
    provide: REDIS_CLIENT,
    useFactory: (config: ConfigService<RecsEnv>) => new Redis(config.get('REDIS_URL', { infer: true })!),
    inject: [ConfigService],
  }],
  exports: [REDIS_CLIENT],
})
export class RedisModule {}
