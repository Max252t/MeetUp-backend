import { z } from 'zod';
import { baseEnvSchema, validateEnv } from '@meetup/shared-config';

const searchEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3004),
  OPENSEARCH_URL: z.string().default('http://localhost:9200'),
  NATS_URL: z.string().default('nats://localhost:4222'),
});

export type SearchEnv = z.infer<typeof searchEnvSchema>;
export const validateSearchEnv = (c: Record<string, unknown>) => validateEnv(searchEnvSchema, c);
