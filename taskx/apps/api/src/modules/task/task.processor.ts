import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan } from 'typeorm';
import { TaskEntity, UserEntity } from '@taskx/database';
import { TaskStatus } from '@taskx/types';
import { NotificationService } from '../notification/notification.service';
import { TaskService } from '../task/task.service';

@Processor('tasks')
@Injectable()
export class TaskProcessor {
  constructor(
    @InjectRepository(TaskEntity)
    private taskRepository: Repository<TaskEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private notificationService: NotificationService,
    private taskService: TaskService,
  ) {}

  @Process('checkDeadlines')
  async handleDeadlineCheck(job: Job) {
    console.log('Checking task deadlines...');

    const now = new Date();
    const twoHoursFromNow = new Date(now.getTime() + 2 * 60 * 60 * 1000);

    const tasksApproachingDeadline = await this.taskRepository.find({
      where: {
        status: TaskStatus.IN_PROGRESS,
        deadline: LessThan(twoHoursFromNow),
      },
      relations: ['executor'],
    });

    for (const task of tasksApproachingDeadline) {
      if (task.executor) {
        const hoursLeft = Math.ceil(
          (task.deadline.getTime() - now.getTime()) / (1000 * 60 * 60),
        );

        if (hoursLeft > 0 && hoursLeft <= 2) {
          await this.notificationService.notifyDeadlineApproaching(
            task.executor.telegramId,
            task.title,
            task.id,
            hoursLeft,
          );
        }
      }
    }

    return { checked: tasksApproachingDeadline.length };
  }

  @Process('autoComplete')
  async handleAutoComplete(job: Job) {
    console.log('Checking for auto-completion...');

    const autoCompleteHours = parseInt(
      process.env.AUTO_COMPLETE_HOURS || '24',
    );
    const autoCompleteTime = new Date(
      Date.now() - autoCompleteHours * 60 * 60 * 1000,
    );

    const tasksToComplete = await this.taskRepository.find({
      where: {
        status: TaskStatus.SUBMITTED,
        submittedAt: LessThan(autoCompleteTime),
      },
      relations: ['client', 'executor'],
    });

    for (const task of tasksToComplete) {
      try {
        await this.taskService.completeTask(task.id, task.clientId);

        console.log(
          `Auto-completed task ${task.publicId} after ${autoCompleteHours}h`,
        );

        if (task.client) {
          await this.notificationService.notifyTaskCompleted(
            task.client.telegramId,
            task.title,
            task.id,
            task.executorPayout,
          );
        }

        if (task.executor) {
          await this.notificationService.notifyTaskCompleted(
            task.executor.telegramId,
            task.title,
            task.id,
            task.executorPayout,
          );
        }
      } catch (error) {
        console.error(
          `Failed to auto-complete task ${task.publicId}:`,
          error,
        );
      }
    }

    return { completed: tasksToComplete.length };
  }

  @Process('expireTasks')
  async handleExpiration(job: Job) {
    console.log('Checking for expired tasks...');

    const now = new Date();

    const expiredTasks = await this.taskRepository.find({
      where: {
        status: TaskStatus.PUBLISHED,
        deadline: LessThan(now),
      },
      relations: ['client'],
    });

    for (const task of expiredTasks) {
      try {
        task.status = TaskStatus.EXPIRED;
        await this.taskRepository.save(task);

        if (task.client) {
          await this.notificationService.notifyTaskCancelled(
            task.client.telegramId,
            task.title,
            task.id,
            'Истёк срок выполнения',
          );
        }

        console.log(`Expired task ${task.publicId}`);
      } catch (error) {
        console.error(`Failed to expire task ${task.publicId}:`, error);
      }
    }

    return { expired: expiredTasks.length };
  }
}
