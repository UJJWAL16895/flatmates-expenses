/**
 * Split Calculator — Pure functions for computing expense splits.
 *
 * All money handled in integer cents internally.
 * Remainder from uneven splits goes to the first person.
 */

import { toCents, fromCents } from '@/lib/utils';

export interface SplitResult {
  userId: string;
  amountOwedInr: number;
  shareAmount?: number;
  sharePercentage?: number;
  shareUnits?: number;
}

/**
 * Equal split: divide total equally among members.
 * Remainder cents go to the first member.
 */
export function calculateEqualSplit(
  totalAmountInr: number,
  memberUserIds: string[]
): SplitResult[] {
  const count = memberUserIds.length;
  if (count === 0) return [];

  const totalCents = toCents(totalAmountInr);
  const perPersonCents = Math.floor(totalCents / count);
  const remainderCents = totalCents - perPersonCents * count;

  return memberUserIds.map((userId, index) => ({
    userId,
    amountOwedInr: fromCents(perPersonCents + (index < remainderCents ? 1 : 0)),
  }));
}

/**
 * Exact split: each person's amount is specified.
 * Amounts should sum to totalAmountInr.
 */
export function calculateExactSplit(
  totalAmountInr: number,
  splits: Array<{ userId: string; amount: number }>
): SplitResult[] {
  return splits.map(s => ({
    userId: s.userId,
    amountOwedInr: s.amount,
    shareAmount: s.amount,
  }));
}

/**
 * Percentage split: each person has a percentage.
 * Percentages MUST sum to exactly 100.
 * Returns null if percentages don't sum to 100.
 */
export function calculatePercentageSplit(
  totalAmountInr: number,
  splits: Array<{ userId: string; percentage: number }>
): SplitResult[] | null {
  const totalPercentage = splits.reduce((sum, s) => sum + s.percentage, 0);

  // Block if not exactly 100%
  if (Math.abs(totalPercentage - 100) > 0.01) {
    return null;
  }

  const totalCents = toCents(totalAmountInr);
  let allocatedCents = 0;

  const results: SplitResult[] = splits.map((s, index) => {
    let cents: number;
    if (index === splits.length - 1) {
      // Last person gets the remainder to avoid rounding issues
      cents = totalCents - allocatedCents;
    } else {
      cents = Math.round((totalCents * s.percentage) / 100);
      allocatedCents += cents;
    }

    return {
      userId: s.userId,
      amountOwedInr: fromCents(cents),
      sharePercentage: s.percentage,
    };
  });

  return results;
}

/**
 * Shares split: each person has a number of share units.
 * Total is divided proportionally by units.
 */
export function calculateSharesSplit(
  totalAmountInr: number,
  splits: Array<{ userId: string; units: number }>
): SplitResult[] {
  const totalUnits = splits.reduce((sum, s) => sum + s.units, 0);
  if (totalUnits === 0) return [];

  const totalCents = toCents(totalAmountInr);
  let allocatedCents = 0;

  return splits.map((s, index) => {
    let cents: number;
    if (index === splits.length - 1) {
      cents = totalCents - allocatedCents;
    } else {
      cents = Math.floor((totalCents * s.units) / totalUnits);
      allocatedCents += cents;
    }

    return {
      userId: s.userId,
      amountOwedInr: fromCents(cents),
      shareUnits: s.units,
    };
  });
}

/**
 * Validate that percentage splits sum to 100%.
 * Returns the sum and the difference from 100.
 */
export function validatePercentageSum(
  percentages: number[]
): { valid: boolean; sum: number; diff: number } {
  const sum = percentages.reduce((a, b) => a + b, 0);
  const diff = sum - 100;
  return {
    valid: Math.abs(diff) < 0.01,
    sum,
    diff,
  };
}
