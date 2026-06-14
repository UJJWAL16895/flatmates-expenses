-- ============================================================
-- Flatmates Shared Expenses — Database Schema
-- ============================================================
-- Design Principles:
--   1. NUMERIC(10,2) for all money — NEVER FLOAT
--   2. Soft deletes only — deleted_at timestamp
--   3. Membership has date ranges (joined_at / left_at)
--   4. Import rows stored raw before any processing
--   5. Every anomaly gets its own record with resolution tracking
--   6. Exchange rate locked at time of expense creation
-- ============================================================

-- Enable UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================================
-- 1. USERS
-- ============================================================
CREATE TABLE IF NOT EXISTS users (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email         TEXT UNIQUE NOT NULL,
  name          TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_color  TEXT DEFAULT '#8b5cf6',
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 2. GROUPS
-- ============================================================
CREATE TABLE IF NOT EXISTS groups (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  created_by  UUID REFERENCES users(id),
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  deleted_at  TIMESTAMPTZ  -- soft delete
);

-- ============================================================
-- 3. GROUP_MEMBERS
-- ============================================================
CREATE TABLE IF NOT EXISTS group_members (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id    UUID NOT NULL REFERENCES groups(id),
  user_id     UUID NOT NULL REFERENCES users(id),
  joined_at   DATE NOT NULL,
  left_at     DATE,          -- NULL = still active
  invited_by  UUID REFERENCES users(id),
  UNIQUE(group_id, user_id, joined_at)
);

-- ============================================================
-- 4. EXPENSES
-- ============================================================
CREATE TABLE IF NOT EXISTS expenses (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id              UUID NOT NULL REFERENCES groups(id),
  description           TEXT NOT NULL,
  total_amount          NUMERIC(10,2) NOT NULL,    -- original currency
  currency              TEXT NOT NULL DEFAULT 'INR',
  exchange_rate_to_inr  NUMERIC(10,4) NOT NULL DEFAULT 1.0,  -- 1.0 if INR
  total_amount_inr      NUMERIC(10,2) NOT NULL,    -- computed, stored
  paid_by_user_id       UUID REFERENCES users(id), -- nullable for missing payer
  split_type            TEXT NOT NULL CHECK (split_type IN ('equal', 'exact', 'percentage', 'shares')),
  expense_date          DATE NOT NULL,
  category              TEXT,
  notes                 TEXT,
  is_settlement         BOOLEAN DEFAULT FALSE,
  import_row_id         UUID,       -- FK added after import_rows table exists
  created_by            UUID REFERENCES users(id),
  created_at            TIMESTAMPTZ DEFAULT NOW(),
  deleted_at            TIMESTAMPTZ  -- soft delete: NEVER hard delete
);

-- ============================================================
-- 5. EXPENSE_SPLITS
-- ============================================================
CREATE TABLE IF NOT EXISTS expense_splits (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  expense_id        UUID NOT NULL REFERENCES expenses(id) ON DELETE CASCADE,
  user_id           UUID NOT NULL REFERENCES users(id),
  share_amount      NUMERIC(10,2),    -- for exact splits
  share_percentage  NUMERIC(5,2),     -- for percentage splits
  share_units       INTEGER,          -- for shares splits
  amount_owed_inr   NUMERIC(10,2) NOT NULL,  -- ALWAYS computed in INR
  is_settled        BOOLEAN DEFAULT FALSE,
  settled_at        TIMESTAMPTZ
);

-- ============================================================
-- 6. SETTLEMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS settlements (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id          UUID NOT NULL REFERENCES groups(id),
  paid_by_user_id   UUID NOT NULL REFERENCES users(id),
  paid_to_user_id   UUID NOT NULL REFERENCES users(id),
  amount_inr        NUMERIC(10,2) NOT NULL,
  settled_at        DATE NOT NULL,
  notes             TEXT,
  created_by        UUID REFERENCES users(id),
  created_at        TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- 7. IMPORT_SESSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS import_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id        UUID REFERENCES groups(id),
  filename        TEXT NOT NULL,
  uploaded_by     UUID REFERENCES users(id),
  uploaded_at     TIMESTAMPTZ DEFAULT NOW(),
  total_rows      INTEGER DEFAULT 0,
  imported_count  INTEGER DEFAULT 0,
  rejected_count  INTEGER DEFAULT 0,
  modified_count  INTEGER DEFAULT 0,
  status          TEXT DEFAULT 'processing'
                  CHECK (status IN ('processing', 'review', 'done', 'cancelled'))
);

-- ============================================================
-- 8. IMPORT_ROWS
-- ============================================================
CREATE TABLE IF NOT EXISTS import_rows (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id    UUID NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  row_number    INTEGER NOT NULL,
  raw_data      JSONB NOT NULL,       -- exactly what CSV had
  parsed_data   JSONB,                -- what we interpreted
  status        TEXT DEFAULT 'pending'
                CHECK (status IN ('pending', 'approved', 'rejected', 'modified')),
  expense_id    UUID REFERENCES expenses(id)  -- linked after import commit
);

-- Now add the FK from expenses to import_rows
ALTER TABLE expenses
  ADD CONSTRAINT fk_expenses_import_row
  FOREIGN KEY (import_row_id) REFERENCES import_rows(id);

-- ============================================================
-- 9. ANOMALIES
-- ============================================================
CREATE TABLE IF NOT EXISTS anomalies (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id        UUID NOT NULL REFERENCES import_sessions(id) ON DELETE CASCADE,
  import_row_id     UUID NOT NULL REFERENCES import_rows(id) ON DELETE CASCADE,
  anomaly_type      TEXT NOT NULL CHECK (anomaly_type IN (
    'DUPLICATE_EXACT',
    'DUPLICATE_CONFLICT',
    'SETTLEMENT_AS_EXPENSE',
    'MISSING_PAID_BY',
    'MISSING_CURRENCY',
    'AMOUNT_FORMAT_ERROR',
    'AMOUNT_PRECISION_ERROR',
    'UNKNOWN_PERSON',
    'PERCENTAGE_SUM_ERROR',
    'NEGATIVE_AMOUNT',
    'ZERO_AMOUNT',
    'AMBIGUOUS_DATE',
    'NONMEMBER_IN_SPLIT',
    'MEMBER_INACTIVE_ON_DATE',
    'SPLIT_TYPE_MISMATCH',
    'MISSING_EXCHANGE_RATE',
    'DEPOSIT_AS_EXPENSE'
  )),
  severity          TEXT NOT NULL CHECK (severity IN ('error', 'warning', 'info')),
  description       TEXT NOT NULL,
  suggested_action  TEXT,
  resolution        TEXT DEFAULT 'pending'
                    CHECK (resolution IN ('pending', 'approved', 'rejected', 'modified')),
  resolved_by       UUID REFERENCES users(id),
  resolved_at       TIMESTAMPTZ,
  resolver_notes    TEXT,
  related_row_id    UUID REFERENCES import_rows(id)  -- for duplicate pairs
);
