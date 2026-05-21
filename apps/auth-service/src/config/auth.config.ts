import { z } from 'zod';
import { baseEnvSchema, validateEnv } from '@meetup/shared-config';

const authEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3001),
  GRPC_PORT: z.coerce.number().default(50051),
  DATABASE_URL: z.string(),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  NATS_URL: z.string().default('nats://localhost:4222'),
  JWT_PRIVATE_KEY: z.string(),
  JWT_PUBLIC_KEY: z.string(),
  JWT_KID: z.string().default('main'),
  REFRESH_TOKEN_SECRET: z.string(),
  PII_ENCRYPTION_KEY: z.string().length(64),
  PII_HMAC_KEY: z.string().length(64),
});

export type AuthEnv = z.infer<typeof authEnvSchema>;

export function validateAuthEnv(config: Record<string, unknown>): AuthEnv {
  return validateEnv(authEnvSchema, config);
}
