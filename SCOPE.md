# Project Scope Boundaries

This document defines the functional boundaries, supported use cases, and out-of-scope items for the Flatmates Expenses application.

## 1. In Scope

### User Management & Authentication
* Multi-user setup with credentials login (`next-auth`).
* Password encryption using `bcrypt` (10 rounds).
* Protected pages (`/dashboard`, `/expenses`, `/balances`, `/groups`, `/settlements`, `/import`).
* Auto-redirect from root `/` to `/dashboard`.

### Group Expenses & Splits
* Group creation and membership management.
* Expense creation with categories, date, notes, and payer assignment.
* Splitting strategies:
  * **Equal Split**: Even division among members.
  * **Exact Split**: User-specified amounts per person.
  * **Percentage Split**: Percentage ratios per person (validated to sum to 100%).
  * **Shares Split**: Proportional division using integer share units.
* Timeline-aware balances (expenses are only split among members active on the expense date).
* Soft deletes (`deleted_at` column) on expenses and groups.

### Multi-Currency Engine
* Dual-currency support: **INR** and **USD**.
* Exchange rate entered at entry/import time and locked.
* Internal ledgers calculated and cached in INR.

### Settlement Engine
* Recording settlement payments between flatmates (settlements reduce net balances but are not treated as expenses).
* Minimum Transactions Algorithm (debt simplification using greedy creditor-debtor matching).
* Detailed drill-down log showing exactly which expenses contribute to a member's balance.

### CSV Import Pipeline
* Raw parsing of `Expenses Export.csv` via `papaparse`.
* Intermediate raw row storage in the database (`import_rows`).
* Anomaly pipeline running **17 distinct detectors** (e.g. duplicate conflict, USD rate missing, percentage sum errors).
* Review dashboard allowing users to individually approve, skip, or manually correct rows.
* Final transactional commit inserting resolved records as expenses or settlements.
* Summary report download.

---

## 2. Out of Scope

* **Automatic Exchange Rates**: Fetching live exchange rates from external APIs is excluded. Rates must be manually specified for USD expenses to maintain historical precision.
* **Hard Deletion**: Removing database rows entirely is excluded to maintain ledger auditing integrity. All deletions are soft-deletes via `deleted_at`.
* **Sub-Penny Adjustments**: Floating point currency allocations. All monetary storage works in integer cents (e.g. ₹10.50 is stored and calculated as 1050 cents).
* **Automatic Settles**: Direct bank integrations, UPI gateways, or Stripe transfers are out of scope. Settlements are recorded manually on the interface.
