import { z } from 'zod';
import { baseEnvSchema, validateEnv } from '@meetup/shared-config';

const gatewayEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3000),
  REDIS_URL: z.string().default('redis://localhost:6379'),
  AUTH_SERVICE_URL: z.string().default('http://localhost:3001'),
  PROFILE_SERVICE_URL: z.string().default('http://localhost:3002'),
  MEDIA_SERVICE_URL: z.string().default('http://localhost:3006'),
  SEARCH_SERVICE_URL: z.string().default('http://localhost:3004'),
  JWKS_URI: z.string().default('http://localhost:3001/.well-known/jwks.json'),
  JWT_ISSUER: z.string().optional(),
  RATE_LIMIT_TTL: z.coerce.number().default(60_000),
  RATE_LIMIT_MAX: z.coerce.number().default(100),
});

export type GatewayEnv = z.infer<typeof gatewayEnvSchema>;

export function validateGatewayEnv(config: Record<string, unknown>): GatewayEnv {
  return validateEnv(gatewayEnvSchema, config);
}
