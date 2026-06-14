import pool from './connection';
import type { Settlement } from '@/types';

export async function createSettlement(
  groupId: string,
  paidByUserId: string,
  paidToUserId: string,
  amountInr: number,
  settledAt: string,
  notes: string | null,
  createdBy: string
): Promise<Settlement> {
  const result = await pool.query(
    `INSERT INTO settlements (
      group_id, paid_by_user_id, paid_to_user_id,
      amount_inr, settled_at, notes, created_by
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *`,
    [groupId, paidByUserId, paidToUserId, amountInr, settledAt, notes, createdBy]
  );
  return result.rows[0];
}

export async function getSettlementsByGroup(groupId: string): Promise<Settlement[]> {
  const result = await pool.query(
    `SELECT s.*,
            payer.name AS paid_by_name,
            payee.name AS paid_to_name
     FROM settlements s
     JOIN users payer ON payer.id = s.paid_by_user_id
     JOIN users payee ON payee.id = s.paid_to_user_id
     WHERE s.group_id = $1
     ORDER BY s.settled_at DESC`,
    [groupId]
  );
  return result.rows;
}

export async function getSettlementById(id: string): Promise<Settlement | null> {
  const result = await pool.query(
    `SELECT s.*,
            payer.name AS paid_by_name,
            payee.name AS paid_to_name
     FROM settlements s
     JOIN users payer ON payer.id = s.paid_by_user_id
     JOIN users payee ON payee.id = s.paid_to_user_id
     WHERE s.id = $1`,
    [id]
  );
  return result.rows[0] || null;
}
