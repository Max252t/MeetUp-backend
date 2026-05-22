# MeetUp Backend — Архитектура

## Контекст

Бэкенд для Android-приложения MeetUp (знакомства по интересам). Клиент построен по Clean Architecture + MVI (Orbit), стек Hilt/Room/Retrofit/DataStore/OkHttp. Этот репозиторий содержит серверную часть, разрабатывается независимо от клиента; контракт фиксируется через OpenAPI и AsyncAPI спецификации.

## Стек

- **Язык:** TypeScript 5.x
- **Фреймворк:** NestJS 10 (микросервисы через `@nestjs/microservices`, HTTP — Fastify-adapter)
- **Транспорт между сервисами:** NATS JetStream (lightweight, exactly-once, persistent streams) + gRPC для синхронных RPC
- **API Gateway:** NestJS + Fastify, единая точка входа для мобильного клиента
- **Realtime:** WebSocket (Socket.IO) на Chat-сервисе, fallback long-polling
- **Базы данных:** PostgreSQL 16 (по одной БД на сервис, Database-per-service), Redis 7 (кэш + presence + rate-limit), MinIO/S3 (медиа)
- **Поиск/рекомендации:** OpenSearch (полнотекст + гео + фильтры по интересам)
- **Очереди событий:** NATS JetStream (доменные события), Redis Streams (быстрые ephemeral задачи)
- **ORM:** Prisma (миграции + типобезопасность)
- **Auth:** JWT (access 15 мин) + refresh (rotating, httpOnly), Argon2id для паролей
- **Контейнеризация:** Docker + docker-compose (dev), Kubernetes-ready манифесты (prod)
- **Наблюдаемость:** OpenTelemetry → Jaeger + Prometheus + Loki, pino-логирование с correlation-id

> **Почему NestJS, а не «чистый Node»:** DI-контейнер, готовая интеграция микросервисов/gRPC/WebSocket, dec­oraторный валидатор (class-validator). Снижает бойлерплейт без потери гибкости. Если в будущем какой-то сервис упрётся в CPU (рекомендации, шифрование медиа) — переписать его на Go/Rust изолированно, контракт не сломается.

## Микросервисы

```
                    ┌──────────────────┐
                    │   Mobile Client  │
                    └─────────┬────────┘
                              │ HTTPS / WSS (TLS 1.3)
                    ┌─────────▼────────┐
                    │   API Gateway    │  ← rate-limit, auth-проверка JWT, маршрутизация
                    └─────────┬────────┘
                              │ gRPC (mTLS)        / NATS (event bus)
       ┌──────────┬───────────┼───────────┬──────────┬──────────┐
       ▼          ▼           ▼           ▼          ▼          ▼
   ┌────────┐ ┌────────┐ ┌─────────┐ ┌────────┐ ┌────────┐ ┌──────────┐
   │ Auth   │ │Profile │ │  Chat   │ │ Search │ │ Recos  │ │  Media   │
   │ Svc    │ │ Svc    │ │  Svc    │ │  Svc   │ │  Svc   │ │  Svc     │
   └───┬────┘ └───┬────┘ └───┬─────┘ └───┬────┘ └───┬────┘ └────┬─────┘
       │PG       │PG       │PG+Redis    │OpenSearch │PG+Redis  │S3/MinIO
       │         │         │            │           │
       └─────────┴────► NATS JetStream ◄┴───────────┘
                    (UserUpdated, MessageSent, Liked, …)
```

### 1. **api-gateway**
- Единственный публичный endpoint (`api.meetup.app`)
- Валидирует JWT, прокидывает `x-user-id` дальше
- Rate-limit (Redis token bucket), CORS, helmet, request-id
- OpenAPI-спека агрегируется здесь (Swagger UI на `/docs` только в dev)
- Не хранит состояние

### 2. **auth-service**
- Регистрация (email/phone + OTP через провайдер), логин, refresh-token rotation
- Argon2id (memory=64MB, iterations=3, parallelism=4) для паролей
- JWT RS256: приватный ключ только у auth-service, публичный раздаётся остальным через JWKS endpoint
- Хранит сессии в Redis (для отзыва), refresh-токены — в PG (хэш + family для detect reuse)
- Эмитит `UserRegistered`, `UserDeleted`

### 3. **profile-service**
- CRUD профиля: город, страна, интересы, био, пол, дата рождения, фото-метаданные (сами файлы — в media-svc)
- Хранит embeddings интересов для рекомендаций (pgvector)
- Эмитит `ProfileUpdated`, `InterestsChanged`

### 4. **chat-service**
- WebSocket-шлюз (Socket.IO с Redis adapter для горизонтального масштабирования)
- REST для истории сообщений (пагинация cursor-based)
- Сообщения в PG (партиционирование по `conversation_id` hash), индексы по `(conversation_id, created_at desc)`
- Presence (online/typing) — Redis с TTL 30s
- **E2EE chat** (см. ниже): сервер хранит только зашифрованный ciphertext, ключи не видит
- Эмитит `MessageSent`, `ConversationCreated` (для push-уведомлений)

