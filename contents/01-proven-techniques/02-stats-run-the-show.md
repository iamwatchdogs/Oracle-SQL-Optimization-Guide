---
title: Stats Run the Show
description: Fresh optimizer numbers that fix bad cardinality guesses.
order: 12
draft: false
---

Oracle does not optimize the table. It optimizes a cost model built from statistics, predicates, and runtime feedback.

When `WHERE dept_id = 99` returns a few rows but the plan estimates a large fraction of `employees`, the first question is not “which hint should I paste?” It is “which optimizer input is wrong or missing?”

## 1. Let automatic collection do the boring work

Start with the automatic optimizer-statistics task and object-level preferences. Reach for a manual gather when the object, workload, or release requires a specific response. A nightly script that computes every column on every table is not a strategy; it is a maintenance incident waiting for a maintenance window.

For large tables, the documented choice is often a sample-size policy rather than `ESTIMATE_PERCENT => 100`. Use `AUTO_SAMPLE_SIZE` or another documented estimating strategy when the accuracy and maintenance trade-off support it. A full compute can still be appropriate for a small, critical object, but the choice belongs in the object record and the V0 comparison. [S08](https://www.oracle.com/docs/tech/database/technical-brief-bp-for-stats-gather-19c.pdf) [S09](https://www.oracle.com/docs/tech/database/technical-brief-stats-concepts-19c.pdf)

Partitioned objects add another choice. Incremental statistics can maintain global information from partition changes and synopses instead of rescanning the whole object. Concurrent gathering can reduce a large stats window, but it competes for CPU and I/O. The plan outcome and the gathering cost both belong in the test record. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/)

**Real-Time Statistics is a 19c feature.** The 26ai guide's table of contents mentions regression models for real-time statistics, but this pass did not verify that detail beyond the table of contents. Treat the regression-model behavior as unverified until the 26ai page is read directly. Do not build the chapter's recommendation on it.

For tables that change many times between windows, Real-Time Statistics can keep optimizer estimates closer to recent DML. It is not a replacement for gathering on every object. Compare the estimate, the plan, and the cost on the actual workload before enabling it broadly.

High-frequency automatic collection is another option for volatile objects, not a blanket setting. More collection means more CPU, I/O, and maintenance-window pressure. The useful artifact is a targeted policy with a measured reason. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/) [S08](https://www.oracle.com/docs/tech/database/technical-brief-bp-for-stats-gather-19c.pdf)

## 2. Fix skew, correlation, and missing context

A histogram describes a column's value distribution. Use one when the predicate is skewed and the documented criteria support it. `FOR COLUMNS SIZE AUTO` lets Oracle choose where appropriate; forcing a histogram on every column adds maintenance and can make plans worse. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/)

Extended statistics describe relationships that single-column statistics cannot see. A column group can help when two predicates are correlated. An expression statistic can help when a predicate uses an expression such as `UPPER(city)`. `AUTO_STAT_EXTENSIONS` can let workload-derived SQL plan directives request extended statistics, but a directive is not a performance fix by itself.

Plan-directive maintenance is part of the fix. Inspect `DBA_SQL_PLAN_DIRECTIVES`, record why each directive exists, check whether it was resolved, and re-run the affected estimate comparison. An unresolved directive can leave the optimizer relying on dynamic statistics. That brings a parse-time cost to every hard parse, so do not hide a permanent statistics gap behind sampling. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/) [S26](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/managing-extended-statistics.html)

Dynamic sampling is useful when the optimizer has missing or insufficient statistics and cannot wait for a better input. It is also a tradeoff: sampling happens during hard parse, so repeated parse work can erase the benefit. Prefer a durable statistics fix when the workload and object allow it. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/) [S08](https://www.oracle.com/docs/tech/database/technical-brief-bp-for-stats-gather-19c.pdf)

## 3. Test pending statistics without lying to the optimizer

`PUBLISH=FALSE` is a staging mechanism. It keeps gathered statistics pending; it does **not** by itself make the optimizer use those pending values.

For a direct session test, enable pending-statistics use explicitly:

```sql
EXEC DBMS_STATS.SET_TABLE_PREFS('HR', 'EMPLOYEES', 'PUBLISH', 'FALSE');
EXEC DBMS_STATS.GATHER_TABLE_STATS('HR', 'EMPLOYEES');
ALTER SESSION SET OPTIMIZER_USE_PENDING_STATISTICS = TRUE;
```

For release-specific and repeatable testing, use SPA's Optimizer Statistics workflow where available. Compare the pending path with the current path using the same statement and workload, then publish the winner or discard the candidate. Publishing is the commit point. Keep the historical restore path ready because stats retention is bounded. [S29](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/) [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html)

Do not report “pending statistics improved the plan” unless you recorded how the optimizer was allowed to use them. The evidence needs the current statistics timestamp, pending statistics state, session or SPA workflow, plan pair, and decision. After publishing, restore the recorded `PUBLISH` preference. If the prior value was inherited rather than local, use the documented `NULL` reset where supported; then verify the effective value with `DBMS_STATS.GET_PREFS`.

<details><summary>How the targeted statistics ladder fits together</summary>

Start with ordinary column statistics. If the predicate is skewed, test a histogram. If two columns or an expression carry the real selectivity, test extended or expression statistics. If the workload keeps producing a missing-stats signal, inspect SQL plan directives and resolve the underlying gap. Use dynamic sampling only when the remaining information is genuinely unavailable at hard-parse time. Each rung needs its own plan and metric comparison. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/) [S26](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/managing-extended-statistics.html)
</details>

No live Oracle database was available for the research pass. `sqlcl` and `sqlplus` were not on `PATH`. The examples and thresholds here are procedures and starting policies, not results from this page.

Source IDs and technique IDs resolve in `.agents/research/07-sources-bibliography.md` and `.agents/research/01-proven-techniques-catalog.md`.

**Artifact: a stats decision record with the policy, estimate gap, plan pair, pending-state test, load, and restore command.**
