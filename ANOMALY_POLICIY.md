\# Anomaly Handling Policy



For each anomaly type, this documents detection logic, 

severity, and default policy. User can override any decision.



\---



\### 1. DUPLICATE\_EXACT

Detection: Same date + same paid\_by + same amount + similar description

Example: Row 4 and Row 5 (Marina Bites dinner, both ₹3200 by Dev)

Severity: WARNING

Policy: Keep the first occurrence. Flag second for user review.

User options: Keep first | Keep second | Keep both



\### 2. DUPLICATE\_CONFLICT  

Detection: Same date + same paid\_by + similar description + DIFFERENT amount

Example: Row 23 (₹2400 Aisha) and Row 24 (₹2450 Rohan) for Thalassa dinner

Severity: ERROR

Policy: Block both. Surface side-by-side for user to pick one.

User options: Keep Row 23 | Keep Row 24 | Enter correct amount manually



\### 3. SETTLEMENT\_AS\_EXPENSE

Detection: Description contains settlement keywords OR no split\_type AND 

&#x20;          split\_with is a single person

Example: Row 13 "Rohan paid Aisha back" ₹5000

Severity: ERROR  

Policy: Do not import as expense. Offer to record as settlement instead.

User options: Import as settlement | Skip entirely



\### 4. MISSING\_PAID\_BY

Detection: paid\_by column is empty

Example: Row 12 "House cleaning supplies" ₹780

Severity: ERROR

Policy: Cannot import without knowing who paid. Block row.

User options: Assign a payer | Skip row



\### 5. MISSING\_CURRENCY

Detection: currency column is empty

Example: Row 27 Groceries DMart Mar 15

Severity: WARNING

Policy: Default to INR (most expenses are INR). Flag for confirmation.

User options: Confirm INR | Set to USD | Skip row



\### 6. AMOUNT\_FORMAT\_ERROR

Detection: Amount contains comma or non-numeric characters

Example: Row 6 "1,200" for Electricity Feb

Severity: WARNING

Policy: Strip comma, parse as 1200. Show user the correction.

User options: Confirm ₹1200 | Enter correct amount | Skip



\### 7. AMOUNT\_PRECISION\_ERROR

Detection: Amount has more than 2 decimal places

Example: Row 9 "899.995" cylinder refill

Severity: WARNING

Policy: Round to 2 decimal places (899.995 → 900.00). 

&#x20;       Standard rounding: .5 rounds up.

User options: Confirm ₹900.00 | Enter correct amount | Skip



\### 8. UNKNOWN\_PERSON

Detection: paid\_by or split\_with name doesn't match any known member

Example: Row 10 "Priya S" - is this Priya?

Severity: WARNING

Policy: Suggest closest match. Block until user confirms.

User options: Map to existing member | Create new member | Skip



\### 9. PERCENTAGE\_SUM\_ERROR

Detection: Percentage splits do not sum to 100%

Example: Row 14 Pizza Friday: 30+30+30+20 = 110%

Severity: ERROR

Policy: Block row. Show the sum and the difference.

User options: Normalize proportionally | Edit manually | Skip



\### 10. NEGATIVE\_AMOUNT

Detection: Amount is negative

Example: Row 25 Parasailing refund -$30

Severity: WARNING

Policy: Treat as refund. Reverse the split direction (others 

&#x20;       owe less, or payer owes others). Flag for confirmation.

User options: Import as refund | Skip row



\### 11. ZERO\_AMOUNT

Detection: Amount is 0

Example: Row 28 "Dinner order Swiggy" ₹0 (note says counted twice)

Severity: INFO

Policy: Skip import. Note says it was a duplicate fix.

User options: Skip | Import anyway (creates ₹0 expense)



\### 12. AMBIGUOUS\_DATE

Detection: Date format doesn't match DD-MM-YYYY 

&#x20;          OR could be valid in multiple formats

Example: Row 26 "Mar-14" (not a standard date)

&#x20;        Row 32 "04-05-2026" (Apr 5 or May 4? note confirms ambiguity)

Severity: ERROR

Policy: Block row. Show raw value, ask user to confirm correct date.

User options: Set date manually | Skip row



\### 13. NONMEMBER\_IN\_SPLIT

Detection: Name in split\_with not in group members list

Example: Row 21 "Dev's friend Kabir" in parasailing split

Severity: WARNING

Policy: Cannot include unknown person in split.

&#x20;       Remove from split and recalculate equal shares among known members.

&#x20;       OR create temporary member record.

User options: Remove Kabir, split among 4 | Add Kabir as temp member | Skip



\### 14. MEMBER\_INACTIVE\_ON\_DATE

Detection: Person in split\_with was not a member on expense\_date

Example: April expenses still listing Meera in split\_with

&#x20;        Row 35: April 2 Groceries still lists Meera

Severity: WARNING

Policy: Remove inactive member from split, recalculate.

User options: Remove Meera, split among active members | Override | Skip



\### 15. SPLIT\_TYPE\_MISMATCH

Detection: split\_type says "equal" but split\_details has 

&#x20;          specific numbers suggesting shares or exact split

Example: Row 41 Furniture ₹12000 says equal but has 

&#x20;        "Aisha 1; Rohan 1; Priya 1; Sam 1" in details

Severity: INFO

Policy: If shares are all equal, treat as equal split. 

&#x20;       Flag as info only, no action needed.

User options: Treat as equal | Treat as shares | Review manually



\### 16. MISSING\_EXCHANGE\_RATE

Detection: Currency is USD but no exchange rate provided

Example: All USD rows in the CSV have no rate column

Severity: WARNING

Policy: Block USD rows until rate is provided.

&#x20;       Show all USD rows together, ask user to set rate.

&#x20;       Apply same rate to all USD rows from same trip date range

&#x20;       OR allow per-row rate entry.

User options: Set rate for all | Set per-row | Skip USD rows



\### 17. DEPOSIT\_AS\_EXPENSE

Detection: Description contains deposit/deposit keywords,

&#x20;          single person in split\_with (not a group split)

Example: Row 38 "Sam deposit share" ₹15000 split only with Aisha

Severity: WARNING  

Policy: This looks like a deposit or one-time payment, not a 

&#x20;       shared group expense. Offer to record as settlement.

User options: Record as settlement | Import as expense | Skip

