# Flatmates Expenses Tracker

A full-stack, premium shared expenses web application for flatmates, built with Next.js 14 (App Router), TypeScript, PostgreSQL (Supabase), Framer Motion, and NextAuth.js.

## Key Features

1. **Dashboard & Metrics**: Visual breakdown of total group expenses, monthly spending trends, net user balance, and interactive settlement pathways.
2. **CSV Import Pipeline**: High-performance, session-based CSV upload and parser (via PapaParse) featuring **17 unique anomaly detectors** (e.g., date mismatches, negative amounts, percentage check mismatches, and USD currency blocks).
3. **Anomaly Review UI**: Interactive review dashboard for imported CSV rows containing anomalies. Flatmates can individually accept or skip resolutions, modify values (like exchange rates), and view a final commit report.
4. **Expense Log & Splits**: Manage expenses with dynamic splits (equally, by shares, by percentages, or custom amounts). Expandable views show exactly who owes whom.
5. **Settlement Engine**: Dynamic transaction minimizer to resolve debts in the fewest possible transfers among flatmates.
6. **Timeline-Aware Balances**: Net balance calculations strictly filter users based on their group join (`joined_at`) and leave (`left_at`) dates.
7. **Premium Glassmorphic Design**: Harmonies of purple and teal, neon accents, dark mode by default, and micro-animations using Framer Motion.

8. **Commit Loading Screen**: Animated full-screen overlay showing stage-by-step progress, elapsed time, and estimation with custom rotating humor.
9. **Data Source Switching**: Seamlessly toggle between realistic sample data (auto-seeded on registration) and imported live data with top banners.
10. **DiceBear Avatar Selection**: Registration flow featuring password confirmations and selection from 12 dynamic SVG avatars.

---

## Technical Stack
- **Framework**: Next.js 16.2.9 (App Router)
- **Database**: PostgreSQL (Supabase Serverless) using raw SQL pool clients (`pg`)
- **Authentication**: NextAuth.js v4 (Credentials Provider)
- **Validations**: Zod
- **Animations**: Framer Motion
- **Date Handling**: date-fns
- **Styling**: Tailwind CSS + Custom CSS Variables

---

## Local Setup & Run Instructions

### 1. Prerequisites
Ensure you have **Node.js (v18+)** and **npm** installed on your system.

### 2. Set Up Environment Variables
Create a `.env.local` file in the root directory (one is already prepared for you) with the following structure:
```env
DATABASE_URL=postgresql://postgres:VilenGameDev@11218@db.stqayuzcbuhpqiaabsjg.supabase.co:5432/postgres
NEXTAUTH_SECRET=flatmates-expenses-super-secret-key-2026-production
NEXTAUTH_URL=http://localhost:3000
NEXT_PUBLIC_APP_NAME=Flatmates
```

### 3. Install Dependencies
Run the following command to install required npm modules:
```bash
npm install
```

### 4. Database Setup (Migrations & Seed)
To automatically create all required tables, indexes, and seed the default flatmate members and groups, run:
```bash
npm run db:migrate
```

*Note: This script runs the SQL migration files in `sql/` in order against the Supabase database configured in `DATABASE_URL`.*

### 5. Run the Local Development Server
Start the Next.js development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your web browser.

---

## Seed User Accounts
Use any of these flatmate credentials to log in. All accounts share the same password:

- **Aisha**: `aisha@flatmates.app` (Joined Feb 1, 2026 - Active)
- **Rohan**: `rohan@flatmates.app` (Joined Feb 1, 2026 - Active)
- **Priya**: `priya@flatmates.app` (Joined Feb 1, 2026 - Active)
- **Sam**: `sam@flatmates.app` (Joined Apr 8, 2026 - Active)
- **Meera**: `meera@flatmates.app` (Former flatmate: Feb 1, 2026 – Mar 31, 2026)
- **Dev**: `dev@flatmates.app` (Temporary traveler: Mar 8, 2026 – Mar 14, 2026)

**Password for all accounts:** `password123`
