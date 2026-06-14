/**
 * CSV Parser — PapaParse wrapper.
 * Parses raw CSV into typed ParsedRow[] with initial data cleanup.
 */

import Papa from 'papaparse';
import type { ParsedRow, RawCSVRow, SplitDetail, SplitType, Currency } from '@/types';

/**
 * Parse CSV text into raw rows
 */
export function parseCSV(csvText: string): RawCSVRow[] {
  const result = Papa.parse<RawCSVRow>(csvText, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h: string) => h.trim().toLowerCase().replace(/\s+/g, '_'),
  });

  return result.data;
}

/**
 * Transform raw CSV rows into parsed rows with initial interpretation.
 * This does NOT fix anomalies — it just parses what it can.
 */
export function transformRows(rawRows: RawCSVRow[]): ParsedRow[] {
  return rawRows.map((raw, index) => {
    const parsed: ParsedRow = {
      date: parseDate(raw.date?.trim() || ''),
      description: raw.description?.trim() || '',
      paid_by: raw.paid_by?.trim() || '',
      amount: parseAmount(raw.amount?.trim() || ''),
      amount_raw: raw.amount?.trim() || '',
      currency: parseCurrency(raw.currency?.trim() || ''),
      split_type: parseSplitType(raw.split_type?.trim() || ''),
      split_with: parseSplitWith(raw.split_with?.trim() || ''),
      split_details: parseSplitDetails(raw.split_details?.trim() || ''),
      notes: raw.notes?.trim() || '',
      row_number: index + 2, // +2 because: 1-indexed + header row
    };
    return parsed;
  });
}

/**
 * Attempt to parse a date string to ISO format (YYYY-MM-DD).
 * Returns null if unparseable.
 */
function parseDate(dateStr: string): string | null {
  if (!dateStr) return null;

  // Try DD-MM-YYYY format
  const ddmmyyyy = /^(\d{2})-(\d{2})-(\d{4})$/.exec(dateStr);
  if (ddmmyyyy) {
    const [, day, month, year] = ddmmyyyy;
    const d = parseInt(day);
    const m = parseInt(month);
    if (d >= 1 && d <= 31 && m >= 1 && m <= 12) {
      return `${year}-${month}-${day}`;
    }
  }

  // If it doesn't match DD-MM-YYYY, return null (ambiguous/invalid)
  return null;
}

/**
 * Attempt to parse amount, handling commas and extra decimals.
 * Returns the raw parsed number or null if unparseable.
 */
function parseAmount(amountStr: string): number | null {
  if (!amountStr) return null;

  // Remove commas for parsing
  const cleaned = amountStr.replace(/,/g, '');
  const num = parseFloat(cleaned);

  if (isNaN(num)) return null;
  return num;
}

function parseCurrency(currStr: string): Currency | null {
  const upper = currStr.toUpperCase();
  if (upper === 'INR') return 'INR';
  if (upper === 'USD') return 'USD';
  if (upper === '') return null;
  return null;
}

function parseSplitType(typeStr: string): SplitType | null {
  const lower = typeStr.toLowerCase();
  if (lower === 'equal') return 'equal';
  if (lower === 'exact' || lower === 'unequal') return 'exact';
  if (lower === 'percentage') return 'percentage';
  if (lower === 'shares' || lower === 'share') return 'shares';
  if (lower === '') return null;
  return null;
}

function parseSplitWith(splitStr: string): string[] {
  if (!splitStr) return [];
  return splitStr.split(';').map((s) => s.trim()).filter(Boolean);
}

function parseSplitDetails(detailsStr: string): SplitDetail[] {
  if (!detailsStr) return [];

  return detailsStr
    .split(';')
    .map((part) => {
      const trimmed = part.trim();
      // Match patterns like "Aisha 30%", "Rohan 700", "Priya 1"
      const match = /^(.+?)\s+([\d.]+)(%)?$/.exec(trimmed);
      if (match) {
        return {
          name: match[1].trim(),
          value: parseFloat(match[2]),
        };
      }
      return null;
    })
    .filter((d): d is SplitDetail => d !== null);
}
