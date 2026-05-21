export const NATS_SUBJECTS = {
  USER_REGISTERED: 'user.registered',
  USER_DELETED: 'user.deleted',
  PROFILE_UPDATED: 'profile.updated',
  INTERESTS_CHANGED: 'interests.changed',
  MESSAGE_SENT: 'chat.message.sent',
  CONVERSATION_CREATED: 'chat.conversation.created',
  MEDIA_UPLOADED: 'media.uploaded',
  MEDIA_REJECTED: 'media.rejected',
  RECOMMENDATIONS_REFRESHED: 'recommendations.refreshed',
  MATCH_CREATED: 'match.created',
} as const;

export const JWT_CONSTANTS = {
  ACCESS_TOKEN_TTL: '15m',
  REFRESH_TOKEN_TTL: '30d',
  ALGORITHM: 'RS256' as const,
} as const;

export const REDIS_KEYS = {
  SESSION: (userId: string) => `session:${userId}`,
  OTP: (identifier: string) => `otp:${identifier}`,
  OTP_ATTEMPTS: (identifier: string) => `otp:attempts:${identifier}`,
  RATE_LIMIT: (ip: string) => `rate:${ip}`,
  PRESENCE: (userId: string) => `presence:${userId}`,
  TYPING: (conversationId: string, userId: string) => `typing:${conversationId}:${userId}`,
  RECOMMENDATIONS: (userId: string) => `recs:${userId}`,
} as const;

export const GRPC_PORTS = {
  AUTH: 50051,
  PROFILE: 50052,
  CHAT: 50053,
  MEDIA: 50054,
  SEARCH: 50055,
  RECOMMENDATIONS: 50056,
} as const;
