import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserEntity, WalletEntity } from '@taskx/database';
import { UserStatus } from '@taskx/types';
import { nanoid } from 'nanoid';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    @InjectRepository(WalletEntity)
    private walletRepository: Repository<WalletEntity>,
  ) {}

  async findByTelegramId(telegramId: string): Promise<UserEntity | null> {
    return this.userRepository.findOne({
      where: { telegramId },
    });
  }

  async createUser(data: {
    telegramId: string;
    firstName?: string;
    lastName?: string;
    languageCode?: string;
  }): Promise<UserEntity> {
    const publicUsername = `User_${nanoid(8)}`;

    const user = this.userRepository.create({
      publicUsername,
      telegramId: data.telegramId,
      firstName: data.firstName,
      lastName: data.lastName,
      languageCode: data.languageCode || 'ru',
      status: UserStatus.ACTIVE,
    });

    const savedUser = await this.userRepository.save(user);

    const wallet = this.walletRepository.create({
      userId: savedUser.id,
      availableBalance: '0',
      frozenBalance: '0',
      earnedTotal: '0',
      spentTotal: '0',
    });

    await this.walletRepository.save(wallet);

    return savedUser;
  }

  async findOrCreateUser(data: {
    telegramId: string;
    firstName?: string;
    lastName?: string;
    languageCode?: string;
  }): Promise<UserEntity> {
    let user = await this.findByTelegramId(data.telegramId);

    if (!user) {
      user = await this.createUser(data);
    }

    return user;
  }

  async getUserById(userId: string): Promise<UserEntity> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new Error('User not found');
    }

    return user;
  }

  async updateUserStats(
    userId: string,
    updates: {
      completedTasks?: number;
      createdTasks?: number;
      cancelledTasks?: number;
      disputeCount?: number;
    },
  ): Promise<void> {
    await this.userRepository.update(userId, updates);
  }

  async updateUserRating(userId: string, newRating: number): Promise<void> {
    await this.userRepository.update(userId, {
      rating: newRating.toFixed(2),
    });
  }
}
