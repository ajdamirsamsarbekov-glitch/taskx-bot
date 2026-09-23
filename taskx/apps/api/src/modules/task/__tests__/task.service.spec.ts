import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { TaskService } from '../task.service';
import { TaskEntity, PlatformSettingsEntity } from '@taskx/database';
import { TaskStatus, TaskCategory } from '@taskx/types';
import { WalletService } from '../../wallet/wallet.service';

describe('TaskService', () => {
  let service: TaskService;
  let taskRepository: Repository<TaskEntity>;
  let settingsRepository: Repository<PlatformSettingsEntity>;
  let walletService: WalletService;
  let dataSource: DataSource;

  const mockTask = {
    id: 'task-1',
    publicId: 'TASK-123',
    clientId: 'user-1',
    executorId: null,
    title: 'Test Task',
    description: 'Test description',
    category: TaskCategory.DELIVERY,
    price: '100',
    executorPayout: '70',
    platformFee: '30',
    deadline: new Date('2026-12-31'),
    status: TaskStatus.DRAFT,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const mockQueryRunner = {
    connect: jest.fn(),
    startTransaction: jest.fn(),
    commitTransaction: jest.fn(),
    rollbackTransaction: jest.fn(),
    release: jest.fn(),
    manager: {
      findOne: jest.fn(),
      save: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskService,
        {
          provide: getRepositoryToken(TaskEntity),
          useValue: {
            findOne: jest.fn(),
            find: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
            createQueryBuilder: jest.fn(() => ({
              where: jest.fn().mockReturnThis(),
              andWhere: jest.fn().mockReturnThis(),
              orderBy: jest.fn().mockReturnThis(),
              limit: jest.fn().mockReturnThis(),
              getMany: jest.fn(),
            })),
          },
        },
        {
          provide: getRepositoryToken(PlatformSettingsEntity),
          useValue: {
            findOne: jest.fn().mockResolvedValue({ key: 'PLATFORM_FEE_PERCENT', value: '30' }),
          },
        },
        {
          provide: WalletService,
          useValue: {
            lockEscrow: jest.fn(),
            releaseEscrow: jest.fn(),
            refund: jest.fn(),
            platformFee: jest.fn(),
          },
        },
        {
          provide: DataSource,
          useValue: {
            createQueryRunner: jest.fn(() => mockQueryRunner),
          },
        },
      ],
    }).compile();

    service = module.get<TaskService>(TaskService);
    taskRepository = module.get<Repository<TaskEntity>>(getRepositoryToken(TaskEntity));
    settingsRepository = module.get<Repository<PlatformSettingsEntity>>(
      getRepositoryToken(PlatformSettingsEntity),
    );
    walletService = module.get<WalletService>(WalletService);
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateFees', () => {
    it('should calculate 30% platform fee correctly', async () => {
      const result = await service.calculateFees('100');

      expect(result.price).toBe('100');
      expect(result.platformFee).toBe('30');
      expect(result.executorPayout).toBe('70');
    });

    it('should calculate fees for 1000 som', async () => {
      const result = await service.calculateFees('1000');

      expect(result.price).toBe('1000');
      expect(result.platformFee).toBe('300');
      expect(result.executorPayout).toBe('700');
    });

    it('should handle decimal amounts correctly', async () => {
      const result = await service.calculateFees('99.99');

      expect(result.price).toBe('99.99');
      expect(result.platformFee).toBe('29.997');
      expect(result.executorPayout).toBe('69.993');
    });
  });

  describe('createTask', () => {
    it('should create task with correct fee calculation', async () => {
      jest.spyOn(taskRepository, 'create').mockReturnValue(mockTask as any);
      jest.spyOn(taskRepository, 'save').mockResolvedValue(mockTask as any);

      const result = await service.createTask('user-1', {
        title: 'Test Task',
        description: 'Test description',
        category: TaskCategory.DELIVERY,
        price: '100',
        deadline: new Date('2026-12-31'),
      });

      expect(result.price).toBe('100');
      expect(result.executorPayout).toBe('70');
      expect(result.platformFee).toBe('30');
      expect(taskRepository.save).toHaveBeenCalled();
    });
  });

  describe('publishTask', () => {
    it('should lock escrow and change status to PUBLISHED', async () => {
      mockQueryRunner.manager.findOne.mockResolvedValue(mockTask);
      mockQueryRunner.manager.save.mockResolvedValue({
        ...mockTask,
        status: TaskStatus.PUBLISHED,
      });

      jest.spyOn(walletService, 'lockEscrow').mockResolvedValue({} as any);

      const result = await service.publishTask('task-1', 'user-1');

      expect(walletService.lockEscrow).toHaveBeenCalledWith(
        'user-1',
        mockTask.price,
        mockTask.id,
        expect.any(String),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should fail if task is not in DRAFT status', async () => {
      const publishedTask = { ...mockTask, status: TaskStatus.PUBLISHED };
      mockQueryRunner.manager.findOne.mockResolvedValue(publishedTask);

      await expect(service.publishTask('task-1', 'user-1')).rejects.toThrow(
        'Only draft tasks can be published',
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('assignTask', () => {
    it('should assign task to executor', async () => {
      const publishedTask = { ...mockTask, status: TaskStatus.PUBLISHED };
      mockQueryRunner.manager.findOne.mockResolvedValue(publishedTask);
      mockQueryRunner.manager.save.mockResolvedValue({
        ...publishedTask,
        executorId: 'user-2',
        status: TaskStatus.ASSIGNED,
        acceptedAt: expect.any(Date),
      });

      const result = await service.assignTask('task-1', 'user-2');

      expect(result.executorId).toBe('user-2');
      expect(result.status).toBe(TaskStatus.ASSIGNED);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should fail if user tries to assign own task', async () => {
      const publishedTask = { ...mockTask, status: TaskStatus.PUBLISHED };
      mockQueryRunner.manager.findOne.mockResolvedValue(publishedTask);

      await expect(service.assignTask('task-1', 'user-1')).rejects.toThrow(
        'Cannot assign your own task',
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });

    it('should fail if task is not PUBLISHED', async () => {
      const assignedTask = { ...mockTask, status: TaskStatus.ASSIGNED };
      mockQueryRunner.manager.findOne.mockResolvedValue(assignedTask);

      await expect(service.assignTask('task-1', 'user-2')).rejects.toThrow(
        'Task is not available for assignment',
      );
    });
  });

  describe('completeTask', () => {
    it('should distribute funds correctly (70% executor, 30% platform)', async () => {
      const submittedTask = {
        ...mockTask,
        status: TaskStatus.SUBMITTED,
        executorId: 'user-2',
      };
      mockQueryRunner.manager.findOne.mockResolvedValue(submittedTask);
      mockQueryRunner.manager.save.mockResolvedValue({
        ...submittedTask,
        status: TaskStatus.COMPLETED,
        completedAt: expect.any(Date),
      });

      jest.spyOn(walletService, 'platformFee').mockResolvedValue({} as any);
      jest.spyOn(walletService, 'releaseEscrow').mockResolvedValue({} as any);

      await service.completeTask('task-1', 'user-1');

      expect(walletService.platformFee).toHaveBeenCalledWith(
        'user-1',
        '30',
        'task-1',
        expect.any(String),
      );
      expect(walletService.releaseEscrow).toHaveBeenCalledWith(
        'user-2',
        '70',
        'task-1',
        expect.any(String),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should fail if task is not SUBMITTED', async () => {
      const inProgressTask = { ...mockTask, status: TaskStatus.IN_PROGRESS };
      mockQueryRunner.manager.findOne.mockResolvedValue(inProgressTask);

      await expect(service.completeTask('task-1', 'user-1')).rejects.toThrow(
        'Task must be in SUBMITTED status to complete',
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('cancelTask', () => {
    it('should refund full amount if PUBLISHED', async () => {
      const publishedTask = { ...mockTask, status: TaskStatus.PUBLISHED };
      mockQueryRunner.manager.findOne.mockResolvedValue(publishedTask);
      mockQueryRunner.manager.save.mockResolvedValue({
        ...publishedTask,
        status: TaskStatus.CANCELLED,
        cancelledAt: expect.any(Date),
      });

      jest.spyOn(walletService, 'refund').mockResolvedValue({} as any);

      await service.cancelTask('task-1', 'user-1');

      expect(walletService.refund).toHaveBeenCalledWith(
        'user-1',
        '100',
        'task-1',
        expect.any(String),
      );
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should fail if task is IN_PROGRESS', async () => {
      const inProgressTask = { ...mockTask, status: TaskStatus.IN_PROGRESS };
      mockQueryRunner.manager.findOne.mockResolvedValue(inProgressTask);

      await expect(service.cancelTask('task-1', 'user-1')).rejects.toThrow(
        'Cannot cancel task in current status',
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('getAvailableTasks', () => {
    it('should return only PUBLISHED tasks', async () => {
      const queryBuilder = taskRepository.createQueryBuilder();
      jest.spyOn(queryBuilder, 'getMany').mockResolvedValue([mockTask] as any);

      await service.getAvailableTasks();

      expect(queryBuilder.where).toHaveBeenCalledWith('task.status = :status', {
        status: TaskStatus.PUBLISHED,
      });
    });

    it('should filter by category', async () => {
      const queryBuilder = taskRepository.createQueryBuilder();
      jest.spyOn(queryBuilder, 'getMany').mockResolvedValue([mockTask] as any);

      await service.getAvailableTasks({ category: TaskCategory.DELIVERY });

      expect(queryBuilder.andWhere).toHaveBeenCalledWith('task.category = :category', {
        category: TaskCategory.DELIVERY,
      });
    });
  });
});
