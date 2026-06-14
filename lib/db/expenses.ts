import pool from './connection';
import type { Expense, ExpenseWithSplits, ExpenseSplit, SplitType, Currency } from '@/types';

export async function createExpense(
  groupId: string,
  description: string,
  totalAmount: number,
  currency: Currency,
  exchangeRate: number,
  paidByUserId: string | null,
  splitType: SplitType,
  expenseDate: string,
  category: string | null,
  notes: string | null,
  createdBy: string,
  importRowId?: string | null
): Promise<Expense> {
  const totalAmountInr = currency === 'USD'
    ? Math.round(totalAmount * exchangeRate * 100) / 100
    : totalAmount;

  const result = await pool.query(
    `INSERT INTO expenses (
      group_id, description, total_amount, currency, exchange_rate_to_inr,
      total_amount_inr, paid_by_user_id, split_type, expense_date,
      category, notes, created_by, import_row_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
    RETURNING *`,
    [
      groupId, description, totalAmount, currency, exchangeRate,
      totalAmountInr, paidByUserId, splitType, expenseDate,
      category, notes, createdBy, importRowId || null,
    ]
  );
  return result.rows[0];
}

export async function createExpenseSplit(
  expenseId: string,
  userId: string,
  shareAmount: number | null,
  sharePercentage: number | null,
  shareUnits: number | null,
  amountOwedInr: number
): Promise<ExpenseSplit> {
  const result = await pool.query(
    `INSERT INTO expense_splits (
      expense_id, user_id, share_amount, share_percentage,
      share_units, amount_owed_inr
    ) VALUES ($1, $2, $3, $4, $5, $6)
    RETURNING *`,
    [expenseId, userId, shareAmount, sharePercentage, shareUnits, amountOwedInr]
  );
  return result.rows[0];
}

export async function getExpensesByGroup(
  groupId: string,
  limit = 50,
  offset = 0
): Promise<ExpenseWithSplits[]> {
  const expensesResult = await pool.query(
    `SELECT e.*, u.name AS paid_by_name
     FROM expenses e
     LEFT JOIN users u ON u.id = e.paid_by_user_id
     WHERE e.group_id = $1 AND e.deleted_at IS NULL AND e.is_settlement = false
     ORDER BY e.expense_date DESC, e.created_at DESC
     LIMIT $2 OFFSET $3`,
    [groupId, limit, offset]
  );

  const expenses = expensesResult.rows;
  if (expenses.length === 0) return [];

  const expenseIds = expenses.map((e: Expense) => e.id);
  const splitsResult = await pool.query(
    `SELECT es.*, u.name AS user_name
     FROM expense_splits es
     JOIN users u ON u.id = es.user_id
     WHERE es.expense_id = ANY($1)
     ORDER BY u.name`,
    [expenseIds]
  );

  const splitsByExpense: Record<string, ExpenseSplit[]> = {};
  for (const split of splitsResult.rows) {
    if (!splitsByExpense[split.expense_id]) {
      splitsByExpense[split.expense_id] = [];
    }
    splitsByExpense[split.expense_id].push(split);
  }

  return expenses.map((e: Expense) => ({
    ...e,
    splits: splitsByExpense[e.id] || [],
  }));
}

export async function getExpenseById(id: string): Promise<ExpenseWithSplits | null> {
  const expenseResult = await pool.query(
    `SELECT e.*, u.name AS paid_by_name
     FROM expenses e
     LEFT JOIN users u ON u.id = e.paid_by_user_id
     WHERE e.id = $1 AND e.deleted_at IS NULL`,
    [id]
  );

  if (expenseResult.rows.length === 0) return null;

  const splitsResult = await pool.query(
    `SELECT es.*, u.name AS user_name
     FROM expense_splits es
     JOIN users u ON u.id = es.user_id
     WHERE es.expense_id = $1
     ORDER BY u.name`,
    [id]
  );

  return {
    ...expenseResult.rows[0],
    splits: splitsResult.rows,
  };
}

export async function updateExpense(
  id: string,
  description: string,
  totalAmount: number,
  currency: Currency,
  exchangeRate: number,
  splitType: SplitType,
  expenseDate: string,
  category: string | null,
  notes: string | null
): Promise<Expense> {
  const totalAmountInr = currency === 'USD'
    ? Math.round(totalAmount * exchangeRate * 100) / 100
    : totalAmount;

  const result = await pool.query(
    `UPDATE expenses SET
      description = $2, total_amount = $3, currency = $4,
      exchange_rate_to_inr = $5, total_amount_inr = $6,
      split_type = $7, expense_date = $8, category = $9, notes = $10
     WHERE id = $1 AND deleted_at IS NULL
     RETURNING *`,
    [id, description, totalAmount, currency, exchangeRate, totalAmountInr,
     splitType, expenseDate, category, notes]
  );
  return result.rows[0];
}

// SOFT DELETE — never hard delete
export async function softDeleteExpense(id: string): Promise<void> {
  await pool.query(
    'UPDATE expenses SET deleted_at = NOW() WHERE id = $1',
    [id]
  );
}

export async function deleteExpenseSplits(expenseId: string): Promise<void> {
  await pool.query(
    'DELETE FROM expense_splits WHERE expense_id = $1',
    [expenseId]
  );
}

/**
 * Get expenses for a specific user, filtered by membership dates.
 * This is the CRITICAL query that ensures Sam doesn't see pre-join expenses.
 */
export async function getExpensesForUserBalance(
  groupId: string,
  userId: string
): Promise<Array<{ expense_id: string; amount_owed_inr: number; expense_date: string; description: string; paid_by_user_id: string }>> {
  const result = await pool.query(
    `SELECT e.id AS expense_id, es.amount_owed_inr, e.expense_date,
            e.description, e.paid_by_user_id
     FROM expenses e
     JOIN expense_splits es ON es.expense_id = e.id
     JOIN group_members gm ON gm.user_id = es.user_id
       AND gm.group_id = e.group_id
     WHERE es.user_id = $1
       AND e.group_id = $2
       AND e.expense_date >= gm.joined_at
       AND (gm.left_at IS NULL OR e.expense_date <= gm.left_at)
       AND e.deleted_at IS NULL
       AND e.is_settlement = false
     ORDER BY e.expense_date DESC`,
    [userId, groupId]
  );
  return result.rows;
}
