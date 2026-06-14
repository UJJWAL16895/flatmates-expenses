import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getGroups } from '@/lib/db/groups';
import { getExpensesByGroup } from '@/lib/db/expenses';
import { getGroupBalances } from '@/lib/db/balances';
import { getSettlementsByGroup } from '@/lib/db/settlements';
import pool from '@/lib/db/connection';

/**
 * Dashboard API — aggregates expenses, balances, and settlements
 * for the user's first group into a single response.
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const groups = await getGroups(userId);

    if (groups.length === 0) {
      return NextResponse.json({
        success: true,
        data: {
          total_expenses: 0,
          active_members: 0,
          user_balance: 0,
          settlements_due: 0,
          recent_expenses: [],
          settlement_suggestions: [],
          balances: [],
          has_completed_import: false,
          last_import_at: null,
        },
      });
    }

    const groupId = groups[0].id;

    // Fetch all data in parallel (including import status)
    const [expenses, balanceData, settlements, importResult] = await Promise.all([
      getExpensesByGroup(groupId, 10, 0), // last 10 for dashboard
      getGroupBalances(groupId),
      getSettlementsByGroup(groupId),
      pool.query(
        `SELECT id, uploaded_at, imported_count FROM import_sessions
         WHERE group_id = $1 AND status = 'done'
         ORDER BY uploaded_at DESC LIMIT 1`,
        [groupId]
      ),
    ]);

    // Calculate totals
    const totalExpenses = expenses.reduce(
      (sum, e) => sum + parseFloat(e.total_amount_inr as unknown as string),
      0
    );

    // Find the current user's balance
    const userBalance = balanceData.balances.find((b) => b.user_id === userId);

    // Import status
    const completedImport = importResult.rows[0] || null;

    return NextResponse.json({
      success: true,
      data: {
        total_expenses: totalExpenses,
        active_members: balanceData.balances.length,
        user_balance: userBalance?.net_balance_inr ?? 0,
        settlements_due: balanceData.suggestions.length,
        recent_expenses: expenses,
        settlement_suggestions: balanceData.suggestions,
        balances: balanceData.balances,
        has_completed_import: !!completedImport,
        last_import_at: completedImport?.uploaded_at || null,
      },
    });
  } catch (error) {
    console.error('GET /api/dashboard error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
