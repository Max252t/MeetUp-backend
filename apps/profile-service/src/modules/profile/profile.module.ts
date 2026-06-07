import { Module } from '@nestjs/common';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { ProfileRepository } from './profile.repository';
import { ProfilePublisher } from './events/profile.publisher';
import { ProfileListener } from './events/profile.listener';

@Module({
  controllers: [ProfileController],
  providers: [ProfileService, ProfileRepository, ProfilePublisher, ProfileListener],
  exports: [ProfileRepository],
})
export class ProfileModule {}
