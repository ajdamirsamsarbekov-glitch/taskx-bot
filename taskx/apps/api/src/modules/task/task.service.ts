import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, In, Not } from 'typeorm';
import { TaskEntity, PlatformSettingsEntity } from '@taskx/database';
import { TaskStatus, TaskCategory } from '@taskx/types';
import { WalletService } from '../wallet/wallet.service';
import { nanoid } from 'nanoid';
import Decimal from 'decimal.js';

@Injectable()
export class TaskService {
  constructor(
    @InjectRepository(TaskEntity)
    private taskRepository: Repository<TaskEntity>,
    @InjectRepository(PlatformSettingsEntity)
    private settingsRepository: Repository<PlatformSettingsEntity>,
    private walletService: WalletService,
    private dataSource: DataSource,
  ) {}

  async getPlatformFeePercent(): Promise<number> {
    const setting = await this.settingsRepository.findOne({
      where: { key: 'PLATFORM_FEE_PERCENT' },
    });
    return setting ? parseInt(setting.value) : 30;
  }

  async calculateFees(price: string): Promise<{
    price: string;
    executorPayout: string;
    platformFee: string;
  }> {
    const feePercent = await this.getPlatformFeePercent();
    const priceDecimal = new Decimal(price);
    const platformFee = priceDecimal.mul(feePercent).div(100);
    const executorPayout = priceDecimal.minus(platformFee);

    return {
      price: priceDecimal.toString(),
      platformFee: platformFee.toString(),
      executorPayout: executorPayout.toString(),
    };
  }

  async createTask(
    clientId: string,
    data: {
      title: string;
      description: string;
      category: TaskCategory;
      price: string;
      deadline: Date;
      location?: { latitude: number; longitude: number; address?: string };
      attachments?: string[];
    },
  ): Promise<TaskEntity> {
    const fees = await this.calculateFees(data.price);
    const publicId = `TASK-${nanoid(10)}`;

    const task = this.taskRepository.create({
      publicId,
      clientId,
      title: data.title,
      description: data.description,
      category: data.category,
      price: fees.price,
      executorPayout: fees.executorPayout,
      platformFee: fees.platformFee,
      deadline: data.deadline,
      location: data.location,
      attachments: data.attachments,
      status: TaskStatus.DRAFT,
    });

    return this.taskRepository.save(task);
  }

  async publishTask(taskId: string, clientId: string): Promise<TaskEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const task = await queryRunner.manager.findOne(TaskEntity, {
        where: { id: taskId, clientId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!task) {
        throw new Error('Task not found');
      }

      if (task.status !== TaskStatus.DRAFT) {
        throw new Error('Only draft tasks can be published');
      }

      await this.walletService.lockEscrow(
        clientId,
        task.price,
        task.id,
        `Escrow lock for task ${task.publicId}`,
      );

      task.status = TaskStatus.PUBLISHED;
      const savedTask = await queryRunner.manager.save(TaskEntity, task);

      await queryRunner.commitTransaction();

      return savedTask;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async assignTask(taskId: string, executorId: string): Promise<TaskEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const task = await queryRunner.manager.findOne(TaskEntity, {
        where: { id: taskId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!task) {
        throw new Error('Task not found');
      }

      if (task.status !== TaskStatus.PUBLISHED) {
        throw new Error('Task is not available for assignment');
      }

      if (task.clientId === executorId) {
        throw new Error('Cannot assign your own task');
      }

      task.executorId = executorId;
      task.status = TaskStatus.ASSIGNED;
      task.acceptedAt = new Date();

      const savedTask = await queryRunner.manager.save(TaskEntity, task);

      await queryRunner.commitTransaction();

      return savedTask;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async startTask(taskId: string, executorId: string): Promise<TaskEntity> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, executorId },
    });

    if (!task) {
      throw new Error('Task not found or not assigned to you');
    }

    if (task.status !== TaskStatus.ASSIGNED) {
      throw new Error('Task must be in ASSIGNED status to start');
    }

    task.status = TaskStatus.IN_PROGRESS;
    task.startedAt = new Date();

    return this.taskRepository.save(task);
  }

  async submitTask(taskId: string, executorId: string): Promise<TaskEntity> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, executorId },
    });

    if (!task) {
      throw new Error('Task not found or not assigned to you');
    }

    if (task.status !== TaskStatus.IN_PROGRESS) {
      throw new Error('Task must be in IN_PROGRESS status to submit');
    }

    task.status = TaskStatus.SUBMITTED;
    task.submittedAt = new Date();

    return this.taskRepository.save(task);
  }

  async completeTask(taskId: string, clientId: string): Promise<TaskEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const task = await queryRunner.manager.findOne(TaskEntity, {
        where: { id: taskId, clientId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!task) {
        throw new Error('Task not found');
      }

      if (task.status !== TaskStatus.SUBMITTED) {
        throw new Error('Task must be in SUBMITTED status to complete');
      }

      if (!task.executorId) {
        throw new Error('Task has no executor');
      }

      await this.walletService.platformFee(
        clientId,
        task.platformFee,
        task.id,
        `Platform fee for task ${task.publicId}`,
      );

      await this.walletService.releaseEscrow(
        task.executorId,
        task.executorPayout,
        task.id,
        `Payment for completing task ${task.publicId}`,
      );

      task.status = TaskStatus.COMPLETED;
      task.completedAt = new Date();

      const savedTask = await queryRunner.manager.save(TaskEntity, task);

      await queryRunner.commitTransaction();

      return savedTask;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async cancelTask(taskId: string, clientId: string): Promise<TaskEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const task = await queryRunner.manager.findOne(TaskEntity, {
        where: { id: taskId, clientId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!task) {
        throw new Error('Task not found');
      }

      if (![TaskStatus.DRAFT, TaskStatus.PUBLISHED].includes(task.status)) {
        throw new Error('Cannot cancel task in current status');
      }

      if (task.status === TaskStatus.PUBLISHED) {
        await this.walletService.refund(
          clientId,
          task.price,
          task.id,
          `Refund for cancelled task ${task.publicId}`,
        );
      }

      task.status = TaskStatus.CANCELLED;
      task.cancelledAt = new Date();

      const savedTask = await queryRunner.manager.save(TaskEntity, task);

      await queryRunner.commitTransaction();

      return savedTask;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getAvailableTasks(filters?: {
    category?: TaskCategory;
    minPrice?: string;
    maxPrice?: string;
    location?: { latitude: number; longitude: number; radius: number };
  }): Promise<TaskEntity[]> {
    const query = this.taskRepository.createQueryBuilder('task');

    query.where('task.status = :status', { status: TaskStatus.PUBLISHED });

    if (filters?.category) {
      query.andWhere('task.category = :category', {
        category: filters.category,
      });
    }

    if (filters?.minPrice) {
      query.andWhere('task.price >= :minPrice', { minPrice: filters.minPrice });
    }

    if (filters?.maxPrice) {
      query.andWhere('task.price <= :maxPrice', { maxPrice: filters.maxPrice });
    }

    query.orderBy('task.createdAt', 'DESC');
    query.limit(50);

    return query.getMany();
  }

  async getTaskById(taskId: string): Promise<TaskEntity> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId },
      relations: ['client', 'executor'],
    });

    if (!task) {
      throw new Error('Task not found');
    }

    return task;
  }

  async getMyTasks(userId: string): Promise<TaskEntity[]> {
    return this.taskRepository.find({
      where: [{ clientId: userId }, { executorId: userId }],
      order: { createdAt: 'DESC' },
    });
  }
}
