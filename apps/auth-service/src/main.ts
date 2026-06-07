import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
// Override PORT from this service's .env to prevent pnpm v9 from injecting a wrong value
(function fixPort() {
  const envFile = path.join(__dirname, '..', '.env');
  if (!fs.existsSync(envFile)) return;
  const m = fs.readFileSync(envFile, 'utf8').match(/^PORT=(\d+)/m);
  if (m) process.env.PORT = m[1];
})();
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { GlobalExceptionFilter } from './common/filters/exception.filter';
import { RequestIdInterceptor } from './common/interceptors/request-id.interceptor';
import { createLogger } from '@meetup/telemetry';

async function bootstrap() {
  const logger = createLogger({ service: 'auth-service' });

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    bufferLogs: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );
  app.useGlobalFilters(new GlobalExceptionFilter());
  app.useGlobalInterceptors(new RequestIdInterceptor());

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('MeetUp Auth Service')
      .setVersion('1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, config));
  }

  const port = process.env.PORT ?? 3001;
  await app.listen(port, '0.0.0.0');
  logger.info({ port }, 'auth-service listening');
}

bootstrap().catch((err) => {
  console.error('Failed to start auth-service', err);
  process.exit(1);
});
