import { z } from 'zod';
import { baseEnvSchema, validateEnv } from '@meetup/shared-config';

const recsEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3005),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  NATS_URL: z.string().default('nats://localhost:4222'),
  SEARCH_SERVICE_URL: z.string().default('http://localhost:3004'),
  RECS_CACHE_TTL_HOURS: z.coerce.number().default(24),
  RECS_TOP_N: z.coerce.number().default(100),
});

export type RecsEnv = z.infer<typeof recsEnvSchema>;
export const validateRecsEnv = (c: Record<string, unknown>) => validateEnv(recsEnvSchema, c);
