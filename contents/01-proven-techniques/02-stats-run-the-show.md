---
title: Stats Run the Show
description: Fresh optimizer numbers that fix bad cardinality guesses.
order: 12
draft: false
---

"Why did Oracle pick that bad plan? It guessed wrong about my data."

Take `employees(id,name,dept_id,salary)` with 10M rows. Dept 10 holds 40% of rows. You run `WHERE dept_id = 10`. Oracle picks `TABLE ACCESS FULL`. Good. You run `WHERE dept_id = 99`. Only 20 rows match. Oracle still picks `TABLE ACCESS FULL`. Bad. Same shape, different data. The difference is numbers about data. That is optimizer statistics.

Fresh counts are like a headcount before food orders, except Oracle counts rows and value spread to pick join order and access paths. Drop the catering now. Stats are estimates. Plans follow estimates.

<details><summary>In case you don't know about a histogram, it's a note on how values spread in a column.</summary>It is a note on how values spread in one column. Flat columns need no note. Skewed columns do. Oracle stores frequency, top-frequency, or hybrid by set rules. Height-balanced is legacy. You build it with `METHOD_OPT`, such as `FOR COLUMNS SIZE AUTO salary`. Defaults pick only where skew meets the TGSQL ch.11 criteria. Devs use it when one value matches 40% and the next matches 20 rows, yet plans stay FULL for both. It drives selective access for skewed predicates. Do not force histograms on every column. Extra notes add parse and space cost and can worsen plans. Sharp line: it tells the optimizer which values are rare. Example: `WHERE salary > 180000` goes from E-Rows 500K and A-Rows 800 on FULL to E-Rows 900 and A-Rows 800 on RANGE SCAN. Unverified — check your skew. See [T-16].</details>

<details><summary>In case you don't know about extended statistics, it's a note on columns used together.</summary>They are stats on columns used together, or on an expression. City plus state is the classic pair. `UPPER(name)` is the classic expression. Single-column numbers miss the link. You create them by hand with `method_opt=>'FOR COLUMNS (state, country) SIZE SKEWONLY'`, or set `AUTO_STAT_EXTENSIONS` to ON and let plan directives trigger creation. Devs use them when two filters each look selective alone but match many rows together. They drive correct cardinality for combined predicates. Do not rely on single-column stats alone. They multiply independent guesses and undercount by 100x, which picks the wrong join. Sharp line: they store the correlation single columns cannot see. Example: `WHERE city='Austin' AND state='TX'` guesses 10 rows alone but matches 50K together. Group stats close the gap. See [T-17] https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/managing-extended-statistics.html</details>

### 1. Keep auto collection on, tune the edges with care

Plain claim: defaults win. Custom scripts lose unless you measure.

Naive progression:

```sql
-- Naive: nightly 100% gather on a 500M-row table, window overruns, plans flip
EXEC DBMS_STATS.GATHER_TABLE_STATS('HR','EMPLOYEES',estimate_percent=>100);
-- Plan next morning: INDEX RANGE SCAN becomes TABLE ACCESS FULL, no code change
```

Fixed:

```sql
-- Fixed: leave the auto task on, set prefs per object
EXEC DBMS_STATS.SET_TABLE_PREFS('HR','EMPLOYEES','ESTIMATE_PERCENT','AUTO_SAMPLE_SIZE');
-- Check history, then compare plans with DISPLAY_CURSOR before/after
```

What the plan shows: after a correct gather, `INDEX RANGE SCAN` on `EMP_DEPT_IX` for `dept_id = 99` with E-Rows close to A-Rows. Docs: Best Practices for Gathering Optimizer Statistics 19c + TGSQL ch.13 Gathering Optimizer Statistics [T-09/T-10]. Manual sample-size and parallelism guidance lives there. Do not run 100% gathers by habit.

