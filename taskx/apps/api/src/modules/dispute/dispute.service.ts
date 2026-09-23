import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import { DisputeEntity, ReviewEntity, UserEntity } from '@taskx/database';
import { DisputeStatus, DisputeResolution } from '@taskx/types';
import { TaskService } from '../task/task.service';
import { WalletService } from '../wallet/wallet.service';
import Decimal from 'decimal.js';

@Injectable()
export class DisputeService {
  constructor(
    @InjectRepository(DisputeEntity)
    private disputeRepository: Repository<DisputeEntity>,
    @InjectRepository(ReviewEntity)
    private reviewRepository: Repository<ReviewEntity>,
    @InjectRepository(UserEntity)
    private userRepository: Repository<UserEntity>,
    private taskService: TaskService,
    private walletService: WalletService,
    private dataSource: DataSource,
  ) {}

  async createDispute(
    taskId: string,
    userId: string,
    reason: string,
    evidence?: string[],
  ): Promise<DisputeEntity> {
    const task = await this.taskService.getTaskById(taskId);

    if (!task.clientId || !task.executorId) {
      throw new Error('Task must have both client and executor');
    }

    const isClient = task.clientId === userId;
    const isExecutor = task.executorId === userId;

    if (!isClient && !isExecutor) {
      throw new Error('You are not part of this task');
    }

    const existingDispute = await this.disputeRepository.findOne({
      where: { taskId, status: DisputeStatus.OPEN },
    });

    if (existingDispute) {
      throw new Error('Dispute already exists for this task');
    }

    const dispute = this.disputeRepository.create({
      taskId,
      clientId: task.clientId,
      executorId: task.executorId,
      reason,
      clientEvidence: isClient ? evidence : undefined,
      executorEvidence: isExecutor ? evidence : undefined,
      status: DisputeStatus.OPEN,
    });

    return this.disputeRepository.save(dispute);
  }

  async addEvidence(
    disputeId: string,
    userId: string,
    evidence: string[],
  ): Promise<DisputeEntity> {
    const dispute = await this.disputeRepository.findOne({
      where: { id: disputeId },
    });

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    const isClient = dispute.clientId === userId;
    const isExecutor = dispute.executorId === userId;

    if (!isClient && !isExecutor) {
      throw new Error('You are not part of this dispute');
    }

    if (isClient) {
      dispute.clientEvidence = [...(dispute.clientEvidence || []), ...evidence];
    } else {
      dispute.executorEvidence = [
        ...(dispute.executorEvidence || []),
        ...evidence,
      ];
    }

    return this.disputeRepository.save(dispute);
  }

