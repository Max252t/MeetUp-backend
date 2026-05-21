import { DomainEvent } from './base';

export interface MediaUploadedData {
  mediaId: string;
  userId: string;
  url: string;
  mimeType: string;
  uploadedAt: string;
}

export interface MediaRejectedData {
  mediaId: string;
  userId: string;
  reason: string;
  rejectedAt: string;
}

export type MediaUploadedEvent = DomainEvent<MediaUploadedData>;
export type MediaRejectedEvent = DomainEvent<MediaRejectedData>;
