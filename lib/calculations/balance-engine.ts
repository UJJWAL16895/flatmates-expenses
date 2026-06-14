/**
 * Balance Engine — Pure functions, NO DB calls.
 *
 * All money is handled in integer cents internally to avoid
 * floating point errors. Results are returned in decimal INR.
 */

import type { SettlementSuggestion } from '@/types';
import { toCents, fromCents } from '@/lib/utils';

interface ExpenseSplitData {
  expense_id: string;
  paid_by_user_id: string;
  split_user_id: string;
  amount_owed_inr: number;
}

interface SettlementData {
  paid_by_user_id: string;
  paid_to_user_id: string;
  amount_inr: number;
}

/**
 * Calculate net balance for each user.
 * Positive = owed money (others owe you)
 * Negative = owes money (you owe others)
 *
 * Algorithm:
 * 1. For each expense, the payer gets credit (+) equal to total
 * 2. Each person in the split gets debited (-) their share
 * 3. Settlements: payer gets credit, receiver gets debit
 * 4. Net = total credits - total debits
 */
export function calculateNetBalances(
  expenseSplits: ExpenseSplitData[],
  settlements: SettlementData[],
  memberMap: Map<string, { name: string; avatar_color: string }>
): Map<string, number> {
  const balances = new Map<string, number>();

  // Initialize all members to 0
  for (const [userId] of memberMap) {
    balances.set(userId, 0);
  }

  // Track what each person has paid and what they owe
  // Group splits by expense to figure out total per expense
  const expensePayments = new Map<string, { payer: string; total_cents: number }>();

  for (const split of expenseSplits) {
    const owedCents = toCents(split.amount_owed_inr);

    // Debit the person who owes
    const currentDebt = balances.get(split.split_user_id) || 0;
    balances.set(split.split_user_id, currentDebt - owedCents);

    // Track total per expense for payer credit
    if (!expensePayments.has(split.expense_id)) {
      expensePayments.set(split.expense_id, {
        payer: split.paid_by_user_id,
        total_cents: 0,
      });
    }
    const ep = expensePayments.get(split.expense_id)!;
    ep.total_cents += owedCents;
  }

  // Credit the payer for each expense
  for (const [, ep] of expensePayments) {
    const currentCredit = balances.get(ep.payer) || 0;
    balances.set(ep.payer, currentCredit + ep.total_cents);
  }

  // Apply settlements
  for (const settlement of settlements) {
    const amountCents = toCents(settlement.amount_inr);

    // Payer made a payment — reduces what they owe (positive adjustment)
    const payerBalance = balances.get(settlement.paid_by_user_id) || 0;
    balances.set(settlement.paid_by_user_id, payerBalance + amountCents);

    // Receiver received payment — reduces what they're owed (negative adjustment)
    const receiverBalance = balances.get(settlement.paid_to_user_id) || 0;
    balances.set(settlement.paid_to_user_id, receiverBalance - amountCents);
  }

  // Convert back from cents to decimal
  const result = new Map<string, number>();
  for (const [userId, cents] of balances) {
    result.set(userId, fromCents(cents));
  }

  return result;
}

/**
 * Minimum Transactions Algorithm (Debt Simplification)
 *
 * Given net balances, find the minimum number of transactions
 * to settle all debts.
 *
 * Algorithm:
 * 1. Separate into creditors (positive balance) and debtors (negative)
 * 2. Sort creditors descending, debtors ascending (by absolute value)
 * 3. Match largest creditor with largest debtor
 * 4. Create settlement for min(credit, |debt|)
 * 5. Adjust balances and repeat
 */
export function simplifyDebts(
  netBalances: Map<string, number>,
  memberMap: Map<string, { name: string; avatar_color: string }>
): SettlementSuggestion[] {
  const suggestions: SettlementSuggestion[] = [];

  // Work in cents for precision
  const creditors: Array<{ userId: string; cents: number }> = [];
  const debtors: Array<{ userId: string; cents: number }> = [];

  for (const [userId, balance] of netBalances) {
    const cents = toCents(balance);
    if (cents > 0) {
      creditors.push({ userId, cents });
    } else if (cents < 0) {
      debtors.push({ userId, cents: Math.abs(cents) });
    }
  }

  // Sort descending by amount
  creditors.sort((a, b) => b.cents - a.cents);
  debtors.sort((a, b) => b.cents - a.cents);

  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];

    const settlementCents = Math.min(creditor.cents, debtor.cents);

    if (settlementCents > 0) {
      const creditorInfo = memberMap.get(creditor.userId);
      const debtorInfo = memberMap.get(debtor.userId);

      suggestions.push({
        from_user_id: debtor.userId,
        from_name: debtorInfo?.name || 'Unknown',
        to_user_id: creditor.userId,
        to_name: creditorInfo?.name || 'Unknown',
        amount_inr: fromCents(settlementCents),
      });
    }

    creditor.cents -= settlementCents;
    debtor.cents -= settlementCents;

    if (creditor.cents === 0) i++;
    if (debtor.cents === 0) j++;
  }

  return suggestions;
}
