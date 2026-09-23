import TelegramBot from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN;
const WEB_URL = process.env.WEB_URL || 'http://localhost:3001';

if (!BOT_TOKEN) {
  throw new Error('BOT_TOKEN is required');
}

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;
  const firstName = msg.from?.first_name || 'User';

  await bot.sendMessage(
    chatId,
    `👋 Добро пожаловать в TaskX, ${firstName}!\n\n` +
      `TaskX — это платформа для быстрых заданий.\n\n` +
      `💼 Создавайте задания и получайте помощь\n` +
      `💰 Выполняйте задания и зарабатывайте\n` +
      `🔒 Безопасные сделки с escrow\n\n` +
      `Нажмите кнопку ниже, чтобы открыть приложение:`,
    {
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: '🚀 Открыть TaskX',
              web_app: { url: WEB_URL },
            },
          ],
        ],
      },
    },
  );
});

bot.onText(/\/menu/, async (msg) => {
  const chatId = msg.chat.id;

  await bot.sendMessage(chatId, '📋 Главное меню TaskX:', {
    reply_markup: {
      inline_keyboard: [
        [
          {
            text: '🔍 Найти задания',
            web_app: { url: `${WEB_URL}/tasks` },
          },
        ],
        [
          {
            text: '➕ Создать задание',
            web_app: { url: `${WEB_URL}/create` },
          },
        ],
        [
          {
            text: '📝 Мои задания',
            web_app: { url: `${WEB_URL}/my-tasks` },
          },
        ],
        [
          {
            text: '💰 Кошелёк',
            web_app: { url: `${WEB_URL}/wallet` },
          },
        ],
        [
          {
            text: '👤 Профиль',
            web_app: { url: `${WEB_URL}/profile` },
          },
        ],
      ],
    },
  });
});

bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;

  await bot.sendMessage(
    chatId,
    `📖 Помощь TaskX\n\n` +
      `Команды:\n` +
      `/start - Начать работу\n` +
      `/menu - Главное меню\n` +
      `/help - Помощь\n` +
      `/support - Поддержка\n\n` +
      `Как это работает:\n\n` +
      `1️⃣ Заказчик создаёт задание и указывает цену\n` +
      `2️⃣ Деньги резервируются на платформе (escrow)\n` +
      `3️⃣ Исполнитель принимает задание\n` +
      `4️⃣ После выполнения исполнитель отправляет результат\n` +
      `5️⃣ Заказчик подтверждает выполнение\n` +
      `6️⃣ Деньги распределяются:\n` +
      `   • 70% исполнителю\n` +
      `   • 30% комиссия платформы\n\n` +
      `⚡️ Если заказчик не ответит в течение 24 часов, задание автоматически завершится.`,
  );
});

bot.onText(/\/support/, async (msg) => {
  const chatId = msg.chat.id;

  await bot.sendMessage(
    chatId,
    `🆘 Поддержка TaskX\n\n` +
      `Если у вас возникли проблемы или вопросы, напишите нам:\n\n` +
      `📧 Email: support@taskx.com\n` +
      `💬 Telegram: @taskx_support\n\n` +
      `Мы ответим в течение 24 часов.`,
  );
});

export async function sendNotification(
  telegramId: string,
  message: string,
  buttons?: Array<{ text: string; url?: string; callback_data?: string }>,
): Promise<void> {
  try {
    const options: any = {};

    if (buttons && buttons.length > 0) {
      options.reply_markup = {
        inline_keyboard: [
          buttons.map((btn) => ({
            text: btn.text,
            url: btn.url,
            callback_data: btn.callback_data,
          })),
        ],
      };
    }

    await bot.sendMessage(telegramId, message, options);
  } catch (error) {
    console.error('Failed to send notification:', error);
  }
}

console.log('🤖 TaskX Bot started');

export default bot;
