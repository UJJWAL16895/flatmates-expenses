/**
 * POST /api/import/[sessionId]/commit — Commit approved rows to expenses/settlements
 */

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import {
  getImportSession,
  getImportRows,
  getAnomaliesBySession,
  updateImportSessionStatus,
  updateImportRowStatus,
} from '@/lib/db/import';
import { createExpense, createExpenseSplit } from '@/lib/db/expenses';
import { createSettlement } from '@/lib/db/settlements';
import { findUserByName } from '@/lib/db/users';
import {
  calculateEqualSplit,
  calculateExactSplit,
  calculateSharesSplit,
} from '@/lib/calculations/split-calculator';
import type { ParsedRow, Currency, SplitType } from '@/types';

const DEFAULT_GROUP_ID = '00000000-0000-0000-0000-000000000000';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const { sessionId } = await params;

    // Get session
    const importSession = await getImportSession(sessionId);
    if (!importSession) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    // Check for unresolved anomalies
    const anomalies = await getAnomaliesBySession(sessionId);
    const pendingAnomalies = anomalies.filter((a) => a.resolution === 'pending');

    if (pendingAnomalies.length > 0) {
      return NextResponse.json({
        success: false,
        error: `${pendingAnomalies.length} anomalies still need resolution before committing`,
        data: { pending_count: pendingAnomalies.length },
      }, { status: 400 });
    }

    // Get rows
    const rows = await getImportRows(sessionId);

    let importedCount = 0;
    let rejectedCount = 0;
    let modifiedCount = 0;
    let settlementsCreated = 0;

    for (const row of rows) {
      // Skip rejected rows
      if (row.status === 'rejected') {
        rejectedCount++;
        continue;
      }

      const parsed = row.parsed_data as ParsedRow | null;
      if (!parsed || !parsed.date || parsed.amount === null) {
        rejectedCount++;
        await updateImportRowStatus(row.id, 'rejected');
        continue;
      }

      // Check if this row should be a settlement
      const rowAnomalies = anomalies.filter((a) => a.import_row_id === row.id);
      const isSettlement = rowAnomalies.some(
        (a) =>
          (a.anomaly_type === 'SETTLEMENT_AS_EXPENSE' ||
            a.anomaly_type === 'DEPOSIT_AS_EXPENSE') &&
          a.resolution === 'approved'
      );

      try {
        if (isSettlement) {
          // Create settlement record (NOT an expense)
          const payerUser = await findUserByName(parsed.paid_by);
          const payeeUser = parsed.split_with[0]
            ? await findUserByName(parsed.split_with[0])
            : null;

          if (payerUser && payeeUser) {
            await createSettlement(
              DEFAULT_GROUP_ID,
              payerUser.id,
              payeeUser.id,
              Math.abs(parsed.amount),
              parsed.date,
              parsed.notes || null,
              userId
            );
            settlementsCreated++;
            await updateImportRowStatus(row.id, 'approved');
            importedCount++;
          } else {
            rejectedCount++;
            await updateImportRowStatus(row.id, 'rejected');
          }
          continue;
        }

        // Resolve user IDs
        const payerUser = await findUserByName(parsed.paid_by);
        if (!payerUser) {
          rejectedCount++;
          await updateImportRowStatus(row.id, 'rejected');
          continue;
        }

        const splitUserIds: string[] = [];
        for (const name of parsed.split_with) {
          const user = await findUserByName(name);
          if (user) {
            splitUserIds.push(user.id);
          }
        }

        if (splitUserIds.length === 0) {
          rejectedCount++;
          await updateImportRowStatus(row.id, 'rejected');
          continue;
        }

        // Determine currency and exchange rate
        const currency: Currency = parsed.currency || 'INR';
        const exchangeRate = (parsed as unknown as Record<string, unknown>).exchange_rate
          ? Number((parsed as unknown as Record<string, unknown>).exchange_rate)
          : currency === 'INR' ? 1 : 0;

        // Skip USD without exchange rate
        if (currency === 'USD' && exchangeRate === 0) {
          rejectedCount++;
          await updateImportRowStatus(row.id, 'rejected');
          continue;
        }

        const amount = Math.abs(parsed.amount);
        const totalAmountInr = currency === 'USD'
          ? Math.round(amount * exchangeRate * 100) / 100
          : amount;

        const splitType: SplitType = parsed.split_type || 'equal';

        // Create expense
        const expense = await createExpense(
          DEFAULT_GROUP_ID,
          parsed.description,
          amount,
          currency,
          exchangeRate || 1,
          payerUser.id,
          splitType,
          parsed.date,
          null,
          parsed.notes || null,
          userId,
          row.id
        );

        // Calculate and create splits
        let splits;
        switch (splitType) {
          case 'equal':
            splits = calculateEqualSplit(totalAmountInr, splitUserIds);
            break;
          case 'exact':
            splits = calculateExactSplit(
              totalAmountInr,
              parsed.split_details.map((d, i) => ({
                userId: splitUserIds[i] || splitUserIds[0],
                amount: d.value,
              }))
            );
            break;
          case 'shares':
            splits = calculateSharesSplit(
              totalAmountInr,
              parsed.split_details.map((d, i) => ({
                userId: splitUserIds[i] || splitUserIds[0],
                units: d.value,
              }))
            );
            break;
          default:
            splits = calculateEqualSplit(totalAmountInr, splitUserIds);
        }

        for (const split of splits) {
          await createExpenseSplit(
            expense.id,
            split.userId,
            split.shareAmount || null,
            split.sharePercentage || null,
            split.shareUnits || null,
            split.amountOwedInr
          );
        }

        if (row.status === 'modified') {
          modifiedCount++;
        }
        importedCount++;
        await updateImportRowStatus(row.id, 'approved', expense.id);
      } catch (err) {
        console.error(`Error importing row ${row.row_number}:`, err);
        rejectedCount++;
        await updateImportRowStatus(row.id, 'rejected');
      }
    }

    // Update session
    await updateImportSessionStatus(sessionId, 'done', {
      imported: importedCount,
      rejected: rejectedCount,
      modified: modifiedCount,
    });

    return NextResponse.json({
      success: true,
      data: {
        imported: importedCount,
        rejected: rejectedCount,
        modified: modifiedCount,
        settlements_created: settlementsCreated,
      },
    });
  } catch (error) {
    console.error('POST /api/import/[sessionId]/commit error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
