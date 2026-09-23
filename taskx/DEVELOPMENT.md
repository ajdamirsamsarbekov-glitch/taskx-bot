# DEVELOPMENT GUIDE

## Запуск проекта для разработки

### 1. Установка зависимостей

```bash
cd taskx
npm install
```

### 2. Настройка базы данных

Запустите PostgreSQL и Redis через Docker:

```bash
docker-compose up postgres redis minio -d
```

Или установите локально:
- PostgreSQL 15+
- Redis 7+
- MinIO (опционально)

### 3. Переменные окружения

Создайте `.env` в корне проекта:

```env
# Database
DATABASE_URL=postgresql://taskx:taskx_password@localhost:5432/taskx
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_USER=taskx
DATABASE_PASSWORD=taskx_password
DATABASE_NAME=taskx

# Redis
REDIS_URL=redis://localhost:6379
REDIS_HOST=localhost
REDIS_PORT=6379

# Telegram Bot (получить от @BotFather)
BOT_TOKEN=your_bot_token_here
TELEGRAM_WEBHOOK_URL=https://yourdomain.com/webhook

# JWT
JWT_SECRET=your_jwt_secret_here_min_32_chars
JWT_EXPIRES_IN=7d

# Admin
ADMIN_SECRET=your_admin_secret_here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=change_this_password

# Platform Settings
PLATFORM_FEE_PERCENT=30
AUTO_COMPLETE_HOURS=24
MIN_TASK_PRICE=50
MAX_TASK_PRICE=50000

# Storage
STORAGE_ENDPOINT=localhost
STORAGE_PORT=9000
STORAGE_ACCESS_KEY=minioadmin
STORAGE_SECRET_KEY=minioadmin
STORAGE_BUCKET=taskx-files
STORAGE_USE_SSL=false

# App URLs
API_URL=http://localhost:3000
WEB_URL=http://localhost:3001
ADMIN_URL=http://localhost:3002

# Environment
NODE_ENV=development
PORT=3000
```

### 4. Миграции

```bash
# Собрать database package
cd packages/database
npm run build

# Выполнить миграции
npm run migrate

# При необходимости откатить
npm run migrate:revert
```

### 5. Запуск в dev режиме

**Запустить все сервисы:**
```bash
npm run dev
```

**Или по отдельности:**

Terminal 1 - API:
```bash
cd apps/api
npm run dev
```

Terminal 2 - Bot:
```bash
cd apps/bot
npm run dev
```

Terminal 3 - Web:
```bash
cd apps/web
npm run dev
```

Terminal 4 - Admin:
```bash
cd apps/admin
npm run dev
```

### 6. Доступ к сервисам

- **API:** http://localhost:3000
- **Web (Mini App):** http://localhost:3001
- **Admin Panel:** http://localhost:3002
- **Bot:** Работает в polling режиме

### 7. Проверка работоспособности

**Проверить API:**
```bash
curl http://localhost:3000/health
```

**Проверить подключение к БД:**
```bash
psql postgresql://taskx:taskx_password@localhost:5432/taskx -c "SELECT * FROM users LIMIT 1;"
```

**Проверить Redis:**
```bash
redis-cli ping
```

## Разработка

### Структура кода

```
apps/
  api/          - NestJS backend
    src/
      modules/  - Бизнес-логика по модулям
      common/   - Guards, middleware, filters
      config/   - Конфигурация
  bot/          - Telegram bot
  web/          - Next.js Mini App
  admin/        - Admin Panel

packages/
  database/     - TypeORM entities + migrations
  types/        - TypeScript типы
  shared/       - Общие утилиты
```

### Создание миграции

```bash
cd packages/database
npm run migrate:generate -- -n MigrationName
```

### Добавление нового модуля API

1. Создать папку в `apps/api/src/modules/`
2. Добавить service, controller, module
3. Зарегистрировать в `app.module.ts`

### Изменение комиссии платформы

Изменить в базе данных:
```sql
UPDATE platform_settings 
SET value = '25' 
WHERE key = 'PLATFORM_FEE_PERCENT';
```

Или через Admin Panel → Настройки

## Тестирование

```bash
npm run test
```

Запуск конкретных тестов:
```bash
cd apps/api
npm run test -- wallet.service.spec.ts
```

## Отладка

### Логи API
```bash
cd apps/api
npm run dev
# Логи выводятся в консоль
```

### Логи Bot
```bash
cd apps/bot
npm run dev
```

### Отладка в VS Code

`.vscode/launch.json`:
```json
{
  "version": "0.2.0",
  "configurations": [
    {
      "type": "node",
      "request": "launch",
      "name": "Debug API",
      "runtimeExecutable": "npm",
      "runtimeArgs": ["run", "dev"],
      "cwd": "${workspaceFolder}/apps/api",
      "console": "integratedTerminal"
    }
  ]
}
```

## Частые проблемы

### Ошибка подключения к БД
- Проверьте что PostgreSQL запущен
- Проверьте DATABASE_URL в .env
- Проверьте что миграции выполнены

### Ошибка "BOT_TOKEN not configured"
- Получите токен от @BotFather
- Добавьте в .env

### Redis connection refused
- Запустите Redis: `docker-compose up redis -d`
- Или установите локально

### TypeORM не находит entities
- Пересоберите packages: `npm run build`
- Проверьте пути в `data-source.ts`

## Production Build

```bash
# Собрать все приложения
npm run build

# Запустить production
npm start
```

## Docker для разработки

Запустить только инфраструктуру:
```bash
docker-compose up postgres redis minio -d
```

Запустить всё:
```bash
docker-compose up -d
```

Посмотреть логи:
```bash
docker-compose logs -f api
```

Остановить:
```bash
docker-compose down
```

## API Endpoints

См. README.md для списка всех endpoints.

Swagger документация (в планах):
http://localhost:3000/api-docs

## Полезные команды

```bash
# Очистить node_modules
npm run clean

# Переустановить зависимости
rm -rf node_modules package-lock.json
npm install

# Проверить линтер
npm run lint

# Форматировать код
npm run format

# Посмотреть структуру БД
psql $DATABASE_URL -c "\dt"

# Очистить данные в БД (ОСТОРОЖНО!)
psql $DATABASE_URL -c "TRUNCATE users CASCADE;"
```

## Telegram Bot Development

### Настройка webhook (для production)

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook?url=https://yourdomain.com/webhook"
```

### Проверка webhook

```bash
curl "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

### Удаление webhook (для dev)

```bash
curl -X POST "https://api.telegram.org/bot<BOT_TOKEN>/deleteWebhook"
```

В dev режиме бот работает через polling (автоматически).

## Мониторинг

### Redis CLI

```bash
redis-cli
> KEYS *
> GET ratelimit:user123:/tasks
> TTL ratelimit:user123:/tasks
```

### Bull Queue Dashboard

В планах: bull-board для мониторинга фоновых задач

## Обновление зависимостей

```bash
npm outdated
npm update
```

## Контрибуция

1. Fork репозиторий
2. Создать feature branch: `git checkout -b feature/amazing-feature`
3. Commit изменения: `git commit -m 'Add amazing feature'`
4. Push в branch: `git push origin feature/amazing-feature`
5. Открыть Pull Request

---

**Дата обновления:** 2026-09-22
