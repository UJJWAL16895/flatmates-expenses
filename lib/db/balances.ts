import pool from './connection';
import type { UserBalance, SettlementSuggestion } from '@/types';
import { getExpensesForUserBalance } from './expenses';
import { getSettlementsByGroup, } from './settlements';
import { getGroupMembers } from './groups';
import { calculateNetBalances, simplifyDebts } from '@/lib/calculations/balance-engine';

/**
 * Get full balance data for a group.
 * This queries expenses (filtered by membership dates), settlements,
 * and calculates net balances + settlement suggestions.
 */
export async function getGroupBalances(groupId: string): Promise<{
  balances: UserBalance[];
  suggestions: SettlementSuggestion[];
}> {
  const members = await getGroupMembers(groupId);
  const settlements = await getSettlementsByGroup(groupId);

  // Get all expenses with splits for this group
  const expensesResult = await pool.query(
    `SELECT e.id, e.paid_by_user_id, e.total_amount_inr, e.expense_date,
            es.user_id AS split_user_id, es.amount_owed_inr
     FROM expenses e
     JOIN expense_splits es ON es.expense_id = e.id
     JOIN group_members gm ON gm.user_id = es.user_id
       AND gm.group_id = e.group_id
     WHERE e.group_id = $1
       AND e.deleted_at IS NULL
       AND e.is_settlement = false
       AND e.expense_date >= gm.joined_at
       AND (gm.left_at IS NULL OR e.expense_date <= gm.left_at)
     ORDER BY e.expense_date`,
    [groupId]
  );

  // Build the data structures for the pure balance engine
  const expenseSplits = expensesResult.rows.map((row: { id: string; paid_by_user_id: string; split_user_id: string; amount_owed_inr: string }) => ({
    expense_id: row.id,
    paid_by_user_id: row.paid_by_user_id,
    split_user_id: row.split_user_id,
    amount_owed_inr: parseFloat(row.amount_owed_inr as string),
  }));

  const settlementData = settlements.map(s => ({
    paid_by_user_id: s.paid_by_user_id,
    paid_to_user_id: s.paid_to_user_id,
    amount_inr: parseFloat(s.amount_inr as unknown as string),
  }));

  const memberMap = new Map(
    members.map(m => [m.user_id, {
      name: m.user_name || '',
      avatar_color: m.avatar_color || '#8b5cf6',
    }])
  );

  const netBalances = calculateNetBalances(expenseSplits, settlementData, memberMap);
  const suggestions = simplifyDebts(netBalances, memberMap);

  const balances: UserBalance[] = Array.from(memberMap.entries()).map(([userId, info]) => {
    const net = netBalances.get(userId) || 0;
    return {
      user_id: userId,
      user_name: info.name,
      avatar_color: info.avatar_color,
      net_balance_inr: net,
      owes: suggestions
        .filter(s => s.from_user_id === userId)
        .map(s => ({ to_user_id: s.to_user_id, to_name: s.to_name, amount_inr: s.amount_inr })),
      owed_by: suggestions
        .filter(s => s.to_user_id === userId)
        .map(s => ({ from_user_id: s.from_user_id, from_name: s.from_name, amount_inr: s.amount_inr })),
    };
  });

  return { balances, suggestions };
}

/**
 * Get detailed balance breakdown for a specific user in a group
 */
export async function getUserBalanceDetail(
  groupId: string,
  userId: string
): Promise<{
  expenses: Array<{
    expense_id: string;
    description: string;
    expense_date: string;
    amount_owed_inr: number;
    paid_by_user_id: string;
  }>;
  total_owed: number;
  total_paid: number;
  net: number;
}> {
  const expenses = await getExpensesForUserBalance(groupId, userId);

  // Calculate what user paid vs what they owe
  const paidResult = await pool.query(
    `SELECT COALESCE(SUM(total_amount_inr), 0) AS total_paid
     FROM expenses
     WHERE group_id = $1
       AND paid_by_user_id = $2
       AND deleted_at IS NULL
       AND is_settlement = false`,
    [groupId, userId]
  );

  const totalOwed = expenses.reduce((sum, e) => sum + parseFloat(e.amount_owed_inr as unknown as string), 0);
  const totalPaid = parseFloat(paidResult.rows[0].total_paid);

  return {
    expenses,
    total_owed: totalOwed,
    total_paid: totalPaid,
    net: totalPaid - totalOwed,
  };
}
