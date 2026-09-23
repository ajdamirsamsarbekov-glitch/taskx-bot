# TaskX - Changelog

## [1.0.0] - 2026-09-22

### 🎉 Initial MVP Release

Полнофункциональная платформа микрозаданий в Telegram с escrow-платежами и комиссией 30%.

### ✅ Implemented Features

#### Backend (NestJS)
- **Wallet System**
  - Ledger-based транзакции
  - Escrow lock/release механизм
  - Decimal.js для точных расчётов
  - Pessimistic locking для предотвращения race conditions
  - Атомарные транзакции

- **Task Marketplace**
  - State machine: DRAFT → PUBLISHED → ASSIGNED → IN_PROGRESS → SUBMITTED → COMPLETED
  - Автоматический расчёт 30% комиссии
  - Публикация с резервированием средств
  - Автозавершение через 24 часа после submission
  - Проверка дедлайнов

- **Authentication**
  - Telegram WebApp initData validation
  - JWT токены
  - Автоматическая регистрация через /start

- **Dispute System**
  - Создание споров
  - Загрузка доказательств
  - 4 типа резолюций: FAVOR_CLIENT, FAVOR_EXECUTOR, SPLIT, CUSTOM
  - Админ-панель для разрешения

- **Review System**
  - Рейтинг 1-5 звёзд
  - Автообновление рейтинга пользователя
  - История отзывов

- **Notification System**
  - Telegram уведомления для всех событий
  - Task lifecycle notifications
  - Payment notifications
  - Dispute notifications

- **Security**
  - Rate limiting через Redis
  - Audit logging
  - Helmet для HTTP headers
  - Global exception filter
  - Server-side validation
  - SQL injection protection через TypeORM

- **Background Jobs**
  - Проверка дедлайнов (каждые 15 мин)
  - Автозавершение заданий (каждый час)
  - Автоматическое истечение просроченных (каждые 30 мин)

#### Database
- PostgreSQL схема с 9 таблицами
- TypeORM entities
- Миграции
- Индексы для оптимизации
- Enum типы для статусов

#### Telegram Bot
- Команды: /start, /menu, /help, /support
- Inline кнопки для быстрого доступа
- Уведомления с кнопками действий
- Polling mode для development

#### Mini App (Next.js)
- Telegram WebApp интеграция
- Аутентификация через initData
- Лента заданий
- Кошелёк с балансом
- Профиль пользователя
- Мои задания
- Zustand для state management

#### Admin Panel (Next.js)
- Dashboard со статистикой
- Управление спорами
- Резолюция споров (3 варианта)
- Настройки платформы
  - Изменение комиссии
  - Настройка автозавершения

#### DevOps
- Docker Compose для всех сервисов
- Nginx reverse proxy
- PostgreSQL, Redis, MinIO
- Dockerfiles для API, Bot, Web
- Production-ready конфигурация

### 📦 Packages

- `@taskx/api` - NestJS backend
- `@taskx/bot` - Telegram bot
- `@taskx/web` - Next.js Mini App
- `@taskx/admin` - Admin Panel
- `@taskx/database` - TypeORM entities + migrations
- `@taskx/types` - Shared TypeScript types

### 🔐 Security Features

- Telegram WebApp authentication
- JWT with expiration
- Rate limiting (50-5 req/min в зависимости от endpoint)
- Audit logs для критических операций
- Pessimistic locking для финансовых операций
- Server-side validation всех данных
- Анонимность пользователей (публичные ID)

### 💰 Financial Features

- Escrow система
- 30% комиссия платформы (настраиваемая)
- Автоматическое распределение средств
- Защита от double spending
- Ledger-based transactions (неизменяемая история)
- Поддержка Decimal для точности

### 📊 Statistics & Monitoring

- Audit logs для всех критических действий
- Background job scheduling
- Error handling и logging
- Health checks (в планах)

### 🌐 API Endpoints

**Auth:**
- POST /auth/telegram

**Users:**
- GET /users/me
- GET /users/:id

**Wallet:**
- GET /wallet
- GET /wallet/transactions
- POST /wallet/deposit
- POST /wallet/withdraw

**Tasks:**
- GET /tasks
- GET /tasks/my
- GET /tasks/:id
- POST /tasks
- POST /tasks/:id/publish
- POST /tasks/:id/assign
- POST /tasks/:id/start
- POST /tasks/:id/submit
- POST /tasks/:id/complete
- POST /tasks/:id/cancel

**Disputes:**
- POST /disputes
- POST /disputes/:id/evidence
- GET /disputes/:id
- POST /disputes/reviews
- GET /disputes/reviews/task/:taskId
- GET /disputes/reviews/user/:userId

### 📝 Documentation

- ✅ README.md - Полное описание проекта
- ✅ DEVELOPMENT.md - Guide для разработчиков
- ✅ .env.example - Пример переменных окружения
- ✅ docker-compose.yml - Production deployment

### ⏳ Pending Features

- [ ] Tests (unit + integration)
- [ ] Real payment integration (MBank, карты)
- [ ] Geolocation для локальных заданий
- [ ] Фото/видео вложения в задания
- [ ] Внутренний чат по заданию
- [ ] Swagger API документация
- [ ] Bull Board для мониторинга очередей
- [ ] Prometheus metrics
- [ ] Sentry для error tracking

### 🐛 Known Issues

- Mock payment provider (требует интеграции реального)
- Admin Panel без аутентификации (требует защиты)
- Mini App UI базовый (требует улучшений UX)
- Нет тестов

### 🔄 Breaking Changes

N/A - первый релиз

---

## Roadmap

### v1.1 (Planned)
- [ ] Реальные платёжные системы
- [ ] Push notifications
- [ ] Geolocation
- [ ] Фото/видео uploads
- [ ] Внутренний чат

### v1.2 (Planned)
- [ ] AI fraud detection
- [ ] Верификация пользователей
- [ ] Промокоды
- [ ] Категории и специализации

### v2.0 (Future)
- [ ] AI matching
- [ ] Бизнес подписки
- [ ] Public API

---

**Версия:** 1.0.0  
**Дата:** 2026-09-22  
**Статус:** MVP Ready for Testing
