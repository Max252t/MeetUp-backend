import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { createLogger } from '@meetup/telemetry';

async function bootstrap() {
  const logger = createLogger({ service: 'search-service' });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  const port = process.env.PORT ?? 3004;
  await app.listen(port, '0.0.0.0');
  logger.info({ port }, 'search-service listening');
}

bootstrap().catch((e) => { console.error(e); process.exit(1); });
