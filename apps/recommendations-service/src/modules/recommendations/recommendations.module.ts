import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService, RECS_QUEUE } from './recommendations.service';
import { RecommendationsProcessor } from './recommendations.processor';

@Module({
  imports: [BullModule.registerQueue({ name: RECS_QUEUE })],
  controllers: [RecommendationsController],
  providers: [RecommendationsService, RecommendationsProcessor],
})
export class RecommendationsModule {}