### 5. **search-service**
- Индексация профилей в OpenSearch (slave из NATS-событий `ProfileUpdated`)
- Фильтры: возраст (range), пол, интересы (terms), геораспределение (geo_distance), online-статус
- Возвращает `userId[]`, гидрация в gateway-aggregator или клиент тянет профили отдельно

### 6. **recommendations-service**
- Cron-задача (BullMQ) пересчёт recommendation feed раз в N часов на пользователя
- Алгоритм: cosine similarity на embedding'ах интересов + collaborative filtering на лайках
- Кэш топ-100 в Redis на пользователя, TTL 24h
- Эмитит `RecommendationsRefreshed`

### 7. **media-service**
- Presigned URLs на загрузку в S3/MinIO (клиент грузит напрямую, минуя сервер)
- Webhook от S3 → валидация (MIME, размер, NSFW-чек через ML-сервис) → запись метаданных в PG
- Серверное шифрование объектов: SSE-KMS (AWS) или SSE-C с собственным ключом в Vault
- Эмитит `MediaUploaded`, `MediaRejected`

### 8. **notifications-service**
- Слушает события (`MessageSent`, `MatchCreated`, …) из NATS
- Отправляет push через FCM
- Хранит токены устройств в PG (зашифрованные)

## Безопасность и шифрование

