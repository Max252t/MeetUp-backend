import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProfileModule } from './modules/profile/profile.module';
import { NatsModule } from './modules/nats/nats.module';
import { validateProfileEnv } from './config/profile.config';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, validate: validateProfileEnv }),
    NatsModule,
    ProfileModule,
  ],
})
export class AppModule {}
