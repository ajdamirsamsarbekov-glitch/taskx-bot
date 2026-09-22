# TaskX - Telegram Task Marketplace Platform

TaskX — это полнофункциональная платформа микрозаданий в Telegram с безопасными escrow-платежами и комиссией 30%.

## 🚀 Быстрый деплой на Railway.app

1. Зарегистрируйтесь на https://railway.app
2. "New Project" → "Deploy from GitHub repo"
3. Подключите репозиторий
4. Добавьте переменные окружения (Variables):
   ```
   BOT_TOKEN=8666914335:AAGnN7l7lUUPeiFnTqHzmq4GCBwqK9zGip8
   SUPABASE_URL=https://hjoosjstmginrpatkvbm.supabase.co
   SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqb29zanN0bWdpbnJwYXRrdmJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDA3NTI5MywiZXhwIjoyMTA1NjUxMjkzfQ.wuMdC1ZsckIUB5PKjRdNH1vaJLSaRxjzevBxay2DbBI
   ```
5. Deploy! Бот будет работать 24/7

## 📦 Локальный запуск

```bash
npm install
node supabase-bot-v2.js
```

## 🎯 Основные возможности

- ✅ **Двойная роль**: Каждый пользователь может быть заказчиком и исполнителем
- 💰 **Escrow система**: Безопасные сделки с резервированием средств
- 🔒 **30% комиссия платформы**: Автоматическое распределение платежей
- 📱 **Telegram Mini App**: Полноценный интерфейс внутри Telegram
- 🔐 **Полная анонимность**: Пользователи видят только публичные ID
- ⚖️ **Система споров**: Админ-панель для разрешения конфликтов
- ⭐ **Рейтинг и отзывы**: Оценки после завершения заданий
- 🔔 **Уведомления**: Telegram-нотификации на все события

## 🏗️ Архитектура

Монорепозиторий на базе Turborepo с TypeScript:

```
taskx/
├── apps/
│   ├── api/          # NestJS backend API
│   ├── bot/          # Telegram Bot
│   ├── web/          # Next.js Mini App (в разработке)
│   └── admin/        # Admin Panel (в разработке)
├── packages/
│   ├── database/     # TypeORM entities + migrations
│   ├── types/        # Shared TypeScript types
│   ├── shared/       # Shared utilities
│   ├── validation/   # Validation schemas
│   └── config/       # Configuration
└── docker/           # Docker configs
```

## 🛠️ Технологический стек

### Backend
- **NestJS** - Enterprise-grade архитектура
- **PostgreSQL** - Реляционная БД с ACID гарантиями
- **TypeORM** - ORM с migrations
- **Redis** - Кеширование и очереди
- **Bull** - Background jobs
- **Decimal.js** - Точные денежные расчёты

### Bot
- **node-telegram-bot-api** - Telegram Bot API
- **Telegram WebApp** - Mini App интеграция

### Deployment
- **Docker Compose** - Контейнеризация
- **Nginx** - Reverse proxy
- **MinIO** - S3-compatible хранилище файлов

## 📦 Установка

### Требования
- Node.js >= 20.0.0
- npm >= 10.0.0
- Docker & Docker Compose (для production)
- PostgreSQL 15+ (для локальной разработки)
- Redis 7+ (для локальной разработки)

### Быстрый старт

1. **Клонировать репозиторий**
```bash
cd taskx
```

2. **Установить зависимости**
```bash
npm install
```

3. **Настроить переменные окружения**
```bash
cp .env.example .env
```

Отредактируйте `.env` и добавьте:
- `BOT_TOKEN` - токен от @BotFather
- `JWT_SECRET` - секретный ключ для JWT
- `DATABASE_URL` - URL подключения к PostgreSQL
- `REDIS_URL` - URL подключения к Redis

4. **Запустить PostgreSQL и Redis**
```bash
docker-compose up postgres redis -d
```

5. **Выполнить миграции**
```bash
npm run db:migrate
```

6. **Запустить в режиме разработки**
```bash
npm run dev
```

Сервисы будут доступны:
- API: http://localhost:3000
- Bot: работает в polling режиме
- Web: http://localhost:3001 (после реализации)

## 🚀 Production Deployment

### Docker Compose

1. **Создать `.env` файл**
```bash
cp .env.example .env
```

