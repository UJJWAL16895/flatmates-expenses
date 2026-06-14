import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getImportSession, getImportRows, getAnomaliesBySession } from '@/lib/db/import';
import type { ImportReport, ImportReportRow, ImportSummary, AnomalyType } from '@/types';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { sessionId } = await params;

    const importSession = await getImportSession(sessionId);
    if (!importSession) {
      return NextResponse.json({ success: false, error: 'Session not found' }, { status: 404 });
    }

    const rows = await getImportRows(sessionId);
    const anomalies = await getAnomaliesBySession(sessionId);

    // Build per-row report
    const reportRows: ImportReportRow[] = rows.map((row) => {
      const rowAnomalies = anomalies.filter((a) => a.import_row_id === row.id);
      const actionTaken =
        row.status === 'approved'
          ? 'Imported'
          : row.status === 'rejected'
          ? 'Skipped'
          : row.status === 'modified'
          ? 'Imported with modifications'
          : 'Pending';

      return {
        row_number: row.row_number,
        raw_data: row.raw_data,
        anomalies: rowAnomalies,
        action_taken: actionTaken,
        status: row.status,
      };
    });

    // Build summary
    const anomaliesByType: Record<string, number> = {};
    for (const a of anomalies) {
      anomaliesByType[a.anomaly_type] = (anomaliesByType[a.anomaly_type] || 0) + 1;
    }

    const summary: ImportSummary = {
      total_rows: rows.length,
      imported: rows.filter((r) => r.status === 'approved').length,
      rejected: rows.filter((r) => r.status === 'rejected').length,
      modified: rows.filter((r) => r.status === 'modified').length,
      anomalies_by_type: anomaliesByType as Record<AnomalyType, number>,
      settlements_created: anomalies.filter(
        (a) =>
          (a.anomaly_type === 'SETTLEMENT_AS_EXPENSE' ||
            a.anomaly_type === 'DEPOSIT_AS_EXPENSE') &&
          a.resolution === 'approved'
      ).length,
    };

    const report: ImportReport = {
      session: importSession,
      rows: reportRows,
      summary,
    };

    return NextResponse.json({ success: true, data: report });
  } catch (error) {
    console.error('GET /api/import/[sessionId]/report error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
