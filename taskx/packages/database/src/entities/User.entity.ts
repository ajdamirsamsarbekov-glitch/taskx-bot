import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  OneToMany,
} from 'typeorm';
import { UserStatus } from '@taskx/types';

@Entity('users')
@Index(['telegramId'], { unique: true })
@Index(['publicUsername'], { unique: true })
export class UserEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 50, unique: true })
  publicUsername: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  telegramId: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  firstName?: string;

  @Column({ type: 'varchar', length: 100, nullable: true })
  lastName?: string;

  @Column({ type: 'varchar', length: 10, default: 'ru' })
  languageCode: string;

  @Column({
    type: 'enum',
    enum: UserStatus,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ type: 'decimal', precision: 3, scale: 2, default: 0 })
  rating: string;

  @Column({ type: 'integer', default: 0 })
  reviewsCount: number;

  @Column({ type: 'integer', default: 0 })
  completedTasks: number;

  @Column({ type: 'integer', default: 0 })
  createdTasks: number;

  @Column({ type: 'integer', default: 0 })
  cancelledTasks: number;

  @Column({ type: 'integer', default: 0 })
  disputeCount: number;

  @Column({ type: 'decimal', precision: 5, scale: 2, default: 100 })
  successRate: string;

  @Column({ type: 'integer', default: 100 })
  trustScore: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
