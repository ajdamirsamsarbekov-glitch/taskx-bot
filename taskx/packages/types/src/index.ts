export enum UserStatus {
  ACTIVE = 'ACTIVE',
  SUSPENDED = 'SUSPENDED',
  BLOCKED = 'BLOCKED',
}

export enum TaskStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ASSIGNED = 'ASSIGNED',
  IN_PROGRESS = 'IN_PROGRESS',
  SUBMITTED = 'SUBMITTED',
  COMPLETED = 'COMPLETED',
  CANCELLED = 'CANCELLED',
  EXPIRED = 'EXPIRED',
  DISPUTED = 'DISPUTED',
  REFUNDED = 'REFUNDED',
}

export enum TransactionType {
  DEPOSIT = 'DEPOSIT',
  WITHDRAW = 'WITHDRAW',
  ESCROW_LOCK = 'ESCROW_LOCK',
  ESCROW_RELEASE = 'ESCROW_RELEASE',
  REFUND = 'REFUND',
  PLATFORM_FEE = 'PLATFORM_FEE',
  ADJUSTMENT = 'ADJUSTMENT',
}

export enum DisputeStatus {
  OPEN = 'OPEN',
  IN_REVIEW = 'IN_REVIEW',
  RESOLVED = 'RESOLVED',
  CLOSED = 'CLOSED',
}

export enum DisputeResolution {
  FAVOR_CLIENT = 'FAVOR_CLIENT',
  FAVOR_EXECUTOR = 'FAVOR_EXECUTOR',
  SPLIT = 'SPLIT',
  CUSTOM = 'CUSTOM',
}

export enum TaskCategory {
  DELIVERY = 'DELIVERY',
  PURCHASE = 'PURCHASE',
  COURIER = 'COURIER',
  HELP = 'HELP',
  ONLINE = 'ONLINE',
  IT = 'IT',
  DESIGN = 'DESIGN',
  TEXT = 'TEXT',
  PHOTO_VIDEO = 'PHOTO_VIDEO',
  OTHER = 'OTHER',
}

export enum NotificationType {
  TASK_CREATED = 'TASK_CREATED',
  TASK_ASSIGNED = 'TASK_ASSIGNED',
  TASK_STARTED = 'TASK_STARTED',
  TASK_SUBMITTED = 'TASK_SUBMITTED',
  TASK_COMPLETED = 'TASK_COMPLETED',
  TASK_CANCELLED = 'TASK_CANCELLED',
  TASK_EXPIRED = 'TASK_EXPIRED',
  DISPUTE_OPENED = 'DISPUTE_OPENED',
  DISPUTE_RESOLVED = 'DISPUTE_RESOLVED',
  PAYMENT_RECEIVED = 'PAYMENT_RECEIVED',
  WITHDRAWAL_COMPLETED = 'WITHDRAWAL_COMPLETED',
  DEADLINE_APPROACHING = 'DEADLINE_APPROACHING',
}

export interface User {
  id: string;
  publicUsername: string;
  telegramId: string;
  firstName?: string;
  lastName?: string;
  languageCode: string;
  status: UserStatus;
  rating: string;
  reviewsCount: number;
  completedTasks: number;
  createdTasks: number;
  cancelledTasks: number;
  disputeCount: number;
  successRate: string;
  trustScore: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface Wallet {
  id: string;
  userId: string;
  availableBalance: string;
  frozenBalance: string;
  earnedTotal: string;
  spentTotal: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  type: TransactionType;
  amount: string;
  balanceBefore: string;
  balanceAfter: string;
  frozenBefore: string;
  frozenAfter: string;
  taskId?: string;
  description?: string;
  metadata?: Record<string, any>;
  createdAt: Date;
}

export interface Task {
  id: string;
  publicId: string;
  clientId: string;
  executorId?: string;
  title: string;
  description: string;
  category: TaskCategory;
  price: string;
  executorPayout: string;
  platformFee: string;
  deadline: Date;
  location?: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  attachments?: string[];
  status: TaskStatus;
  createdAt: Date;
  updatedAt: Date;
  acceptedAt?: Date;
  startedAt?: Date;
  submittedAt?: Date;
  completedAt?: Date;
  cancelledAt?: Date;
}

export interface TaskSubmission {
  id: string;
  taskId: string;
  executorId: string;
  content: string;
  attachments?: string[];
  createdAt: Date;
}

export interface Review {
  id: string;
  taskId: string;
  reviewerId: string;
  reviewedId: string;
  rating: number;
  comment?: string;
  createdAt: Date;
}

export interface Dispute {
  id: string;
  taskId: string;
  clientId: string;
  executorId: string;
  reason: string;
  clientEvidence?: string[];
  executorEvidence?: string[];
  status: DisputeStatus;
  resolution?: DisputeResolution;
  resolutionNote?: string;
  resolvedBy?: string;
  resolvedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface PlatformSettings {
  feePercent: number;
  autoCompleteHours: number;
  minTaskPrice: number;
  maxTaskPrice: number;
}
