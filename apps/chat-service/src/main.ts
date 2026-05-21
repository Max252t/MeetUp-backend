import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { createLogger } from '@meetup/telemetry';

async function bootstrap() {
  const logger = createLogger({ service: 'chat-service' });
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = process.env.PORT ?? 3003;
  await app.listen(port, '0.0.0.0');
  logger.info({ port }, 'chat-service listening');
}

bootstrap().catch((e) => { console.error(e); process.exit(1); });
