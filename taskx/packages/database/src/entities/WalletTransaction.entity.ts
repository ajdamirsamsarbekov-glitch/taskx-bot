import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { TransactionType } from '@taskx/types';
import { WalletEntity } from './Wallet.entity';

@Entity('wallet_transactions')
@Index(['walletId'])
@Index(['taskId'])
@Index(['createdAt'])
export class WalletTransactionEntity {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'uuid' })
  walletId: string;

  @Column({
    type: 'enum',
    enum: TransactionType,
  })
  type: TransactionType;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  amount: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  balanceBefore: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  balanceAfter: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  frozenBefore: string;

  @Column({ type: 'decimal', precision: 15, scale: 2 })
  frozenAfter: string;

  @Column({ type: 'uuid', nullable: true })
  taskId?: string;

  @Column({ type: 'text', nullable: true })
  description?: string;

  @Column({ type: 'jsonb', nullable: true })
  metadata?: Record<string, any>;

  @CreateDateColumn()
  createdAt: Date;

  @ManyToOne(() => WalletEntity)
  @JoinColumn({ name: 'walletId' })
  wallet: WalletEntity;
}
