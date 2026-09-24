---
title: Measure First
description: AWR, ASH, Monitor, XPLAN, and traces that show where time goes.
order: 11
draft: false
---

"Where do I start? Just add an index? Not yet."

Your report on `employees(id,name,dept_id,salary)` and `departments(id,name)` ran in 2 seconds last week. Today it runs 40 seconds. Same SQL. No code change. You want to add an index. Stop. Measure first. Change second.

Measuring is like checking which tap floods the flat, except you use snapshots and plan lines in place of wet floors. Then drop the plumbing. You need IDs, counts, and plans.

<details><summary>In case you don't know about AWR, it's Oracle's timed snapshots of DB activity.</summary>AWR is the Automatic Workload Repository. It stores timed snapshots of load by SQL and event. ADDM reads that history and names suspects. Steps are fixed. Pull the AWR report for the bad hour. Sort SQL by elapsed and buffer gets. Pick one SQL ID. Teams with a slow hour need it first. It drives one decision: which statement deserves tune time. Do not start from single-run feel. Single runs miss the window and tune the wrong SQL. Sharp line: AWR frames the workload, single timing does not. Example: the bad hour shows one join top by elapsed. You tune that ID only. Needs STATISTICS_LEVEL TYPICAL or ALL. See [T-01] https://docs.oracle.com/en/database/oracle/oracle-database/19/tdppt/automatic-database-performance-monitoring.html</details>

<details><summary>In case you don't know about ASH, it's a sampler of who was active and when.</summary>ASH is Active Session History. It samples who was active and when, showing which SQL and wait ate time. Steps are fixed. Check ASH top SQL for the same AWR window. Check top event next. Pick one SQL ID. Teams with spikes need it with AWR. It drives one decision: which wait plus SQL to chase. Do not use it alone for short statements. Short ones slip past the sampler and hide the root cause. Sharp line: ASH names active pain, not full history. Example: a long join shows clear in ASH while a 10ms lookup slips past, so pair ASH with Monitor. Needs STATISTICS_LEVEL TYPICAL or ALL. See [T-02].</details>

### 1. Start wide: AWR frames the window, ASH names the SQL

Plain claim: workload proof beats single-run hunches.

Naive progression:

```sql
-- Naive: you feel the app is slow, so you tune this join
SELECT d.name, COUNT(*)
FROM employees e JOIN departments d ON d.id = e.dept_id
GROUP BY d.name;
```

No window. No ID. You tune the wrong statement. Fixed:

1. Pull the AWR report for the bad hour. Look at SQL ordered by elapsed and by buffer gets.
2. Check ASH top SQL and top event for the same window.
3. Pick one SQL ID.

What the plan shows at this stage: nothing yet. That is the point. AWR plus ASH give you the target. ADDM quantifies findings from the same AWR data for triage [T-57]. Docs: Database Performance Tuning Guide 19c E96347-06, 2 Day + Performance Tuning (https://docs.oracle.com/en/database/oracle/oracle-database/19/tdppt/automatic-database-performance-monitoring.html).

Why it matters: a 20% app claim needs workload evidence, not one run. Single-statement proof comes next. Skip this and you speed up a query nobody runs.

### 2. Zoom to one run: Monitor plus XPLAN shows guess vs truth

Plain claim: the optimizer guesses row counts. The gap between guess and truth drives half the fixes.

Naive progression:

```sql
-- Naive: EXPLAIN PLAN says INDEX RANGE SCAN, you ship it
EXPLAIN PLAN FOR SELECT * FROM employees WHERE dept_id = 10;
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY());
```

`EXPLAIN PLAN` is compile-time. It can miss binds and runtime choices. Fixed:

```sql
SELECT * FROM employees WHERE dept_id = 10;
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR(FORMAT=>'+ALLSTATS LAST'));
```

What the plan shows: `TABLE ACCESS BY INDEX ROWID BATCHED` + `INDEX RANGE SCAN` on the dept index, with E-Rows=500 vs A-Rows=2M. That 4000x miss is cardinality error. For long or parallel SQL, open the SQL Monitor report (`V$SQL_MONITOR` / `DBMS_SQL_MONITOR`). It lists per-line actual rows and time. Docs: TGSQL ch.21 Monitoring Database Operations [T-03], `DBMS_XPLAN` ref (https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html) and TGSQL ch.6 (https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/generating-and-displaying-execution-plans.html) [T-04].

Why it matters: E-Rows vs A-Rows tells you which line to fix. No gap reading, no tuning. (One aside: this part is boring and it saves you. Back to work.)

### 3. Freeze it: Trace for time splits, Tuning Set for reruns

Plain claim: elapsed time splits into parse, execute, fetch, waits. You need the split.

Naive progression:

```sql
-- Naive: wall clock only
SET TIMING ON
SELECT d.name, AVG(e.salary)
FROM employees e JOIN departments d ON d.id = e.dept_id
WHERE e.salary > 50000 GROUP BY d.name;
-- 12 seconds. Why? Unknown.
```

Fixed: run SQL Trace for the session, format with TKPROF, read parse/exec/fetch counts plus disk vs buffer gets. Watch the four documented traps in TGSQL ch.23: argument, read-consistency, schema, time [T-05]. For waits you cannot explain, `TRCSESS` merges traces by session or SQL.

What the plan shows after the fix: same `HASH JOIN` + `TABLE ACCESS FULL`, but TKPROF shows 2M fetches and direct-path waits on one line. You now know the line, not just the total.

Then lock the input. Create a SQL Tuning Set with `DBMS_SQLTUNE` or `DBMS_SQLSET`, load the statement, use it as the before/after input for every later change [T-06]. For a portable repro, run SQL Test Case Builder (`DBMS_SQLDIAG`) to pack SQL, plan, stats, DDL samples [T-07]. For a fast offline bundle around one SQL ID, run SQLdb360. It pulls plans, stats, ASH, binds into one zip. The older SQLd360 (2018, 65 stars) is dormant. Use SQLdb360 (2024). Both repos show no declared license as of 2026-09-22, so check use rights first. Cross-check its claims against Monitor and XPLAN [T-08]. Unverified on your schema — test on your schema.

Why it matters: the Tuning Set makes V0 possible. Same workload, test execute, change, test execute, compare on `buffer_gets`. Docs: `DBMS_SQLPA` ref (https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html) [T-56].

**Keep this: Save the plan and counts before you touch SQL. No DISPLAY_CURSOR pair, no change.**
