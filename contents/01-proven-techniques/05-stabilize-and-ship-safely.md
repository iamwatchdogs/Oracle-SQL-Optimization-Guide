---
title: Stabilize and Ship Safely
description: Baselines, profiles, advisors, and guardrails that block regressions.
order: 15
draft: false
---

"It got faster on my laptop. Can I ship it? Not yet."

Your join on `employees(id,name,dept_id,salary)` and `departments(id,name)` drops from 9 seconds to 0.4 seconds after a new index. You ship Friday. Monday stats refresh flips it back to `TABLE ACCESS FULL`. Same code. Slow again. Speed without a lock is luck.

A baseline is like a saved game, except Oracle reloads the known-good plan and tests new plans before they go live. Drop the game now. Known plans run. New plans prove faster first.

<details><summary>In case you don't know about a SQL profile, it's extra numbers attached to one SQL ID.</summary>A SQL profile holds auxiliary statistics for one statement. It corrects the optimizer estimate without touching code. You accept it from SQL Tuning Advisor, then verify with SPA test execute before and after. Drop it to roll back. App owners use it when they cannot edit SQL but need a better plan now. It drives one decision: keep the corrected estimate or drop it. Do not use a code rewrite instead. Rewrite needs a deploy and full regression tests, while a profile is one object tied to one SQL ID. Sharp line: it fixes the estimate while the text stays byte-identical. Example: an order lookup picks FULL with E-Rows 100 against A-Rows 2M. The profile adds the missing selectivity and the next parse picks INDEX RANGE SCAN. V0 confirms buffer_gets fell. See [T-46] https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/sql-tuning-advisor.html</details>

<details><summary>In case you don't know about a SQL patch, it's a hint attached to one SQL ID.</summary>A SQL patch injects hints into one statement without editing the app. Oracle built it to work around optimizer faults. You create it with `DBMS_SQLDIAG.CREATE_SQL_PATCH`. Unverified — run on your test DB. Support teams use it when packaged code fails and a code change is weeks away. It drives one decision: ship a short-term workaround or wait for a real fix. Do not use it as a permanent tune. It hides the root cause and rots as data shifts, costing hidden debt plus re-tests on each upgrade. Sharp line: it changes the plan when you cannot change the text. Example: `WHERE status = :b1` picks a bad nested loop. You patch a FULL hint to force the stable path, then log a task to fix stats. See [T-47/T-66] https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLDIAG.html</details>

### 1. Control the plan: hints last, baselines first

Plain claim: hints freeze decisions. Baselines verify decisions.

Naive progression:

```sql
-- Naive: hint that worked once, now stale
SELECT /*+ INDEX(e emp_dept_ix) USE_NL(e d) */ d.name, AVG(e.salary)
FROM employees e JOIN departments d ON d.id = e.dept_id
WHERE e.salary > 50000 GROUP BY d.name;
-- Plan today: NESTED LOOPS + INDEX RANGE SCAN. Fast.
-- Plan after data growth: same frozen shape. Slow. Hint ignored or harmful.
```

Check hint use with the hint report in `DISPLAY_CURSOR`. Docs: TGSQL ch.19 Influencing the Optimizer (https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/influencing-the-optimizer.html) [T-45]. If the report says unused, Oracle ignored you.

Fixed:

```sql
-- Fixed: capture the good plan, evolve only verified plans
EXEC DBMS_SPM.LOAD_PLANS_FROM_CURSOR_CACHE(sql_id=>'abc123');
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_SQL_PLAN_BASELINE(sql_handle=>'XYZ'));
-- New plans stay unaccepted until evolve proves better
```

What the plan shows: `DISPLAY_SQL_PLAN_BASELINE` lists accepted vs unaccepted plans. Only accepted run. Docs: TGSQL ch.28/29 + `DBMS_SPM` ref + 19c SPM brief [T-48]. Migrate old stored outlines to baselines with ch.30 paths and behavior-preserving options [T-53]. On 19c, Auto SPM verifies candidates in back office from Auto STS when best-vs-worst metrics cross a threshold. On 26ai, Real-Time SPM verifies in foreground during execution and reinstates the prior accepted plan on regression (PVLDB 2026, Oracle Optimizer blogs July 2024 / Nov 2025) [T-49]. Keep adaptive plans on unless V0 says off. Plan shows adaptive markers and the final branch. Docs: TGSQL ch.4 About Adaptive Query Optimization [T-50].

