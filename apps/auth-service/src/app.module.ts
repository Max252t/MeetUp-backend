import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthModule } from './modules/auth/auth.module';
import { JwksModule } from './modules/jwks/jwks.module';
import { RedisModule } from './modules/redis/redis.module';
import { NatsModule } from './modules/nats/nats.module';
import { validateAuthEnv } from './config/auth.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateAuthEnv }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 20 }]),
    RedisModule,
    NatsModule,
    AuthModule,
    JwksModule,
  ],
})
export class AppModule {}
