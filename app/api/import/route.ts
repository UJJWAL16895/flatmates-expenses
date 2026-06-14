import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { parseCSV, transformRows } from '@/lib/import/parser';
import { detectAllAnomalies } from '@/lib/import/detectors';
import {
  createImportSession,
  createImportRow,
  updateImportSessionStatus,
  storeDetectedAnomalies,
  getImportSessionsByGroup,
} from '@/lib/db/import';
import { getMembershipRanges } from '@/lib/db/groups';
import { getGroups } from '@/lib/db/groups';
import pool from '@/lib/db/connection';

const DEFAULT_GROUP_ID = '00000000-0000-0000-0000-000000000000';

/**
 * GET /api/import — Return import session history for all of the user's groups
 */
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;
    const groups = await getGroups(userId);

    // Gather sessions across all groups
    const allSessions = [];
    for (const g of groups) {
      const sessions = await getImportSessionsByGroup(g.id);
      allSessions.push(...sessions);
    }

    // Sort by newest first
    allSessions.sort((a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime());

    return NextResponse.json({ success: true, data: allSessions });
  } catch (error) {
    console.error('GET /api/import error:', error);
    return NextResponse.json({ success: false, error: 'Internal server error' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const userId = (session.user as { id: string }).id;

    // Parse form data
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const groupId = (formData.get('group_id') as string) || DEFAULT_GROUP_ID;

    if (!file) {
      return NextResponse.json(
        { success: false, error: 'No CSV file provided' },
        { status: 400 }
      );
    }

    // Ensure the user is a member of this group
    await pool.query(
      `INSERT INTO group_members (group_id, user_id, joined_at)
       VALUES ($1, $2, '2026-02-01')
       ON CONFLICT (group_id, user_id, joined_at) DO NOTHING`,
      [groupId, userId]
    );

    // Read CSV content
    const csvText = await file.text();

    // Step 1: Parse CSV
    const rawRows = parseCSV(csvText);
    const parsedRows = transformRows(rawRows);

    // Step 2: Create import session
    const importSession = await createImportSession(
      groupId,
      file.name,
      userId,
      parsedRows.length
    );

    // Step 3: Store raw rows
    const importRows = [];
    for (let i = 0; i < rawRows.length; i++) {
      const importRow = await createImportRow(
        importSession.id,
        parsedRows[i].row_number,
        rawRows[i],
        parsedRows[i]
      );
      importRows.push(importRow);
    }

    // Step 4: Get membership data for context
    const membershipRanges = await getMembershipRanges(groupId);

    // Step 5: Run all anomaly detectors
    const context = {
      known_members: membershipRanges,
      existing_rows: parsedRows,
      group_id: groupId,
      session_id: importSession.id,
    };

    const detectedAnomalies = detectAllAnomalies(parsedRows, context);

    // Step 6: Store anomalies in DB
    const storedAnomalies = await storeDetectedAnomalies(
      importSession.id,
      importRows,
      detectedAnomalies
    );

    // Step 7: Update session status to review
    await updateImportSessionStatus(importSession.id, 'review');

    return NextResponse.json({
      success: true,
      data: {
        session_id: importSession.id,
        total_rows: parsedRows.length,
        anomalies_found: storedAnomalies.length,
        anomalies_by_type: detectedAnomalies.reduce(
          (acc, a) => {
            acc[a.anomaly_type] = (acc[a.anomaly_type] || 0) + 1;
            return acc;
          },
          {} as Record<string, number>
        ),
      },
    });
  } catch (error) {
    console.error('POST /api/import error:', error);
    return NextResponse.json(
      { success: false, error: 'Import failed: ' + (error as Error).message },
      { status: 500 }
    );
  }
}
