# MeetUp — API Reference для Android

**Base URL (prod):** `https://api.meetup.app`  
**Base URL (эмулятор):** `http://10.0.2.2:3000`  
**OpenAPI 3.1 спека:** [`openapi.yaml`](./openapi.yaml) — используйте для кодогенерации Retrofit через `openapi-generator`

---

## Содержание

1. [Аутентификация](#1-аутентификация)
2. [Обработка токенов](#2-обработка-токенов)
3. [Auth API](#3-auth-api)
4. [Profile API](#4-profile-api)
5. [Chat REST API](#5-chat-rest-api)
6. [Chat WebSocket (Socket.IO)](#6-chat-websocket-socketio)
7. [Search API](#7-search-api)
8. [Recommendations API](#8-recommendations-api)
9. [Media API](#9-media-api)
10. [Notifications API](#10-notifications-api)
11. [Коды ошибок](#11-коды-ошибок)
12. [Rate Limiting](#12-rate-limiting)

---

## 1. Аутентификация

Все защищённые endpoints требуют заголовок:

```
Authorization: Bearer <accessToken>
```

**Access-token** — JWT RS256, живёт **15 минут**.  
**Refresh-token** — UUID v4, живёт **30 дней**.

Оба токена храните в `EncryptedSharedPreferences` или Android Keystore.  
**Никогда не храните в обычном SharedPreferences.**

---

## 2. Обработка токенов

### Стратегия refresh

```
1. Запрос с accessToken → сервер → 401 Unauthorized
2. Клиент вызывает POST /v1/auth/refresh с refreshToken
3. Получает новую пару токенов
4. Повторяет исходный запрос
```

> **Важно:** Refresh tokens используют **rotating strategy** — каждый использованный токен инвалидируется.
> При обнаружении повторного использования вся сессия уничтожается и пользователь вынужден войти снова.

### Рекомендуемая реализация (OkHttp Authenticator)

```kotlin
class TokenAuthenticator(
    private val tokenStorage: TokenStorage,
    private val authApi: AuthApi
) : Authenticator {

    override fun authenticate(route: Route?, response: Response): Request? {
        if (response.request.header("Authorization") == null) return null

        val refreshToken = tokenStorage.refreshToken ?: return null

        val newTokens = runBlocking {
            runCatching { authApi.refresh(RefreshRequest(refreshToken)) }.getOrNull()
        } ?: run {
            tokenStorage.clear()
            return null // force re-login
        }

        tokenStorage.save(newTokens)
        return response.request.newBuilder()
            .header("Authorization", "Bearer ${newTokens.accessToken}")
            .build()
    }
}
```

---

## 3. Auth API

### 3.1 Регистрация

**POST** `/v1/auth/register`

```json
// Request
{
  "email": "ivan@example.com",
  "password": "S3cret!123",
  "displayName": "Иван",
  "phone": "+79001234567"   // опционально
}
```

```json
// Response 201
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "message": "OTP sent"
}
```

После успеха на email придёт 6-значный OTP (10 мин, 5 попыток).  
Перейдите к [3.2 Подтверждение OTP](#32-подтверждение-otp).

---

### 3.2 Подтверждение OTP

**POST** `/v1/auth/verify-otp`

```json
// Request
{
  "email": "ivan@example.com",
  "code": "482910"
}
```

```json
// Response 201
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "3f6c8b2a-1d4e-4f7a-9c0b-2e5f8a1d3c6e",
  "expiresIn": 900
}
```

---

### 3.3 Вход

**POST** `/v1/auth/login`

```json
// Request
{
  "email": "ivan@example.com",
  "password": "S3cret!123"
}
```

```json
// Response 200
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "3f6c8b2a-1d4e-4f7a-9c0b-2e5f8a1d3c6e",
  "expiresIn": 900
}
```

| Код | Причина |
|-----|---------|
| 200 | Успешно |
| 401 | Неверный email или пароль |
| 429 | Слишком много попыток |

---

### 3.4 Обновление токена

**POST** `/v1/auth/refresh`

```json
// Request
{
  "refreshToken": "3f6c8b2a-1d4e-4f7a-9c0b-2e5f8a1d3c6e"
}
```

```json
// Response 200 — НОВАЯ пара токенов, старый refreshToken уже недействителен
{
  "accessToken": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "7a1b2c3d-4e5f-6g7h-8i9j-0k1l2m3n4o5p",
  "expiresIn": 900
}
```

---

### 3.5 Выход

**POST** `/v1/auth/logout`  
**Auth:** Bearer token

```json
// Request
{
  "userId": "550e8400-e29b-41d4-a716-446655440000",
  "refreshToken": "7a1b2c3d-4e5f-6g7h-8i9j-0k1l2m3n4o5p"
}
```

**Response:** `204 No Content`

---

### 3.6 Удаление аккаунта (GDPR)

**DELETE** `/v1/auth/account`  
**Auth:** Bearer token

```json
// Request
{
  "userId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Response:** `204 No Content`

Публикует событие `user.deleted` — все сервисы асинхронно удаляют данные пользователя (Saga).

---

## 4. Profile API

> Все endpoints требуют `Authorization: Bearer <token>`.

### 4.1 Создать / обновить свой профиль

**PUT** `/v1/profiles/me`

```json
// Request
{
  "displayName": "Иван",
  "bio": "Люблю горы и кофе",
  "city": "Москва",
  "country": "RU",
  "gender": "male",
  "birthDate": "1995-07-15",
  "interests": ["hiking", "coffee", "photography"]
}
```

```json
// Response 200
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "displayName": "Иван",
  "bio": "Люблю горы и кофе",
  "city": "Москва",
  "country": "RU",
  "gender": "male",
  "birthDate": "1995-07-15T00:00:00.000Z",
  "interests": ["hiking", "coffee", "photography"],
  "photoUrls": [],
  "isActive": true,
  "createdAt": "2024-11-01T10:00:00.000Z",
  "updatedAt": "2024-11-01T12:00:00.000Z"
}
```

| Поле | Тип | Описание |
|------|-----|----------|
| `displayName` | string (2–50) | **Обязательное** |
| `bio` | string (≤ 500) | Опционально |
| `city` | string | Опционально |
| `country` | string | ISO 3166-1 alpha-2 |
| `gender` | enum | `male` / `female` / `other` |
| `birthDate` | ISO 8601 date | `YYYY-MM-DD` |
| `interests` | string[] | Теги через массив |

---

### 4.2 Получить свой профиль

**GET** `/v1/profiles/me`

```json
// Response 200 — то же тело, что в 4.1
```

---

### 4.3 Получить профиль другого пользователя

**GET** `/v1/profiles/{userId}`

```
GET /v1/profiles/550e8400-e29b-41d4-a716-446655440000
```

```json
// Response 200
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "displayName": "Мария",
  "bio": "Путешествия и йога",
  "city": "Санкт-Петербург",
  "country": "RU",
  "gender": "female",
  "interests": ["yoga", "travel"],
  "photoUrls": ["https://cdn.meetup.app/media/uuid.jpg"],
  "isActive": true,
  ...
}
```

---

## 5. Chat REST API

> Для получения новых сообщений в реальном времени используйте [WebSocket](#6-chat-websocket-socketio).  
> REST нужен для загрузки истории при открытии диалога.

### 5.1 Список диалогов

**GET** `/v1/chat/conversations`  
**Auth:** Bearer token

```json
// Response 200
[
  {
    "id": "abc12345-...",
    "participants": [
      "550e8400-...",
      "6ba7b810-..."
    ],
    "createdAt": "2024-11-01T09:30:00.000Z"
  }
]
```

---

### 5.2 Начать диалог

**POST** `/v1/chat/conversations`  
**Auth:** Bearer token

```json
// Request
{
  "targetUserId": "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
}
```

```json
// Response 201 — идемпотентен, вернёт существующий если уже есть
{
  "id": "abc12345-...",
  "participants": ["550e8400-...", "6ba7b810-..."],
  "createdAt": "2024-11-01T09:30:00.000Z"
}
```

---

### 5.3 История сообщений

**GET** `/v1/chat/conversations/{conversationId}/messages`  
**Auth:** Bearer token

| Query-параметр | Тип | По умолчанию | Описание |
|----------------|-----|-------------|----------|
| `cursor` | ISO 8601 | — | Timestamp последнего полученного сообщения |
| `limit` | integer | 50 | Размер страницы (макс. 100) |

```
// Первая загрузка
GET /v1/chat/conversations/abc12345.../messages?limit=50

// Следующая страница (подгрузка выше)
GET /v1/chat/conversations/abc12345.../messages?cursor=2024-11-01T11:59:00.000Z&limit=50
```

```json
// Response 200
{
  "items": [
    {
      "id": "msg-uuid-1",
      "conversationId": "abc12345-...",
      "senderId": "6ba7b810-...",
      "content": "Привет!",
      "isEncrypted": false,
      "createdAt": "2024-11-01T12:00:00.000Z"
    },
    {
      "id": "msg-uuid-2",
      "conversationId": "abc12345-...",
      "senderId": "550e8400-...",
      "content": "Привет! Как дела?",
      "isEncrypted": false,
      "createdAt": "2024-11-01T11:58:00.000Z"
    }
  ],
  "nextCursor": "2024-11-01T11:55:00.000Z",
  "hasMore": true
}
```

> Сообщения отсортированы **от новых к старым**. `nextCursor` — timestamp для следующей страницы.  
> Если `hasMore: false` — все сообщения загружены.

---

## 6. Chat WebSocket (Socket.IO)

**Endpoint:** `wss://api.meetup.app/chat` (или `ws://10.0.2.2:3003` в dev)  
**Транспорт:** WebSocket с fallback на long-polling

### 6.1 Подключение

```kotlin
// Зависимость: implementation("io.socket:socket.io-client:2.1.0")

val options = IO.Options().apply {
    auth = mapOf("userId" to currentUserId)
    transports = arrayOf(WebSocket.NAME)
}
val socket = IO.socket("wss://api.meetup.app/chat", options)
socket.connect()
```

> `userId` передаётся в `handshake.auth`. В продакшне замените на JWT (валидация на сервере).

---

### 6.2 События: клиент → сервер

#### join_conversation — войти в комнату диалога

```kotlin
socket.emit("join_conversation", JSONObject().apply {
    put("conversationId", "abc12345-...")
})

socket.on("joined") { args ->
    val data = args[0] as JSONObject
    // data.getString("conversationId")
}
```

> Вызывайте при открытии экрана диалога. Клиент начнёт получать `new_message` для этого диалога.

---

#### send_message — отправить сообщение

```kotlin
socket.emit("send_message", JSONObject().apply {
    put("conversationId", "abc12345-...")
    put("content", "Привет!")
    put("isEncrypted", false)  // true для E2EE (XSalsa20-Poly1305)
})

socket.on("message_sent") { args ->
    val msg = args[0] as JSONObject
    // msg.getString("id"), msg.getString("createdAt") ...
}
```

---

#### typing — индикатор набора

```kotlin
// Начать набор
socket.emit("typing", JSONObject().apply {
    put("conversationId", "abc12345-...")
    put("isTyping", true)
})

// Остановить набор (или подождать 5 с — TTL в Redis)
socket.emit("typing", JSONObject().apply {
    put("conversationId", "abc12345-...")
    put("isTyping", false)
})
```

---

### 6.3 События: сервер → клиент

| Событие | Когда приходит | Данные |
|---------|---------------|--------|
| `new_message` | Новое сообщение в открытом диалоге | `Message` объект |
| `typing` | Собеседник начал/закончил набор | `{ userId, isTyping }` |

```kotlin
socket.on("new_message") { args ->
    val msg = args[0] as JSONObject
    val messageId = msg.getString("id")
    val senderId  = msg.getString("senderId")
    val content   = msg.getString("content")
    val createdAt = msg.getString("createdAt")
    // добавить в RecyclerView
}

socket.on("typing") { args ->
    val data = args[0] as JSONObject
    val userId    = data.getString("userId")
    val isTyping  = data.getBoolean("isTyping")
    // показать/скрыть индикатор
}
```

---

## 7. Search API

### 7.1 Поиск профилей

**GET** `/v1/search/profiles`

| Параметр | Тип | Описание |
|----------|-----|----------|
| `q` | string | Текстовый запрос (имя, биография, город) |
| `gender` | `male`/`female`/`other` | Фильтр по полу |
| `minAge` | integer ≥ 18 | Минимальный возраст |
| `maxAge` | integer ≤ 100 | Максимальный возраст |
| `city` | string | Точное совпадение города |
| `country` | string | ISO 3166-1 alpha-2 |
| `interests` | string[] | Фильтр по тегам (повторяющийся параметр) |
| `from` | integer | Смещение пагинации |
| `size` | integer (1–100) | Размер страницы |

```
GET /v1/search/profiles?gender=female&minAge=22&maxAge=30&city=Москва&interests=hiking&interests=coffee&size=20
```

```json
// Response 200 — массив userId
[
  "550e8400-e29b-41d4-a716-446655440000",
  "6ba7b810-9dad-11d1-80b4-00c04fd430c8"
]
```

> **Гидрация:** сервер возвращает только `userId[]`. Профили загружайте отдельно через
> `GET /v1/profiles/{userId}` или пакетно (реализация батчинга на стороне клиента).

---

## 8. Recommendations API

### 8.1 Получить ленту рекомендаций

**GET** `/v1/recommendations`  
**Auth:** Bearer token

```json
// Response 200
[
  "a1b2c3d4-...",
  "e5f6g7h8-...",
  "i9j0k1l2-..."
]
```

Возвращает до **100** userId. Кэш живёт **24 часа**.  
Если массив пуст — пересчёт запущен автоматически, повторите запрос позже.

---

### 8.2 Запросить пересчёт ленты

**POST** `/v1/recommendations/refresh`  
**Auth:** Bearer token

```json
// Response 201
{}
```

Пересчёт асинхронный (BullMQ очередь). Обычно занимает несколько секунд.

---

## 9. Media API

### Сценарий загрузки фото

```
┌──────────┐        ┌─────────────┐       ┌───────┐
│  Android │        │ API Gateway │       │  S3   │
└────┬─────┘        └──────┬──────┘       └───┬───┘
     │  POST /upload-url   │                   │
     │────────────────────►│                   │
     │◄────────────────────│                   │
     │  { mediaId, uploadUrl, expiresIn }       │
     │                     │                   │
     │  PUT uploadUrl (файл напрямую в S3)      │
     │─────────────────────┼──────────────────►│
     │◄────────────────────┼───────────────────│
     │  200 OK (от S3)     │                   │
     │                     │                   │
     │  POST /media/{id}/confirm               │
     │────────────────────►│                   │
     │◄────────────────────│                   │
     │  MediaObject        │                   │
```

---

### 9.1 Получить presigned URL

**POST** `/v1/media/upload-url`  
**Auth:** Bearer token

```json
// Request
{
  "mimeType": "image/jpeg",
  "sizeBytes": 2048576
}
```

```json
// Response 201
{
  "mediaId": "7c9e6679-7425-40de-944b-e07fc1f90ae7",
  "uploadUrl": "https://s3.meetup.app/meetup-media/userId/7c9e6679...?X-Amz-Signature=...",
  "expiresIn": 900
}
```

---

### 9.2 Загрузить файл в S3

```kotlin
// Прямой PUT в S3 — БЕЗ Authorization заголовка
val request = Request.Builder()
    .url(uploadUrl)
    .put(file.asRequestBody(mimeType.toMediaType()))
    .header("Content-Type", mimeType)
    .build()

val response = okHttpClient.newCall(request).execute()
// response.code должен быть 200
```

---

### 9.3 Подтвердить загрузку

**POST** `/v1/media/{mediaId}/confirm`  
**Auth:** Bearer token

```json
// Response 201
{
  "id": "7c9e6679-...",
  "userId": "550e8400-...",
  "mimeType": "image/jpeg",
  "sizeBytes": 2048576,
  "status": "active",
  "url": "https://cdn.meetup.app/meetup-media/userId/7c9e6679.jpg",
  "uploadedAt": "2024-11-01T12:05:00.000Z",
  "createdAt": "2024-11-01T12:00:00.000Z",
  "updatedAt": "2024-11-01T12:05:00.000Z"
}
```

Используйте `url` из ответа для добавления фото в профиль (`PUT /v1/profiles/me`, поле `photoUrls`).

---

### 9.4 Список загруженных файлов

**GET** `/v1/media/my`  
**Auth:** Bearer token

```json
// Response 200
[
  { "id": "7c9e6679-...", "url": "https://cdn.meetup.app/...", "mimeType": "image/jpeg", ... }
]
```

---

### 9.5 Удалить файл

**DELETE** `/v1/media/{mediaId}`  
**Auth:** Bearer token

**Response:** `204 No Content`

---

## 10. Notifications API

### 10.1 Зарегистрировать FCM-токен

**POST** `/v1/notifications/device-token`  
**Auth:** Bearer token

```kotlin
// Получить FCM-токен
FirebaseMessaging.getInstance().token.addOnCompleteListener { task ->
    val token = task.result
    // Отправить на сервер
    notificationsApi.registerDeviceToken(
        RegisterDeviceTokenRequest(token = token, platform = "android")
    )
}
```

```json
// Request
{
  "token": "fX3kLm...длинная_строка_FCM",
  "platform": "android"
}
```

```json
// Response 201
{
  "id": "uuid",
  "userId": "550e8400-...",
  "token": "fX3kLm...",
  "platform": "android",
  "createdAt": "2024-11-01T12:00:00.000Z",
  "updatedAt": "2024-11-01T12:00:00.000Z"
}
```

> Вызывайте при каждом старте приложения — токен может обновиться.  
> Также реализуйте `FirebaseMessagingService.onNewToken()` для обновления при ротации.

---

### 10.2 Удалить FCM-токен (при выходе)

**DELETE** `/v1/notifications/device-token`  
**Auth:** Bearer token

```json
// Request
{
  "token": "fX3kLm..."
}
```

**Response:** `204 No Content`

> Вызывайте перед `POST /v1/auth/logout`.

---

### Push-уведомления (входящие)

Сервер присылает push при следующих событиях:

| Событие | `title` | `data.type` |
|---------|---------|-------------|
| Новое сообщение | "Новое сообщение" | `message` |
| Новый матч | "Новый матч!" | `match` |

```kotlin
class MeetUpFirebaseService : FirebaseMessagingService() {

    override fun onMessageReceived(message: RemoteMessage) {
        val type = message.data["type"]
        val conversationId = message.data["conversationId"]

        when (type) {
            "message" -> showMessageNotification(message.notification, conversationId)
            "match"   -> showMatchNotification(message.notification)
        }
    }

    override fun onNewToken(token: String) {
        // Обновить токен на сервере
        lifecycleScope.launch {
            notificationsApi.registerDeviceToken(
                RegisterDeviceTokenRequest(token = token, platform = "android")
            )
        }
    }
}
```

---

## 11. Коды ошибок

Все ошибки возвращают единый формат:

```json
{
  "statusCode": 401,
  "message": "Unauthorized",
  "path": "/v1/profiles/me",
  "timestamp": "2024-11-01T12:00:00.000Z"
}
```

При ошибках валидации `message` — массив строк:

```json
{
  "statusCode": 422,
  "message": [
    "email must be an email",
    "password must be longer than or equal to 8 characters"
  ]
}
```

| Код | Значение | Действие на клиенте |
|-----|----------|---------------------|
| 400 | Некорректный запрос | Показать сообщение из `message` |
| 401 | Не авторизован | Обновить токен → повторить запрос |
| 403 | Нет прав | Показать ошибку доступа |
| 404 | Не найдено | Показать заглушку |
| 409 | Конфликт (email занят) | Показать сообщение из `message` |
| 422 | Ошибка валидации | Подсветить поля формы |
| 429 | Rate limit | Показать таймер, подождать `Retry-After` |
| 500 | Ошибка сервера | Показать "Попробуйте позже" |

---

## 12. Rate Limiting

| Уровень | Лимит | Окно |
|---------|-------|------|
| Per-IP (Gateway) | 100 запросов | 60 секунд |
| Auth endpoints | 20 запросов | 60 секунд |
| OTP попытки | 5 попыток | 10 минут |

При превышении возвращается `429 Too Many Requests`.  
Проверяйте заголовок `Retry-After` в ответе.

---

## Кодогенерация Retrofit

Из OpenAPI-спеки генерируются Kotlin-интерфейсы и data-классы:

```bash
openapi-generator-cli generate \
  -i openapi/openapi.yaml \
  -g kotlin \
  -o android/app/src/main/java/com/meetup/api/generated \
  --additional-properties=\
library=retrofit2,\
dateLibrary=java8,\
serializationLibrary=kotlinx_serialization,\
packageName=com.meetup.api
```
