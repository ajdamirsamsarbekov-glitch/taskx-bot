import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { WalletEntity, WalletTransactionEntity } from '@taskx/database';
import { TransactionType } from '@taskx/types';
import Decimal from 'decimal.js';

@Injectable()
export class WalletService {
  constructor(
    @InjectRepository(WalletEntity)
    private walletRepository: Repository<WalletEntity>,
    @InjectRepository(WalletTransactionEntity)
    private transactionRepository: Repository<WalletTransactionEntity>,
    private dataSource: DataSource,
  ) {}

  async getWalletByUserId(userId: string): Promise<WalletEntity> {
    let wallet = await this.walletRepository.findOne({
      where: { userId },
    });

    if (!wallet) {
      wallet = await this.createWallet(userId);
    }

    return wallet;
  }

  async createWallet(userId: string): Promise<WalletEntity> {
    const wallet = this.walletRepository.create({
      userId,
      availableBalance: '0',
      frozenBalance: '0',
      earnedTotal: '0',
      spentTotal: '0',
    });

    return this.walletRepository.save(wallet);
  }

  async deposit(
    userId: string,
    amount: string,
    description?: string,
  ): Promise<WalletTransactionEntity> {
    return this.executeTransaction(
      userId,
      TransactionType.DEPOSIT,
      amount,
      description,
    );
  }

  async withdraw(
    userId: string,
    amount: string,
    description?: string,
  ): Promise<WalletTransactionEntity> {
    const wallet = await this.getWalletByUserId(userId);
    const available = new Decimal(wallet.availableBalance);
    const withdrawAmount = new Decimal(amount);

    if (available.lessThan(withdrawAmount)) {
      throw new Error('Insufficient balance');
    }

    return this.executeTransaction(
      userId,
      TransactionType.WITHDRAW,
      amount,
      description,
    );
  }

  async lockEscrow(
    userId: string,
    amount: string,
    taskId: string,
    description?: string,
  ): Promise<WalletTransactionEntity> {
    const wallet = await this.getWalletByUserId(userId);
    const available = new Decimal(wallet.availableBalance);
    const lockAmount = new Decimal(amount);

    if (available.lessThan(lockAmount)) {
      throw new Error('Insufficient balance for escrow lock');
    }

    return this.executeTransaction(
      userId,
      TransactionType.ESCROW_LOCK,
      amount,
      description,
      taskId,
    );
  }

  async releaseEscrow(
    userId: string,
    amount: string,
    taskId: string,
    description?: string,
  ): Promise<WalletTransactionEntity> {
    return this.executeTransaction(
      userId,
      TransactionType.ESCROW_RELEASE,
      amount,
      description,
      taskId,
    );
  }

  async refund(
    userId: string,
    amount: string,
    taskId: string,
    description?: string,
  ): Promise<WalletTransactionEntity> {
    return this.executeTransaction(
      userId,
      TransactionType.REFUND,
      amount,
      description,
      taskId,
    );
  }

  async platformFee(
    userId: string,
    amount: string,
    taskId: string,
    description?: string,
  ): Promise<WalletTransactionEntity> {
    return this.executeTransaction(
      userId,
      TransactionType.PLATFORM_FEE,
      amount,
      description,
      taskId,
    );
  }

  private async executeTransaction(
    userId: string,
    type: TransactionType,
    amount: string,
    description?: string,
    taskId?: string,
  ): Promise<WalletTransactionEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const wallet = await queryRunner.manager.findOne(WalletEntity, {
        where: { userId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!wallet) {
        throw new Error('Wallet not found');
      }

      const amountDecimal = new Decimal(amount);
      const balanceBefore = new Decimal(wallet.availableBalance);
      const frozenBefore = new Decimal(wallet.frozenBalance);
      let balanceAfter = balanceBefore;
      let frozenAfter = frozenBefore;

      switch (type) {
        case TransactionType.DEPOSIT:
          balanceAfter = balanceBefore.add(amountDecimal);
          wallet.availableBalance = balanceAfter.toString();
          break;

        case TransactionType.WITHDRAW:
          balanceAfter = balanceBefore.minus(amountDecimal);
          wallet.availableBalance = balanceAfter.toString();
          wallet.spentTotal = new Decimal(wallet.spentTotal)
            .add(amountDecimal)
            .toString();
          break;

        case TransactionType.ESCROW_LOCK:
          balanceAfter = balanceBefore.minus(amountDecimal);
          frozenAfter = frozenBefore.add(amountDecimal);
          wallet.availableBalance = balanceAfter.toString();
          wallet.frozenBalance = frozenAfter.toString();
          break;

        case TransactionType.ESCROW_RELEASE:
          frozenAfter = frozenBefore.minus(amountDecimal);
          balanceAfter = balanceBefore.add(amountDecimal);
          wallet.frozenBalance = frozenAfter.toString();
          wallet.availableBalance = balanceAfter.toString();
          wallet.earnedTotal = new Decimal(wallet.earnedTotal)
            .add(amountDecimal)
            .toString();
          break;

        case TransactionType.REFUND:
          frozenAfter = frozenBefore.minus(amountDecimal);
          balanceAfter = balanceBefore.add(amountDecimal);
          wallet.frozenBalance = frozenAfter.toString();
          wallet.availableBalance = balanceAfter.toString();
          break;

        case TransactionType.PLATFORM_FEE:
          frozenAfter = frozenBefore.minus(amountDecimal);
          wallet.frozenBalance = frozenAfter.toString();
          break;

        case TransactionType.ADJUSTMENT:
          balanceAfter = balanceBefore.add(amountDecimal);
          wallet.availableBalance = balanceAfter.toString();
          break;
      }

      if (new Decimal(wallet.availableBalance).lessThan(0)) {
        throw new Error('Insufficient balance');
      }

      if (new Decimal(wallet.frozenBalance).lessThan(0)) {
        throw new Error('Insufficient frozen balance');
      }

      await queryRunner.manager.save(WalletEntity, wallet);

      const transaction = queryRunner.manager.create(WalletTransactionEntity, {
        walletId: wallet.id,
        type,
        amount: amountDecimal.toString(),
        balanceBefore: balanceBefore.toString(),
        balanceAfter: balanceAfter.toString(),
        frozenBefore: frozenBefore.toString(),
        frozenAfter: frozenAfter.toString(),
        taskId,
        description,
      });

      const savedTransaction = await queryRunner.manager.save(
        WalletTransactionEntity,
        transaction,
      );

      await queryRunner.commitTransaction();

      return savedTransaction;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async getTransactionHistory(
    userId: string,
    limit = 50,
    offset = 0,
  ): Promise<WalletTransactionEntity[]> {
    const wallet = await this.getWalletByUserId(userId);

    return this.transactionRepository.find({
      where: { walletId: wallet.id },
      order: { createdAt: 'DESC' },
      take: limit,
      skip: offset,
    });
  }
}
