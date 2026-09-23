require('dotenv').config();
const { Bot } = require('node-telegram-bot-api');

const BOT_TOKEN = '8666914335:AAGnN7l7lUUPeiFnTqHzmq4GCBwqK9zGip8';

// Mock данные для демонстрации
const users = new Map();

function getUser(telegramId) {
  if (!users.has(telegramId)) {
    users.set(telegramId, {
      id: `user_${telegramId}`,
      publicUsername: `User_${Math.random().toString(36).substr(2, 6)}`,
      balance: 1000,
      frozenBalance: 0,
      completedTasks: 0,
      rating: 5.0,
    });
  }
  return users.get(telegramId);
}

const bot = new Bot(BOT_TOKEN);

// Команда /start
bot.command('start', async (ctx) => {
  const firstName = ctx.from?.first_name || 'User';
  const user = getUser(ctx.from.id);

  await ctx.reply(
    `👋 Добро пожаловать в TaskX, ${firstName}!\n\n` +
    `🎯 <b>TaskX</b> — платформа микрозаданий с безопасными платежами\n\n` +
    `💼 Создавайте задания и получайте помощь\n` +
    `💰 Выполняйте задания и зарабатывайте\n` +
    `🔒 Escrow защита (30% комиссия платформы)\n\n` +
    `<b>Ваш профиль:</b>\n` +
    `🆔 ${user.publicUsername}\n` +
    `💵 Баланс: ${user.balance} сом\n` +
    `⭐ Рейтинг: ${user.rating}\n\n` +
    `Используйте /menu для навигации`,
    { parse_mode: 'HTML' }
  );
});

// Команда /menu
bot.command('menu', async (ctx) => {
  const user = getUser(ctx.from.id);

  await ctx.reply(
    `📋 <b>Главное меню TaskX</b>\n\n` +
    `💵 Баланс: ${user.balance} сом\n` +
    `🔒 Заморожено: ${user.frozenBalance} сом\n\n` +
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
  const user = getUser(ctx.from.id);
  const data = ctx.callbackQuery.data;

  let message = '';

  switch (data) {
    case 'tasks':
      message =
        `🔍 <b>Доступные задания</b>\n\n` +
        `1️⃣ Купить сендвич\n` +
        `💰 100 сом (вы получите 70 сом)\n` +
        `📍 Ош, центр\n` +
        `⏱ До 18:00\n\n` +
        `2️⃣ Доставить документы\n` +
        `💰 200 сом (вы получите 140 сом)\n` +
        `📍 Бишкек\n` +
        `⏱ Сегодня\n\n` +
        `<i>Комиссия платформы: 30%</i>`;
      break;

    case 'create':
      message =
        `➕ <b>Создать задание</b>\n\n` +
        `📝 Опишите задание\n` +
        `💰 Укажите цену (мин. 50 сом)\n` +
        `⏱ Установите дедлайн\n` +
        `📍 Укажите место\n\n` +
        `<b>Как это работает:</b>\n` +
        `1. Вы создаёте задание за 100 сом\n` +
        `2. Деньги резервируются (escrow)\n` +
        `3. Исполнитель выполняет задание\n` +
        `4. Вы подтверждаете\n` +
        `5. Исполнитель получает 70 сом\n` +
        `6. Платформа получает 30 сом\n\n` +
        `<i>Функция создания в разработке...</i>`;
      break;

    case 'my_tasks':
      message =
        `📝 <b>Мои задания</b>\n\n` +
        `Выполнено: ${user.completedTasks}\n` +
        `Активных: 0\n\n` +
        `У вас пока нет активных заданий`;
      break;

    case 'wallet':
      message =
        `💰 <b>Кошелёк</b>\n\n` +
        `💵 Доступно: ${user.balance} сом\n` +
        `🔒 Заморожено: ${user.frozenBalance} сом\n` +
        `📈 Всего заработано: 0 сом\n` +
        `📉 Всего потрачено: 0 сом\n\n` +
        `<b>История:</b>\n` +
        `Пока пусто\n\n` +
        `<i>Функции пополнения/вывода в разработке...</i>`;
      break;

    case 'profile':
      message =
        `👤 <b>Профиль</b>\n\n` +
        `🆔 ${user.publicUsername}\n` +
        `⭐ Рейтинг: ${user.rating}\n` +
        `✅ Выполнено: ${user.completedTasks}\n` +
        `📊 Успешность: 100%\n` +
        `🛡 Trust Score: 100\n\n` +
        `<i>Ваш Telegram ID скрыт для анонимности</i>`;
      break;
  }

  if (message) {
    await ctx.api.sendMessage(ctx.chat.id, message, { parse_mode: 'HTML' });
  }

  await ctx.answerCallbackQuery();
});

// Команда /help
bot.command('help', async (ctx) => {
  await ctx.reply(
    `📖 <b>Помощь TaskX</b>\n\n` +
    `<b>Команды:</b>\n` +
    `/start - Начать работу\n` +
    `/menu - Главное меню\n` +
    `/help - Помощь\n\n` +
    `<b>Как это работает:</b>\n\n` +
    `1️⃣ Заказчик создаёт задание (100 сом)\n` +
    `2️⃣ Деньги резервируются (escrow)\n` +
    `3️⃣ Исполнитель принимает задание\n` +
    `4️⃣ После выполнения отправляет результат\n` +
    `5️⃣ Заказчик подтверждает\n` +
    `6️⃣ Распределение:\n` +
    `   • 70 сом → исполнитель\n` +
    `   • 30 сом → платформа\n\n` +
    `⚡️ Автозавершение через 24ч если заказчик не ответит\n\n` +
    `<b>Безопасность:</b>\n` +
    `✅ Escrow защита\n` +
    `✅ Анонимность пользователей\n` +
    `✅ Система рейтингов\n` +
    `✅ Разрешение споров администратором`,
    { parse_mode: 'HTML' }
  );
});

console.log('🤖 TaskX Demo Bot запущен!');
console.log('📱 Откройте Telegram и найдите своего бота');
console.log('💬 Отправьте команду /start\n');
console.log('⚠️  DEMO версия без базы данных');
console.log('📝 Для полной версии требуется PostgreSQL + Redis\n');

bot.startPolling();
