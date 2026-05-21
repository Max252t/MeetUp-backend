import { Module } from '@nestjs/common';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { AuthRepository } from './auth.repository';
import { AuthPublisher } from './events/auth.publisher';

@Module({
  controllers: [AuthController],
  providers: [AuthService, AuthRepository, AuthPublisher],
  exports: [AuthService],
})
export class AuthModule {}
