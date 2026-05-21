import { DomainEvent } from './base';

export interface UserRegisteredData {
  userId: string;
  email: string;
  registeredAt: string;
}

export interface UserDeletedData {
  userId: string;
  deletedAt: string;
}

export type UserRegisteredEvent = DomainEvent<UserRegisteredData>;
export type UserDeletedEvent = DomainEvent<UserDeletedData>;
