import { Injectable, OnModuleInit } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bull';
import { Queue } from 'bull';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class TaskSchedulerService implements OnModuleInit {
  constructor(
    @InjectQueue('tasks') private tasksQueue: Queue,
  ) {}

  async onModuleInit() {
    await this.scheduleJobs();
  }

  private async scheduleJobs() {
    await this.tasksQueue.add(
      'checkDeadlines',
      {},
      {
        repeat: { cron: '*/15 * * * *' },
      },
    );

    await this.tasksQueue.add(
      'autoComplete',
      {},
      {
        repeat: { cron: '0 * * * *' },
      },
    );

    await this.tasksQueue.add(
      'expireTasks',
      {},
      {
        repeat: { cron: '*/30 * * * *' },
      },
    );

    console.log('✅ Background jobs scheduled');
  }

  @Cron(CronExpression.EVERY_HOUR)
  async cleanupOldJobs() {
    const jobs = await this.tasksQueue.getJobs([
      'completed',
      'failed',
    ]);

    const oneDayAgo = Date.now() - 24 * 60 * 60 * 1000;

    for (const job of jobs) {
      if (job.finishedOn && job.finishedOn < oneDayAgo) {
        await job.remove();
      }
    }
  }
}
