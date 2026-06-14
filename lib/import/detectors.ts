/**
 * Anomaly Detectors — All 17 types.
 * Each detector follows the AnomalyDetector interface.
 * Detectors receive a parsed row + context and return an anomaly or null.
 */

import type {
  ParsedRow,
  ImportContext,
  DetectedAnomaly,
  AnomalyDetector,
  MembershipRange,
} from '@/types';

// ---- Settlement keyword patterns ----
const SETTLEMENT_KEYWORDS = [
  'paid back', 'paid .* back', 'settlement', 'settled',
  'repaid', 'reimbursed', 'payback', 'pay back',
];

const DEPOSIT_KEYWORDS = [
  'deposit', 'security deposit', 'advance',
];

// ---- Helper: fuzzy name match ----
function fuzzyMatch(name: string, knownNames: string[]): string | null {
  const lower = name.toLowerCase().trim();
  for (const known of knownNames) {
    const knownLower = known.toLowerCase();
    if (knownLower === lower) return known;
    // Check if one contains the other (e.g., "Priya S" contains "Priya")
    if (knownLower.includes(lower) || lower.includes(knownLower)) return known;
    // Check first name match
    const knownFirst = knownLower.split(' ')[0];
    const nameFirst = lower.split(' ')[0];
    if (knownFirst === nameFirst && nameFirst.length >= 3) return known;
  }
  return null;
}

function isMemberActiveOnDate(
  userId: string,
  date: string,
  members: MembershipRange[]
): boolean {
  const member = members.find((m) => m.user_id === userId);
  if (!member) return false;
  if (date < member.joined_at) return false;
  if (member.left_at && date > member.left_at) return false;
  return true;
}

function getMemberByName(
  name: string,
  members: MembershipRange[]
): MembershipRange | null {
  const lower = name.toLowerCase().trim();
  return members.find((m) => m.user_name.toLowerCase() === lower) || null;
}

// ============================================================
// 1. DUPLICATE_EXACT
// Same date + same paid_by + same amount + similar description
// ============================================================
const duplicateExactDetector: AnomalyDetector = {
  type: 'DUPLICATE_EXACT',
  detect(row: ParsedRow, context: ImportContext): DetectedAnomaly | null {
    for (const other of context.existing_rows) {
      if (other.row_number >= row.row_number) continue; // only check earlier rows
      if (
        other.date === row.date &&
        other.paid_by.toLowerCase() === row.paid_by.toLowerCase() &&
        other.amount === row.amount &&
        other.amount !== null &&
        areSimilarDescriptions(other.description, row.description)
      ) {
        return {
          anomaly_type: 'DUPLICATE_EXACT',
          severity: 'warning',
          description: `Row ${row.row_number} appears to be a duplicate of Row ${other.row_number}. ` +
            `Both are "${row.description}" / "${other.description}" for ${row.amount} by ${row.paid_by} on ${row.date}.`,
          suggested_action: `Keep Row ${other.row_number}, skip Row ${row.row_number}`,
          related_row_number: other.row_number,
        };
      }
    }
    return null;
  },
};

function areSimilarDescriptions(a: string, b: string): boolean {
  const normalize = (s: string) =>
    s.toLowerCase().replace(/[^a-z0-9]/g, '').trim();
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return true;
  // Check if one contains the other
  if (na.includes(nb) || nb.includes(na)) return true;
  // Check word overlap
  const wordsA = new Set(a.toLowerCase().split(/\s+/));
  const wordsB = new Set(b.toLowerCase().split(/\s+/));
  let overlap = 0;
  for (const w of wordsA) {
    if (wordsB.has(w) && w.length > 2) overlap++;
  }
  return overlap >= 2;
}

