-- TaskX Database Schema for Supabase PostgreSQL
-- Migration from SQLite to PostgreSQL

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  telegram_id TEXT UNIQUE NOT NULL,
  public_username TEXT UNIQUE NOT NULL,
  first_name TEXT,
  balance DECIMAL(10, 2) DEFAULT 1000.00,
  frozen_balance DECIMAL(10, 2) DEFAULT 0.00,
  completed_tasks INTEGER DEFAULT 0,
  rating DECIMAL(3, 2) DEFAULT 5.00,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tasks table
CREATE TABLE IF NOT EXISTS tasks (
  id SERIAL PRIMARY KEY,
  public_id TEXT UNIQUE NOT NULL,
  client_id INTEGER NOT NULL,
  executor_id INTEGER,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price DECIMAL(10, 2) NOT NULL,
  executor_payout DECIMAL(10, 2) NOT NULL,
  platform_fee DECIMAL(10, 2) NOT NULL,
  status TEXT DEFAULT 'DRAFT',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (client_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (executor_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  type TEXT NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  task_id INTEGER,
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users(telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_public_username ON users(public_username);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_client_id ON tasks(client_id);
CREATE INDEX IF NOT EXISTS idx_tasks_executor_id ON tasks(executor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_transactions_task_id ON transactions(task_id);

-- Check constraints
ALTER TABLE tasks ADD CONSTRAINT check_price_positive CHECK (price >= 50);
ALTER TABLE tasks ADD CONSTRAINT check_status_valid CHECK (status IN ('DRAFT', 'PUBLISHED', 'ASSIGNED', 'IN_PROGRESS', 'SUBMITTED', 'COMPLETED', 'CANCELLED'));
ALTER TABLE transactions ADD CONSTRAINT check_type_valid CHECK (type IN ('DEPOSIT', 'WITHDRAW', 'ESCROW_LOCK', 'ESCROW_RELEASE', 'PLATFORM_FEE', 'REFUND'));
