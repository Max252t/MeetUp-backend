# MeetUp Backend

NestJS микросервисный бэкенд для Android-приложения MeetUp (знакомства по интересам).

## Стек

- **Runtime:** Node.js 20, TypeScript 5
- **Framework:** NestJS 10 + Fastify
- **Транспорт:** NATS JetStream (события) + gRPC (синхронные RPC)
- **БД:** PostgreSQL 16, Redis 7, OpenSearch 2, MinIO/S3
- **Auth:** JWT RS256 + Argon2id + refresh rotation
- **Realtime:** Socket.IO (chat-service)
- **Монорепо:** pnpm workspaces + Turborepo

## Сервисы

| Сервис | Порт | Описание |
|--------|------|----------|
| api-gateway | 3000 | Единая точка входа, JWT-валидация, rate-limit |
| auth-service | 3001 | Регистрация, логин, JWKS, refresh rotation |
| profile-service | 3002 | CRUD профиля, pgvector embeddings |
| chat-service | 3003 | WebSocket чат (Socket.IO), история сообщений |
| search-service | 3004 | OpenSearch поиск с фильтрами |
| recommendations-service | 3005 | BullMQ очередь + Redis кэш |
| media-service | 3006 | Presigned S3 URLs, MinIO |
| notifications-service | 3007 | FCM push, NATS listener |

## Быстрый старт

```bash
# 1. Поднять инфраструктуру
cd infra && docker-compose up -d

# 2. Установить зависимости
pnpm install

# 3. Создать .env в каждом сервисе (на основе .env.example)
# 4. Сгенерировать RSA ключи для auth-service
openssl genrsa 4096 | openssl pkcs8 -topk8 -nocrypt -out private.pem
openssl rsa -in private.pem -pubout -out public.pem

# 5. Запустить миграции
pnpm --filter @meetup/auth-service run prisma:migrate:dev
pnpm --filter @meetup/profile-service run prisma:migrate:dev
pnpm --filter @meetup/chat-service run prisma:migrate:dev
pnpm --filter @meetup/media-service run prisma:migrate:dev
pnpm --filter @meetup/notifications-service run prisma:migrate:dev

# 6. Запустить все сервисы в dev-режиме
pnpm dev
```

## Swagger UI

После запуска в development-режиме:
- API Gateway: http://localhost:3000/docs
- Auth Service: http://localhost:3001/docs
- Profile Service: http://localhost:3002/docs

## Безопасность

- JWT RS256 — приватный ключ только у auth-service, публичный — через JWKS endpoint
- Argon2id (64MB/3iter/4par) для паролей
- PII-поля (email, phone) зашифрованы AES-256-GCM + blind index (HMAC-SHA256) для поиска
- Refresh token rotation с detect-reuse (invalidation by family)
- Rate limiting: per-IP на gateway + per-user внутри сервисов
- Audit log в PG (append-only)
- OTP с лимитом попыток в Redis

## Архитектура событий (NATS JetStream)

```
auth-service    → user.registered, user.deleted
profile-service → profile.updated, interests.changed
chat-service    → chat.message.sent, chat.conversation.created
media-service   → media.uploaded, media.rejected
recommendations → recommendations.refreshed
```

## CI/CD

GitHub Actions: lint → typecheck → tests → security audit → docker build per-service