  async resolveDispute(
    disputeId: string,
    adminId: string,
    resolution: DisputeResolution,
    resolutionNote?: string,
    customSplit?: { clientAmount: string; executorAmount: string },
  ): Promise<DisputeEntity> {
    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const dispute = await queryRunner.manager.findOne(DisputeEntity, {
        where: { id: disputeId },
        lock: { mode: 'pessimistic_write' },
      });

      if (!dispute) {
        throw new Error('Dispute not found');
      }

      if (dispute.status !== DisputeStatus.OPEN) {
        throw new Error('Dispute is not open');
      }

      const task = await this.taskService.getTaskById(dispute.taskId);

      const totalAmount = new Decimal(task.price);
      const platformFee = new Decimal(task.platformFee);
      const executorPayout = new Decimal(task.executorPayout);

      switch (resolution) {
        case DisputeResolution.FAVOR_CLIENT:
          await this.walletService.refund(
            dispute.clientId,
            totalAmount.toString(),
            task.id,
            `Refund after dispute resolution: ${dispute.id}`,
          );
          break;

        case DisputeResolution.FAVOR_EXECUTOR:
          await this.walletService.platformFee(
            dispute.clientId,
            platformFee.toString(),
            task.id,
            `Platform fee after dispute resolution: ${dispute.id}`,
          );

          await this.walletService.releaseEscrow(
            dispute.executorId,
            executorPayout.toString(),
            task.id,
            `Payment after dispute resolution: ${dispute.id}`,
          );
          break;

        case DisputeResolution.SPLIT:
          const halfAmount = totalAmount.div(2);
          await this.walletService.refund(
            dispute.clientId,
            halfAmount.toString(),
            task.id,
            `50% refund after dispute resolution: ${dispute.id}`,
          );

          await this.walletService.releaseEscrow(
            dispute.executorId,
            halfAmount.toString(),
            task.id,
            `50% payment after dispute resolution: ${dispute.id}`,
          );
          break;

        case DisputeResolution.CUSTOM:
          if (!customSplit) {
            throw new Error('Custom split amounts required');
          }

          const clientAmount = new Decimal(customSplit.clientAmount);
          const executorAmount = new Decimal(customSplit.executorAmount);

          if (!clientAmount.add(executorAmount).equals(totalAmount)) {
            throw new Error('Split amounts must equal total amount');
          }

          if (clientAmount.greaterThan(0)) {
            await this.walletService.refund(
              dispute.clientId,
              clientAmount.toString(),
              task.id,
              `Custom refund after dispute resolution: ${dispute.id}`,
            );
          }

          if (executorAmount.greaterThan(0)) {
            await this.walletService.releaseEscrow(
              dispute.executorId,
              executorAmount.toString(),
              task.id,
              `Custom payment after dispute resolution: ${dispute.id}`,
            );
          }
          break;
      }

      dispute.status = DisputeStatus.RESOLVED;
      dispute.resolution = resolution;
      dispute.resolutionNote = resolutionNote;
      dispute.resolvedBy = adminId;
      dispute.resolvedAt = new Date();

      const savedDispute = await queryRunner.manager.save(
        DisputeEntity,
        dispute,
      );

      await queryRunner.commitTransaction();

      return savedDispute;
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }

  async createReview(
    taskId: string,
    reviewerId: string,
    reviewedId: string,
    rating: number,
    comment?: string,
  ): Promise<ReviewEntity> {
    if (rating < 1 || rating > 5) {
      throw new Error('Rating must be between 1 and 5');
    }

    const task = await this.taskService.getTaskById(taskId);

    if (task.clientId !== reviewerId && task.executorId !== reviewerId) {
      throw new Error('You are not part of this task');
    }

    const existingReview = await this.reviewRepository.findOne({
      where: { taskId, reviewerId },
    });

    if (existingReview) {
      throw new Error('You have already reviewed this task');
    }

    const review = this.reviewRepository.create({
      taskId,
      reviewerId,
      reviewedId,
      rating,
      comment,
    });

    const savedReview = await this.reviewRepository.save(review);

    await this.updateUserRating(reviewedId);

    return savedReview;
  }

  private async updateUserRating(userId: string): Promise<void> {
    const reviews = await this.reviewRepository.find({
      where: { reviewedId: userId },
    });

    if (reviews.length === 0) return;

    const totalRating = reviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / reviews.length;

    await this.userRepository.update(userId, {
      rating: averageRating.toFixed(2),
      reviewsCount: reviews.length,
    });
  }

  async getDisputeById(disputeId: string): Promise<DisputeEntity> {
    const dispute = await this.disputeRepository.findOne({
      where: { id: disputeId },
      relations: ['task', 'client', 'executor'],
    });

    if (!dispute) {
      throw new Error('Dispute not found');
    }

    return dispute;
  }

  async getTaskReviews(taskId: string): Promise<ReviewEntity[]> {
    return this.reviewRepository.find({
      where: { taskId },
      relations: ['reviewer', 'reviewed'],
    });
  }

  async getUserReviews(userId: string): Promise<ReviewEntity[]> {
    return this.reviewRepository.find({
      where: { reviewedId: userId },
      order: { createdAt: 'DESC' },
      take: 50,
    });
  }
}
