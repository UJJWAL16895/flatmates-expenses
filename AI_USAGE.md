# AI Collaboration & Usage Report

This document outlines the AI tools used during the development of the Flatmates Expense Tracker, key prompts executed, and details on three specific cases where the AI generated incorrect code, how it was caught, and how it was fixed.

---

## 1. AI Tools Utilized
* **Primary AI Assistant**: **Antigravity**, Google DeepMind's agentic AI coding assistant, running in Planning Mode to design, build, and verify features iteratively.
* **Integrations**: Next.js App Router compiler, TypeScript compiler (`tsc`), and Git version control tools.

---

## 2. Key Prompts & Intents
During the course of the project, the following core instructions drove the development:
1. **Schema Generation**: *"Create a migration script that builds raw SQL tables for users, group membership timelines, multi-currency expenses, and manual settlements, ensuring PgBouncer compatibility on port 5432."*
2. **Integer Arithmetic Engine**: *"Write monetary calculation helpers in integer cents to completely avoid floating-point drift, with splits distributed sequentially for remainder cents."*
3. **CSV Anomaly Pipeline**: *"Implement an intermediate db storage pipeline parsing CSV lines to run 17 distinct detectors identifying dates, currency omissions, invalid member splits, and duplicates."*
4. **UX Polish Checklist**: *"Add CSS keyframes, Framer Motion staggered list loaders, progress bar shimmering, and an interactive settlements network graph with curved Directed edges, hover tooltips, and click filtering."*

---

## 3. Concrete Cases of AI Errors, Detection, & Fixes

Below are three specific instances where the AI generated incorrect code or architecture, how it was identified, and the resolution implemented:

### Case 1: Duplicate JSX `className` Attribute
* **The Error**: While writing the SVG grouping element for nodes in the Settlement Network Graph (`components/settlements/network-graph.tsx`), the AI generated two duplicate `className` attributes on the `<g>` element:
  ```tsx
  <g
    key={node.name}
    className="cursor-pointer"
    ...
    className="transition-all duration-300"
  >
  ```
* **How It Was Caught**: During the verification step, running a local Next.js production build (`npm run build`) triggered a TypeScript/JSX compilation failure:
  ```bash
  Type error: JSX elements cannot have multiple attributes with the same name.
    303 |                 }}
    304 |                 style={{ opacity: isHighlighted ? 1 : 0.15 }}
  > 305 |                 className="transition-all duration-300"
        |                 ^
  ```
* **What Was Changed**: Merged the duplicate classNames into a single string:
  ```tsx
  className="cursor-pointer transition-all duration-300"
  ```
  After this fix, the build completed successfully with zero compile warnings.

### Case 2: PgBouncer Protocol Hangs during Multi-Statement DDL
* **The Error**: The AI initially configured database migrations to run raw SQL multi-statement scripts directly over port `6543` (transaction mode).
* **How It Was Caught**: In transaction mode, executing multi-statement strings causes PgBouncer to hang indefinitely or throw an unsupported protocol error since it cannot guarantee transactional state across multiple statements in standard pools.
* **What Was Changed**:
  1. Updated the connection string URL to target port `5432` (Session Mode) specifically for schema DDL operations.
  2. Modified the migration utility `scripts/migrate.js` to strip SQL comments, dynamically split queries using semicolons, and run them sequentially using a single Client transaction block.

### Case 3: Invalid Seed UUID Syntax (Hexadecimal Check)
* **The Error**: The AI generated a default seeding placeholder UUID containing an invalid hexadecimal character: `"g0000000-0000-0000-0000-000000000000"` (the character `'g'` is out of the `[0-9a-f]` hex range).
* **How It Was Caught**: Executing the database seed script failed with a raw Postgres error:
  ```bash
  invalid input syntax for type uuid: "g0000000-0000-0000-0000-000000000000"
  ```
* **What Was Changed**: Replaced the malformed placeholder string with the correct zero-UUID syntax (`00000000-0000-0000-0000-000000000000`) in all SQL scripts and corresponding user session defaults.