// ============================================================
// 2. DUPLICATE_CONFLICT
// Same date + similar description + DIFFERENT amount or payer
// ============================================================
const duplicateConflictDetector: AnomalyDetector = {
  type: 'DUPLICATE_CONFLICT',
  detect(row: ParsedRow, context: ImportContext): DetectedAnomaly | null {
    for (const other of context.existing_rows) {
      if (other.row_number >= row.row_number) continue;
      if (
        other.date === row.date &&
        areSimilarDescriptions(other.description, row.description) &&
        other.amount !== row.amount &&
        other.amount !== null &&
        row.amount !== null
      ) {
        // Make sure it wasn't already caught as exact duplicate
        if (
          other.paid_by.toLowerCase() === row.paid_by.toLowerCase() &&
          other.amount === row.amount
        )
          continue;

        return {
          anomaly_type: 'DUPLICATE_CONFLICT',
          severity: 'error',
          description: `Row ${row.row_number} conflicts with Row ${other.row_number}. ` +
            `"${row.description}" (₹${row.amount} by ${row.paid_by}) vs ` +
            `"${other.description}" (₹${other.amount} by ${other.paid_by}). ` +
            `Same event, different amounts.`,
          suggested_action: `Review both rows and keep the correct one`,
          related_row_number: other.row_number,
        };
      }
    }
    return null;
  },
};

// ============================================================
// 3. SETTLEMENT_AS_EXPENSE
// Description contains settlement keywords OR no split_type
// AND split_with is a single person
// ============================================================
const settlementAsExpenseDetector: AnomalyDetector = {
  type: 'SETTLEMENT_AS_EXPENSE',
  detect(row: ParsedRow): DetectedAnomaly | null {
    const desc = row.description.toLowerCase();
    const isSettlement = SETTLEMENT_KEYWORDS.some((kw) =>
      new RegExp(kw, 'i').test(desc)
    );
    const singleSplit = row.split_with.length === 1;
    const noSplitType = !row.split_type;

    if (isSettlement || (noSplitType && singleSplit)) {
      return {
        anomaly_type: 'SETTLEMENT_AS_EXPENSE',
        severity: 'error',
        description: `Row ${row.row_number} "${row.description}" looks like a settlement, not an expense. ` +
          `${row.paid_by} → ${row.split_with[0] || '?'} for ₹${row.amount}.`,
        suggested_action: `Import as settlement record instead of expense`,
      };
    }
    return null;
  },
};

// ============================================================
// 4. MISSING_PAID_BY
// ============================================================
const missingPaidByDetector: AnomalyDetector = {
  type: 'MISSING_PAID_BY',
  detect(row: ParsedRow): DetectedAnomaly | null {
    if (!row.paid_by || row.paid_by.trim() === '') {
      return {
        anomaly_type: 'MISSING_PAID_BY',
        severity: 'error',
        description: `Row ${row.row_number} "${row.description}" has no payer specified. Cannot import without knowing who paid.`,
        suggested_action: `Assign a payer to this expense`,
      };
    }
    return null;
  },
};

// ============================================================
// 5. MISSING_CURRENCY
// ============================================================
const missingCurrencyDetector: AnomalyDetector = {
  type: 'MISSING_CURRENCY',
  detect(row: ParsedRow): DetectedAnomaly | null {
    if (row.currency === null) {
      return {
        anomaly_type: 'MISSING_CURRENCY',
        severity: 'warning',
        description: `Row ${row.row_number} "${row.description}" has no currency specified. Defaulting to INR.`,
        suggested_action: `Confirm currency is INR`,
      };
    }
    return null;
  },
};

// ============================================================
// 6. AMOUNT_FORMAT_ERROR
// Amount contains comma or non-numeric characters
// ============================================================
const amountFormatDetector: AnomalyDetector = {
  type: 'AMOUNT_FORMAT_ERROR',
  detect(row: ParsedRow): DetectedAnomaly | null {
    if (row.amount_raw && row.amount_raw.includes(',')) {
      const cleaned = row.amount_raw.replace(/,/g, '');
      return {
        anomaly_type: 'AMOUNT_FORMAT_ERROR',
        severity: 'warning',
        description: `Row ${row.row_number} "${row.description}" has comma in amount: "${row.amount_raw}". Parsed as ${cleaned}.`,
        suggested_action: `Confirm amount is ₹${cleaned}`,
      };
    }
    return null;
  },
};

// ============================================================
// 7. AMOUNT_PRECISION_ERROR
// Amount has more than 2 decimal places
// ============================================================
const amountPrecisionDetector: AnomalyDetector = {
  type: 'AMOUNT_PRECISION_ERROR',
  detect(row: ParsedRow): DetectedAnomaly | null {
    if (row.amount_raw) {
      const decimalMatch = /\.(\d{3,})/.exec(row.amount_raw.replace(/,/g, ''));
      if (decimalMatch) {
        const rounded = Math.round((row.amount || 0) * 100) / 100;
        return {
          anomaly_type: 'AMOUNT_PRECISION_ERROR',
          severity: 'warning',
          description: `Row ${row.row_number} "${row.description}" has too many decimal places: ${row.amount_raw}. Rounded to ${rounded.toFixed(2)}.`,
          suggested_action: `Confirm amount is ₹${rounded.toFixed(2)}`,
        };
      }
    }
    return null;
  },
};

