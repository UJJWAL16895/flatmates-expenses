import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { resolveAnomaly, getAnomaliesBySession, updateImportRowStatus } from '@/lib/db/import';

/**
 * Bulk resolve anomalies — handles "Auto-Fix All Warnings",
 * "Skip All Info", and "Apply Recommended Fix to All".
 */
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
    const body = await req.json();
    const { action } = body;

    if (!action || !['auto_fix_warnings', 'skip_all_info', 'apply_recommended'].includes(action)) {
      return NextResponse.json(
        { success: false, error: 'Invalid action. Must be: auto_fix_warnings, skip_all_info, or apply_recommended' },
        { status: 400 }
      );
    }

    const anomalies = await getAnomaliesBySession(sessionId);
    const pending = anomalies.filter((a) => a.resolution === 'pending');
    let resolved = 0;

    for (const anomaly of pending) {
      switch (action) {
        case 'auto_fix_warnings':
          // Auto-approve all warnings (accept the suggested fix)
          if (anomaly.severity === 'warning') {
            await resolveAnomaly(anomaly.id, 'approved', userId, 'Bulk: auto-fix warnings');
            // Handle settlement-type anomalies
            if (
              anomaly.anomaly_type === 'SETTLEMENT_AS_EXPENSE' ||
              anomaly.anomaly_type === 'DEPOSIT_AS_EXPENSE'
            ) {
              await updateImportRowStatus(anomaly.import_row_id, 'modified');
            }
            resolved++;
          }
          break;

        case 'skip_all_info':
          // Skip (approve) all info-level anomalies — they're non-critical
          if (anomaly.severity === 'info') {
            await resolveAnomaly(anomaly.id, 'approved', userId, 'Bulk: skip all info');
            resolved++;
          }
          break;

        case 'apply_recommended':
          // Apply the recommended action for ALL pending anomalies
          if (anomaly.severity === 'error') {
            // Errors → reject the row (safest default)
            await resolveAnomaly(anomaly.id, 'rejected', userId, 'Bulk: recommended fix');
            await updateImportRowStatus(anomaly.import_row_id, 'rejected');
          } else if (anomaly.severity === 'warning') {
            // Warnings → approve with suggested fix
            await resolveAnomaly(anomaly.id, 'approved', userId, 'Bulk: recommended fix');
            if (
              anomaly.anomaly_type === 'SETTLEMENT_AS_EXPENSE' ||
              anomaly.anomaly_type === 'DEPOSIT_AS_EXPENSE'
            ) {
              await updateImportRowStatus(anomaly.import_row_id, 'modified');
            }
          } else {
            // Info → approve (acknowledge)
            await resolveAnomaly(anomaly.id, 'approved', userId, 'Bulk: recommended fix');
          }
          resolved++;
          break;
      }
    }

    return NextResponse.json({
      success: true,
      data: { resolved, total_pending: pending.length },
      message: `Resolved ${resolved} anomalies`,
    });
  } catch (error) {
    console.error('POST /api/import/[sessionId]/resolve/bulk error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
