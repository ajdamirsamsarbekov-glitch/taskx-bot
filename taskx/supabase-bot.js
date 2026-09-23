require('dotenv').config();
const { Bot } = require('node-telegram-bot-api');
const { Pool } = require('pg');

const BOT_TOKEN = process.env.BOT_TOKEN || '8666914335:AAGnN7l7lUUPeiFnTqHzmq4GCBwqK9zGip8';

// PostgreSQL connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Test connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('❌ Ошибка подключения к базе данных:', err.message);
    process.exit(1);
  }
  console.log('✅ Подключено к PostgreSQL (Supabase)');
});

// Функции для работы с БД
async function getOrCreateUser(telegramId, firstName) {
  const client = await pool.connect();
  try {
    // Проверяем существующего пользователя
    let result = await client.query(
      'SELECT * FROM users WHERE telegram_id = $1',
      [telegramId]
    );

    if (result.rows.length > 0) {
      return result.rows[0];
    }

    // Создаём нового пользователя
    const username = `User_${Math.random().toString(36).substr(2, 6)}`;
    result = await client.query(
      'INSERT INTO users (telegram_id, public_username, first_name) VALUES ($1, $2, $3) RETURNING *',
      [telegramId, username, firstName]
    );

    console.log(`✅ Новый пользователь: ${result.rows[0].public_username}`);
    return result.rows[0];
  } finally {
    client.release();
  }
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
});

// Команда /menu
bot.command('menu', async (ctx) => {
  const telegramId = ctx.from.id.toString();
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
});

