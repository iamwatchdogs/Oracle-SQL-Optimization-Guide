---
title: Proven Techniques - What Actually Works
description: 68 Oracle SQL fixes in 8 groups, each with a rerun check.
order: 10
draft: false
---

"There are 68 tricks here? Do I need them all? No."

You know `SELECT`, `WHERE`, `JOIN`, `GROUP BY`. Start here: `employees(id,name,dept_id,salary)`, `departments(id,name)`. Ten rows. This query is instant:

```sql
SELECT d.name, AVG(e.salary)
FROM employees e JOIN departments d ON d.id = e.dept_id
GROUP BY d.name;
```

Now make `employees` 100M rows. Same text. Now it runs 40 seconds. That gap is this chapter.

A technique group is like a hospital floor, except each floor treats one cause of slow SQL and discharges with its own rerun test. Drop the hospital now. Causes plus tests. That is all groups are.

<details><summary>In case you don't know about a plan baseline, it's a saved good plan Oracle may reuse.</summary>Oracle stores accepted plans. New plans must prove faster before use. Bad plans stay out. See <code>DBMS_SPM</code> ref and TGSQL ch.28/29 [T-48].</details>

<details><summary>In case you don't know about an index, it's a shortcut to rows without scanning the table.</summary>You pay on writes. You gain on selective reads. You prove the trade with a rerun. See TGSQL ch.8 access paths [T-24].</details>

### 1. Measure first, or you fix the wrong query

Plain claim: slow is not a location. You need the SQL ID, the wait, the plan line.

```sql
-- Naive: guess the slow part
SELECT /*+ FULL(e) */ COUNT(*) FROM employees e WHERE e.dept_id = 10;
```

The plan shows `TABLE ACCESS FULL` on `EMPLOYEES`. That proves nothing by itself. The fixed move is `SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR())` right after the run. You get E-Rows vs A-Rows, predicates, plan hash. Docs: `DBMS_XPLAN` ref + TGSQL ch.6 [T-04].

Why it matters: every later group needs this before/after pair. No plan pair, no proof.

### 2. Feed true numbers, then fix the shape on disk

Plain claim: bad estimates cause bad plans. Stale numbers pick full scans. Fresh numbers pick range scans.

```sql
-- Naive: 100M-row employees, stats from 6 months ago
SELECT * FROM employees WHERE dept_id = 10;
-- Plan: TABLE ACCESS FULL, E-Rows=100, A-Rows=2M
```

Fix with `DBMS_STATS.GATHER_TABLE_STATS`, then rerun. The plan flips to `INDEX RANGE SCAN` + `TABLE ACCESS BY INDEX ROWID BATCHED`. Docs: stats best practices + TGSQL ch.13 [T-09/T-10]. If the filter hits one week of range-partitioned `sales`, the plan should show `PARTITION RANGE SINGLE` with `PSTART=17 PSTOP=17`. Docs: pruning page https://docs.oracle.com/en/database/oracle/oracle-database/19/vldbg/partition-pruning.html [T-26].

Why it matters: statistics is the largest family, 15 entries [T-09 to T-23]. Layout is next: B-tree paths ch.8 [T-24], compression, In-Memory, Exadata offload.

### 3. Let Oracle rewrite, then lock the good plan

Plain claim: the optimizer rewrites your text into cheaper shapes. You check the rewrite. You lock it.

```sql
-- Naive: hand-rolled OR that blocks index use
SELECT * FROM employees WHERE dept_id = 10 OR salary > 90000;
-- Fixed: Oracle OR-expansion shows CONCATENATION, one branch per predicate [T-34]
```

A second shape: a monthly rollup over `sales` rewrites to a materialized view. The plan shows `MAT_VIEW REWRITE ACCESS`. Needs `ENABLE QUERY REWRITE` + `QUERY_REWRITE_ENABLED=TRUE` [T-28]. Unverified on your schema — test on your schema.

Two vendor numbers set scope. Automatic Indexing showed ~15% gain with up to 60% space-reclaim potential (VLDB 2025) [T-32]. Real-Time SPM (26ai) verifies in foreground and reinstates the prior plan on regression (PVLDB 2026) [T-49]. Direction, not a promise.

In this chapter:

- [Measure First](/01-proven-techniques/01-measure-first/)
- [Stats Run the Show](/01-proven-techniques/02-stats-run-the-show/)
- [Indexes and Layout](/01-proven-techniques/03-indexes-and-layout/)
- [Let Oracle Rewrite](/01-proven-techniques/04-let-oracle-rewrite/)
- [Stabilize and Ship Safely](/01-proven-techniques/05-stabilize-and-ship-safely/)

**Keep this: Work the groups in order; never ship without the Group 1 check. One change, one plan pair, one rerun.**
