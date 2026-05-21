import { DomainEvent } from './base';

export interface ProfileUpdatedData {
  userId: string;
  city?: string;
  country?: string;
  interests?: string[];
  bio?: string;
  gender?: string;
  birthDate?: string;
  updatedAt: string;
}

export interface InterestsChangedData {
  userId: string;
  interests: string[];
  changedAt: string;
}

export type ProfileUpdatedEvent = DomainEvent<ProfileUpdatedData>;
export type InterestsChangedEvent = DomainEvent<InterestsChangedData>;
