# Architectural & Design Decisions

This document outlines the core engineering decisions made during the development of the Flatmates Expense Tracker.

---

## 1. Money Representation: Integer Cents vs. Floats

### Context
Standard floating-point representation in JavaScript (`Number`) suffers from IEEE 754 precision issues (e.g., `0.1 + 0.2 !== 0.3`). For a financial ledger, any deviation in precision, even at the sub-penny level, is unacceptable.

### Decision
* **Internal Representation**: All financial values are handled as integer cents internally in JS/TS (e.g. ₹12.50 is represented as `1250` cents).
* **Database Type**: Database tables store monetary values in `NUMERIC(10,2)` columns.
* **Helper Functions**: Pure utilities `toCents` and `fromCents` in [utils.ts](file:///c:/Users/utsav/OneDrive/Documents/expenses/lib/utils.ts) handle conversion securely:
  ```typescript
  export function toCents(amount: number): number {
    return Math.round(amount * 100);
  }
  export function fromCents(cents: number): number {
    return cents / 100;
  }
  ```
* **Uneven Split Handling**: Remainder cents resulting from integer division are distributed sequentially (e.g. a ₹10.00 split among 3 people resolves to 334 cents, 333 cents, and 333 cents).

---

## 2. Timeline-Aware Balance Calculation

### Context
Members join and leave the group at different dates. For example, Sam joined on April 8, 2026, and should not be charged for rent or utility expenses from February or March. Similarly, Meera left at the end of March and should not be charged for April expenses.

### Decision
* **Membership Model**: The `group_members` table tracks `joined_at` and `left_at` (nullable) dates for each user.
* **Dynamic Query Filtering**: Balances are calculated dynamically in SQL by checking active membership on the date of the expense:
  ```sql
  SELECT e.id, e.paid_by_user_id, e.total_amount_inr, e.expense_date,
         es.user_id AS split_user_id, es.amount_owed_inr
  FROM expenses e
  JOIN expense_splits es ON es.expense_id = e.id
  JOIN group_members gm ON gm.user_id = es.user_id AND gm.group_id = e.group_id
  WHERE e.group_id = $1
    AND e.deleted_at IS NULL
    AND e.is_settlement = false
    AND e.expense_date >= gm.joined_at
    AND (gm.left_at IS NULL OR e.expense_date <= gm.left_at)
  ```
* **Split Exclusions**: When a user is inactive on the expense date, they are omitted from the split calculations, and the expense is divided only among the active members on that date.

---

## 3. Multi-Currency Exchange Rate Locking

### Context
Priya highlighted that some Goa trip expenses were incurred in USD, which a naive spreadsheet would treat 1:1 with INR.

### Decision
* **Rate Lock-in**: USD expenses are converted to INR at creation/import time using a user-specified rate.
* **Database Ledger**: Both the original amount (e.g., $10.00 USD) and the converted amount (`total_amount_inr`) are stored alongside the locked exchange rate.
* **Immutable Rates**: Once created, exchange rates are immutable. Balances are calculated exclusively using the locked `total_amount_inr` field to prevent retrospective fluctuation.

---

## 4. PgBouncer Compatibility for Migrations

### Context
Supabase uses PgBouncer for connection pooling. On port `6543` (Transaction Mode), executing multi-statement SQL strings causes PgBouncer to throw errors or hang, as transaction mode doesn't permit multi-statement protocol execution.

### Decision
* **Session Mode**: Connected migrations to port `5432` (Session Mode).
* **Statement Splitting**: Implemented statement-by-statement parsing in `scripts/migrate.js`. Semicolons are parsed, comments are stripped, and queries are executed sequentially within a single transaction block.

---

## 5. Settlement Engine & Debt Simplification

### Context
Aisha wants to see the minimum possible transaction steps to resolve group balances. Rohan wants a detailed audit trail of how his balance was calculated.

### Decision
* **Simplified Settlements**: A greedy matching algorithm in `simplifyDebts` (in `lib/calculations/balance-engine.ts`) sorts creditors and debtors descending by net balances and repeatedly matches the largest debtor with the largest creditor:
  ```typescript
  const settlementCents = Math.min(creditor.cents, debtor.cents);
  ```
* **Drill-down Capability**: Implemented `getUserBalanceDetail` to retrieve a list of all individual splits and settlements involving a specific user, enabling a full audit path from the dashboard balance cards.

---

## 6. Settlements Network Graph: Circular Layout vs Force-Directed Layouts

### Context
The settlements page needs to visually present outstanding payments between flatmates. A traditional list can be tedious, while a standard force-directed layout can bounce erratically and lead to overlapping edges.

### Decision
* **Circular Arranged Nodes**: Placed avatars in a predictable circle around a central origin using polar trigonometry ($\theta = \frac{2\pi \cdot i}{N} - \frac{\pi}{2}$). This guarantees node positions are static and readable.
* **Quadratic Bezier Directed Edges**: Connected nodes with curved quadratic Bezier pathways (`Q cx cy`). Since lines in opposite directions offset in opposite directions, flows from A $\to$ B and B $\to$ A never overlap.
* **Color and Width Scaling**: Encoded settlement sizes visually. The stroke thickness scales proportionally, and edge colors shift dynamically based on size ratios (Violet $\to$ Blue $\to$ Amber $\to$ Rose), matching the dashboard's design.
* **Graph-Linked Click Filtering**: Clicking a node acts as a global page filter. It highlights direct cash paths in the graph while filtering the settlements list below, providing a highly cohesive interaction loop.

---

## 7. Client-Side Page Route Transitions

### Context
By default, Next.js transitions between pages instantaneously, which can feel rigid and mechanical. We wanted smooth, premium transitions without degrading page performance.

### Decision
* **Pathname-Keyed Framer Motion Wrapper**: Created a `<PageTransition>` component using `framer-motion` that wraps page children and binds `key={pathname}`. This forces a clean mount animation (`initial={{ opacity: 0, y: 10 }}` to `animate={{ opacity: 1, y: 0 }}`) whenever Next.js changes routes.
* **Glassmorphic Skeleton Shimmers**: Loading states utilize custom pulse shimmers overlaid on semi-transparent backgrounds to maintain visual continuity while fetching asynchronous group metrics.
