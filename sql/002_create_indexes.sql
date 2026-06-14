-- ============================================================
-- Performance Indexes
-- ============================================================

-- Users
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Groups
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);
CREATE INDEX IF NOT EXISTS idx_groups_deleted_at ON groups(deleted_at);

-- Group Members
CREATE INDEX IF NOT EXISTS idx_group_members_group_id ON group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user_id ON group_members(user_id);
CREATE INDEX IF NOT EXISTS idx_group_members_dates ON group_members(group_id, user_id, joined_at, left_at);

-- Expenses
CREATE INDEX IF NOT EXISTS idx_expenses_group_id ON expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_paid_by ON expenses(paid_by_user_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(expense_date);
CREATE INDEX IF NOT EXISTS idx_expenses_deleted_at ON expenses(deleted_at);
CREATE INDEX IF NOT EXISTS idx_expenses_group_date ON expenses(group_id, expense_date) WHERE deleted_at IS NULL;

-- Expense Splits
CREATE INDEX IF NOT EXISTS idx_expense_splits_expense_id ON expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user_id ON expense_splits(user_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_settled ON expense_splits(is_settled);

-- Settlements
CREATE INDEX IF NOT EXISTS idx_settlements_group_id ON settlements(group_id);
CREATE INDEX IF NOT EXISTS idx_settlements_paid_by ON settlements(paid_by_user_id);
CREATE INDEX IF NOT EXISTS idx_settlements_paid_to ON settlements(paid_to_user_id);

-- Import Sessions
CREATE INDEX IF NOT EXISTS idx_import_sessions_group_id ON import_sessions(group_id);
CREATE INDEX IF NOT EXISTS idx_import_sessions_status ON import_sessions(status);

-- Import Rows
CREATE INDEX IF NOT EXISTS idx_import_rows_session_id ON import_rows(session_id);
CREATE INDEX IF NOT EXISTS idx_import_rows_status ON import_rows(status);

-- Anomalies
CREATE INDEX IF NOT EXISTS idx_anomalies_session_id ON anomalies(session_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_row_id ON anomalies(import_row_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_resolution ON anomalies(resolution);
CREATE INDEX IF NOT EXISTS idx_anomalies_type ON anomalies(anomaly_type);
