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
import { DisputeStatus, DisputeResolution } from '@taskx/types';
import { TaskEntity } from './Task.entity';
import { UserEntity } from './User.entity';

@Entity('disputes')
@Index(['taskId'])
@Index(['status'])
export class DisputeEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  taskId: string;

  @Column({ type: 'uuid' })
  clientId: string;

  @Column({ type: 'uuid' })
  executorId: string;

  @Column({ type: 'text' })
  reason: string;

  @Column({ type: 'jsonb', nullable: true })
  clientEvidence?: string[];

  @Column({ type: 'jsonb', nullable: true })
  executorEvidence?: string[];

  @Column({
    type: 'enum',
    enum: DisputeStatus,
    default: DisputeStatus.OPEN,
  })
  status: DisputeStatus;

  @Column({
    type: 'enum',
    enum: DisputeResolution,
    nullable: true,
  })
  resolution?: DisputeResolution;

  @Column({ type: 'text', nullable: true })
  resolutionNote?: string;

  @Column({ type: 'uuid', nullable: true })
  resolvedBy?: string;

  @Column({ type: 'timestamp', nullable: true })
  resolvedAt?: Date;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @ManyToOne(() => TaskEntity)
  @JoinColumn({ name: 'taskId' })
  task: TaskEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'clientId' })
  client: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'executorId' })
  executor: UserEntity;
}
