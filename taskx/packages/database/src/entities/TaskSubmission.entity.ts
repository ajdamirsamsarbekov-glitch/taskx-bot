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

@Entity('task_submissions')
@Index(['taskId'])
@Index(['executorId'])
export class TaskSubmissionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  taskId: string;

  @Column({ type: 'uuid' })
  executorId: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'jsonb', nullable: true })
  attachments?: string[];

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => TaskEntity)
  @JoinColumn({ name: 'taskId' })
  task: TaskEntity;

  @ManyToOne(() => UserEntity)
  @JoinColumn({ name: 'executorId' })
  executor: UserEntity;
}
