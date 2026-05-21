import { Inject, Injectable } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import Redis from 'ioredis';
import { JetStreamClient, StringCodec } from 'nats';
import { REDIS_CLIENT } from '../redis/redis.module';
import { JETSTREAM_CLIENT } from '../nats/nats.module';
import { REDIS_KEYS, NATS_SUBJECTS } from '@meetup/shared-config';
import { v4 as uuidv4 } from 'uuid';

export const RECS_QUEUE = 'recommendations';

@Injectable()
export class RecommendationsService {
  private readonly sc = StringCodec();

  constructor(
    @Inject(REDIS_CLIENT) private readonly redis: Redis,
    @Inject(JETSTREAM_CLIENT) private readonly js: JetStreamClient,
    @InjectQueue(RECS_QUEUE) private readonly queue: Queue,
  ) {}

  async getRecommendations(userId: string): Promise<string[]> {
    const cached = await this.redis.lrange(REDIS_KEYS.RECOMMENDATIONS(userId), 0, -1);
    if (cached.length > 0) return cached;

    await this.triggerRefresh(userId);
    return [];
  }

  async triggerRefresh(userId: string): Promise<void> {
    await this.queue.add('refresh', { userId }, { removeOnComplete: true, attempts: 3, backoff: 5000 });
  }

  async storeRecommendations(userId: string, userIds: string[]): Promise<void> {
    const key = REDIS_KEYS.RECOMMENDATIONS(userId);
    const pipeline = this.redis.pipeline();
    pipeline.del(key);
    if (userIds.length > 0) pipeline.rpush(key, ...userIds);
    pipeline.expire(key, 24 * 3600);
    await pipeline.exec();

    const event = {
      id: uuidv4(),
      type: NATS_SUBJECTS.RECOMMENDATIONS_REFRESHED,
      occurredAt: new Date().toISOString(),
      data: { userId, count: userIds.length, refreshedAt: new Date().toISOString() },
    };
    await this.js.publish(NATS_SUBJECTS.RECOMMENDATIONS_REFRESHED, this.sc.encode(JSON.stringify(event)));
  }

  @Cron(CronExpression.EVERY_6_HOURS)
  async scheduledRefreshAll(): Promise<void> {
    // In production: query active users from profile-service and enqueue all
    // Placeholder: demonstrates the cron pattern
  }
}
