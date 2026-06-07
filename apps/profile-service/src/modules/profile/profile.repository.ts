import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Gender } from '../../generated/prisma';

@Injectable()
export class ProfileRepository extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async createIfNotExists(id: string, name: string) {
    return this.profile.upsert({
      where: { id },
      create: { id, name, interests: [], photos: [] },
      update: {},
    });
  }

  async patch(id: string, data: {
    name?: string;
    bio?: string;
    city?: string;
    country?: string;
    gender?: Gender;
    birthDate?: Date;
    interests?: string[];
    photos?: string[];
  }) {
    return this.profile.upsert({
      where: { id },
      create: {
        id,
        name: data.name ?? '',
        bio: data.bio,
        city: data.city,
        country: data.country,
        gender: data.gender,
        birthDate: data.birthDate,
        interests: data.interests ?? [],
        photos: data.photos ?? [],
      },
      update: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.bio !== undefined && { bio: data.bio }),
        ...(data.city !== undefined && { city: data.city }),
        ...(data.country !== undefined && { country: data.country }),
        ...(data.gender !== undefined && { gender: data.gender }),
        ...(data.birthDate !== undefined && { birthDate: data.birthDate }),
        ...(data.interests !== undefined && { interests: data.interests }),
        ...(data.photos !== undefined && { photos: data.photos }),
      },
    });
  }

  async findById(id: string) {
    return this.profile.findUnique({ where: { id } });
  }

  async findManyByIds(ids: string[]) {
    return this.profile.findMany({ where: { id: { in: ids }, isActive: true } });
  }

  async deactivate(id: string) {
    return this.profile.update({ where: { id }, data: { isActive: false } });
  }

  async upsertInterest(name: string, category: string) {
    return this.interest.upsert({
      where: { name },
      create: { name, category },
      update: {},
    });
  }

  async findAllInterests() {
    return this.interest.findMany({ orderBy: [{ category: 'asc' }, { name: 'asc' }] });
  }
}
