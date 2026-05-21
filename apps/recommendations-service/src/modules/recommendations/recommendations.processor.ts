import { Process, Processor } from '@nestjs/bull';
import { Job } from 'bull';
import { RecommendationsService, RECS_QUEUE } from './recommendations.service';

@Processor(RECS_QUEUE)
export class RecommendationsProcessor {
  constructor(private readonly recsService: RecommendationsService) {}

  @Process('refresh')
  async handleRefresh(job: Job<{ userId: string }>) {
    const { userId } = job.data;

    // Simplified algorithm: in production, fetch profile embeddings and
    // compute cosine similarity + collaborative filtering on liked profiles.
    // Here we demonstrate the pattern with a placeholder result.
    const recommendations: string[] = [];

    await this.recsService.storeRecommendations(userId, recommendations);
  }
}
