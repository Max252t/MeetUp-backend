import { DomainEvent } from './base';

export interface RecommendationsRefreshedData {
  userId: string;
  count: number;
  refreshedAt: string;
}

export type RecommendationsRefreshedEvent = DomainEvent<RecommendationsRefreshedData>;