For partitioned tables, set `SET_TABLE_PREFS(...,'INCREMENTAL','TRUE')` and keep global numbers via synopses (adaptive sampling, HyperLogLog) [T-11]. For tight windows, use concurrent gathering tied to Resource Manager [T-12]. For hot DML tables, turn on Real-Time Statistics (19c+, regression models added in 26ai) so DML updates feed the optimizer without waiting for night [T-13]. For bulk loads, rely on online gathering during `CREATE TABLE AS SELECT` and direct-path inserts [T-14]. For intra-day churn, add high-frequency auto collection on volatile objects only [T-23].

Why it matters: stale stats are a documented root cause of bad plans (TGSQL ch.10). Volatile tables need a different path. AskTOM thread July 2026 records the trade-off [T-13].

### 2. Fix skew and links: histograms, groups, expressions

Plain claim: one-column flat numbers fail on skew and on correlated columns.

Naive progression:

```sql
-- Naive: salary skew, no histogram
SELECT * FROM employees WHERE salary > 180000;
-- E-Rows=500K, A-Rows=800. Plan: TABLE ACCESS FULL. Wrong.
```

Fixed:

```sql
-- Fixed: histogram where criteria meet, then recheck
EXEC DBMS_STATS.GATHER_TABLE_STATS('HR','EMPLOYEES',method_opt=>'FOR COLUMNS SIZE AUTO salary');
SELECT * FROM employees WHERE salary > 180000;
-- Plan: INDEX RANGE SCAN, E-Rows=900, A-Rows=800
```

What the plan shows: `INDEX RANGE SCAN` with E-Rows near A-Rows in `DISPLAY_CURSOR`. Docs: TGSQL ch.11 criteria per type [T-16]. Second shape: `WHERE city='Austin' AND state='TX'`. Single-column stats multiply selectivities and guess 10 rows when truth is 50K. Fix with a column group or `AUTO_STAT_EXTENSIONS=ON` [T-17]. Third shape: `WHERE UPPER(name)='KING'`. Fix with expression statistics on `UPPER(name)` [T-18]. Read `DBA_SQL_PLAN_DIRECTIVES` to see recorded misses and whether directives resolved them [T-19]. For missing or derived predicates, dynamic statistics (dynamic sampling, TGSQL ch.12) samples at parse time [T-15]. Prefer fixing stats first. Parse-time sampling costs each hard parse.

Why it matters: this ladder fixes the E-Rows vs A-Rows gap from Measure First without touching SQL. Unverified on your schema — test on your schema.

### 3. Test risky refreshes without breaking the app

Plain claim: new numbers can cause regressions. Stage them.

Naive progression:

```sql
-- Naive: gather straight into production, three reports flip plans at 9am
EXEC DBMS_STATS.GATHER_TABLE_STATS('HR','EMPLOYEES');
```

Fixed:

```sql
-- Fixed: publish later, compare, then keep or drop
EXEC DBMS_STATS.SET_TABLE_PREFS('HR','EMPLOYEES','PUBLISH','FALSE');
EXEC DBMS_STATS.GATHER_TABLE_STATS('HR','EMPLOYEES');
-- compare pending vs current with plan + V0, then:
EXEC DBMS_STATS.PUBLISH_PENDING_STATS('HR','EMPLOYEES');
-- rollback if bad:
EXEC DBMS_STATS.RESTORE_TABLE_STATS('HR','EMPLOYEES',SYSDATE-1);
```

What the plan shows: pending plan hash vs current plan hash via compare, then `INDEX RANGE SCAN` stays or returns. Docs: TGSQL ch.15 pending stats [T-21], ch.16 restore + retention [T-22]. Run Optimizer Statistics Advisor monthly (task, findings, actions script) before hand-tuning policy [T-20].

Why it matters: restore is the rollback primitive for every stats change. History retention bounds the window. No restore point, no gather. (One aside: I still double-check PUBLISH before I gather. Back to the numbers.)

**Keep this: Fix the estimate first; the plan follows. Stage with pending, keep restore ready.**
