import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
  OneToOne,
  JoinColumn,
} from 'typeorm';
import { UserEntity } from './User.entity';

@Entity('wallets')
@Index(['userId'], { unique: true })
export class WalletEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  userId: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  availableBalance: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  frozenBalance: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  earnedTotal: string;

  @Column({ type: 'decimal', precision: 15, scale: 2, default: 0 })
  spentTotal: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;

  @OneToOne(() => UserEntity)
  @JoinColumn({ name: 'userId' })
  user: UserEntity;
}
