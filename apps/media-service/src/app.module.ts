import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MediaModule } from './modules/media/media.module';
import { NatsModule } from './modules/nats/nats.module';
import { validateMediaEnv } from './config/media.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateMediaEnv }),
    NatsModule,
    MediaModule,
  ],
})
export class AppModule {}
