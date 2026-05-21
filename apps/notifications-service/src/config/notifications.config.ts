import { z } from 'zod';
import { baseEnvSchema, validateEnv } from '@meetup/shared-config';

const notificationsEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3007),
  DATABASE_URL: z.string(),
  NATS_URL: z.string().default('nats://localhost:4222'),
  FIREBASE_PROJECT_ID: z.string().optional(),
  FIREBASE_CREDENTIALS: z.string().optional(),
});

export type NotificationsEnv = z.infer<typeof notificationsEnvSchema>;
export const validateNotificationsEnv = (c: Record<string, unknown>) => validateEnv(notificationsEnvSchema, c);
