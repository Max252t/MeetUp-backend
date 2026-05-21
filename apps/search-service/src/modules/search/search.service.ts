import { Inject, Injectable, OnModuleInit } from '@nestjs/common';
import { Client } from '@opensearch-project/opensearch';
import { OPENSEARCH_CLIENT, PROFILES_INDEX } from '../opensearch/opensearch.module';

export interface ProfileDocument {
  userId: string;
  displayName: string;
  bio?: string;
  city?: string;
  country?: string;
  gender?: string;
  birthDate?: string;
  interests: string[];
  isActive: boolean;
  updatedAt: string;
}

export interface SearchFilters {
  gender?: string;
  minAge?: number;
  maxAge?: number;
  interests?: string[];
  city?: string;
  country?: string;
  lat?: number;
  lon?: number;
  radiusKm?: number;
  onlineOnly?: boolean;
  from?: number;
  size?: number;
}

@Injectable()
export class SearchService implements OnModuleInit {
  constructor(@Inject(OPENSEARCH_CLIENT) private readonly client: Client) {}

  async onModuleInit() {
    await this.ensureIndex();
  }

  async indexProfile(doc: ProfileDocument): Promise<void> {
    await this.client.index({
      index: PROFILES_INDEX,
      id: doc.userId,
      body: doc,
    });
  }

  async deleteProfile(userId: string): Promise<void> {
    await this.client.delete({ index: PROFILES_INDEX, id: userId }).catch(() => {});
  }

  async search(query: string, filters: SearchFilters): Promise<string[]> {
    const must: object[] = [];
    const filter: object[] = [];

    if (query) must.push({ multi_match: { query, fields: ['displayName', 'bio', 'city'] } });
    if (filters.gender) filter.push({ term: { gender: filters.gender } });
    if (filters.city) filter.push({ term: { city: filters.city } });
    if (filters.country) filter.push({ term: { country: filters.country } });
    if (filters.interests?.length) filter.push({ terms: { interests: filters.interests } });
    filter.push({ term: { isActive: true } });

    if (filters.minAge || filters.maxAge) {
      const now = new Date();
      const range: Record<string, string> = {};
      if (filters.maxAge) range['gte'] = new Date(now.getFullYear() - filters.maxAge, now.getMonth(), now.getDate()).toISOString();
      if (filters.minAge) range['lte'] = new Date(now.getFullYear() - filters.minAge, now.getMonth(), now.getDate()).toISOString();
      filter.push({ range: { birthDate: range } });
    }

    const response = await this.client.search({
      index: PROFILES_INDEX,
      body: {
        query: { bool: { must, filter } },
        from: filters.from ?? 0,
        size: filters.size ?? 20,
        _source: ['userId'],
      },
    });

    const hits = (response.body.hits?.hits ?? []) as Array<{ _id: string }>;
    return hits.map((h) => h._id);
  }

  private async ensureIndex(): Promise<void> {
    const exists = await this.client.indices.exists({ index: PROFILES_INDEX });
    if (exists.body) return;

    await this.client.indices.create({
      index: PROFILES_INDEX,
      body: {
        mappings: {
          properties: {
            userId: { type: 'keyword' },
            displayName: { type: 'text' },
            bio: { type: 'text' },
            city: { type: 'keyword' },
            country: { type: 'keyword' },
            gender: { type: 'keyword' },
            birthDate: { type: 'date' },
            interests: { type: 'keyword' },
            isActive: { type: 'boolean' },
            updatedAt: { type: 'date' },
          },
        },
      },
    });
  }
}
