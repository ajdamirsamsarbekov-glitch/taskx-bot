require('dotenv').config();
const { Bot } = require('node-telegram-bot-api');
const Database = require('better-sqlite3');
const db = new Database('taskx.db');

const BOT_TOKEN = '8666914335:AAGnN7l7lUUPeiFnTqHzmq4GCBwqK9zGip8';

// Создание таблиц
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    telegram_id TEXT UNIQUE NOT NULL,
    public_username TEXT UNIQUE NOT NULL,
    first_name TEXT,
    balance REAL DEFAULT 1000,
    frozen_balance REAL DEFAULT 0,
    completed_tasks INTEGER DEFAULT 0,
    rating REAL DEFAULT 5.0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    public_id TEXT UNIQUE NOT NULL,
    client_id INTEGER NOT NULL,
    executor_id INTEGER,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    price REAL NOT NULL,
    executor_payout REAL NOT NULL,
    platform_fee REAL NOT NULL,
    status TEXT DEFAULT 'DRAFT',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES users(id),
    FOREIGN KEY (executor_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    type TEXT NOT NULL,
    amount REAL NOT NULL,
    task_id INTEGER,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id)
  );
`);

// Функции для работы с БД
function getOrCreateUser(telegramId, firstName) {
  let user = db.prepare('SELECT * FROM users WHERE telegram_id = ?').get(telegramId);

  if (!user) {
    const username = `User_${Math.random().toString(36).substr(2, 6)}`;
    const result = db.prepare(`
      INSERT INTO users (telegram_id, public_username, first_name)
      VALUES (?, ?, ?)
    `).run(telegramId, username, firstName);

    user = db.prepare('SELECT * FROM users WHERE id = ?').get(result.lastInsertRowid);
    console.log(`✅ Новый пользователь: ${user.public_username}`);
  }

  return user;
}

function calculateFees(price) {
  const platformFee = price * 0.30;
  const executorPayout = price - platformFee;
  return { price, platformFee, executorPayout };
}

const bot = new Bot(BOT_TOKEN);

// Хранилище для состояний создания задания
const creatingTasks = new Map();

// Команда /start
bot.command('start', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const firstName = ctx.from?.first_name || 'User';
  const user = getOrCreateUser(telegramId, firstName);

  await ctx.reply(
    `👋 Добро пожаловать в TaskX, ${firstName}!\n\n` +
    `🎯 <b>TaskX</b> — платформа микрозаданий с безопасными платежами\n\n` +
    `💼 Создавайте задания и получайте помощь\n` +
    `💰 Выполняйте задания и зарабатывайте\n` +
    `🔒 Escrow защита (30% комиссия платформы)\n\n` +
    `<b>Ваш профиль:</b>\n` +
    `🆔 ${user.public_username}\n` +
    `💵 Баланс: ${user.balance} сом\n` +
    `⭐ Рейтинг: ${user.rating}\n\n` +
    `Используйте /menu для навигации`,
    { parse_mode: 'HTML' }
  );
});

// Команда /menu
bot.command('menu', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const user = getOrCreateUser(telegramId, ctx.from?.first_name);

  await ctx.reply(
    `📋 <b>Главное меню TaskX</b>\n\n` +
    `💵 Баланс: ${user.balance} сом\n` +
    `🔒 Заморожено: ${user.frozen_balance} сом\n\n` +
    `Выберите действие:`,
    {
      parse_mode: 'HTML',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔍 Найти задания', callback_data: 'tasks' }],
          [{ text: '➕ Создать задание', callback_data: 'create' }],
          [{ text: '📝 Мои задания', callback_data: 'my_tasks' }],
          [{ text: '💰 Кошелёк', callback_data: 'wallet' }],
          [{ text: '👤 Профиль', callback_data: 'profile' }],
        ],
      },
    }
  );
});

// Обработка callback кнопок
bot.on('callback_query', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const user = getOrCreateUser(telegramId, ctx.from?.first_name);
  const data = ctx.callbackQuery.data;

  let message = '';

  switch (data) {
    case 'tasks':
      const availableTasks = db.prepare(`
        SELECT * FROM tasks
        WHERE status = 'PUBLISHED' AND client_id != ?
        ORDER BY created_at DESC LIMIT 10
      `).all(user.id);

      if (availableTasks.length === 0) {
        message = `🔍 <b>Доступные задания</b>\n\n` +
                 `Пока нет доступных заданий.\n` +
                 `Создайте первое задание через /menu → Создать задание`;
      } else {
        message = `🔍 <b>Доступные задания</b>\n\n`;
        availableTasks.forEach((task, i) => {
          message += `${i + 1}️⃣ ${task.title}\n` +
                    `💰 ${task.price} сом (вы получите ${task.executor_payout} сом)\n` +
                    `📋 ${task.description}\n` +
                    `ID: ${task.public_id}\n\n`;
        });
        message += `<i>Комиссия платформы: 30%</i>\n\n` +
                  `Чтобы принять задание: /take TASK_ID`;
      }
      break;

    case 'create':
      creatingTasks.set(telegramId, { step: 'title' });
      message =
        `➕ <b>Создать задание - Шаг 1/3</b>\n\n` +
        `📝 Напишите название задания:\n\n` +
        `Пример: "Купить сендвич" или "Доставить документы"`;
      break;

    case 'my_tasks':
      const myTasks = db.prepare(`
        SELECT * FROM tasks
        WHERE client_id = ? OR executor_id = ?
        ORDER BY created_at DESC LIMIT 10
      `).all(user.id, user.id);

      message = `📝 <b>Мои задания</b>\n\n` +
               `Выполнено: ${user.completed_tasks}\n\n`;

      if (myTasks.length === 0) {
        message += `У вас пока нет заданий`;
      } else {
        myTasks.forEach(task => {
          const role = task.client_id === user.id ? '📤 Заказчик' : '📥 Исполнитель';
          message += `${role}: ${task.title}\n` +
                    `💰 ${task.price} сом | ${task.status}\n` +
                    `ID: ${task.public_id}\n\n`;
        });
      }
      break;

    case 'wallet':
      const transactions = db.prepare(`
        SELECT * FROM transactions
        WHERE user_id = ?
        ORDER BY created_at DESC LIMIT 5
      `).all(user.id);

      message =
        `💰 <b>Кошелёк</b>\n\n` +
        `💵 Доступно: ${user.balance} сом\n` +
        `🔒 Заморожено: ${user.frozen_balance} сом\n\n` +
        `<b>История транзакций:</b>\n`;

      if (transactions.length === 0) {
        message += `Пока пусто`;
      } else {
        transactions.forEach(tx => {
          const sign = tx.amount > 0 ? '+' : '';
          message += `${sign}${tx.amount} сом - ${tx.type}\n`;
        });
      }
      break;

    case 'profile':
      message =
        `👤 <b>Профиль</b>\n\n` +
        `🆔 ${user.public_username}\n` +
        `⭐ Рейтинг: ${user.rating}\n` +
        `✅ Выполнено: ${user.completed_tasks} заданий\n` +
        `💵 Баланс: ${user.balance} сом\n` +
        `🔒 Заморожено: ${user.frozen_balance} сом\n\n` +
        `<i>Ваш Telegram ID скрыт для анонимности</i>`;
      break;
  }

  if (message) {
    await ctx.reply(message, { parse_mode: 'HTML' });
  }

  await ctx.answerCallbackQuery();
});

// Обработка текстовых сообщений для создания задания
bot.on('message', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const user = getOrCreateUser(telegramId, ctx.from?.first_name);
  const text = ctx.message?.text;

  if (!text || text.startsWith('/')) return;

  const taskState = creatingTasks.get(telegramId);
  if (!taskState) return;

  if (taskState.step === 'title') {
    taskState.title = text;
    taskState.step = 'description';
    creatingTasks.set(telegramId, taskState);

    await ctx.reply(
      `➕ <b>Создать задание - Шаг 2/3</b>\n\n` +
      `📋 Напишите описание задания:\n\n` +
      `Пример: "Купить сендвич в магазине X на улице Y и доставить по адресу Z"`,
      { parse_mode: 'HTML' }
    );
  } else if (taskState.step === 'description') {
    taskState.description = text;
    taskState.step = 'price';
    creatingTasks.set(telegramId, taskState);

    await ctx.reply(
      `➕ <b>Создать задание - Шаг 3/3</b>\n\n` +
      `💰 Напишите цену задания (в сомах):\n\n` +
      `Минимум: 50 сом\n` +
      `Пример: 100`,
      { parse_mode: 'HTML' }
    );
  } else if (taskState.step === 'price') {
    const price = parseFloat(text);

    if (isNaN(price) || price < 50) {
      return ctx.reply('❌ Цена должна быть числом и не менее 50 сом. Попробуйте ещё раз:');
    }

    if (user.balance < price) {
      creatingTasks.delete(telegramId);
      return ctx.reply(`❌ Недостаточно средств. Баланс: ${user.balance} сом, требуется: ${price} сом`);
    }

    const fees = calculateFees(price);
    const publicId = `TASK-${Date.now().toString(36).toUpperCase()}`;

    try {
      // Создаём задание
      const result = db.prepare(`
        INSERT INTO tasks (public_id, client_id, title, description, price, executor_payout, platform_fee, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'PUBLISHED')
      `).run(publicId, user.id, taskState.title, taskState.description, fees.price, fees.executorPayout, fees.platformFee);

      // Резервируем деньги (escrow)
      db.prepare(`
        UPDATE users
        SET balance = balance - ?, frozen_balance = frozen_balance + ?
        WHERE id = ?
      `).run(price, price, user.id);

      // Записываем транзакцию
      db.prepare(`
        INSERT INTO transactions (user_id, type, amount, task_id, description)
        VALUES (?, 'ESCROW_LOCK', ?, ?, ?)
      `).run(user.id, -price, result.lastInsertRowid, `Резервирование для задания ${publicId}`);

      creatingTasks.delete(telegramId);

      await ctx.reply(
        `✅ <b>Задание создано!</b>\n\n` +
        `📋 ${taskState.title}\n` +
        `💰 Цена: ${price} сом\n` +
        `💵 Исполнитель получит: ${fees.executorPayout.toFixed(2)} сом\n` +
        `🏦 Комиссия платформы: ${fees.platformFee.toFixed(2)} сом (30%)\n` +
        `🔒 Средства зарезервированы\n\n` +
        `ID: ${publicId}\n\n` +
        `Задание опубликовано и доступно для исполнителей!`,
        { parse_mode: 'HTML' }
      );

      console.log(`📋 Создано задание: ${publicId} от ${user.public_username}`);
    } catch (error) {
      console.error(error);
      creatingTasks.delete(telegramId);
      await ctx.reply('❌ Ошибка при создании задания');
    }
  }
});

// Команда создания задания
bot.command('create', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const user = getOrCreateUser(telegramId, ctx.from?.first_name);

  const text = ctx.match;
  if (!text) {
    return ctx.reply('Формат: /create Название | Описание | Цена\nПример: /create Купить сендвич | Доставить по адресу X | 100');
  }

  const parts = text.split('|').map(p => p.trim());
  if (parts.length !== 3) {
    return ctx.reply('❌ Неверный формат. Используйте: /create Название | Описание | Цена');
  }

  const [title, description, priceStr] = parts;
  const price = parseFloat(priceStr);

  if (isNaN(price) || price < 50) {
    return ctx.reply('❌ Цена должна быть числом и не менее 50 сом');
  }

  if (user.balance < price) {
    return ctx.reply(`❌ Недостаточно средств. Баланс: ${user.balance} сом, требуется: ${price} сом`);
  }

  const fees = calculateFees(price);
  const publicId = `TASK-${Date.now().toString(36).toUpperCase()}`;

  try {
    // Создаём задание
    const result = db.prepare(`
      INSERT INTO tasks (public_id, client_id, title, description, price, executor_payout, platform_fee, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'PUBLISHED')
    `).run(publicId, user.id, title, description, fees.price, fees.executorPayout, fees.platformFee);

    // Резервируем деньги (escrow)
    db.prepare(`
      UPDATE users
      SET balance = balance - ?, frozen_balance = frozen_balance + ?
      WHERE id = ?
    `).run(price, price, user.id);

    // Записываем транзакцию
    db.prepare(`
      INSERT INTO transactions (user_id, type, amount, task_id, description)
      VALUES (?, 'ESCROW_LOCK', ?, ?, ?)
    `).run(user.id, -price, result.lastInsertRowid, `Резервирование для задания ${publicId}`);

    await ctx.reply(
      `✅ <b>Задание создано!</b>\n\n` +
      `📋 ${title}\n` +
      `💰 Цена: ${price} сом\n` +
      `💵 Исполнитель получит: ${fees.executorPayout.toFixed(2)} сом\n` +
      `🏦 Комиссия платформы: ${fees.platformFee.toFixed(2)} сом (30%)\n` +
      `🔒 Средства зарезервированы\n\n` +
      `ID: ${publicId}\n\n` +
      `Задание опубликовано и доступно для исполнителей!`,
      { parse_mode: 'HTML' }
    );

    console.log(`📋 Создано задание: ${publicId} от ${user.public_username}`);
  } catch (error) {
    console.error(error);
    await ctx.reply('❌ Ошибка при создании задания');
  }
});

// Команда /help
bot.command('help', async (ctx) => {
  await ctx.reply(
    `📖 <b>Помощь TaskX</b>\n\n` +
    `<b>Команды:</b>\n` +
    `/start - Начать работу\n` +
    `/menu - Главное меню\n` +
    `/create - Создать задание\n` +
    `/help - Помощь\n\n` +
    `<b>Пример создания:</b>\n` +
    `/create Купить сендвич | Доставить по адресу | 100\n\n` +
    `<b>Как работает escrow:</b>\n` +
    `1️⃣ Заказчик создаёт задание (100 сом)\n` +
    `2️⃣ Деньги резервируются (escrow)\n` +
    `3️⃣ Исполнитель принимает задание\n` +
    `4️⃣ После выполнения отправляет результат\n` +
    `5️⃣ Заказчик подтверждает\n` +
    `6️⃣ Распределение:\n` +
    `   • 70 сом → исполнитель\n` +
    `   • 30 сом → платформа\n\n` +
    `<b>Безопасность:</b>\n` +
    `✅ Escrow защита\n` +
    `✅ Анонимность пользователей\n` +
    `✅ База данных SQLite`,
    { parse_mode: 'HTML' }
  );
});

console.log('🤖 TaskX Bot с базой данных запущен!');
console.log('💾 База данных: SQLite (taskx.db)');
console.log('📱 Откройте Telegram и найдите своего бота');
console.log('💬 Отправьте /start\n');

bot.startPolling();