// ============================================================
// 8. UNKNOWN_PERSON
// paid_by or split_with name doesn't match any known member
// ============================================================
const unknownPersonDetector: AnomalyDetector = {
  type: 'UNKNOWN_PERSON',
  detect(row: ParsedRow, context: ImportContext): DetectedAnomaly | null {
    const knownNames = context.known_members.map((m) => m.user_name);

    // Check paid_by
    if (row.paid_by) {
      const exact = getMemberByName(row.paid_by, context.known_members);
      if (!exact) {
        const fuzzy = fuzzyMatch(row.paid_by, knownNames);
        if (fuzzy) {
          return {
            anomaly_type: 'UNKNOWN_PERSON',
            severity: 'warning',
            description: `Row ${row.row_number}: Payer "${row.paid_by}" is not an exact match. Did you mean "${fuzzy}"?`,
            suggested_action: `Map "${row.paid_by}" to "${fuzzy}"`,
          };
        }
        // No fuzzy match at all — truly unknown
        // (but skip if it's a case sensitivity issue like "priya" vs "Priya")
        const caseMatch = knownNames.find(
          (n) => n.toLowerCase() === row.paid_by.toLowerCase()
        );
        if (!caseMatch) {
          return {
            anomaly_type: 'UNKNOWN_PERSON',
            severity: 'warning',
            description: `Row ${row.row_number}: Payer "${row.paid_by}" is not a known member.`,
            suggested_action: `Map to an existing member or create new`,
          };
        }
      }
    }

    return null;
  },
};

// ============================================================
// 9. PERCENTAGE_SUM_ERROR
// Percentage splits do not sum to 100%
// ============================================================
const percentageSumDetector: AnomalyDetector = {
  type: 'PERCENTAGE_SUM_ERROR',
  detect(row: ParsedRow): DetectedAnomaly | null {
    if (row.split_type !== 'percentage') return null;
    if (row.split_details.length === 0) return null;

    const sum = row.split_details.reduce((acc, d) => acc + d.value, 0);
    if (Math.abs(sum - 100) > 0.01) {
      return {
        anomaly_type: 'PERCENTAGE_SUM_ERROR',
        severity: 'error',
        description: `Row ${row.row_number} "${row.description}": Percentage splits sum to ${sum}%, not 100%. ` +
          `Breakdown: ${row.split_details.map((d) => `${d.name} ${d.value}%`).join(', ')}.`,
        suggested_action: `Correct percentages to sum to 100% (currently ${sum > 100 ? sum - 100 : 100 - sum}% ${sum > 100 ? 'over' : 'under'})`,
      };
    }
    return null;
  },
};

// ============================================================
// 10. NEGATIVE_AMOUNT
// ============================================================
const negativeAmountDetector: AnomalyDetector = {
  type: 'NEGATIVE_AMOUNT',
  detect(row: ParsedRow): DetectedAnomaly | null {
    if (row.amount !== null && row.amount < 0) {
      return {
        anomaly_type: 'NEGATIVE_AMOUNT',
        severity: 'warning',
        description: `Row ${row.row_number} "${row.description}" has a negative amount: ${row.amount}. This may be a refund.`,
        suggested_action: `Import as refund (reverses split direction)`,
      };
    }
    return null;
  },
};

// ============================================================
// 11. ZERO_AMOUNT
// ============================================================
const zeroAmountDetector: AnomalyDetector = {
  type: 'ZERO_AMOUNT',
  detect(row: ParsedRow): DetectedAnomaly | null {
    if (row.amount === 0) {
      return {
        anomaly_type: 'ZERO_AMOUNT',
        severity: 'info',
        description: `Row ${row.row_number} "${row.description}" has ₹0 amount.${row.notes ? ` Note: "${row.notes}"` : ''}`,
        suggested_action: `Skip this row (zero amount)`,
      };
    }
    return null;
  },
};

