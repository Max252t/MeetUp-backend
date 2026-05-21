import pino, { Logger } from 'pino';

export interface LoggerOptions {
  service: string;
  level?: string;
  pretty?: boolean;
}

export function createLogger(options: LoggerOptions): Logger {
  const { service, level = process.env.LOG_LEVEL ?? 'info', pretty = process.env.NODE_ENV !== 'production' } = options;

  return pino({
    level,
    base: { service },
    redact: {
      paths: ['*.email', '*.phone', '*.token', '*.password', '*.secret', 'headers.authorization'],
      censor: '[REDACTED]',
    },
    transport: pretty
      ? { target: 'pino-pretty', options: { colorize: true, translateTime: 'SYS:standard' } }
      : undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}

export type { Logger };
