\# Product Requirements Document

\## Shared Expenses App



\### The Problem

Four flatmates (Aisha, Rohan, Priya, Meera) have tracked shared 

expenses in a spreadsheet since February 2026. Dev joined for a 

Goa trip. Meera moved out end of March. Sam moved in mid-April.

The spreadsheet is now a mess and needs to become a proper app.



\---



\### The Users and Their Core Needs



\*\*Aisha\*\* - "I just want one number per person. Who pays whom, 

how much, done."

→ Simplified settlement view. Minimum transactions algorithm.



\*\*Rohan\*\* - "No magic numbers. If the app says I owe ₹2,300, 

I want to see exactly which expenses make that up."

→ Full drill-down from balance → expense → split breakdown



\*\*Priya\*\* - "Half the trip was in dollars. The sheet pretends 

a dollar is a rupee. That can't be right."

→ Multi-currency support. USD → INR conversion. Rate stored 

&#x20; per expense at time of entry. Never recalculated later.



\*\*Sam\*\* - "I moved in mid-April. Why would March electricity 

affect my balance?"

→ Membership date ranges. Balance filtered by join date.

&#x20; Expenses before join date excluded from Sam's balance.



\*\*Meera\*\* - "Clean up the duplicates but I want to approve 

anything the app deletes or changes."

→ Anomaly review flow. Nothing auto-deleted. Every change 

&#x20; requires explicit user approval before import commits.



\---



\### Feature List



\#### 1. Authentication

\- Email + password login

\- Registration with name

\- Protected routes

\- Session management via NextAuth.js



\#### 2. Groups

\- Create a group

\- Add members with a join date

\- Remove members with a leave date

\- Member timeline view (who was active when)

\- A user can be in multiple groups



\#### 3. Expenses

\- Create expense with: description, amount, currency, 

&#x20; date, paid\_by, split\_type, split\_with, category, notes

\- Split types supported:

&#x20; a. Equal - divide total equally among members

&#x20; b. Exact - specify exact amount per person

&#x20; c. Percentage - specify % per person (must sum to 100)

&#x20; d. Shares - specify ratio units per person

\- Edit expense

\- Soft delete expense (deleted\_at, not hard delete)

\- View who owes what for each expense



\#### 4. Multi-Currency

\- Supported: INR, USD

\- Exchange rate entered manually per expense

\- Rate locked at time of entry

\- All balances calculated in INR

\- Original currency + amount stored alongside INR equivalent



\#### 5. Balances

\- Group balance overview

\- Per-person net balance (positive = owed, negative = owes)

\- Simplified settlement suggestions (minimum transactions)

\- Individual drill-down showing which expenses contribute



\#### 6. Settlements

\- Record a payment between two people

\- Mark specific expense splits as settled

\- Settlement is NOT an expense



\#### 7. CSV Import

\- Upload expenses\_export.csv

\- Parse and detect all anomalies

\- Surface every anomaly to user for review

\- User approves or rejects each anomaly resolution

\- Nothing committed to DB without user approval

\- Generate downloadable import report after completion



\#### 8. Import Anomaly Types to Handle

\- Duplicate entries (same date + payer + amount)

\- Conflicting duplicates (same event, different amounts)

\- Settlement logged as expense

\- Missing paid\_by

\- Missing currency

\- Comma in number (1,200)

\- Extra decimal places (899.995)

\- Unknown/ambiguous person name (Priya S)

\- Percentage split not summing to 100

\- Negative amount (refund vs error)

\- Zero amount

\- Ambiguous date format

\- Non-member in split list

\- Member included after they left

\- Contradictory split\_type vs split\_details

\- USD amounts with no exchange rate



\---



\### Membership Date Logic (Critical)

\- GROUP\_MEMBERS table has joined\_at and left\_at columns

\- left\_at NULL = still active

\- When calculating balances, only include expenses where:

&#x20; expense\_date >= member.joined\_at

&#x20; AND (member.left\_at IS NULL OR expense\_date <= member.left\_at)

\- This directly solves Sam's requirement



\---



\### Currency Logic (Critical)

\- Every USD expense must have an exchange\_rate stored

\- amount\_in\_inr = amount \* exchange\_rate

\- This conversion is done ONCE at import/entry time

\- Balances always calculated using amount\_in\_inr

\- UI shows original currency for reference



\---



\### Settlement Logic (Critical)  

\- Settlements reduce balances but are NOT expenses

\- Stored in separate SETTLEMENTS table

\- When Rohan pays Aisha ₹5000, this is recorded as:

&#x20; paid\_by: Rohan, paid\_to: Aisha, amount: 5000

\- This reduces Rohan's debt to Aisha by ₹5000

\- Does NOT appear in expense list



\---



\### What Must NOT Happen

\- Float arithmetic for money (use NUMERIC in DB, 

&#x20; handle as integers in JS × 100)

\- Silent data changes during import

\- Hard deleting any record

\- Recalculating exchange rates after the fact

\- Including pre-join expenses in a member's balance

