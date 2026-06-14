import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  createExpense,
  createExpenseSplit,
  getExpensesByGroup,
  deleteExpenseSplits,
} from '@/lib/db/expenses';
import { createExpenseSchema } from '@/lib/validations/expense.schema';
import {
  calculateEqualSplit,
  calculateExactSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
} from '@/lib/calculations/split-calculator';

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const groupId = searchParams.get('group_id');
    const limit = parseInt(searchParams.get('limit') || '50');
    const offset = parseInt(searchParams.get('offset') || '0');

    if (!groupId) {
      return NextResponse.json({ success: false, error: 'group_id is required' }, { status: 400 });
    }

    const expenses = await getExpensesByGroup(groupId, limit, offset);

    return NextResponse.json({ success: true, data: expenses });
  } catch (error) {
    console.error('GET /api/expenses error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const parsed = createExpenseSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const data = parsed.data;
    const userId = (session.user as { id: string }).id;
    const exchangeRate = data.currency === 'USD' ? (data.exchange_rate || 1) : 1;
    const totalAmountInr = data.currency === 'USD'
      ? Math.round(data.total_amount * exchangeRate * 100) / 100
      : data.total_amount;

    // Calculate splits based on type
    let splitResults;
    switch (data.split_type) {
      case 'equal':
        splitResults = calculateEqualSplit(
          totalAmountInr,
          data.splits.map((s) => s.user_id)
        );
        break;
      case 'exact':
        splitResults = calculateExactSplit(
          totalAmountInr,
          data.splits.map((s) => ({ userId: s.user_id, amount: s.amount || 0 }))
        );
        break;
      case 'percentage': {
        const pctResult = calculatePercentageSplit(
          totalAmountInr,
          data.splits.map((s) => ({ userId: s.user_id, percentage: s.percentage || 0 }))
        );
        if (!pctResult) {
          return NextResponse.json(
            { success: false, error: 'Percentages must sum to 100%' },
            { status: 400 }
          );
        }
        splitResults = pctResult;
        break;
      }
      case 'shares':
        splitResults = calculateSharesSplit(
          totalAmountInr,
          data.splits.map((s) => ({ userId: s.user_id, units: s.units || 1 }))
        );
        break;
    }

    // Create expense
    const expense = await createExpense(
      data.group_id,
      data.description,
      data.total_amount,
      data.currency,
      exchangeRate,
      data.paid_by_user_id,
      data.split_type,
      data.expense_date,
      data.category || null,
      data.notes || null,
      userId
    );

    // Create splits
    for (const split of splitResults) {
      await createExpenseSplit(
        expense.id,
        split.userId,
        split.shareAmount || null,
        split.sharePercentage || null,
        split.shareUnits || null,
        split.amountOwedInr
      );
    }

    return NextResponse.json({ success: true, data: expense }, { status: 201 });
  } catch (error) {
    console.error('POST /api/expenses error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
