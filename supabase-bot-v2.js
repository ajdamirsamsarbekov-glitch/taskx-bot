require('dotenv').config();
const { Bot } = require('node-telegram-bot-api');
const { createClient } = require('@supabase/supabase-js');

const BOT_TOKEN = process.env.BOT_TOKEN || '8666914335:AAGnN7l7lUUPeiFnTqHzmq4GCBwqK9zGip8';
const SUPABASE_URL = 'https://hjoosjstmginrpatkvbm.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhqb29zanN0bWdpbnJwYXRrdmJtIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MDA3NTI5MywiZXhwIjoyMTA1NjUxMjkzfQ.wuMdC1ZsckIUB5PKjRdNH1vaJLSaRxjzevBxay2DbBI';

// Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Проверка подключения и создание таблиц
async function initDatabase() {
  console.log('🔄 Инициализация базы данных Supabase...');

  try {
    // Проверяем подключение
    const { data, error } = await supabase.from('users').select('count').limit(1);

    if (error && error.code === '42P01') {
      // Таблицы не существуют, создаём их
      console.log('📝 Создаю таблицы...');

      // Используем Supabase REST API для выполнения SQL
      const { error: createError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            telegram_id TEXT UNIQUE NOT NULL,
            public_username TEXT UNIQUE NOT NULL,
            first_name TEXT,
            balance DECIMAL(10, 2) DEFAULT 1000.00,
            frozen_balance DECIMAL(10, 2) DEFAULT 0.00,
            completed_tasks INTEGER DEFAULT 0,
            rating DECIMAL(3, 2) DEFAULT 5.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );

          CREATE TABLE IF NOT EXISTS tasks (
            id SERIAL PRIMARY KEY,
            public_id TEXT UNIQUE NOT NULL,
            client_id INTEGER NOT NULL,
            executor_id INTEGER,
            title TEXT NOT NULL,
            description TEXT NOT NULL,
            price DECIMAL(10, 2) NOT NULL,
            executor_payout DECIMAL(10, 2) NOT NULL,
            platform_fee DECIMAL(10, 2) NOT NULL,
            status TEXT DEFAULT 'DRAFT',
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (client_id) REFERENCES users(id),
            FOREIGN KEY (executor_id) REFERENCES users(id)
          );

          CREATE TABLE IF NOT EXISTS transactions (
            id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL,
            amount DECIMAL(10, 2) NOT NULL,
            task_id INTEGER,
            description TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (task_id) REFERENCES tasks(id)
          );
        `
      });

      if (createError) {
        console.log('⚠️  Не удалось создать таблицы через RPC, продолжаем...');
      }
    }

    console.log('✅ База данных Supabase готова!');
  } catch (err) {
    console.log('⚠️  Предупреждение при инициализации:', err.message);
    console.log('📝 Создайте таблицы вручную в Supabase SQL Editor используя файл supabase-migration.sql');
  }
}

// Функции для работы с БД
async function getOrCreateUser(telegramId, firstName) {
  // Проверяем существующего пользователя
  const { data: existingUser, error: fetchError } = await supabase
    .from('users')
    .select('*')
    .eq('telegram_id', telegramId)
    .single();

  if (existingUser) {
    return existingUser;
  }

  // Создаём нового пользователя
  const username = `User_${Math.random().toString(36).substr(2, 6)}`;
  const { data: newUser, error: insertError } = await supabase
    .from('users')
    .insert({
      telegram_id: telegramId,
      public_username: username,
      first_name: firstName
    })
    .select()
    .single();

  if (insertError) {
    throw insertError;
  }

  console.log(`✅ Новый пользователь: ${newUser.public_username}`);
  return newUser;
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

  try {
    const user = await getOrCreateUser(telegramId, firstName);

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
  } catch (error) {
    console.error('Error in /start:', error);
    await ctx.reply('❌ Ошибка при регистрации. Попробуйте позже.');
  }
});

// Команда /menu
bot.command('menu', async (ctx) => {
  const telegramId = ctx.from.id.toString();

  try {
    const user = await getOrCreateUser(telegramId, ctx.from?.first_name);

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
  } catch (error) {
    console.error('Error in /menu:', error);
    await ctx.reply('❌ Ошибка при загрузке меню.');
  }
});

// Обработка callback кнопок
bot.on('callback_query', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const data = ctx.callbackQuery.data;

  try {
    const user = await getOrCreateUser(telegramId, ctx.from?.first_name);
    let message = '';

    switch (data) {
      case 'tasks':
        const { data: availableTasks } = await supabase
          .from('tasks')
          .select('*')
          .eq('status', 'PUBLISHED')
          .neq('client_id', user.id)
          .order('created_at', { ascending: false })
          .limit(10);

        if (!availableTasks || availableTasks.length === 0) {
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
          message += `<i>Комиссия платформы: 30%</i>`;
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
        const { data: myTasks } = await supabase
          .from('tasks')
          .select('*')
          .or(`client_id.eq.${user.id},executor_id.eq.${user.id}`)
          .order('created_at', { ascending: false })
          .limit(10);

        message = `📝 <b>Мои задания</b>\n\n` +
                 `Выполнено: ${user.completed_tasks}\n\n`;

        if (!myTasks || myTasks.length === 0) {
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
        const { data: transactions } = await supabase
          .from('transactions')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false })
          .limit(5);

        message =
          `💰 <b>Кошелёк</b>\n\n` +
          `💵 Доступно: ${user.balance} сом\n` +
          `🔒 Заморожено: ${user.frozen_balance} сом\n\n` +
          `<b>История транзакций:</b>\n`;

        if (!transactions || transactions.length === 0) {
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
  } catch (error) {
    console.error('Error in callback_query:', error);
    await ctx.answerCallbackQuery('❌ Ошибка');
  }
});

// Обработка текстовых сообщений для создания задания
bot.on('message', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const text = ctx.message?.text;

  if (!text || text.startsWith('/')) return;

  const taskState = creatingTasks.get(telegramId);
  if (!taskState) return;

  try {
    const user = await getOrCreateUser(telegramId, ctx.from?.first_name);

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

      if (parseFloat(user.balance) < price) {
        creatingTasks.delete(telegramId);
        return ctx.reply(`❌ Недостаточно средств. Баланс: ${user.balance} сом, требуется: ${price} сом`);
      }

      const fees = calculateFees(price);
      const publicId = `TASK-${Date.now().toString(36).toUpperCase()}`;

      // Создаём задание
      const { data: newTask, error: taskError } = await supabase
        .from('tasks')
        .insert({
          public_id: publicId,
          client_id: user.id,
          title: taskState.title,
          description: taskState.description,
          price: fees.price,
          executor_payout: fees.executorPayout,
          platform_fee: fees.platformFee,
          status: 'PUBLISHED'
        })
        .select()
        .single();

      if (taskError) throw taskError;

      // Обновляем баланс пользователя
      const { error: balanceError } = await supabase
        .from('users')
        .update({
          balance: parseFloat(user.balance) - price,
          frozen_balance: parseFloat(user.frozen_balance) + price
        })
        .eq('id', user.id);

      if (balanceError) throw balanceError;

      // Создаём транзакцию
      await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'ESCROW_LOCK',
          amount: -price,
          task_id: newTask.id,
          description: `Резервирование для задания ${publicId}`
        });

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
    }
  } catch (error) {
    console.error('Error creating task:', error);
    creatingTasks.delete(telegramId);
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
    `/help - Помощь\n\n` +
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
    `✅ База данных Supabase`,
    { parse_mode: 'HTML' }
  );
});

// Запуск
(async () => {
  await initDatabase();

  console.log('🤖 TaskX Bot (Supabase) запущен!');
  console.log('💾 База данных: Supabase');
  console.log('🔗 Project: hjoosjstmginrpatkvbm');
  console.log('📱 Откройте Telegram и найдите своего бота');
  console.log('💬 Отправьте /start\n');

  bot.startPolling();
})();