2. **Настроить production переменные**
```env
BOT_TOKEN=your_production_bot_token
JWT_SECRET=strong_random_secret
DATABASE_PASSWORD=strong_db_password
ADMIN_PASSWORD=strong_admin_password
WEB_URL=https://yourdomain.com
API_URL=https://api.yourdomain.com
```

3. **Запустить все сервисы**
```bash
docker-compose up -d
```

4. **Выполнить миграции**
```bash
docker-compose exec api npm run db:migrate
```

5. **Проверить логи**
```bash
docker-compose logs -f
```

## 💼 Бизнес-логика

### Жизненный цикл задания

```
DRAFT → PUBLISHED → ASSIGNED → IN_PROGRESS → SUBMITTED → COMPLETED
                                      ↓
                                  DISPUTED → RESOLVED
```

### Финансовые операции

**Создание задания (100 сом):**
```
Заказчик: available_balance: -100, frozen_balance: +100
```

**Завершение задания:**
```
Платформа: +30 сом (комиссия)
Исполнитель: +70 сом (оплата)
Заказчик: frozen_balance: -100
```

**Отмена задания:**
```
Заказчик: available_balance: +100, frozen_balance: -100 (возврат)
```

### Комиссия платформы

Комиссия настраивается через `platform_settings`:
- По умолчанию: **30%**
- Изменяется только администратором
- Применяется автоматически при создании задания

Пример расчёта:
```
Цена задания: 1000 сом
Комиссия (30%): 300 сом
Выплата исполнителю: 700 сом
```

## 🔐 Безопасность

### Telegram WebApp Authentication
- Валидация `initData` с проверкой HMAC
- Нельзя подделать user ID или данные пользователя
- Все проверки на сервере

### Wallet Security
- **Ledger-based система**: Каждая операция создаёт transaction record
- **Pessimistic locking**: Предотвращение race conditions
- **Atomic transactions**: Все финансовые операции атомарны
- **Decimal arithmetic**: Нет ошибок округления

### API Security
- JWT токены с истечением
- Rate limiting (в разработке)
- Helmet для HTTP headers
- Валидация всех входящих данных
- SQL injection protection через TypeORM
- XSS protection

### Анонимность
- Telegram ID никогда не показывается пользователям
- Используются публичные ID: `User_abc123`, `TASK-xyz456`
- Реальные данные доступны только администраторам

## 📊 База данных

### Основные таблицы

**users** - Пользователи
- `publicUsername` - Анонимный публичный ID
- `telegramId` - Реальный Telegram ID (скрыт)
- `rating` - Средний рейтинг
- `completedTasks` - Количество выполненных заданий

**wallets** - Кошельки
- `availableBalance` - Доступный баланс
- `frozenBalance` - Замороженные средства (escrow)
- `earnedTotal` - Всего заработано
- `spentTotal` - Всего потрачено

**wallet_transactions** - Транзакции
- Все финансовые операции логируются
- Хранит баланс до и после операции
- Неизменяемая история (append-only)

**tasks** - Задания
- `price` - Полная стоимость задания
- `executorPayout` - Выплата исполнителю (70%)
- `platformFee` - Комиссия платформы (30%)
- `status` - Текущий статус из state machine

**disputes** - Споры
- Причина спора
- Доказательства от обеих сторон
- Резолюция администратора

**reviews** - Отзывы
- Рейтинг от 1 до 5
- Комментарий
- Автоматическое обновление рейтинга пользователя

## 🔧 API Endpoints

### Authentication
```
POST /api/auth/telegram - Аутентификация через Telegram WebApp
```

### Users
```
GET /api/users/me - Мой профиль
GET /api/users/:id - Профиль пользователя
```

### Wallet
```
GET /api/wallet - Мой кошелёк
GET /api/wallet/transactions - История транзакций
POST /api/wallet/deposit - Пополнение (mock)
POST /api/wallet/withdraw - Вывод средств
```

### Tasks
```
GET /api/tasks - Список доступных заданий
GET /api/tasks/my - Мои задания
GET /api/tasks/:id - Детали задания
POST /api/tasks - Создать задание
POST /api/tasks/:id/publish - Опубликовать задание (резервирует деньги)
POST /api/tasks/:id/assign - Принять задание
POST /api/tasks/:id/start - Начать выполнение
POST /api/tasks/:id/submit - Отправить результат
POST /api/tasks/:id/complete - Подтвердить выполнение (распределяет деньги)
POST /api/tasks/:id/cancel - Отменить задание (возврат денег)
```