// Обработка callback кнопок
bot.on('callback_query', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const user = await getOrCreateUser(telegramId, ctx.from?.first_name);
  const data = ctx.callbackQuery.data;

  let message = '';

  switch (data) {
    case 'tasks':
      const availableTasks = await pool.query(
        `SELECT * FROM tasks
         WHERE status = 'PUBLISHED' AND client_id != $1
         ORDER BY created_at DESC LIMIT 10`,
        [user.id]
      );

      if (availableTasks.rows.length === 0) {
        message = `🔍 <b>Доступные задания</b>\n\n` +
                 `Пока нет доступных заданий.\n` +
                 `Создайте первое задание через /menu → Создать задание`;
      } else {
        message = `🔍 <b>Доступные задания</b>\n\n`;
        availableTasks.rows.forEach((task, i) => {
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
      const myTasks = await pool.query(
        `SELECT * FROM tasks
         WHERE client_id = $1 OR executor_id = $1
         ORDER BY created_at DESC LIMIT 10`,
        [user.id]
      );

      message = `📝 <b>Мои задания</b>\n\n` +
               `Выполнено: ${user.completed_tasks}\n\n`;

      if (myTasks.rows.length === 0) {
        message += `У вас пока нет заданий`;
      } else {
        myTasks.rows.forEach(task => {
          const role = task.client_id === user.id ? '📤 Заказчик' : '📥 Исполнитель';
          message += `${role}: ${task.title}\n` +
                    `💰 ${task.price} сом | ${task.status}\n` +
                    `ID: ${task.public_id}\n\n`;
        });
      }
      break;

    case 'wallet':
      const transactions = await pool.query(
        `SELECT * FROM transactions
         WHERE user_id = $1
         ORDER BY created_at DESC LIMIT 5`,
        [user.id]
      );

      message =
        `💰 <b>Кошелёк</b>\n\n` +
        `💵 Доступно: ${user.balance} сом\n` +
        `🔒 Заморожено: ${user.frozen_balance} сом\n\n` +
        `<b>История транзакций:</b>\n`;

      if (transactions.rows.length === 0) {
        message += `Пока пусто`;
      } else {
        transactions.rows.forEach(tx => {
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
  const user = await getOrCreateUser(telegramId, ctx.from?.first_name);
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

    if (parseFloat(user.balance) < price) {
      creatingTasks.delete(telegramId);
      return ctx.reply(`❌ Недостаточно средств. Баланс: ${user.balance} сом, требуется: ${price} сом`);
    }

    const fees = calculateFees(price);
    const publicId = `TASK-${Date.now().toString(36).toUpperCase()}`;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Создаём задание
      const taskResult = await client.query(
        `INSERT INTO tasks (public_id, client_id, title, description, price, executor_payout, platform_fee, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, 'PUBLISHED') RETURNING id`,
        [publicId, user.id, taskState.title, taskState.description, fees.price, fees.executorPayout, fees.platformFee]
      );

      // Резервируем деньги (escrow)
      await client.query(
        `UPDATE users
         SET balance = balance - $1, frozen_balance = frozen_balance + $1
         WHERE id = $2`,
        [price, user.id]
      );

      // Записываем транзакцию
      await client.query(
        `INSERT INTO transactions (user_id, type, amount, task_id, description)
         VALUES ($1, 'ESCROW_LOCK', $2, $3, $4)`,
        [user.id, -price, taskResult.rows[0].id, `Резервирование для задания ${publicId}`]
      );

      await client.query('COMMIT');
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
      await client.query('ROLLBACK');
      console.error(error);
      creatingTasks.delete(telegramId);
      await ctx.reply('❌ Ошибка при создании задания');
    } finally {
      client.release();
    }
  }
});

// Команда /deposit (пополнение)
bot.command('deposit', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const user = await getOrCreateUser(telegramId, ctx.from?.first_name);

  await ctx.replyWithPhoto(
    { source: './qr-payment.jpg' },
    {
      caption:
        `💳 <b>Пополнение баланса</b>\n\n` +
        `Отсканируйте QR-код для оплаты\n\n` +
        `После оплаты отправьте скриншот чека боту\n` +
        `Администратор проверит и зачислит средства\n\n` +
        `<b>Ваш текущий баланс:</b> ${user.balance} сом`,
      parse_mode: 'HTML',
    }
  );
});

// Обработка фото (скриншоты чеков)
bot.on('photo', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const user = await getOrCreateUser(telegramId, ctx.from?.first_name);
  const photoId = ctx.message.photo[ctx.message.photo.length - 1].file_id;

  await ctx.reply(
    `✅ <b>Скриншот получен!</b>\n\n` +
    `Ваша заявка на пополнение отправлена администратору\n` +
    `Ожидайте подтверждения (обычно 5-15 минут)\n\n` +
    `📲 Мы уведомим вас, когда средства поступят на баланс`,
    { parse_mode: 'HTML' }
  );

  // Уведомление админу (замените на ваш Telegram ID)
  const ADMIN_ID = '123456789'; // Замените на реальный ID админа
  await ctx.telegram.sendPhoto(ADMIN_ID, photoId, {
    caption:
      `💰 <b>Новая заявка на пополнение</b>\n\n` +
      `👤 Пользователь: ${user.public_username}\n` +
      `🆔 ID: ${user.id}\n` +
      `📱 Telegram ID: ${telegramId}\n\n` +
      `Для зачисления используйте:\n` +
      `/approve ${user.id} СУММА`,
    parse_mode: 'HTML',
  });
});

// Команда /approve для админа
bot.command('approve', async (ctx) => {
  const args = ctx.message.text.split(' ');
  if (args.length < 3) {
    return ctx.reply('Использование: /approve USER_ID СУММА');
  }

  const userId = parseInt(args[1]);
  const amount = parseFloat(args[2]);

  if (isNaN(userId) || isNaN(amount) || amount <= 0) {
    return ctx.reply('❌ Неверный формат. Используйте: /approve USER_ID СУММА');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Пополняем баланс
    const result = await client.query(
      'UPDATE users SET balance = balance + $1 WHERE id = $2 RETURNING telegram_id, balance',
      [amount, userId]
    );

    if (result.rows.length === 0) {
      await client.query('ROLLBACK');
      return ctx.reply('❌ Пользователь не найден');
    }

    // Записываем транзакцию
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, description) VALUES ($1, 'DEPOSIT', $2, $3)`,
      [userId, amount, `Пополнение баланса администратором`]
    );

    await client.query('COMMIT');

    const userTelegramId = result.rows[0].telegram_id;
    const newBalance = result.rows[0].balance;

    // Уведомляем пользователя
    await ctx.telegram.sendMessage(
      userTelegramId,
      `✅ <b>Баланс пополнен!</b>\n\n` +
        `💰 Зачислено: ${amount} сом\n` +
        `💵 Новый баланс: ${newBalance} сом\n\n` +
        `Теперь вы можете создавать задания!`,
      { parse_mode: 'HTML' }
    );

    await ctx.reply(`✅ Баланс пользователя ${userId} пополнен на ${amount} сом`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    await ctx.reply('❌ Ошибка при пополнении баланса');
  } finally {
    client.release();
  }
});

// Команда /take (принять задание)
bot.command('take', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const user = await getOrCreateUser(telegramId, ctx.from?.first_name);
  const args = ctx.message.text.split(' ');

  if (args.length < 2) {
    return ctx.reply('Использование: /take TASK_ID\nПример: /take TASK-ABC123');
  }

  const taskId = args[1];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Получаем задание
    const taskResult = await client.query(
      `SELECT * FROM tasks WHERE public_id = $1 AND status = 'PUBLISHED'`,
      [taskId]
    );

    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return ctx.reply('❌ Задание не найдено или уже выполняется');
    }

    const task = taskResult.rows[0];

    // Проверяем, что это не свое задание
    if (task.client_id === user.id) {
      await client.query('ROLLBACK');
      return ctx.reply('❌ Вы не можете принять своё задание');
    }

    // Обновляем задание
    await client.query(
      `UPDATE tasks SET executor_id = $1, status = 'IN_PROGRESS' WHERE id = $2`,
      [user.id, task.id]
    );

    await client.query('COMMIT');

    await ctx.reply(
      `✅ <b>Задание принято!</b>\n\n` +
        `📋 ${task.title}\n` +
        `📝 ${task.description}\n` +
        `💰 Вы получите: ${task.executor_payout} сом\n\n` +
        `После выполнения используйте:\n` +
        `/complete ${taskId}`,
      { parse_mode: 'HTML' }
    );

    // Уведомляем заказчика
    const clientResult = await pool.query('SELECT telegram_id FROM users WHERE id = $1', [
      task.client_id,
    ]);
    if (clientResult.rows.length > 0) {
      await ctx.telegram.sendMessage(
        clientResult.rows[0].telegram_id,
        `👷 <b>Задание взято в работу!</b>\n\n` +
          `📋 ${task.title}\n` +
          `Исполнитель: ${user.public_username}`,
        { parse_mode: 'HTML' }
      );
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    await ctx.reply('❌ Ошибка при принятии задания');
  } finally {
    client.release();
  }
});

// Команда /complete (завершить задание)
bot.command('complete', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const user = await getOrCreateUser(telegramId, ctx.from?.first_name);
  const args = ctx.message.text.split(' ');

  if (args.length < 2) {
    return ctx.reply('Использование: /complete TASK_ID\nПример: /complete TASK-ABC123');
  }

  const taskId = args[1];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const taskResult = await client.query(
      `SELECT * FROM tasks WHERE public_id = $1 AND executor_id = $2 AND status = 'IN_PROGRESS'`,
      [taskId, user.id]
    );

    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return ctx.reply('❌ Задание не найдено или вы не исполнитель');
    }

    const task = taskResult.rows[0];

    // Обновляем статус
    await client.query(`UPDATE tasks SET status = 'PENDING_CONFIRMATION' WHERE id = $1`, [task.id]);

    await client.query('COMMIT');

    await ctx.reply(
      `✅ <b>Задание отправлено на проверку!</b>\n\n` +
        `Ожидайте подтверждения от заказчика\n` +
        `После подтверждения средства поступят на баланс`,
      { parse_mode: 'HTML' }
    );

    // Уведомляем заказчика
    const clientResult = await pool.query('SELECT telegram_id FROM users WHERE id = $1', [
      task.client_id,
    ]);
    if (clientResult.rows.length > 0) {
      await ctx.telegram.sendMessage(
        clientResult.rows[0].telegram_id,
        `✅ <b>Задание выполнено!</b>\n\n` +
          `📋 ${task.title}\n` +
          `Исполнитель: ${user.public_username}\n\n` +
          `Для подтверждения используйте:\n` +
          `/confirm ${taskId}`,
        { parse_mode: 'HTML' }
      );
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    await ctx.reply('❌ Ошибка при завершении задания');
  } finally {
    client.release();
  }
});

// Команда /confirm (подтвердить выполнение)
bot.command('confirm', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const user = await getOrCreateUser(telegramId, ctx.from?.first_name);
  const args = ctx.message.text.split(' ');

  if (args.length < 2) {
    return ctx.reply('Использование: /confirm TASK_ID\nПример: /confirm TASK-ABC123');
  }

  const taskId = args[1];

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const taskResult = await client.query(
      `SELECT * FROM tasks WHERE public_id = $1 AND client_id = $2 AND status = 'PENDING_CONFIRMATION'`,
      [taskId, user.id]
    );

    if (taskResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return ctx.reply('❌ Задание не найдено или вы не заказчик');
    }

    const task = taskResult.rows[0];

    // Размораживаем деньги заказчика
    await client.query(
      `UPDATE users SET frozen_balance = frozen_balance - $1 WHERE id = $2`,
      [task.price, task.client_id]
    );

    // Выплачиваем исполнителю
    await client.query(`UPDATE users SET balance = balance + $1 WHERE id = $2`, [
      task.executor_payout,
      task.executor_id,
    ]);

    // Обновляем задание
    await client.query(`UPDATE tasks SET status = 'COMPLETED' WHERE id = $1`, [task.id]);

    // Обновляем счетчик выполненных заданий
    await client.query(`UPDATE users SET completed_tasks = completed_tasks + 1 WHERE id = $1`, [
      task.executor_id,
    ]);

    // Транзакция выплаты исполнителю
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, task_id, description) VALUES ($1, 'PAYOUT', $2, $3, $4)`,
      [task.executor_id, task.executor_payout, task.id, `Выплата за задание ${taskId}`]
    );

    // Транзакция комиссии платформы
    await client.query(
      `INSERT INTO transactions (user_id, type, amount, task_id, description) VALUES ($1, 'PLATFORM_FEE', $2, $3, $4)`,
      [task.client_id, -task.platform_fee, task.id, `Комиссия платформы за задание ${taskId}`]
    );

    await client.query('COMMIT');

    await ctx.reply(
      `✅ <b>Задание завершено!</b>\n\n` +
        `💰 Исполнителю выплачено: ${task.executor_payout} сом\n` +
        `🏦 Комиссия платформы: ${task.platform_fee} сом`,
      { parse_mode: 'HTML' }
    );

    // Уведомляем исполнителя
    const executorResult = await pool.query(
      'SELECT telegram_id, balance FROM users WHERE id = $1',
      [task.executor_id]
    );
    if (executorResult.rows.length > 0) {
      await ctx.telegram.sendMessage(
        executorResult.rows[0].telegram_id,
        `💰 <b>Выплата получена!</b>\n\n` +
          `📋 Задание: ${task.title}\n` +
          `💵 Выплата: ${task.executor_payout} сом\n` +
          `💳 Новый баланс: ${executorResult.rows[0].balance} сом`,
        { parse_mode: 'HTML' }
      );
    }
  } catch (error) {
    await client.query('ROLLBACK');
    console.error(error);
    await ctx.reply('❌ Ошибка при подтверждении задания');
  } finally {
    client.release();
  }
});

