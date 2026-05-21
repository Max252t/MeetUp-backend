import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { ProfileRepository } from './profile.repository';
import { ProfilePublisher } from './events/profile.publisher';

@Module({
  controllers: [ProfileController],
  providers: [ProfileService, ProfileRepository, ProfilePublisher],
})
export class ProfileModule {}
