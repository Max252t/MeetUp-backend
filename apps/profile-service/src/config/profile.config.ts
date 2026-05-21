import { z } from 'zod';
import { baseEnvSchema, validateEnv } from '@meetup/shared-config';

const profileEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3002),
  GRPC_PORT: z.coerce.number().default(50052),
  DATABASE_URL: z.string(),
  NATS_URL: z.string().default('nats://localhost:4222'),
});

export type ProfileEnv = z.infer<typeof profileEnvSchema>;
export const validateProfileEnv = (c: Record<string, unknown>) => validateEnv(profileEnvSchema, c);
