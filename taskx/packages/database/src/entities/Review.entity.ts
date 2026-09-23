import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TaskEntity } from './Task.entity';
import { UserEntity } from './User.entity';

@Entity('reviews')
@Index(['taskId'])
@Index(['reviewerId'])
@Index(['reviewedId'])
export class ReviewEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  taskId: string;

  @Column({ type: 'uuid' })
  reviewerId: string;

  @Column({ type: 'uuid' })
  reviewedId: string;

  @Column({ type: 'integer', width: 1 })
  rating: number;

  @Column({ type: 'text', nullable: true })
  comment?: string;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => TaskEntity)
  @JoinColumn({ name: 'taskId' })
  task: TaskEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'reviewerId' })
  reviewer: UserEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'reviewedId' })
  reviewed: UserEntity;
}
