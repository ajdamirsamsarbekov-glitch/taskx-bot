import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TaskStatus, TaskCategory } from '@taskx/types';
import { UserEntity } from './User.entity';

@Entity('tasks')
@Index(['publicId'], { unique: true })
@Index(['clientId'])
@Index(['executorId'])
@Index(['status'])
@Index(['category'])
@Index(['createdAt'])
export class TaskEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'varchar', length: 20, unique: true })
  publicId: string;

  @Column({ type: 'uuid' })
  clientId: string;

  @Column({ type: 'uuid', nullable: true })
  executorId?: string;

  @Column({ type: 'varchar', length: 200 })
  title: string;

  @Column({ type: 'text' })
  description: string;

  @Column({
    type: 'enum',
    enum: TaskCategory,
  })
  category: TaskCategory;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  price: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  executorPayout: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  platformFee: string;

  @Column({ type: 'timestamp' })
  deadline: Date;

  @Column({ type: 'jsonb', nullable: true })
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };

  @Column({ type: 'jsonb', nullable: true })
  attachments?: string[];

  @Column({
    type: 'enum',
    enum: TaskStatus,
    default: TaskStatus.DRAFT,
  })
  status: TaskStatus;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  acceptedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  startedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  cancelledAt?: Date;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'clientId' })
  client: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'executorId' })
  executor?: UserEntity;
}
