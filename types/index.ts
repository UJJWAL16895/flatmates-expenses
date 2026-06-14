// ============================================================
// Shared TypeScript Types — All interfaces matching DB schema
// ============================================================

// ---- Users ----
export interface User {
  id: string;
  email: string;
  name: string;
  password_hash: string;
  avatar_color: string;
  created_at: string;
}

export type UserPublic = Omit<User, 'password_hash'>;

// ---- Groups ----
export interface Group {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
}

export interface GroupWithMembers extends Group {
  members: GroupMember[];
}

// ---- Group Members ----
export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  joined_at: string;
  left_at: string | null;
  invited_by: string | null;
  // Joined from users table
  user_name?: string;
  user_email?: string;
  avatar_color?: string;
}

export interface MembershipRange {
  user_id: string;
  user_name: string;
  joined_at: string;
  left_at: string | null;
}

// ---- Expenses ----
export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';
export type Currency = 'INR' | 'USD';

export interface Expense {
  id: string;
  group_id: string;
  description: string;
  total_amount: number;       // original currency amount
  currency: Currency;
  exchange_rate_to_inr: number;
  total_amount_inr: number;   // computed, stored
  paid_by_user_id: string | null;
  split_type: SplitType;
  expense_date: string;
  category: string | null;
  notes: string | null;
  is_settlement: boolean;
  import_row_id: string | null;
  created_by: string;
  created_at: string;
  deleted_at: string | null;
}

export interface ExpenseWithSplits extends Expense {
  splits: ExpenseSplit[];
  paid_by_name?: string;
}

// ---- Expense Splits ----
export interface ExpenseSplit {
  id: string;
  expense_id: string;
  user_id: string;
  share_amount: number | null;     // for exact splits
  share_percentage: number | null; // for percentage splits
  share_units: number | null;      // for shares splits
  amount_owed_inr: number;         // ALWAYS computed in INR
  is_settled: boolean;
  settled_at: string | null;
  // Joined from users table
  user_name?: string;
}

// ---- Settlements ----
export interface Settlement {
  id: string;
  group_id: string;
  paid_by_user_id: string;
  paid_to_user_id: string;
  amount_inr: number;
  settled_at: string;
  notes: string | null;
  created_by: string;
  created_at: string;
  // Joined from users table
  paid_by_name?: string;
  paid_to_name?: string;
}

// ---- Balance Engine Types ----
// matrix[owedBy][owedTo] = amountINR (in cents for precision)
export type BalanceMatrix = Record<string, Record<string, number>>;

export interface UserBalance {
  user_id: string;
  user_name: string;
  avatar_color: string;
  net_balance_inr: number; // positive = owed money, negative = owes money
  owes: Array<{ to_user_id: string; to_name: string; amount_inr: number }>;
  owed_by: Array<{ from_user_id: string; from_name: string; amount_inr: number }>;
}

export interface SettlementSuggestion {
  from_user_id: string;
  from_name: string;
  to_user_id: string;
  to_name: string;
  amount_inr: number;
}

// ---- Import Types ----
export type ImportSessionStatus = 'processing' | 'review' | 'done' | 'cancelled';
export type ImportRowStatus = 'pending' | 'approved' | 'rejected' | 'modified';
export type AnomalyResolution = 'pending' | 'approved' | 'rejected' | 'modified';
export type AnomalySeverity = 'error' | 'warning' | 'info';

export type AnomalyType =
  | 'DUPLICATE_EXACT'
  | 'DUPLICATE_CONFLICT'
  | 'SETTLEMENT_AS_EXPENSE'
  | 'MISSING_PAID_BY'
  | 'MISSING_CURRENCY'
  | 'AMOUNT_FORMAT_ERROR'
  | 'AMOUNT_PRECISION_ERROR'
  | 'UNKNOWN_PERSON'
  | 'PERCENTAGE_SUM_ERROR'
  | 'NEGATIVE_AMOUNT'
  | 'ZERO_AMOUNT'
  | 'AMBIGUOUS_DATE'
  | 'NONMEMBER_IN_SPLIT'
  | 'MEMBER_INACTIVE_ON_DATE'
  | 'SPLIT_TYPE_MISMATCH'
  | 'MISSING_EXCHANGE_RATE'
  | 'DEPOSIT_AS_EXPENSE';

export interface ImportSession {
  id: string;
  group_id: string;
  filename: string;
  uploaded_by: string;
  uploaded_at: string;
  total_rows: number;
  imported_count: number;
  rejected_count: number;
  modified_count: number;
  status: ImportSessionStatus;
}

export interface ImportRow {
  id: string;
  session_id: string;
  row_number: number;
  raw_data: RawCSVRow;
  parsed_data: ParsedRow | null;
  status: ImportRowStatus;
  expense_id: string | null;
}

export interface RawCSVRow {
  date: string;
  description: string;
  paid_by: string;
  amount: string;
  currency: string;
  split_type: string;
  split_with: string;
  split_details: string;
  notes: string;
}

export interface ParsedRow {
  date: string | null;           // ISO date string or null if ambiguous
  description: string;
  paid_by: string;               // name as given
  amount: number | null;         // parsed number
  amount_raw: string;            // original string
  currency: Currency | null;
  split_type: SplitType | null;
  split_with: string[];          // array of names
  split_details: SplitDetail[];  // parsed split info
  notes: string;
  row_number: number;
}

export interface SplitDetail {
  name: string;
  value: number; // amount, percentage, or shares depending on type
}

export interface Anomaly {
  id: string;
  session_id: string;
  import_row_id: string;
  anomaly_type: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  suggested_action: string | null;
  resolution: AnomalyResolution;
  resolved_by: string | null;
  resolved_at: string | null;
  resolver_notes: string | null;
  related_row_id: string | null;
  // Joined data for UI display
  row_number?: number;
  raw_data?: RawCSVRow;
  related_raw_data?: RawCSVRow;
}

// Anomaly detector interface
export interface ImportContext {
  known_members: MembershipRange[];
  existing_rows: ParsedRow[];
  group_id: string;
  session_id: string;
}

export interface AnomalyDetector {
  type: AnomalyType;
  detect(row: ParsedRow, context: ImportContext): DetectedAnomaly | null;
}

export interface DetectedAnomaly {
  anomaly_type: AnomalyType;
  severity: AnomalySeverity;
  description: string;
  suggested_action: string;
  related_row_number?: number;
}

// ---- Import Report ----
export interface ImportReport {
  session: ImportSession;
  rows: ImportReportRow[];
  summary: ImportSummary;
}

export interface ImportReportRow {
  row_number: number;
  raw_data: RawCSVRow;
  anomalies: Anomaly[];
  action_taken: string;
  status: ImportRowStatus;
}

export interface ImportSummary {
  total_rows: number;
  imported: number;
  rejected: number;
  modified: number;
  anomalies_by_type: Record<AnomalyType, number>;
  settlements_created: number;
}

// ---- API Response Types ----
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

// ---- Dashboard Types ----
export interface DashboardData {
  total_expenses: number;
  total_settlements: number;
  active_members: number;
  user_balance: number;
  recent_expenses: ExpenseWithSplits[];
  settlement_suggestions: SettlementSuggestion[];
  balances: UserBalance[];
}
