import { Injectable } from '@nestjs/common';
import { NotificationType } from '@taskx/types';
import axios from 'axios';

interface NotificationData {
  telegramId: string;
  type: NotificationType;
  message: string;
  data?: any;
}

@Injectable()
export class NotificationService {
  private readonly BOT_TOKEN = process.env.BOT_TOKEN;
  private readonly WEB_URL = process.env.WEB_URL || 'http://localhost:3001';

  async sendNotification(data: NotificationData): Promise<void> {
    if (!this.BOT_TOKEN) {
      console.error('BOT_TOKEN not configured');
      return;
    }

    try {
      const buttons = this.getButtonsForNotification(data.type, data.data);

      const params: any = {
        chat_id: data.telegramId,
        text: data.message,
        parse_mode: 'HTML',
      };

      if (buttons.length > 0) {
        params.reply_markup = JSON.stringify({
          inline_keyboard: [buttons],
        });
      }

      await axios.post(
        `https://api.telegram.org/bot${this.BOT_TOKEN}/sendMessage`,
        params,
      );
    } catch (error) {
      console.error('Failed to send notification:', error);
    }
  }

  private getButtonsForNotification(
    type: NotificationType,
    data?: any,
  ): Array<{ text: string; url?: string; callback_data?: string }> {
    switch (type) {
      case NotificationType.TASK_CREATED:
        return [
          {
            text: '👀 Просмотреть',
            url: `${this.WEB_URL}/tasks/${data?.taskId}`,
          },
        ];

      case NotificationType.TASK_ASSIGNED:
      case NotificationType.TASK_STARTED:
      case NotificationType.TASK_SUBMITTED:
        return [
          {
            text: '📋 Открыть задание',
            url: `${this.WEB_URL}/tasks/${data?.taskId}`,
          },
        ];

      case NotificationType.TASK_COMPLETED:
      case NotificationType.PAYMENT_RECEIVED:
        return [
          {
            text: '💰 Открыть кошелёк',
            url: `${this.WEB_URL}/wallet`,
          },
        ];

      case NotificationType.DISPUTE_OPENED:
        return [
          {
            text: '⚖️ Открыть спор',
            url: `${this.WEB_URL}/disputes/${data?.disputeId}`,
          },
        ];

      case NotificationType.DEADLINE_APPROACHING:
        return [
          {
            text: '⏰ Открыть задание',
            url: `${this.WEB_URL}/tasks/${data?.taskId}`,
          },
        ];

      default:
        return [
          {
            text: '🚀 Открыть TaskX',
            url: this.WEB_URL,
          },
        ];
    }
  }

  async notifyTaskCreated(
    telegramId: string,
    taskTitle: string,
    taskId: string,
  ): Promise<void> {
    await this.sendNotification({
      telegramId,
      type: NotificationType.TASK_CREATED,
      message: `✅ <b>Задание создано</b>\n\n${taskTitle}\n\nЗадание опубликовано и доступно для исполнителей.`,
      data: { taskId },
    });
  }

  async notifyTaskAssigned(
    clientTelegramId: string,
    executorTelegramId: string,
    taskTitle: string,
    taskId: string,
    executorUsername: string,
  ): Promise<void> {
    await this.sendNotification({
      telegramId: clientTelegramId,
      type: NotificationType.TASK_ASSIGNED,
      message: `👤 <b>Задание принято</b>\n\n${taskTitle}\n\nИсполнитель: ${executorUsername}`,
      data: { taskId },
    });

    await this.sendNotification({
      telegramId: executorTelegramId,
      type: NotificationType.TASK_ASSIGNED,
      message: `✅ <b>Вы приняли задание</b>\n\n${taskTitle}\n\nНе забудьте выполнить его до дедлайна!`,
      data: { taskId },
    });
  }

  async notifyTaskStarted(
    clientTelegramId: string,
    taskTitle: string,
    taskId: string,
  ): Promise<void> {
    await this.sendNotification({
      telegramId: clientTelegramId,
      type: NotificationType.TASK_STARTED,
      message: `🚀 <b>Выполнение началось</b>\n\n${taskTitle}\n\nИсполнитель начал работу над заданием.`,
      data: { taskId },
    });
  }

