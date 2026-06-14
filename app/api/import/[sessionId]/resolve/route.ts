import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { resolveAnomaly, getAnomalyById, updateImportRowStatus, updateImportRowParsedData, getImportRow } from '@/lib/db/import';
import { resolveAnomalySchema } from '@/lib/validations/import.schema';

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
    const parsed = resolveAnomalySchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { success: false, error: parsed.error.issues[0].message },
        { status: 400 }
      );
    }

    const { anomaly_id, resolution, resolver_notes, corrected_data } = parsed.data;

    // Get the anomaly
    const anomaly = await getAnomalyById(anomaly_id);
    if (!anomaly) {
      return NextResponse.json({ success: false, error: 'Anomaly not found' }, { status: 404 });
    }

    // Resolve the anomaly
    await resolveAnomaly(anomaly_id, resolution, userId, resolver_notes);

    // Handle row status based on resolution
    if (resolution === 'rejected') {
      // User chose to skip this row
      await updateImportRowStatus(anomaly.import_row_id, 'rejected');
    } else if (resolution === 'modified' && corrected_data) {
      // User provided corrections — update parsed data
      const importRow = await getImportRow(anomaly.import_row_id);
      if (importRow && importRow.parsed_data) {
        const updatedParsed = { ...(importRow.parsed_data as object) } as Record<string, unknown>;

        if (corrected_data.paid_by !== undefined) updatedParsed.paid_by = corrected_data.paid_by;
        if (corrected_data.amount !== undefined) updatedParsed.amount = corrected_data.amount;
        if (corrected_data.currency !== undefined) updatedParsed.currency = corrected_data.currency;
        if (corrected_data.date !== undefined) updatedParsed.date = corrected_data.date;
        if (corrected_data.exchange_rate !== undefined) updatedParsed.exchange_rate = corrected_data.exchange_rate;

        await updateImportRowParsedData(
          anomaly.import_row_id,
          updatedParsed as unknown as import('@/types').ParsedRow
        );
        await updateImportRowStatus(anomaly.import_row_id, 'modified');
      }
    } else if (resolution === 'approved') {
      // Keep as is or with suggested fix
      const action = corrected_data?.action;

      if (action === 'import_as_settlement') {
        await updateImportRowStatus(anomaly.import_row_id, 'modified');
      } else if (action === 'skip') {
        await updateImportRowStatus(anomaly.import_row_id, 'rejected');
      }
      // Otherwise leave as pending/approved for commit phase
    }

    return NextResponse.json({
      success: true,
      message: `Anomaly ${resolution}`,
    });
  } catch (error) {
    console.error('POST /api/import/[sessionId]/resolve error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}
