# AI Usage & Development Summary

This document details the tasks and contributions performed by the AI Coding Assistant in building, debugging, and verifying the Flatmates Expense Tracker.

---

## 1. Features Built by the AI

The AI built the following components and features based on the application specification:
1. **Schema & Migration Pipeline**:
   - Programmed raw SQL tables for `users`, `groups`, `group_members`, `expenses`, `expense_splits`, and `settlements` with exact constraints.
   - Built a robust, statement-splitting migration script in `scripts/migrate.js` to execute DDL scripts safely over Supabase pools.
2. **NextAuth Session Authentication**:
   - Implemented JWT-based credential authentication checking bcrypt hashed passwords.
   - Created route protection middleware and secured all Next.js API endpoints.
3. **Integer Cents Expense Calculator**:
   - Created safe monetary arithmetic modules (Equal, Exact, Percentage, and Shares calculators) utilizing integer cents multiplication.
   - Built the minimum-transactions greedy algorithm to simplify payments.
4. **CSV Anomaly Pipeline**:
   - Designed 17 distinct anomaly detectors mapping raw lines to warning/error records.
   - Developed review UI tables, difference compare panes, and commit controllers.
5. **Glassmorphism Theme UI**:
   - Configured general layouts, sidebar navigational items, and responsive details.
   - Added interactive animations with Framer Motion and custom CSS properties.

---

## 2. Debugging Actions

The AI successfully investigated and resolved the following production roadblocks:
* **Supabase DNS Unresolvable (Direct IPv4)**:
  - **Symptom**: `getaddrinfo ENOTFOUND` when resolving `db.stqayuzcbuhpqiaabsjg.supabase.co`.
  - **Resolution**: Updated configurations to use the regional transactional pooler address `aws-1-ap-south-1.pooler.supabase.com`.
* **PgBouncer Multi-Statement Hangs (Port 6543)**:
  - **Symptom**: Multi-statement SQL migration runs hung indefinitely.
  - **Resolution**: Switched to port `5432` (Session Mode) and wrote a comment-stripping, semicolon-splitting statement executor in `migrate.js` to execute queries sequentially.
* **Invalid Seeding Hex character `g`**:
  - **Symptom**: Seed sql failed with invalid uuid syntax.
  - **Resolution**: Replaced the placeholder `g0000000-0000-0000-0000-000000000000` with the standard valid zero-UUID (`00000000-0000-0000-0000-000000000000`) throughout schemas and app queries.
* **Incorrect Bcrypt Seed Password Hash**:
  - **Symptom**: Users could not sign in. We verified the seeded bcrypt hash in database was incorrect.
  - **Resolution**: Generated a fresh hash for `password123` via Node CLI, modified the seed scripts to overwrite password hashes on conflict, and re-executed the setup migrations.
* **Login Domain & Page Toggle**:
  - **Symptom**: UI shortcuts set emails to `@flat.io` with password `'demo'`.
  - **Resolution**: Rewrote the form buttons to input `@flatmates.app` emails and `password123`. Added an eye button toggle displaying password text to prevent input mistakes.

---

## 3. Verification & Build Confirmation

* **Compilation Status**: Executed `npm run build` which verified that TypeScript type-checking, Turbopack, and Next.js static site generation compile cleanly with no compilation errors.
* **Data Consistency**: Verified that all mock pages (`dashboard`, `balances`, `expenses`, `groups`) render the custom flatmates dataset (`Kabir`, `Ananya`, `Vikram`, `Zara`) correctly.