### Транспортный уровень
- **TLS 1.3** на api-gateway (Let's Encrypt через cert-manager в k8s)
- **mTLS** между внутренними сервисами (SPIFFE/SPIRE или cert-manager + Istio)
- HSTS, secure cookies, SameSite=strict для админ-панели

### Аутентификация
- JWT **RS256** (не HS256 — приватный ключ не светится во всех сервисах)
- Access-token 15 мин, refresh — 30 дней, rotation + reuse detection
- Argon2id для паролей, никаких bcrypt/sha
- OTP для регистрации, лимит попыток в Redis

### Шифрование в покое
- **БД (PG):** TDE на уровне диска (LUKS/EBS-encryption); PII-поля (email, phone) дополнительно шифруются AES-256-GCM на уровне приложения (envelope encryption, DEK в записи, KEK в Vault/AWS KMS)
- **Медиа (S3):** SSE-KMS, per-tenant ключи
- **Backup'ы:** GPG-зашифрованы перед заливкой в холодное хранилище

### E2EE для чата (опционально, но заложить)
- Протокол: **Signal Protocol (libsignal)** или упрощённо — **NaCl/libsodium** (X25519 + XSalsa20-Poly1305)
- Каждый клиент при регистрации генерирует identity key + prekeys, публикует публичные части на сервер
- Сервер хранит **только ciphertext**, не имеет приватных ключей
- Восстановление истории при смене устройства — через зашифрованный backup на S3, ключ выводится из пользовательского пароля + аппаратного secret (Android Keystore)

### Защита от атак
- Rate-limit: per-IP (gateway) + per-user (внутри сервисов)
- Защита от brute-force на логин: exponential backoff + капча после 5 неудач
- CSRF не релевантен (мобильный клиент, только Bearer-токены)
- SQL-инъекции: Prisma + параметризованные запросы, ESLint-rule запрет `$queryRaw` без `Prisma.sql`
- Валидация всех входов через `class-validator` (zod на гейтвее опционально)
- helmet, защита от prototype pollution (Node >=20 + lockfile audit в CI)
- Secrets — только в Vault/AWS Secrets Manager, никаких `.env` в проде
- Регулярный `npm audit` + Snyk в CI, обновления через Renovate

### Аудит и compliance
- Все security-events (логин, смена пароля, удаление аккаунта) пишутся в append-only audit-log (PG с триггером запрета DELETE/UPDATE)
- GDPR: endpoint «удалить меня» эмитит `UserDeleted` → каждый сервис чистит свои данные (Saga)
- Логи: маскирование PII в pino (`redact: ['*.email', '*.phone', '*.token']`)

## Межсервисное взаимодействие

- **Синхронно** (request/response): gRPC через protobuf-схемы в `packages/proto/`
- **Асинхронно** (события): NATS JetStream, схемы в `packages/events/` (TypeScript-типы, генерация AsyncAPI)
- **Транзакции через границу сервисов:** Saga (хореография через события); компенсирующие действия описаны явно
- **Outbox pattern**: сервис пишет событие в свою БД в одной транзакции с бизнес-данными, отдельный воркер публикует в NATS

## Структура репозитория (monorepo через pnpm + Turborepo)

```
D:\MeetUp-backend\
├─ apps/
│  ├─ api-gateway/
│  ├─ auth-service/
│  ├─ profile-service/
│  ├─ chat-service/
│  ├─ search-service/
│  ├─ recommendations-service/
│  ├─ media-service/
│  └─ notifications-service/
├─ packages/
│  ├─ proto/              ← .proto файлы + сгенерированные TS-типы
│  ├─ events/             ← TypeScript-типы доменных событий + AsyncAPI
│  ├─ shared-config/      ← env-валидация (zod), общие constants
│  ├─ crypto/             ← обёртки над libsodium, KMS-клиент, JWT utils
│  ├─ db-kit/             ← Prisma base, middleware шифрования PII
│  └─ telemetry/          ← OpenTelemetry setup, pino-logger
├─ infra/
│  ├─ docker-compose.yml          ← dev: pg, redis, nats, opensearch, minio, jaeger
│  ├─ k8s/                        ← манифесты + Helm charts
│  └─ terraform/                  ← cloud infra (vpc, rds, kms, secrets)
├─ openapi/                       ← агрегированная REST-спека для клиента
├─ asyncapi/                      ← спека событий
├─ .github/workflows/             ← CI: lint, test, snyk, docker build, deploy
├─ turbo.json
├─ pnpm-workspace.yaml
├─ package.json
└─ README.md
```

### Внутри каждого сервиса (NestJS)
```
apps/<svc>/
├─ src/
│  ├─ main.ts
│  ├─ app.module.ts
│  ├─ modules/<domain>/
│  │   ├─ <domain>.controller.ts        ← HTTP/gRPC
│  │   ├─ <domain>.service.ts           ← бизнес-логика
│  │   ├─ <domain>.repository.ts        ← Prisma
│  │   ├─ dto/                          ← class-validator
│  │   └─ events/                       ← подписки + публикации
│  ├─ common/ (guards, interceptors, filters)
│  └─ config/
├─ prisma/
│  ├─ schema.prisma
│  └─ migrations/
├─ test/
├─ Dockerfile
└─ package.json
```

## Окружения

| Среда   | Где                  | Особенности |
|---------|----------------------|-------------|
| local   | docker-compose       | все зависимости в контейнерах, hot-reload через `nest start --watch` |
| dev     | k8s cluster (dev)    | shared, общий KMS-stub, тестовые данные |
| staging | k8s cluster (stg)    | копия prod-конфига, реальный KMS, обезличенные prod-данные |
| prod    | k8s cluster (prod)   | autoscaling, multi-AZ, бэкапы, on-call |

## CI/CD

- **CI** (GitHub Actions per-PR): lint (eslint+prettier), typecheck, unit-тесты, integration-тесты (testcontainers — PG/Redis/NATS), `npm audit --audit-level=high`, snyk, build Docker per-app
- **CD**: merge в `main` → build → push в registry → ArgoCD синкает k8s
- Миграции Prisma — отдельный job перед деплоем сервиса, с гард-чеком на breaking changes

## Контракт с клиентом

- REST-эндпоинты описаны OpenAPI 3.1, генерация клиентского кода для Android (Retrofit interfaces + DTO) через `openapi-generator`
- WebSocket-события — AsyncAPI, типизированный клиент на Kotlin генерируется в той же сборке
- Версионирование: `/v1/...`, breaking changes → `/v2/...` параллельно (минимум 1 релиз перекрытия)

## Roadmap реализации

1. Скелет монорепо (pnpm + turbo), `packages/shared-config`, `packages/telemetry`, docker-compose с PG/Redis/NATS
2. `auth-service` end-to-end: регистрация, логин, JWT, refresh-rotation, Argon2 — единственный сервис со своим KMS-ключом
3. `api-gateway` с JWT-валидацией через JWKS auth-сервиса
4. `profile-service` + миграции + публикация `ProfileUpdated` в NATS
5. `search-service` слушает события → индексирует в OpenSearch
6. `chat-service` (сначала plaintext + WebSocket), позже — E2EE-слой поверх
7. `media-service` с presigned URLs и SSE-KMS
8. `recommendations-service` (cron + Redis)
9. `notifications-service` (FCM)
10. Observability stack, нагрузочные тесты (k6), security audit

## Альтернативы, осознанно отвергнутые

- **Чистый Node + Express:** меньше структуры, больше бойлерплейта DI/валидации/микросервисов
- **Монолит вместо микросервисов:** требование задачи. Реалистично: на старте можно поднять модульный монолит (один процесс, те же модули) и распилить позже — каркас пакетов это позволяет
- **Kafka вместо NATS JetStream:** Kafka мощнее, но операционно дороже; для текущего масштаба NATS легче
- **MongoDB:** реляционная природа данных (matches, лайки, conversations) лучше ложится на PG; pgvector закрывает кейсы embedding'ов
- **Go/Rust для всего:** TypeScript даёт быструю разработку фич; узкие места (recs, шифрование) можно вынести в Go-сервис изолированно
