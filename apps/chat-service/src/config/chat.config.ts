import { z } from 'zod';
import { baseEnvSchema, validateEnv } from '@meetup/shared-config';

const chatEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3003),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  NATS_URL: z.string().default('nats://localhost:4222'),
});

export type ChatEnv = z.infer<typeof chatEnvSchema>;
export const validateChatEnv = (c: Record<string, unknown>) => validateEnv(chatEnvSchema, c);
