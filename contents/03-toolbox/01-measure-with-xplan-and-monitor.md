---
title: Measure With XPLAN and Monitor
description: Show the executed plan and per-line actual rows first.
order: 31
draft: false
---

Picture a junior saying the query feels slow after a stats job.

No plan hash. No row counts. Just a feeling. That feeling is where bad tuning starts.

You can run SELECT. You have seen a slow query. You know EXPLAIN PLAN exists. This page starts there and shows the run truth.

Measuring a query is like checking a race split sheet, except each plan line reports its own time and row counts.

<details><summary>In case you don't know about DBMS_XPLAN, it's Oracle's package that prints plans from memory, history, and baselines.</summary>DISPLAY_CURSOR shows the executed plan. DISPLAY_AWR shows history. DISPLAY_SQL_PLAN_BASELINE shows baseline plans. Docs: https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html</details>

## 1. The run plan beats the guess plan

Plain claim: EXPLAIN PLAN guesses. DISPLAY_CURSOR shows what ran.

Worked example A — before and after a stats gather. You run the same report query twice. First you grab its SQL ID from V$SQL. Then you print the run plan:

```sql
SELECT sql_id, child_number, plan_hash_value
FROM V$SQL WHERE sql_text LIKE '%orders_month%';

SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR('8mkxm7ur07za0', 0));
```

Shape from Oracle DBMS_XPLAN 19c examples. Doc example uses SQL ID `gwp663cqh5qbf` with child 0 and returns Plan hash value 3693697075. Your IDs will differ. Unverified — test on your schema for your IDs.

After the stats job, you run the same two lines again. You now have two hashes. Say before is 3693697075 and after is 2123456789. Those numbers come from the doc shape above, not from your DB. Your proof is the pair you saved.

How to read it: top line gives Plan hash value, SQL ID, child number. Body gives Id, Operation, Name, Rows, Cost. Predicate section gives access and filter lines. If the hash moved, the plan moved.

Decision it drives: same hash means same plan, so look at data or load, not at the optimizer. New hash means the stats job or a bind change picked a new path. Save both outputs side by side before you touch SQL.

## 2. E-Rows versus A-Rows finds the bad guess

Plain claim: a bad row guess picks a bad join. Actual rows prove it.

Worked example B — the same order query with runtime stats. Add the hint or set stats on, run once, then print with last-run stats:

```sql
SELECT /*+ GATHER_PLAN_STATISTICS */ customer_id, SUM(amount)
FROM orders WHERE order_date >= DATE '2026-01-01'
GROUP BY customer_id;

SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR(NULL, NULL, 'ALLSTATS LAST'));
```

`ALLSTATS LAST` pulls I/O plus memory plus timing from V$SQL_PLAN_STATISTICS_ALL for the last run. Format keys IOSTATS, MEMSTATS, ALLSTATS, LAST are in the same DBMS_XPLAN page.

How to read it: E-Rows is the optimizer guess. A-Rows is what the line really returned. E-Time vs A-Time is guess vs real time per line. Starts shows how many times the line ran. A nested loop that runs 40,000 starts for 40,000 rows is fine on paper and slow in real life. A hash join with E-Rows 10 and A-Rows 900,000 means the guess forced the wrong join.

Real-Time SQL Monitoring gives the same split in a report. Query V$SQL_MONITOR or call DBMS_SQL_MONITOR. It lists per-line actual vs estimated rows, per-line timing, plus memory and temp use. It honors MONITOR and NO_MONITOR hints. Thresholds apply — long or parallel runs show up by default, short ones may not. Unverified — test on your schema for your threshold path. Guide: Oracle Performance Tuning Guide ch.21, 19c/26ai.

Decision it drives: big E-Rows vs A-Rows gap on one line means fix stats or shape on that table first. No gap but slow time means look at waits, I/O, or concurrency, not at row guesses.

One aside: blaming the index is easy, reading A-Rows is harder. Back to the lines.

## 3. Monitor live, trace only when stuck

Plain claim: Monitor answers "where now." Trace answers "what exactly, call by call."

Worked example C — Monitor first. Find your run in V$SQL_MONITOR, then build the text report with DBMS_SQL_MONITOR. You get a per-line tree with actual rows and time. Use it to confirm the slow line from section 2 while the SQL still runs or right after.

Worked example D — trace when Monitor cannot see it. Short fast SQL that runs 50,000 times a day often misses Monitor thresholds. Then use SQL Trace plus TKPROF:

```sql
ALTER SESSION SET SQL_TRACE = TRUE;
-- run your small statement set here
ALTER SESSION SET SQL_TRACE = FALSE;
```

```bash
tkprof ora_12345.trc out.txt explain=apps/xxx sys=no waits=yes
```

Enabling via DBMS_MONITOR plus ALTER SESSION, plus tkprof `.trc` to text, plus TRCSESS merge, are in Oracle Performance Tuning Guide ch.23, 19c/26ai. CLI flags vary by release. Unverified — test on your schema for your trace file path.

How to read trace output: parse, execute, fetch counts. Elapsed, CPU, disk, query, current gets. Waits by event. Recursive SQL listed apart. Read the documented traps before you trust totals — parses can dominate, fetches can hide in the app, sys=yes noise can flood the file.

Decision it drives: high parse count means use binds or cursor sharing. High fetch count means cut columns or paginate. High wait on one event means fix that wait, not the plan.

<details><summary>In case you don't know about E-Rows and A-Rows, it's estimated rows versus actual rows for one plan line.</summary>A large gap points to a bad estimate that pushed the optimizer to a bad plan. Quote both numbers plus plan hash before you name a cause.</details>

**Keep this: Quote plan hash plus A-Rows versus E-Rows before you name a cause.**
