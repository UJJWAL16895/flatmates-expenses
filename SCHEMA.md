\# Database Schema



\## Design Principles

1\. NUMERIC(10,2) for all money - never FLOAT

2\. Soft deletes only - deleted\_at timestamp

3\. Membership has date ranges, not just boolean

4\. Import rows stored raw before any processing

5\. Every anomaly gets its own record with resolution tracking

6\. Exchange rate locked at time of expense creation



\---



\## Tables



\### users

| Column       | Type         | Notes                    |

|-------------|--------------|--------------------------|

| id          | UUID PK      | gen\_random\_uuid()        |

| email       | TEXT UNIQUE  | login identifier         |

| name        | TEXT         | display name             |

| password\_hash | TEXT       | bcrypt hashed            |

| avatar\_color | TEXT        | for UI (hex color)       |

| created\_at  | TIMESTAMPTZ  |                          |



\### groups

| Column      | Type        | Notes                     |

|-------------|-------------|---------------------------|

| id          | UUID PK     |                           |

| name        | TEXT        |                           |

| created\_by  | UUID FK     | → users.id                |

| created\_at  | TIMESTAMPTZ |                           |

| deleted\_at  | TIMESTAMPTZ | soft delete               |



\### group\_members

| Column      | Type        | Notes                     |

|-------------|-------------|---------------------------|

| id          | UUID PK     |                           |

| group\_id    | UUID FK     | → groups.id               |

| user\_id     | UUID FK     | → users.id                |

| joined\_at   | DATE        | when they joined          |

| left\_at     | DATE        | NULL = still active       |

| invited\_by  | UUID FK     | → users.id (nullable)     |

UNIQUE(group\_id, user\_id, joined\_at)



\### expenses

| Column              | Type          | Notes                  |

|---------------------|---------------|------------------------|

| id                  | UUID PK       |                        |

| group\_id            | UUID FK       | → groups.id            |

| description         | TEXT          |                        |

| total\_amount        | NUMERIC(10,2) | original currency      |

| currency            | TEXT          | 'INR' or 'USD'         |

| exchange\_rate\_to\_inr| NUMERIC(10,4) | 1.0 if INR             |

| total\_amount\_inr    | NUMERIC(10,2) | computed, stored       |

| paid\_by\_user\_id     | UUID FK       | → users.id (nullable)  |

| split\_type          | TEXT          | equal/exact/percentage/shares |

| expense\_date        | DATE          |                        |

| category            | TEXT          | nullable               |

| notes               | TEXT          | nullable               |

| is\_settlement       | BOOLEAN       | DEFAULT false          |

| import\_row\_id       | UUID FK       | → import\_rows.id (null if manual) |

| created\_by          | UUID FK       | → users.id             |

| created\_at          | TIMESTAMPTZ   |                        |

| deleted\_at          | TIMESTAMPTZ   | soft delete            |



\### expense\_splits

| Column          | Type          | Notes                    |

|-----------------|---------------|--------------------------|

| id              | UUID PK       |                          |

| expense\_id      | UUID FK       | → expenses.id            |

| user\_id         | UUID FK       | → users.id               |

| share\_amount    | NUMERIC(10,2) | exact: the amount        |

| share\_percentage| NUMERIC(5,2)  | percentage: the %        |

| share\_units     | INTEGER       | shares: the units        |

| amount\_owed\_inr | NUMERIC(10,2) | ALWAYS computed in INR   |

| is\_settled      | BOOLEAN       | DEFAULT false            |

| settled\_at      | TIMESTAMPTZ   | nullable                 |



\### settlements

| Column           | Type          | Notes                   |

|------------------|---------------|-------------------------|

| id               | UUID PK       |                         |

| group\_id         | UUID FK       | → groups.id             |

| paid\_by\_user\_id  | UUID FK       | → users.id              |

| paid\_to\_user\_id  | UUID FK       | → users.id              |

| amount\_inr       | NUMERIC(10,2) |                         |

| settled\_at       | DATE          |                         |

| notes            | TEXT          |                         |

| created\_by       | UUID FK       | → users.id              |

| created\_at       | TIMESTAMPTZ   |                         |



\### import\_sessions

| Column          | Type        | Notes                     |

|-----------------|-------------|---------------------------|

| id              | UUID PK     |                           |

| group\_id        | UUID FK     | → groups.id               |

| filename        | TEXT        |                           |

| uploaded\_by     | UUID FK     | → users.id                |

| uploaded\_at     | TIMESTAMPTZ |                           |

| total\_rows      | INTEGER     |                           |

| imported\_count  | INTEGER     |                           |

| rejected\_count  | INTEGER     |                           |

| modified\_count  | INTEGER     |                           |

| status          | TEXT        | processing/review/done/cancelled |



\### import\_rows

| Column        | Type        | Notes                       |

|---------------|-------------|-----------------------------|

| id            | UUID PK     |                             |

| session\_id    | UUID FK     | → import\_sessions.id        |

| row\_number    | INTEGER     |                             |

| raw\_data      | JSONB       | exactly what CSV had        |

| parsed\_data   | JSONB       | what we interpreted         |

| status        | TEXT        | pending/approved/rejected/modified |

| expense\_id    | UUID FK     | → expenses.id (after import)|



\### anomalies

| Column            | Type        | Notes                     |

|-------------------|-------------|---------------------------|

| id                | UUID PK     |                           |

| session\_id        | UUID FK     | → import\_sessions.id      |

| import\_row\_id     | UUID FK     | → import\_rows.id          |

| anomaly\_type      | TEXT        | see list below            |

| severity          | TEXT        | error/warning/info        |

| description       | TEXT        | human readable explanation|

| suggested\_action  | TEXT        | what we recommend         |

| resolution        | TEXT        | pending/approved/rejected/modified |

| resolved\_by       | UUID FK     | → users.id (nullable)     |

| resolved\_at       | TIMESTAMPTZ |                           |

| resolver\_notes    | TEXT        |                           |



\## Anomaly Types Enum

'DUPLICATE\_EXACT'

'DUPLICATE\_CONFLICT'  

'SETTLEMENT\_AS\_EXPENSE'

'MISSING\_PAID\_BY'

'MISSING\_CURRENCY'

'AMOUNT\_FORMAT\_ERROR'

'AMOUNT\_PRECISION\_ERROR'

'UNKNOWN\_PERSON'

'PERCENTAGE\_SUM\_ERROR'

'NEGATIVE\_AMOUNT'

'ZERO\_AMOUNT'

'AMBIGUOUS\_DATE'

'NONMEMBER\_IN\_SPLIT'

'MEMBER\_INACTIVE\_ON\_DATE'

'SPLIT\_TYPE\_MISMATCH'

'MISSING\_EXCHANGE\_RATE'

