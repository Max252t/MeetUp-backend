import { Module } from '@nestjs/common';
import { InterestsController } from './interests.controller';
import { InterestsService } from './interests.service';
import { ProfileModule } from '../profile/profile.module';

@Module({
  imports: [ProfileModule],
  controllers: [InterestsController],
  providers: [InterestsService],
})
export class InterestsModule {}