Why it matters: baselines are the reject-regression primitive. Hints are last resort and short-term mitigations.

### 2. Keep cursors shared and parameters scoped

Plain claim: literals flood the shared pool. Binds reuse plans. Wrong scope pollutes cursors.

Naive progression:

```sql
-- Naive: app builds text per dept
SELECT * FROM employees WHERE dept_id = 10;
SELECT * FROM employees WHERE dept_id = 11;
-- V$SQL shows 5,000 child cursors, high parse CPU
```

Fixed: bind the variable, let adaptive cursor sharing pick per bind set.

```sql
SELECT * FROM employees WHERE dept_id = :b1;
-- V$SQL shows 1 parent, few children, IS_BIND_SENSITIVE/AWARE flags where skew needs it
```

What the plan shows: fewer children in `V$SQL` / `V$SQL_SHARED_CURSOR`, stable hash for the common case, second child for the skewed bind. Docs: TGSQL ch.20 cursor sharing, bind peeking, ACS [T-51/T-59]. Do not set `CURSOR_SHARING=FORCE` as a permanent fix. Do not scatter session-level optimizer changes. They cause cursor pollution and mismatches [T-52]. SQL profiles [T-46] and patches [T-47] attach to a SQL ID without editing code when you cannot change the app. Drop to roll back.

Why it matters: parse storms look like slow queries. The fix is reuse, not indexes. Measure cursor counts plus V0 on a Tuning Set of both extremes. (One aside: I still check V$SQL before I blame the index. Back to shipping.)

### 3. Propose with advisors, ship with a gate and guardrails

Plain claim: advisors propose. SPA disposes. Guardrails catch the rest.

Naive progression:

```sql
-- Naive: apply all four Tuning Advisor tips at once, ship direct to prod
-- Stats + profile + index + rewrite. One helps. One hurts. Unknown which.
```

Fixed, one at a time:

1. Run SQL Tuning Advisor on the SQL ID, AWR range, or Tuning Set. It returns four analyses: statistics, profile, access path, structure, plus alternative plans [T-54]. On standby workloads, tune via Active Data Guard workflow [T-55].
2. Apply one tip. Run SQL Performance Analyzer: `DBMS_SQLPA.CREATE_ANALYSIS_TASK`, `test execute` before/after, `compare performance` on `buffer_gets` or `elapsed_time` [T-56]. Docs: `DBMS_SQLPA` ref (https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html), RAT User's Guide.
3. ADDM is triage only [T-57]. Test deploy before prod [T-60]. Follow ch.2 methodology for modeling and rollout [T-58].

What the plan shows: SPA report lists improved, regressed, unchanged per statement, with plan hash per side. Ship only the improved set.

Second progression, deploys:

```sql
-- Naive: ALTER TABLE ADD PARTITION during peak, locks queue
-- Fixed layout path: DBMS_REDEFINITION with CAN_REDEF_TABLE checks, sync interim, ABORT_REDEF_TABLE ready [T-62]
-- Fixed code path: Edition-Based Redefinition, old edition live, new edition tested, instant switch [T-63]
```

For runaways, set Resource Manager plan limits plus SQL Quarantine so the bad plan is killed and blacklisted [T-64]. Docs: TGSQL ch.4 About Quarantined SQL Plans, Resource Manager guide. On 26ai, note `SQL_ERROR_MITIGATION` and the transpiler for PL/SQL-in-SQL as a net for compile errors and per-row call overhead, not as a tuning fix [T-61/T-65]. Unverified on your schema — test on your schema.

Why it matters: safe ship is a loop. Propose, test execute, compare, lock, guard. Skip a step and Monday reverts you.

**Keep this: One change, one SPA compare, one rollback path; otherwise do not ship. No gate, no prod.**