// ============================================================
// 12. AMBIGUOUS_DATE
// Date format doesn't match DD-MM-YYYY or could be valid in
// multiple interpretations
// ============================================================
const ambiguousDateDetector: AnomalyDetector = {
  type: 'AMBIGUOUS_DATE',
  detect(row: ParsedRow): DetectedAnomaly | null {
    // Get the raw date from amount_raw's sibling — we stored it in date field
    // If parser couldn't parse it, date will be null
    if (row.date === null) {
      return {
        anomaly_type: 'AMBIGUOUS_DATE',
        severity: 'error',
        description: `Row ${row.row_number} "${row.description}": Date format is ambiguous or invalid. Cannot determine correct date.`,
        suggested_action: `Manually set the correct date`,
      };
    }

    // Check for DD-MM-YYYY where day and month could be swapped
    // e.g., 04-05-2026 could be April 5 or May 4
    const parts = row.date.split('-');
    if (parts.length === 3) {
      const month = parseInt(parts[1]);
      const day = parseInt(parts[2]);
      // If both day and month are <= 12, it's ambiguous
      if (day <= 12 && month <= 12 && day !== month) {
        // Check notes for ambiguity hints
        const notesLower = (row.notes || '').toLowerCase();
        if (
          notesLower.includes('format') ||
          notesLower.includes('april') ||
          notesLower.includes('may') ||
          notesLower.includes('ambig')
        ) {
          return {
            anomaly_type: 'AMBIGUOUS_DATE',
            severity: 'error',
            description: `Row ${row.row_number} "${row.description}": Date "${row.date}" could be interpreted differently. ${row.notes || ''}`,
            suggested_action: `Confirm the correct date`,
          };
        }
      }
    }

    return null;
  },
};

// ============================================================
// 13. NONMEMBER_IN_SPLIT
// Name in split_with is not a known group member
// ============================================================
const nonmemberInSplitDetector: AnomalyDetector = {
  type: 'NONMEMBER_IN_SPLIT',
  detect(row: ParsedRow, context: ImportContext): DetectedAnomaly | null {
    const knownNames = context.known_members.map((m) =>
      m.user_name.toLowerCase()
    );

    for (const name of row.split_with) {
      const lower = name.toLowerCase().trim();
      if (!knownNames.includes(lower)) {
        // Check fuzzy match
        const fuzzy = fuzzyMatch(
          name,
          context.known_members.map((m) => m.user_name)
        );
        if (!fuzzy) {
          return {
            anomaly_type: 'NONMEMBER_IN_SPLIT',
            severity: 'warning',
            description: `Row ${row.row_number} "${row.description}": "${name}" in split is not a group member.`,
            suggested_action: `Remove "${name}" from split and recalculate among known members`,
          };
        }
      }
    }
    return null;
  },
};

// ============================================================
// 14. MEMBER_INACTIVE_ON_DATE
// Person in split_with was not a member on expense_date
// ============================================================
const memberInactiveDetector: AnomalyDetector = {
  type: 'MEMBER_INACTIVE_ON_DATE',
  detect(row: ParsedRow, context: ImportContext): DetectedAnomaly | null {
    if (!row.date) return null;

    for (const name of row.split_with) {
      const member = getMemberByName(name, context.known_members);
      if (!member) continue; // handled by NONMEMBER_IN_SPLIT

      // Check if member was active on this date
      if (row.date < member.joined_at) {
        return {
          anomaly_type: 'MEMBER_INACTIVE_ON_DATE',
          severity: 'warning',
          description: `Row ${row.row_number} "${row.description}": "${name}" hadn't joined yet on ${row.date} (joined ${member.joined_at}).`,
          suggested_action: `Remove "${name}" from split and recalculate among active members`,
        };
      }
      if (member.left_at && row.date > member.left_at) {
        return {
          anomaly_type: 'MEMBER_INACTIVE_ON_DATE',
          severity: 'warning',
          description: `Row ${row.row_number} "${row.description}": "${name}" had already left on ${row.date} (left ${member.left_at}).`,
          suggested_action: `Remove "${name}" from split and recalculate among active members`,
        };
      }
    }
    return null;
  },
};

