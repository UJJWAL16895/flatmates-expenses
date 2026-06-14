/**
 * Import DB Functions — CRUD for import_sessions, import_rows, anomalies
 */

import pool from './connection';
import type {
  ImportSession,
  ImportRow,
  Anomaly,
  RawCSVRow,
  ParsedRow,
  AnomalyType,
  AnomalySeverity,
  DetectedAnomaly,
} from '@/types';

// ---- Import Sessions ----

export async function createImportSession(
  groupId: string,
  filename: string,
  uploadedBy: string,
  totalRows: number
): Promise<ImportSession> {
  const result = await pool.query(
    `INSERT INTO import_sessions (group_id, filename, uploaded_by, total_rows, status)
     VALUES ($1, $2, $3, $4, 'processing')
     RETURNING *`,
    [groupId, filename, uploadedBy, totalRows]
  );
  return result.rows[0];
}

export async function getImportSession(id: string): Promise<ImportSession | null> {
  const result = await pool.query(
    'SELECT * FROM import_sessions WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function getImportSessionsByGroup(groupId: string): Promise<(ImportSession & { uploaded_by_name?: string })[]> {
  const result = await pool.query(
    `SELECT s.*, u.name AS uploaded_by_name
     FROM import_sessions s
     LEFT JOIN users u ON u.id = s.uploaded_by
     WHERE s.group_id = $1
     ORDER BY s.uploaded_at DESC`,
    [groupId]
  );
  return result.rows;
}

export async function updateImportSessionStatus(
  id: string,
  status: string,
  counts?: { imported?: number; rejected?: number; modified?: number }
): Promise<void> {
  const updates = ['status = $2'];
  const values: (string | number)[] = [id, status];
  let paramIdx = 3;

  if (counts?.imported !== undefined) {
    updates.push(`imported_count = $${paramIdx++}`);
    values.push(counts.imported);
  }
  if (counts?.rejected !== undefined) {
    updates.push(`rejected_count = $${paramIdx++}`);
    values.push(counts.rejected);
  }
  if (counts?.modified !== undefined) {
    updates.push(`modified_count = $${paramIdx++}`);
    values.push(counts.modified);
  }

  await pool.query(
    `UPDATE import_sessions SET ${updates.join(', ')} WHERE id = $1`,
    values
  );
}

export async function updateImportProgress(
  sessionId: string,
  step: number,
  totalSteps: number,
  message: string,
  rowsDone?: number,
  rowsTotal?: number
): Promise<void> {
  await pool.query(
    `UPDATE import_sessions
     SET progress_step = $2,
         progress_total = $3,
         progress_message = $4,
         progress_updated_at = NOW()
     WHERE id = $1`,
    [sessionId, step, totalSteps, message]
  );
}

export async function getImportProgress(sessionId: string): Promise<{
  step: number;
  total_steps: number;
  message: string;
  status: string;
  rows_done: number;
  rows_total: number;
} | null> {
  const result = await pool.query(
    `SELECT progress_step, progress_total, progress_message,
            status, imported_count, rejected_count, total_rows
     FROM import_sessions WHERE id = $1`,
    [sessionId]
  );
  const row = result.rows[0];
  if (!row) return null;
  return {
    step: row.progress_step || 0,
    total_steps: row.progress_total || 5,
    message: row.progress_message || '',
    status: row.status,
    rows_done: (row.imported_count || 0) + (row.rejected_count || 0),
    rows_total: row.total_rows || 0,
  };
}

// ---- Import Rows ----

export async function createImportRow(
  sessionId: string,
  rowNumber: number,
  rawData: RawCSVRow,
  parsedData: ParsedRow | null
): Promise<ImportRow> {
  const result = await pool.query(
    `INSERT INTO import_rows (session_id, row_number, raw_data, parsed_data, status)
     VALUES ($1, $2, $3, $4, 'pending')
     RETURNING *`,
    [sessionId, rowNumber, JSON.stringify(rawData), parsedData ? JSON.stringify(parsedData) : null]
  );
  return result.rows[0];
}

export async function getImportRows(sessionId: string): Promise<ImportRow[]> {
  const result = await pool.query(
    'SELECT * FROM import_rows WHERE session_id = $1 ORDER BY row_number',
    [sessionId]
  );
  return result.rows;
}

export async function getImportRow(id: string): Promise<ImportRow | null> {
  const result = await pool.query(
    'SELECT * FROM import_rows WHERE id = $1',
    [id]
  );
  return result.rows[0] || null;
}

export async function updateImportRowStatus(
  id: string,
  status: string,
  expenseId?: string
): Promise<void> {
  if (expenseId) {
    await pool.query(
      'UPDATE import_rows SET status = $2, expense_id = $3 WHERE id = $1',
      [id, status, expenseId]
    );
  } else {
    await pool.query(
      'UPDATE import_rows SET status = $2 WHERE id = $1',
      [id, status]
    );
  }
}

export async function updateImportRowParsedData(
  id: string,
  parsedData: ParsedRow
): Promise<void> {
  await pool.query(
    'UPDATE import_rows SET parsed_data = $2 WHERE id = $1',
    [id, JSON.stringify(parsedData)]
  );
}

// ---- Anomalies ----

export async function createAnomaly(
  sessionId: string,
  importRowId: string,
  anomalyType: AnomalyType,
  severity: AnomalySeverity,
  description: string,
  suggestedAction: string | null,
  relatedRowId?: string | null
): Promise<Anomaly> {
  const result = await pool.query(
    `INSERT INTO anomalies (
      session_id, import_row_id, anomaly_type, severity,
      description, suggested_action, resolution, related_row_id
    ) VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7)
    RETURNING *`,
    [sessionId, importRowId, anomalyType, severity, description, suggestedAction, relatedRowId || null]
  );
  return result.rows[0];
}

export async function getAnomaliesBySession(sessionId: string): Promise<Anomaly[]> {
  const result = await pool.query(
    `SELECT a.*, ir.row_number, ir.raw_data
     FROM anomalies a
     JOIN import_rows ir ON ir.id = a.import_row_id
     WHERE a.session_id = $1
     ORDER BY ir.row_number, a.anomaly_type`,
    [sessionId]
  );
  return result.rows;
}

export async function getAnomalyById(id: string): Promise<Anomaly | null> {
  const result = await pool.query(
    `SELECT a.*, ir.row_number, ir.raw_data
     FROM anomalies a
     JOIN import_rows ir ON ir.id = a.import_row_id
     WHERE a.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}

export async function resolveAnomaly(
  id: string,
  resolution: string,
  resolvedBy: string,
  resolverNotes?: string
): Promise<void> {
  await pool.query(
    `UPDATE anomalies SET
      resolution = $2,
      resolved_by = $3,
      resolved_at = NOW(),
      resolver_notes = $4
     WHERE id = $1`,
    [id, resolution, resolvedBy, resolverNotes || null]
  );
}

export async function getPendingAnomalies(sessionId: string): Promise<Anomaly[]> {
  const result = await pool.query(
    `SELECT a.*, ir.row_number, ir.raw_data
     FROM anomalies a
     JOIN import_rows ir ON ir.id = a.import_row_id
     WHERE a.session_id = $1 AND a.resolution = 'pending'
     ORDER BY ir.row_number`,
    [sessionId]
  );
  return result.rows;
}

/**
 * Store detected anomalies and link them to import rows.
 * Returns the row ID → anomaly mapping.
 */
export async function storeDetectedAnomalies(
  sessionId: string,
  importRows: ImportRow[],
  detectedAnomalies: Array<DetectedAnomaly & { row_number: number }>
): Promise<Anomaly[]> {
  const storedAnomalies: Anomaly[] = [];

  // Build row_number → import_row_id map
  const rowMap = new Map<number, string>();
  for (const row of importRows) {
    rowMap.set(row.row_number, row.id);
  }

  for (const detected of detectedAnomalies) {
    const importRowId = rowMap.get(detected.row_number);
    if (!importRowId) continue;

    // Find related row ID for duplicates
    let relatedRowId: string | null = null;
    if (detected.related_row_number) {
      relatedRowId = rowMap.get(detected.related_row_number) || null;
    }

    const anomaly = await createAnomaly(
      sessionId,
      importRowId,
      detected.anomaly_type,
      detected.severity,
      detected.description,
      detected.suggested_action,
      relatedRowId
    );

    storedAnomalies.push(anomaly);
  }

  return storedAnomalies;
}
