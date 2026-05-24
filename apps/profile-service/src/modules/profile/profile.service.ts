import { Injectable, NotFoundException } from '@nestjs/common';
import { Gender } from '@prisma/client';
import { ProfileRepository } from './profile.repository';
import { ProfilePublisher } from './events/profile.publisher';
import { UpdateProfileDto } from './dto/update-profile.dto';

function computeAge(birthDate: Date | null): number | null {
  if (!birthDate) return null;
  const now = new Date();
  let age = now.getFullYear() - birthDate.getFullYear();
  const m = now.getMonth() - birthDate.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birthDate.getDate())) age--;
  return age;
}

function mapProfile(profile: any) {
  return {
    id: profile.id,
    name: profile.name,
    bio: profile.bio ?? '',
    gender: profile.gender ?? null,
    birthdate: profile.birthDate ? profile.birthDate.toISOString().split('T')[0] : null,
    age: computeAge(profile.birthDate),
    city: profile.city ?? null,
    country: profile.country ?? null,
    photos: profile.photos ?? [],
    interests: profile.interests ?? [],
    isActive: profile.isActive,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
}

@Injectable()
export class ProfileService {
  constructor(
    private readonly repo: ProfileRepository,
    private readonly publisher: ProfilePublisher,
  ) {}

  async createDefault(userId: string, name: string) {
    return this.repo.createIfNotExists(userId, name);
  }

  async patch(userId: string, dto: UpdateProfileDto) {
    const profile = await this.repo.patch(userId, {
      name: dto.name,
      bio: dto.bio,
      city: dto.city,
      country: dto.country,
      gender: dto.gender as Gender | undefined,
      birthDate: dto.birthdate ? new Date(dto.birthdate) : undefined,
      interests: dto.interests,
      photos: dto.photos,
    });

    await this.publisher.publishProfileUpdated({
      userId,
      city: profile.city ?? undefined,
      country: profile.country ?? undefined,
      interests: profile.interests,
      bio: profile.bio ?? undefined,
      gender: profile.gender ?? undefined,
      birthDate: profile.birthDate?.toISOString().split('T')[0],
      updatedAt: new Date().toISOString(),
    });

    if (dto.interests && dto.interests.length > 0) {
      await this.publisher.publishInterestsChanged({
        userId,
        interests: dto.interests,
        changedAt: new Date().toISOString(),
      });
    }

    return mapProfile(profile);
  }

  async getProfile(userId: string) {
    const profile = await this.repo.findById(userId);
    if (!profile) throw new NotFoundException('Profile not found');
    return mapProfile(profile);
  }

  async getProfiles(userIds: string[]) {
    const profiles = await this.repo.findManyByIds(userIds);
    return profiles.map(mapProfile);
  }

  async deactivate(userId: string) {
    await this.repo.deactivate(userId);
  }
}