// ============================================================
// 15. SPLIT_TYPE_MISMATCH
// split_type says "equal" but split_details has specific numbers
// ============================================================
const splitTypeMismatchDetector: AnomalyDetector = {
  type: 'SPLIT_TYPE_MISMATCH',
  detect(row: ParsedRow): DetectedAnomaly | null {
    if (row.split_type === 'equal' && row.split_details.length > 0) {
      // Check if all shares are equal
      const values = row.split_details.map((d) => d.value);
      const allEqual = values.every((v) => v === values[0]);

      if (allEqual) {
        return {
          anomaly_type: 'SPLIT_TYPE_MISMATCH',
          severity: 'info',
          description: `Row ${row.row_number} "${row.description}": split_type is "equal" but has share details (${row.split_details.map((d) => `${d.name} ${d.value}`).join('; ')}). Since all shares are equal, treating as equal split.`,
          suggested_action: `Treat as equal split (shares are all equal)`,
        };
      } else {
        return {
          anomaly_type: 'SPLIT_TYPE_MISMATCH',
          severity: 'warning',
          description: `Row ${row.row_number} "${row.description}": split_type is "equal" but details show unequal shares: ${row.split_details.map((d) => `${d.name} ${d.value}`).join('; ')}.`,
          suggested_action: `Review: treat as equal split or use shares from details`,
        };
      }
    }
    return null;
  },
};

// ============================================================
// 16. MISSING_EXCHANGE_RATE
// Currency is USD but no exchange rate provided
// ============================================================
const missingExchangeRateDetector: AnomalyDetector = {
  type: 'MISSING_EXCHANGE_RATE',
  detect(row: ParsedRow): DetectedAnomaly | null {
    if (row.currency === 'USD') {
      return {
        anomaly_type: 'MISSING_EXCHANGE_RATE',
        severity: 'warning',
        description: `Row ${row.row_number} "${row.description}": USD amount ($${Math.abs(row.amount || 0)}) requires an exchange rate to convert to INR.`,
        suggested_action: `Provide USD→INR exchange rate for this expense`,
      };
    }
    return null;
  },
};

// ============================================================
// 17. DEPOSIT_AS_EXPENSE
// Description contains deposit keywords, single person split
// ============================================================
const depositAsExpenseDetector: AnomalyDetector = {
  type: 'DEPOSIT_AS_EXPENSE',
  detect(row: ParsedRow): DetectedAnomaly | null {
    const desc = row.description.toLowerCase();
    const isDeposit = DEPOSIT_KEYWORDS.some((kw) => desc.includes(kw));
    const singleSplit = row.split_with.length === 1;

    if (isDeposit && singleSplit) {
      return {
        anomaly_type: 'DEPOSIT_AS_EXPENSE',
        severity: 'warning',
        description: `Row ${row.row_number} "${row.description}": Looks like a deposit/payment to ${row.split_with[0]}, not a shared expense. ₹${row.amount}.`,
        suggested_action: `Record as settlement instead of expense`,
      };
    }
    return null;
  },
};

// ============================================================
// Export all detectors
// ============================================================
export const allDetectors: AnomalyDetector[] = [
  duplicateExactDetector,       // 1
  duplicateConflictDetector,    // 2
  settlementAsExpenseDetector,  // 3
  missingPaidByDetector,        // 4
  missingCurrencyDetector,      // 5
  amountFormatDetector,         // 6
  amountPrecisionDetector,      // 7
  unknownPersonDetector,        // 8
  percentageSumDetector,        // 9
  negativeAmountDetector,       // 10
  zeroAmountDetector,           // 11
  ambiguousDateDetector,        // 12
  nonmemberInSplitDetector,     // 13
  memberInactiveDetector,       // 14
  splitTypeMismatchDetector,    // 15
  missingExchangeRateDetector,  // 16
  depositAsExpenseDetector,     // 17
];

/**
 * Run all detectors against all rows.
 * Returns flat array of detected anomalies.
 */
export function detectAllAnomalies(
  rows: ParsedRow[],
  context: ImportContext
): Array<DetectedAnomaly & { row_number: number }> {
  const results: Array<DetectedAnomaly & { row_number: number }> = [];

  for (const row of rows) {
    // Provide all rows as context for duplicate detection
    const rowContext: ImportContext = {
      ...context,
      existing_rows: rows,
    };

    for (const detector of allDetectors) {
      const anomaly = detector.detect(row, rowContext);
      if (anomaly) {
        results.push({
          ...anomaly,
          row_number: row.row_number,
        });
      }
    }
  }

  return results;
}