### Disputes & Reviews
```
POST /api/disputes - Открыть спор
POST /api/disputes/:id/evidence - Добавить доказательства
GET /api/disputes/:id - Детали спора
POST /api/disputes/reviews - Оставить отзыв
GET /api/disputes/reviews/task/:taskId - Отзывы по заданию
GET /api/disputes/reviews/user/:userId - Отзывы пользователя
```

## 🤖 Telegram Bot

### Команды
- `/start` - Начать работу с ботом
- `/menu` - Главное меню
- `/help` - Помощь
- `/support` - Поддержка

### Уведомления
Бот отправляет уведомления о:
- Новых заданиях рядом
- Принятии задания
- Отправке результата
- Подтверждении выполнения
- Получении оплаты
- Открытии спора
- Истечении срока

## 📱 Mini App (в разработке)

Telegram Mini App на Next.js:
- Лента заданий с фильтрами
- Создание задания с формой
- Кошелёк с историей транзакций
- Профиль с рейтингом
- Мои задания (заказчик + исполнитель)
- Чат по заданию
- Споры

## 🛡️ Защита от мошенничества

### Escrow система
- Деньги резервируются при публикации задания
- Нельзя отменить задание после начала выполнения без спора
- Автоматическое завершение через 24 часа после отправки результата

### Рейтинговая система
- Рейтинг обновляется после каждого задания
- Учитывается процент успешных заданий
- Trust score для дополнительной проверки

### Audit Logs
- Все действия логируются
- IP адрес и User-Agent
- Возможность отследить подозрительную активность

## 🧪 Тестирование (в разработке)

```bash
npm run test
```

Критические тесты:
- Wallet: escrow lock/release, комиссия, refund
- Task: state transitions, финансовые операции
- Auth: Telegram initData validation
- Security: SQL injection, XSS, double spending

## 📈 Мониторинг

### Логи
```bash
docker-compose logs -f api
docker-compose logs -f bot
```

### Метрики (планируется)
- Количество активных пользователей
- Объём транзакций
- Доход платформы
- Среднее время выполнения заданий
- Количество споров

## 🔄 Обновления

### Миграции базы данных
```bash
npm run db:migrate
```

### Откат миграций
```bash
npm run db:migrate:revert
```

## 🎨 Roadmap

### MVP (Текущая версия)
- ✅ Backend API
- ✅ Telegram Bot
- ✅ Wallet с escrow
- ✅ Task marketplace
- ✅ Споры и отзывы
- ⏳ Mini App UI
- ⏳ Admin Panel

### v1.1
- [ ] Реальные платёжные системы (MBank, карты)
- [ ] Geolocation для локальных заданий
- [ ] Push-уведомления
- [ ] Фото/видео вложения
- [ ] Внутренний чат

### v1.2
- [ ] Автоматическое определение мошенничества
- [ ] Система репутации
- [ ] Верификация пользователей
- [ ] Промокоды и бонусы

### v2.0
- [ ] AI-подбор заданий
- [ ] Категории и специализации
- [ ] Подписки для бизнеса
- [ ] API для интеграций

## 🤝 Вклад в проект

Проект находится в стадии MVP. Приветствуются:
- Pull requests
- Bug reports
- Feature requests
- Улучшения документации

## 📄 Лицензия

Proprietary. Все права защищены.

## 📞 Поддержка

- Email: support@taskx.com
- Telegram: @taskx_support
- GitHub Issues: github.com/taskx/issues

## ⚠️ Важные замечания

1. **Финансы**: Все расчёты используют `Decimal.js` - никогда не используйте `Number` для денег
2. **State Machine**: Нельзя пропускать статусы заданий - только последовательные переходы
3. **Безопасность**: Всегда проверяйте `initData` на сервере - никогда не доверяйте клиенту
4. **Анонимность**: Никогда не показывайте `telegramId` пользователям
5. **Escrow**: Деньги блокируются при публикации и освобождаются только после подтверждения или спора

---

**Версия**: 1.0.0  
**Дата**: 2026-09-22  
**Статус**: MVP Ready
