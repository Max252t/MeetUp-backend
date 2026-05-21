import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class ProfileRepository extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async upsert(id: string, data: {
    displayName: string;
    bio?: string;
    city?: string;
    country?: string;
    gender?: string;
    birthDate?: Date;
    interests?: string[];
  }) {
    return this.profile.upsert({
      where: { id },
      create: { id, ...data, interests: data.interests ?? [] },
      update: { ...data },
    });
  }

  async findById(id: string) {
    return this.profile.findUnique({ where: { id } });
  }

  async findManyByIds(ids: string[]) {
    return this.profile.findMany({ where: { id: { in: ids }, isActive: true } });
  }

  async addPhotoUrl(id: string, url: string) {
    const profile = await this.profile.findUnique({ where: { id } });
    if (!profile) return null;
    return this.profile.update({
      where: { id },
      data: { photoUrls: [...profile.photoUrls, url] },
    });
  }

  async deactivate(id: string) {
    return this.profile.update({ where: { id }, data: { isActive: false } });
  }
}
