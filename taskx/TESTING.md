# TaskX Test Suite

## Запуск тестов

```bash
# Все тесты
npm test

# С coverage
npm run test:cov

# Watch mode
npm run test:watch

# Конкретный файл
npm test wallet.service.spec.ts
```

## Покрытие тестами

### ✅ Wallet Service
- `getWalletByUserId` - получение/создание кошелька
- `deposit` - пополнение баланса
- `lockEscrow` - резервирование средств
- `releaseEscrow` - выплата исполнителю
- `refund` - возврат средств
- `withdraw` - вывод средств
- `platformFee` - списание комиссии
- `getTransactionHistory` - история транзакций

**Критические сценарии:**
- ✅ Недостаточно средств для escrow
- ✅ Недостаточно средств для withdraw
- ✅ Атомарность транзакций
- ✅ Корректность расчётов Decimal.js
- ✅ Pessimistic locking

### ✅ Task Service
- `calculateFees` - расчёт комиссии 30%
- `createTask` - создание задания
- `publishTask` - публикация с escrow lock
- `assignTask` - принятие задания
- `completeTask` - завершение с распределением средств
- `cancelTask` - отмена с возвратом
- `getAvailableTasks` - фильтрация заданий

**Критические сценарии:**
- ✅ Расчёт 30% комиссии (100→70+30, 1000→700+300)
- ✅ State machine transitions
- ✅ Escrow lock при публикации
- ✅ Правильное распределение 70/30
- ✅ Запрет самоназначения
- ✅ Возврат при отмене

### ✅ Auth Service
- `validateTelegramWebAppData` - валидация initData
- `authenticateFromTelegram` - регистрация/вход
- `validateToken` - проверка JWT

**Критические сценарии:**
- ✅ HMAC validation
- ✅ Invalid hash rejection
- ✅ JWT generation
- ✅ Token validation

## Test Coverage Goals

```
Statements   : 80%
Branches     : 75%
Functions    : 80%
Lines        : 80%
```

## Тестируемые edge cases

### Wallet
- [x] Negative balance prevention
- [x] Double spending prevention
- [x] Transaction atomicity
- [x] Decimal precision
- [x] Concurrent operations (pessimistic lock)

### Task
- [x] Invalid state transitions
- [x] Self-assignment prevention
- [x] Commission calculation accuracy
- [x] Escrow lock/release sync
- [x] Refund correctness

### Security
- [x] Telegram initData forgery
- [x] JWT expiration
- [x] Invalid tokens

## Мокированные зависимости

- TypeORM Repository
- DataSource (QueryRunner)
- WalletService (в task тестах)
- UserService (в auth тестах)
- JwtService

## Важные замечания

1. **Decimal.js** - все денежные расчёты используют Decimal
2. **Atomicity** - финансовые операции атомарны через QueryRunner
3. **Pessimistic locking** - предотвращение race conditions
4. **State machine** - строгие переходы между статусами
5. **30% commission** - жёстко протестирована на разных суммах

## Что НЕ покрыто тестами

- Integration tests с реальной БД
- E2E tests через API
- Performance tests
- Load tests
- Notification service
- Dispute service (частично)
- Background jobs (processors)

## Добавление новых тестов

```typescript
describe('YourService', () => {
  let service: YourService;
  
  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        YourService,
        // mock dependencies
      ],
    }).compile();
    
    service = module.get<YourService>(YourService);
  });
  
  it('should do something', async () => {
    // arrange
    // act
    // assert
  });
});
```

## CI/CD Integration

```yaml
# .github/workflows/test.yml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: npm install
      - run: npm test
      - run: npm run test:cov
```

---

**Last Updated:** 2026-09-22  
**Test Framework:** Jest + @nestjs/testing  
**Coverage Target:** 80%
