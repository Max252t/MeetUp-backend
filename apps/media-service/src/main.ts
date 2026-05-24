import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import multipart from '@fastify/multipart';
import { AppModule } from './app.module';
import { createLogger } from '@meetup/telemetry';

async function bootstrap() {
  const logger = createLogger({ service: 'media-service' });
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

  // Register multipart plugin for file uploads
  await app.register(multipart, {
    limits: { fileSize: 8 * 1024 * 1024, files: 1 },
  });

  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder().setTitle('Media Service').setVersion('1.0').addBearerAuth().build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  }
  const port = process.env.PORT ?? 3006;
  await app.listen(port, '0.0.0.0');
  logger.info({ port }, 'media-service listening');
}

bootstrap().catch((e) => { console.error(e); process.exit(1); });
