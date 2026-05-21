import { Injectable, NotFoundException } from '@nestjs/common';
import { ProfileRepository } from './profile.repository';
import { ProfilePublisher } from './events/profile.publisher';
import { UpsertProfileDto } from './dto/upsert-profile.dto';

@Injectable()
export class ProfileService {
  constructor(
    private readonly repo: ProfileRepository,
    private readonly publisher: ProfilePublisher,
  ) {}

  async upsert(userId: string, dto: UpsertProfileDto) {
    const profile = await this.repo.upsert(userId, {
      ...dto,
      birthDate: dto.birthDate ? new Date(dto.birthDate) : undefined,
    });

    const hadInterests = dto.interests && dto.interests.length > 0;
    await this.publisher.publishProfileUpdated({
      userId,
      city: dto.city,
      country: dto.country,
      interests: dto.interests,
      bio: dto.bio,
      gender: dto.gender,
      birthDate: dto.birthDate,
      updatedAt: new Date().toISOString(),
    });

    if (hadInterests) {
      await this.publisher.publishInterestsChanged({
        userId,
        interests: dto.interests!,
        changedAt: new Date().toISOString(),
      });
    }

    return profile;
  }

  async getProfile(userId: string) {
    const profile = await this.repo.findById(userId);
    if (!profile) throw new NotFoundException('Profile not found');
    return profile;
  }

  async getProfiles(userIds: string[]) {
    return this.repo.findManyByIds(userIds);
  }

  async deactivate(userId: string) {
    await this.repo.deactivate(userId);
  }
}
