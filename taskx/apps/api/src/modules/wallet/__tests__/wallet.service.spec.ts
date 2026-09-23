import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { WalletService } from '../wallet.service';
import { WalletEntity, WalletTransactionEntity } from '@taskx/database';
import { TransactionType } from '@taskx/types';
import Decimal from 'decimal.js';

describe('WalletService', () => {
  let service: WalletService;
  let walletRepository: Repository<WalletEntity>;
  let transactionRepository: Repository<WalletTransactionEntity>;
  let dataSource: DataSource;

  const mockWallet = {
    id: 'wallet-1',
    userId: 'user-1',
    availableBalance: '1000',
    frozenBalance: '0',
    earnedTotal: '0',
    spentTotal: '0',
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
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WalletService,
        {
          provide: getRepositoryToken(WalletEntity),
          useValue: {
            findOne: jest.fn(),
            create: jest.fn(),
            save: jest.fn(),
          },
        },
        {
          provide: getRepositoryToken(WalletTransactionEntity),
          useValue: {
            find: jest.fn(),
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

    service = module.get<WalletService>(WalletService);
    walletRepository = module.get<Repository<WalletEntity>>(
      getRepositoryToken(WalletEntity),
    );
    transactionRepository = module.get<Repository<WalletTransactionEntity>>(
      getRepositoryToken(WalletTransactionEntity),
    );
    dataSource = module.get<DataSource>(DataSource);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getWalletByUserId', () => {
    it('should return existing wallet', async () => {
      jest.spyOn(walletRepository, 'findOne').mockResolvedValue(mockWallet as any);

      const result = await service.getWalletByUserId('user-1');

      expect(result).toEqual(mockWallet);
      expect(walletRepository.findOne).toHaveBeenCalledWith({
        where: { userId: 'user-1' },
      });
    });

    it('should create wallet if not exists', async () => {
      jest.spyOn(walletRepository, 'findOne').mockResolvedValue(null);
      jest.spyOn(walletRepository, 'create').mockReturnValue(mockWallet as any);
      jest.spyOn(walletRepository, 'save').mockResolvedValue(mockWallet as any);

      const result = await service.getWalletByUserId('user-1');

      expect(result).toEqual(mockWallet);
      expect(walletRepository.create).toHaveBeenCalled();
      expect(walletRepository.save).toHaveBeenCalled();
    });
  });

  describe('deposit', () => {
    it('should increase available balance', async () => {
      const updatedWallet = { ...mockWallet, availableBalance: '1100' };

      mockQueryRunner.manager.findOne.mockResolvedValue(mockWallet);
      mockQueryRunner.manager.save.mockResolvedValue(updatedWallet);
      mockQueryRunner.manager.create.mockReturnValue({
        walletId: 'wallet-1',
        type: TransactionType.DEPOSIT,
        amount: '100',
        balanceBefore: '1000',
        balanceAfter: '1100',
        frozenBefore: '0',
        frozenAfter: '0',
      });

      const result = await service.deposit('user-1', '100', 'Test deposit');

      expect(mockQueryRunner.connect).toHaveBeenCalled();
      expect(mockQueryRunner.startTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
      expect(mockQueryRunner.release).toHaveBeenCalled();
      expect(result.type).toBe(TransactionType.DEPOSIT);
      expect(result.amount).toBe('100');
    });
  });

  describe('lockEscrow', () => {
    it('should move funds from available to frozen', async () => {
      const walletWithFunds = { ...mockWallet, availableBalance: '500' };
      const updatedWallet = {
        ...walletWithFunds,
        availableBalance: '400',
        frozenBalance: '100',
      };

      mockQueryRunner.manager.findOne.mockResolvedValue(walletWithFunds);
      mockQueryRunner.manager.save.mockResolvedValue(updatedWallet);
      mockQueryRunner.manager.create.mockReturnValue({
        walletId: 'wallet-1',
        type: TransactionType.ESCROW_LOCK,
        amount: '100',
        balanceBefore: '500',
        balanceAfter: '400',
        frozenBefore: '0',
        frozenAfter: '100',
        taskId: 'task-1',
      });

      const result = await service.lockEscrow(
        'user-1',
        '100',
        'task-1',
        'Lock for task',
      );

      expect(result.type).toBe(TransactionType.ESCROW_LOCK);
      expect(result.amount).toBe('100');
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should fail if insufficient balance', async () => {
      const walletWithLowFunds = { ...mockWallet, availableBalance: '50' };
      mockQueryRunner.manager.findOne.mockResolvedValue(walletWithLowFunds);

      await expect(
        service.lockEscrow('user-1', '100', 'task-1', 'Lock for task'),
      ).rejects.toThrow('Insufficient balance for escrow lock');

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('releaseEscrow', () => {
    it('should move funds from frozen to available', async () => {
      const walletWithFrozen = {
        ...mockWallet,
        availableBalance: '1000',
        frozenBalance: '100',
        earnedTotal: '0',
      };
      const updatedWallet = {
        ...walletWithFrozen,
        availableBalance: '1100',
        frozenBalance: '0',
        earnedTotal: '100',
      };

      mockQueryRunner.manager.findOne.mockResolvedValue(walletWithFrozen);
      mockQueryRunner.manager.save.mockResolvedValue(updatedWallet);
      mockQueryRunner.manager.create.mockReturnValue({
        walletId: 'wallet-1',
        type: TransactionType.ESCROW_RELEASE,
        amount: '100',
        balanceBefore: '1000',
        balanceAfter: '1100',
        frozenBefore: '100',
        frozenAfter: '0',
        taskId: 'task-1',
      });

      const result = await service.releaseEscrow(
        'user-1',
        '100',
        'task-1',
        'Release for task',
      );

      expect(result.type).toBe(TransactionType.ESCROW_RELEASE);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('withdraw', () => {
    it('should decrease available balance', async () => {
      const walletWithFunds = { ...mockWallet, availableBalance: '500' };
      const updatedWallet = {
        ...walletWithFunds,
        availableBalance: '400',
        spentTotal: '100',
      };

      mockQueryRunner.manager.findOne.mockResolvedValue(walletWithFunds);
      mockQueryRunner.manager.save.mockResolvedValue(updatedWallet);
      mockQueryRunner.manager.create.mockReturnValue({
        walletId: 'wallet-1',
        type: TransactionType.WITHDRAW,
        amount: '100',
        balanceBefore: '500',
        balanceAfter: '400',
        frozenBefore: '0',
        frozenAfter: '0',
      });

      const result = await service.withdraw('user-1', '100', 'Withdraw');

      expect(result.type).toBe(TransactionType.WITHDRAW);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });

    it('should fail if insufficient balance', async () => {
      const walletWithLowFunds = { ...mockWallet, availableBalance: '50' };
      mockQueryRunner.manager.findOne.mockResolvedValue(walletWithLowFunds);

      await expect(service.withdraw('user-1', '100', 'Withdraw')).rejects.toThrow(
        'Insufficient balance',
      );

      expect(mockQueryRunner.rollbackTransaction).toHaveBeenCalled();
    });
  });

  describe('refund', () => {
    it('should move funds from frozen back to available', async () => {
      const walletWithFrozen = {
        ...mockWallet,
        availableBalance: '1000',
        frozenBalance: '100',
      };
      const updatedWallet = {
        ...walletWithFrozen,
        availableBalance: '1100',
        frozenBalance: '0',
      };

      mockQueryRunner.manager.findOne.mockResolvedValue(walletWithFrozen);
      mockQueryRunner.manager.save.mockResolvedValue(updatedWallet);
      mockQueryRunner.manager.create.mockReturnValue({
        walletId: 'wallet-1',
        type: TransactionType.REFUND,
        amount: '100',
        balanceBefore: '1000',
        balanceAfter: '1100',
        frozenBefore: '100',
        frozenAfter: '0',
        taskId: 'task-1',
      });

      const result = await service.refund('user-1', '100', 'task-1', 'Refund');

      expect(result.type).toBe(TransactionType.REFUND);
      expect(mockQueryRunner.commitTransaction).toHaveBeenCalled();
    });
  });

  describe('getTransactionHistory', () => {
    it('should return transaction history', async () => {
      const mockTransactions = [
        {
          id: 'tx-1',
          type: TransactionType.DEPOSIT,
          amount: '100',
          createdAt: new Date(),
        },
        {
          id: 'tx-2',
          type: TransactionType.ESCROW_LOCK,
          amount: '50',
          createdAt: new Date(),
        },
      ];

      jest.spyOn(walletRepository, 'findOne').mockResolvedValue(mockWallet as any);
      jest
        .spyOn(transactionRepository, 'find')
        .mockResolvedValue(mockTransactions as any);

      const result = await service.getTransactionHistory('user-1', 10, 0);

      expect(result).toHaveLength(2);
      expect(transactionRepository.find).toHaveBeenCalledWith({
        where: { walletId: 'wallet-1' },
        order: { createdAt: 'DESC' },
        take: 10,
        skip: 0,
      });
    });
  });
});
