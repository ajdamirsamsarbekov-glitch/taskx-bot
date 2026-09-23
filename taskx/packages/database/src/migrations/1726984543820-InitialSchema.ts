import { MigrationInterface, QueryRunner } from 'typeorm';

export class InitialSchema1726984543820 implements MigrationInterface {
  name = 'InitialSchema1726984543820';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "user_status_enum" AS ENUM('ACTIVE', 'SUSPENDED', 'BLOCKED');
    `);

    await queryRunner.query(`
      CREATE TYPE "task_status_enum" AS ENUM(
        'DRAFT', 'PUBLISHED', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED',
        'COMPLETED', 'CANCELLED', 'EXPIRED', 'DISPUTED', 'REFUNDED'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "task_category_enum" AS ENUM(
        'DELIVERY', 'PURCHASE', 'COURIER', 'HELP', 'ONLINE',
        'IT', 'DESIGN', 'TEXT', 'PHOTO_VIDEO', 'OTHER'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "transaction_type_enum" AS ENUM(
        'DEPOSIT', 'WITHDRAW', 'ESCROW_LOCK', 'ESCROW_RELEASE',
        'REFUND', 'PLATFORM_FEE', 'ADJUSTMENT'
      );
    `);

    await queryRunner.query(`
      CREATE TYPE "dispute_status_enum" AS ENUM('OPEN', 'IN_REVIEW', 'RESOLVED', 'CLOSED');
    `);

    await queryRunner.query(`
      CREATE TYPE "dispute_resolution_enum" AS ENUM(
        'FAVOR_CLIENT', 'FAVOR_EXECUTOR', 'SPLIT', 'CUSTOM'
      );
    `);

    await queryRunner.query(`
      CREATE TABLE "users" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "publicUsername" varchar(50) UNIQUE NOT NULL,
        "telegramId" varchar(100) UNIQUE NOT NULL,
        "firstName" varchar(100),
        "lastName" varchar(100),
        "languageCode" varchar(10) DEFAULT 'ru',
        "status" user_status_enum DEFAULT 'ACTIVE',
        "rating" decimal(3, 2) DEFAULT 0,
        "reviewsCount" integer DEFAULT 0,
        "completedTasks" integer DEFAULT 0,
        "createdTasks" integer DEFAULT 0,
        "cancelledTasks" integer DEFAULT 0,
        "disputeCount" integer DEFAULT 0,
        "successRate" decimal(5, 2) DEFAULT 100,
        "trustScore" integer DEFAULT 100,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_users_telegram_id" ON "users"("telegramId");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_users_public_username" ON "users"("publicUsername");
    `);

    await queryRunner.query(`
      CREATE TABLE "wallets" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid UNIQUE NOT NULL,
        "availableBalance" decimal(15, 2) DEFAULT 0,
        "frozenBalance" decimal(15, 2) DEFAULT 0,
        "earnedTotal" decimal(15, 2) DEFAULT 0,
        "spentTotal" decimal(15, 2) DEFAULT 0,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now(),
        FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_wallets_user_id" ON "wallets"("userId");
    `);

    await queryRunner.query(`
      CREATE TABLE "wallet_transactions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "walletId" uuid NOT NULL,
        "type" transaction_type_enum NOT NULL,
        "amount" decimal(15, 2) NOT NULL,
        "balanceBefore" decimal(15, 2) NOT NULL,
        "balanceAfter" decimal(15, 2) NOT NULL,
        "frozenBefore" decimal(15, 2) NOT NULL,
        "frozenAfter" decimal(15, 2) NOT NULL,
        "taskId" uuid,
        "description" text,
        "metadata" jsonb,
        "createdAt" timestamp DEFAULT now(),
        FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_wallet_transactions_wallet_id" ON "wallet_transactions"("walletId");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_wallet_transactions_task_id" ON "wallet_transactions"("taskId");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_wallet_transactions_created_at" ON "wallet_transactions"("createdAt");
    `);

    await queryRunner.query(`
      CREATE TABLE "tasks" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "publicId" varchar(20) UNIQUE NOT NULL,
        "clientId" uuid NOT NULL,
        "executorId" uuid,
        "title" varchar(200) NOT NULL,
        "description" text NOT NULL,
        "category" task_category_enum NOT NULL,
        "price" decimal(15, 2) NOT NULL,
        "executorPayout" decimal(15, 2) NOT NULL,
        "platformFee" decimal(15, 2) NOT NULL,
        "deadline" timestamp NOT NULL,
        "location" jsonb,
        "attachments" jsonb,
        "status" task_status_enum DEFAULT 'DRAFT',
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now(),
        "acceptedAt" timestamp,
        "startedAt" timestamp,
        "submittedAt" timestamp,
        "completedAt" timestamp,
        "cancelledAt" timestamp,
        FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE,
        FOREIGN KEY ("executorId") REFERENCES "users"("id") ON DELETE SET NULL
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_tasks_public_id" ON "tasks"("publicId");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_tasks_client_id" ON "tasks"("clientId");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_tasks_executor_id" ON "tasks"("executorId");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_tasks_status" ON "tasks"("status");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_tasks_category" ON "tasks"("category");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_tasks_created_at" ON "tasks"("createdAt");
    `);

    await queryRunner.query(`
      CREATE TABLE "task_submissions" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "taskId" uuid NOT NULL,
        "executorId" uuid NOT NULL,
        "content" text NOT NULL,
        "attachments" jsonb,
        "createdAt" timestamp DEFAULT now(),
        FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE,
        FOREIGN KEY ("executorId") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_task_submissions_task_id" ON "task_submissions"("taskId");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_task_submissions_executor_id" ON "task_submissions"("executorId");
    `);

    await queryRunner.query(`
      CREATE TABLE "reviews" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "taskId" uuid NOT NULL,
        "reviewerId" uuid NOT NULL,
        "reviewedId" uuid NOT NULL,
        "rating" integer NOT NULL CHECK (rating >= 1 AND rating <= 5),
        "comment" text,
        "createdAt" timestamp DEFAULT now(),
        FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE,
        FOREIGN KEY ("reviewerId") REFERENCES "users"("id") ON DELETE CASCADE,
        FOREIGN KEY ("reviewedId") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_reviews_task_id" ON "reviews"("taskId");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_reviews_reviewer_id" ON "reviews"("reviewerId");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_reviews_reviewed_id" ON "reviews"("reviewedId");
    `);

    await queryRunner.query(`
      CREATE TABLE "disputes" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "taskId" uuid NOT NULL,
        "clientId" uuid NOT NULL,
        "executorId" uuid NOT NULL,
        "reason" text NOT NULL,
        "clientEvidence" jsonb,
        "executorEvidence" jsonb,
        "status" dispute_status_enum DEFAULT 'OPEN',
        "resolution" dispute_resolution_enum,
        "resolutionNote" text,
        "resolvedBy" uuid,
        "resolvedAt" timestamp,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now(),
        FOREIGN KEY ("taskId") REFERENCES "tasks"("id") ON DELETE CASCADE,
        FOREIGN KEY ("clientId") REFERENCES "users"("id") ON DELETE CASCADE,
        FOREIGN KEY ("executorId") REFERENCES "users"("id") ON DELETE CASCADE
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_disputes_task_id" ON "disputes"("taskId");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_disputes_status" ON "disputes"("status");
    `);

    await queryRunner.query(`
      CREATE TABLE "audit_logs" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" uuid,
        "action" varchar(100) NOT NULL,
        "entity" varchar(100),
        "entityId" uuid,
        "metadata" jsonb,
        "ipAddress" inet,
        "userAgent" text,
        "createdAt" timestamp DEFAULT now()
      );
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_audit_logs_user_id" ON "audit_logs"("userId");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_audit_logs_action" ON "audit_logs"("action");
    `);

    await queryRunner.query(`
      CREATE INDEX "idx_audit_logs_created_at" ON "audit_logs"("createdAt");
    `);

    await queryRunner.query(`
      CREATE TABLE "platform_settings" (
        "id" uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        "key" varchar(100) UNIQUE NOT NULL,
        "value" text NOT NULL,
        "description" text,
        "createdAt" timestamp DEFAULT now(),
        "updatedAt" timestamp DEFAULT now()
      );
    `);

    await queryRunner.query(`
      INSERT INTO "platform_settings" ("key", "value", "description") VALUES
        ('PLATFORM_FEE_PERCENT', '30', 'Platform commission percentage'),
        ('AUTO_COMPLETE_HOURS', '24', 'Hours before auto-completion after submission'),
        ('MIN_TASK_PRICE', '50', 'Minimum task price in currency'),
        ('MAX_TASK_PRICE', '50000', 'Maximum task price in currency');
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "platform_settings"`);
    await queryRunner.query(`DROP TABLE "audit_logs"`);
    await queryRunner.query(`DROP TABLE "disputes"`);
    await queryRunner.query(`DROP TABLE "reviews"`);
    await queryRunner.query(`DROP TABLE "task_submissions"`);
    await queryRunner.query(`DROP TABLE "tasks"`);
    await queryRunner.query(`DROP TABLE "wallet_transactions"`);
    await queryRunner.query(`DROP TABLE "wallets"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "dispute_resolution_enum"`);
    await queryRunner.query(`DROP TYPE "dispute_status_enum"`);
    await queryRunner.query(`DROP TYPE "transaction_type_enum"`);
    await queryRunner.query(`DROP TYPE "task_category_enum"`);
    await queryRunner.query(`DROP TYPE "task_status_enum"`);
    await queryRunner.query(`DROP TYPE "user_status_enum"`);
  }
}
