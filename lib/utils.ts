import { type ClassValue, clsx } from 'clsx';

// Combine class names conditionally
export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

// ---- Money Arithmetic (integer cents) ----
// NEVER use floating point for money. Multiply by 100, work in integers.

/** Convert a decimal amount to integer cents */
export function toCents(amount: number): number {
  return Math.round(amount * 100);
}

/** Convert integer cents back to decimal for display */
export function fromCents(cents: number): number {
  return cents / 100;
}

/** Format money for display */
export function formatINR(amount: number): string {
  const formatted = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
  return formatted;
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatCurrency(amount: number, currency: 'INR' | 'USD'): string {
  return currency === 'USD' ? formatUSD(amount) : formatINR(amount);
}

/** Format a date string for display */
export function formatDate(dateStr: string): string {
  const date = new Date(dateStr);
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

/** Format relative time (e.g., "2 hours ago") */
export function timeAgo(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(dateStr);
}

/** Generate initials from a name */
export function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

/** Truncate text with ellipsis */
export function truncate(str: string, length: number): string {
  if (str.length <= length) return str;
  return str.slice(0, length) + '…';
}
