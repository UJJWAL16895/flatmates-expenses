/**
 * Seed sample data for a new user.
 * Creates a "Sample Group (Demo Data)" with demo expenses and splits.
 */

import pool from './connection';

const SAMPLE_EXPENSES = [
  {
    description: 'Monthly Rent - June',
    amount: 25000,
    date: '2025-06-01',
    category: 'Housing',
    split_type: 'equal',
    notes: 'Rent for flat #302',
  },
  {
    description: 'Groceries - BigBasket',
    amount: 3450.50,
    date: '2025-06-03',
    category: 'Groceries',
    split_type: 'equal',
    notes: 'Weekly groceries',
  },
  {
    description: 'Electricity Bill',
    amount: 2800,
    date: '2025-06-05',
    category: 'Utilities',
    split_type: 'equal',
    notes: 'May billing cycle',
  },
  {
    description: 'WiFi + Broadband',
    amount: 999,
    date: '2025-06-06',
    category: 'Internet',
    split_type: 'equal',
    notes: 'JioFiber monthly',
  },
  {
    description: 'Pizza Night 🍕',
    amount: 1200,
    date: '2025-06-08',
    category: 'Food',
    split_type: 'equal',
    notes: 'Dominos order',
  },
  {
    description: 'Cleaning Supplies',
    amount: 650,
    date: '2025-06-10',
    category: 'Cleaning',
    split_type: 'equal',
    notes: 'Mop, detergent, wipes',
  },
  {
    description: 'Movie Night',
    amount: 800,
    date: '2025-06-12',
    category: 'Entertainment',
    split_type: 'equal',
    notes: 'PVR tickets',
  },
  {
    description: 'Water Purifier Service',
    amount: 500,
    date: '2025-06-14',
    category: 'Utilities',
    split_type: 'equal',
    notes: 'Annual maintenance',
  },
];

// Demo flatmates (virtual users in the sample group)
const SAMPLE_MEMBERS = [
  { name: 'You', offset: 0 },
  { name: 'Alex', offset: 1 },
  { name: 'Jordan', offset: 2 },
];

export async function createSampleDataForUser(userId: string): Promise<string> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Create sample group
    const groupResult = await client.query(
      `INSERT INTO groups (name, created_by, is_sample)
       VALUES ($1, $2, true)
       RETURNING id`,
      ['Sample Group (Demo Data)', userId]
    );
    const groupId = groupResult.rows[0].id;

    // 2. Add the real user as a member
    const today = new Date().toISOString().split('T')[0];
    await client.query(
      `INSERT INTO group_members (group_id, user_id, joined_at)
       VALUES ($1, $2, $3)`,
      [groupId, userId, today]
    );

    // 3. Create virtual sample members (these are real users that exist)
    // For sample data, the real user is the payer for all expenses
    // and splits are just with themselves (simplified demo)

    // 4. Insert sample expenses paid by this user, split equally with themselves
    for (let i = 0; i < SAMPLE_EXPENSES.length; i++) {
      const exp = SAMPLE_EXPENSES[i];
      const amount = exp.amount;

      const expResult = await client.query(
        `INSERT INTO expenses (
          group_id, description, total_amount, currency, exchange_rate_to_inr,
          total_amount_inr, paid_by_user_id, split_type, expense_date,
          category, notes, created_by
        ) VALUES ($1, $2, $3, 'INR', 1.0, $3, $4, $5, $6, $7, $8, $4)
        RETURNING id`,
        [groupId, exp.description, amount, userId, exp.split_type, exp.date, exp.category, exp.notes]
      );
      const expenseId = expResult.rows[0].id;

      // Create a single split (user owes themselves — simplified for demo)
      const splitAmount = Math.round(amount * 100) / 100;
      await client.query(
        `INSERT INTO expense_splits (expense_id, user_id, share_amount, share_percentage, share_units, amount_owed_inr)
         VALUES ($1, $2, $3, 100, 1, $3)`,
        [expenseId, userId, splitAmount]
      );
    }

    // 5. Set this as the user's active group
    await client.query(
      'UPDATE users SET active_group_id = $2 WHERE id = $1',
      [userId, groupId]
    );

    await client.query('COMMIT');
    return groupId;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