  async notifyTaskSubmitted(
    clientTelegramId: string,
    taskTitle: string,
    taskId: string,
  ): Promise<void> {
    await this.sendNotification({
      telegramId: clientTelegramId,
      type: NotificationType.TASK_SUBMITTED,
      message: `📨 <b>Результат отправлен</b>\n\n${taskTitle}\n\nИсполнитель отправил результат выполнения.\n\n⚠️ Подтвердите выполнение в течение 24 часов или откройте спор.`,
      data: { taskId },
    });
  }

  async notifyTaskCompleted(
    executorTelegramId: string,
    taskTitle: string,
    taskId: string,
    payout: string,
  ): Promise<void> {
    await this.sendNotification({
      telegramId: executorTelegramId,
      type: NotificationType.TASK_COMPLETED,
      message: `✅ <b>Задание завершено</b>\n\n${taskTitle}\n\n💰 Вы получили: ${payout} сом`,
      data: { taskId },
    });
  }

  async notifyTaskCancelled(
    telegramId: string,
    taskTitle: string,
    taskId: string,
    reason?: string,
  ): Promise<void> {
    await this.sendNotification({
      telegramId,
      type: NotificationType.TASK_CANCELLED,
      message: `❌ <b>Задание отменено</b>\n\n${taskTitle}${reason ? `\n\nПричина: ${reason}` : ''}`,
      data: { taskId },
    });
  }

  async notifyDisputeOpened(
    clientTelegramId: string,
    executorTelegramId: string,
    taskTitle: string,
    disputeId: string,
  ): Promise<void> {
    const message = `⚖️ <b>Открыт спор</b>\n\n${taskTitle}\n\nСпор будет рассмотрен администратором в течение 24 часов.`;

    await this.sendNotification({
      telegramId: clientTelegramId,
      type: NotificationType.DISPUTE_OPENED,
      message,
      data: { disputeId },
    });

    await this.sendNotification({
      telegramId: executorTelegramId,
      type: NotificationType.DISPUTE_OPENED,
      message,
      data: { disputeId },
    });
  }

  async notifyDisputeResolved(
    telegramId: string,
    taskTitle: string,
    resolution: string,
    amount?: string,
  ): Promise<void> {
    await this.sendNotification({
      telegramId,
      type: NotificationType.DISPUTE_RESOLVED,
      message: `✅ <b>Спор разрешён</b>\n\n${taskTitle}\n\nРезультат: ${resolution}${amount ? `\n\n💰 Сумма: ${amount} сом` : ''}`,
      data: {},
    });
  }

  async notifyPaymentReceived(
    telegramId: string,
    amount: string,
  ): Promise<void> {
    await this.sendNotification({
      telegramId,
      type: NotificationType.PAYMENT_RECEIVED,
      message: `💰 <b>Платёж получен</b>\n\nСумма: ${amount} сом\n\nДеньги зачислены на ваш кошелёк.`,
      data: {},
    });
  }

  async notifyWithdrawalCompleted(
    telegramId: string,
    amount: string,
  ): Promise<void> {
    await this.sendNotification({
      telegramId,
      type: NotificationType.WITHDRAWAL_COMPLETED,
      message: `✅ <b>Вывод выполнен</b>\n\nСумма: ${amount} сом\n\nСредства выведены с вашего кошелька.`,
      data: {},
    });
  }

  async notifyDeadlineApproaching(
    telegramId: string,
    taskTitle: string,
    taskId: string,
    hoursLeft: number,
  ): Promise<void> {
    await this.sendNotification({
      telegramId,
      type: NotificationType.DEADLINE_APPROACHING,
      message: `⏰ <b>Приближается дедлайн</b>\n\n${taskTitle}\n\nОсталось: ${hoursLeft} ч\n\nНе забудьте выполнить задание вовремя!`,
      data: { taskId },
    });
  }
}
