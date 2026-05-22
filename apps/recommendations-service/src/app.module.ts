import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { BullModule } from '@nestjs/bull';
import { ScheduleModule } from '@nestjs/schedule';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { RedisModule } from './modules/redis/redis.module';
import { NatsModule } from './modules/nats/nats.module';
import { validateRecsEnv, RecsEnv } from './config/recs.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateRecsEnv }),
    ScheduleModule.forRoot(),
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService<RecsEnv>) => ({
        redis: config.get<string>('REDIS_URL')!,
      }),
    }),
    RedisModule,
    NatsModule,
    RecommendationsModule,
  ],
})
export class AppModule {}
