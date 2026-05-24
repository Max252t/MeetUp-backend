import { z } from 'zod';
import { baseEnvSchema, validateEnv } from '@meetup/shared-config';

const mediaEnvSchema = baseEnvSchema.extend({
  PORT: z.coerce.number().default(3006),
  DATABASE_URL: z.string(),
  NATS_URL: z.string().default('nats://localhost:4222'),
  S3_ENDPOINT: z.string().default('http://localhost:9000'),
  S3_BUCKET: z.string().default('meetup-media'),
  S3_REGION: z.string().default('us-east-1'),
  S3_ACCESS_KEY: z.string().default('meetup_minio'),
  S3_SECRET_KEY: z.string().default('meetup_minio_secret'),
  PRESIGNED_URL_EXPIRES: z.coerce.number().default(900),
  MAX_FILE_SIZE_MB: z.coerce.number().default(10),
  S3_PUBLIC_URL: z.string().default('http://localhost:9000/meetup-media'),
});

export type MediaEnv = z.infer<typeof mediaEnvSchema>;
export const validateMediaEnv = (c: Record<string, unknown>) => validateEnv(mediaEnvSchema, c);