// Команда /withdraw (вывод средств)
bot.command('withdraw', async (ctx) => {
  const telegramId = ctx.from.id.toString();
  const user = await getOrCreateUser(telegramId, ctx.from?.first_name);

  if (parseFloat(user.balance) < 100) {
    return ctx.reply('❌ Минимальная сумма для вывода: 100 сом');
  }

  await ctx.reply(
    `💳 <b>Вывод средств</b>\n\n` +
      `💵 Доступно: ${user.balance} сом\n\n` +
      `Напишите сумму для вывода и реквизиты:\n` +
      `Пример: "500 +996555123456 MBank"\n\n` +
      `Минимум: 100 сом`,
    { parse_mode: 'HTML' }
  );
});

// Команда /help
bot.command('help', async (ctx) => {
  await ctx.reply(
    `📖 <b>Помощь TaskX</b>\n\n` +
    `<b>Команды:</b>\n` +
    `/start - Начать работу\n` +
    `/menu - Главное меню\n` +
    `/deposit - Пополнить баланс\n` +
    `/withdraw - Вывести средства\n` +
    `/take TASK_ID - Принять задание\n` +
    `/complete TASK_ID - Завершить задание\n` +
    `/confirm TASK_ID - Подтвердить выполнение\n` +
    `/help - Помощь\n\n` +
    `<b>Как работает escrow:</b>\n` +
    `1️⃣ Заказчик создаёт задание (100 сом)\n` +
    `2️⃣ Деньги резервируются (escrow)\n` +
    `3️⃣ Исполнитель принимает задание (/take)\n` +
    `4️⃣ После выполнения отправляет результат (/complete)\n` +
    `5️⃣ Заказчик подтверждает (/confirm)\n` +
    `6️⃣ Распределение:\n` +
    `   • 70 сом → исполнитель\n` +
    `   • 30 сом → платформа\n\n` +
    `<b>Безопасность:</b>\n` +
    `✅ Escrow защита\n` +
    `✅ Анонимность пользователей\n` +
    `✅ База данных PostgreSQL (Supabase)`,
    { parse_mode: 'HTML' }
  );
});

console.log('🤖 TaskX Bot (Supabase) запущен!');
console.log('💾 База данных: PostgreSQL (Supabase)');
console.log('📱 Откройте Telegram и найдите своего бота');
console.log('💬 Отправьте /start\n');

bot.startPolling();
