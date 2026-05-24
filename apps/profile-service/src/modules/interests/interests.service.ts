import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const SEED_INTERESTS = [
  { name: 'Football', category: 'Sports' },
  { name: 'Basketball', category: 'Sports' },
  { name: 'Tennis', category: 'Sports' },
  { name: 'Swimming', category: 'Sports' },
  { name: 'Cycling', category: 'Sports' },
  { name: 'Running', category: 'Sports' },
  { name: 'Yoga', category: 'Sports' },
  { name: 'Gym', category: 'Sports' },
  { name: 'Rock', category: 'Music' },
  { name: 'Pop', category: 'Music' },
  { name: 'Jazz', category: 'Music' },
  { name: 'Classical', category: 'Music' },
  { name: 'Hip-Hop', category: 'Music' },
  { name: 'Electronic', category: 'Music' },
  { name: 'Action', category: 'Movies' },
  { name: 'Comedy', category: 'Movies' },
  { name: 'Drama', category: 'Movies' },
  { name: 'Horror', category: 'Movies' },
  { name: 'Sci-Fi', category: 'Movies' },
  { name: 'Documentaries', category: 'Movies' },
  { name: 'Europe', category: 'Travel' },
  { name: 'Asia', category: 'Travel' },
  { name: 'Americas', category: 'Travel' },
  { name: 'Backpacking', category: 'Travel' },
  { name: 'Beach', category: 'Travel' },
  { name: 'Cooking', category: 'Food' },
  { name: 'Baking', category: 'Food' },
  { name: 'Wine', category: 'Food' },
  { name: 'Coffee', category: 'Food' },
  { name: 'Vegetarian', category: 'Food' },
  { name: 'Photography', category: 'Art' },
  { name: 'Drawing', category: 'Art' },
  { name: 'Reading', category: 'Lifestyle' },
  { name: 'Gaming', category: 'Lifestyle' },
  { name: 'Hiking', category: 'Lifestyle' },
];

@Injectable()
export class InterestsService extends PrismaClient implements OnModuleInit {
  async onModuleInit() {
    await this.$connect();
    await this.seed();
  }

  private async seed() {
    for (const item of SEED_INTERESTS) {
      await this.interest.upsert({
        where: { name: item.name },
        create: item,
        update: {},
      });
    }
  }

  async findAll() {
    return this.interest.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  }
}
