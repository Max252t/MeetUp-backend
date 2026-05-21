import { z } from 'zod';

export const baseEnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
});

export type BaseEnv = z.infer<typeof baseEnvSchema>;

export function validateEnv<T extends z.ZodType>(
  schema: T,
  config: Record<string, unknown> = process.env as Record<string, unknown>,
): z.infer<T> {
  const result = schema.safeParse(config);
  if (!result.success) {
    throw new Error(
      `Configuration validation failed:\n${JSON.stringify(result.error.format(), null, 2)}`,
    );
  }
  return result.data;
}
