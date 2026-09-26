---
title: Measure With XPLAN and Monitor
description: Tag the execution, read the plan that ran, and compare two saved plans without guessing.
order: 31
draft: false
---

The first question is not "which index should I add?" It is "what did Oracle execute, and where did the estimate break?" A plan is evidence only when it identifies the statement, the execution, and the observed work.

`EXPLAIN PLAN` is a cheap screen. The executed cursor is the run you are trying to explain. This page is the runbook: tag the execution, display the plan that ran, read the line instead of the label, use SQL Monitor and ASH while the statement is live, trace only when the cheaper tools stop answering, then compare two saved plans.

> **Track:** Core (1, 2) · Practice (6) · Recovery (none) · Advanced / gated (3, 4, 5)
>
> **Prerequisites:** [Measure First](/01-proven-techniques/01-measure-first/) for the plan vocabulary and the target worksheet, plus a read session on the target database.
>
> **Evidence status:** The procedures below are documented against A1 sources: the 19c `DBMS_XPLAN` package reference [S05](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html), the 19c SQL Tuning Guide [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/), and the 19c Performance Tuning Guide [S03](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgdba/). Every fenced block is labeled `ILLUSTRATIVE`, `PLACEHOLDER`, or `MUTATING`. **No live Oracle database was available**, so no output here is a measurement. Confirm privileges, statistics settings, package signatures, and licensing on a test database.
>
> **Next required page:** [Freeze Work With STS](/03-toolbox/02-freeze-work-with-sts/).

## How this page is banded

| Band                 | Sections |
| -------------------- | -------- |
| **Core**             | 1, 2     |
| **Practice**         | 6        |
| **Recovery**         | none     |
| **Advanced / gated** | 3, 4, 5  |

- **Core (1, 2):** tag the session and read the executed cursor. Both need only a read session, and neither changes database state.
- **Practice (6):** compare two saved plans on a real ticket. The artifacts already exist, so the work is judgment rather than entitlement.
- **Recovery (none):** this page produces evidence, not a rollback. The revert path belongs to the change class that applied the candidate.
- **Advanced / gated (3, 4, 5):** Real-Time SQL Monitoring needs the diagnostic and tuning entitlements, ASH needs the diagnostic entitlement only, and SQL Trace needs tracing privileges while adding overhead. Confirm release, edition, and entitlement before you reach for them.

## 1. Tag the execution

Use both module and action. `SET_MODULE` identifies the application or workflow; `SET_ACTION` identifies the trial. Without the action, every before/after run collapses into the same attribution bucket.

**MUTATING — session and package state. ILLUSTRATIVE, not executed. SQLcl or SQL\*Plus, run in the session under test. Expected output: no rows returned; the session now reports these values to monitoring views.**

```sql
EXEC DBMS_APPLICATION_INFO.SET_MODULE('APP_REPORT', 'baseline');
EXEC DBMS_APPLICATION_INFO.SET_ACTION('RUN_01');
```

Run the statement under test, then find its SQL ID and child cursor on the target system:

**ILLUSTRATIVE — SQLcl or SQL\*Plus, read-only against `V$SQL`. Requires the scoped fixed-view read access described in the setup page. Expected output: recent matching cursors with child numbers and plan hashes.**

```sql
SELECT sql_id, child_number, plan_hash_value
FROM   V$SQL
WHERE  sql_text LIKE '%ORDER BY%'
ORDER  BY last_active_time DESC FETCH FIRST 10 ROWS ONLY;
```

Do not use a copied SQL ID. The full identity of the statement you measured is the target worksheet in [Measure First](/01-proven-techniques/01-measure-first/), and it is a preflight gate rather than optional depth. Read every field from the target system; an identity you did not read is a stop.

## 2. Display the plan that ran

For the current session, `DISPLAY_CURSOR` can use its defaults. For a specific execution, pass the SQL ID and the child number:

**ILLUSTRATIVE — PLACEHOLDER — SQLcl or SQL\*Plus. Replace `&sql_id` and `&child_number` with values read in section 1. Requires read access to `V$SQL_PLAN`, `V$SESSION`, and `V$SQL_PLAN_STATISTICS_ALL`. Expected output: the plan for the named child, with runtime statistics when they were gathered.**

```sql
SELECT * FROM TABLE(
  DBMS_XPLAN.DISPLAY_CURSOR(
    sql_id => '&sql_id',
    cursor_child_no => &child_number,
    format => 'ALLSTATS LAST +PEEKED_BINDS'
  )
);
```

`ALLSTATS` adds I/O and memory statistics when the required plan statistics are available. `LAST` limits those statistics to the last execution. `PEEKED_BINDS` shows which bind values shaped the plan. What appears depends on how the statement ran, including `STATISTICS_LEVEL` or `GATHER_PLAN_STATISTICS`. If your display has no actual rows, fix that first: a plan shape without runtime statistics cannot answer the question this page asks.

### Read the line, not the label

Record these readings for every line that decides the outcome, keyed to what `DISPLAY_CURSOR` prints:

| Reading                 | Where it comes from                                                    | Status                                             |
| ----------------------- | ---------------------------------------------------------------------- | -------------------------------------------------- |
| Operation and options   | `Operation` column in the printed plan                                 | as printed                                         |
| `E-Rows`                | `E-Rows` column                                                        | as printed; the estimate                           |
| `A-Rows`                | `A-Rows` column                                                        | as printed; the actual                             |
| Predicates              | `Predicates` block below the plan: `access` versus `filter`            | as printed                                         |
| `Cost`                  | `Cost` column                                                          | as printed; an estimate, not time                  |
| `Starts` and `A-Time`   | printed with `ALLSTATS` when runtime statistics were gathered          | as printed; the actual                             |
| Rows examined           | the step's `A-Rows` before a `filter` discards rows                    | derived, not printed                               |
| Selectivity             | inferred from the predicates and the row counts                        | derived, not printed                               |
| Per-line I/O and memory | `ALLSTATS` statistics for the step, when plan statistics were gathered | as printed when available; confirm on your release |

The full field list, including plan hash, `buffer_gets`, wait events, and where each value lives, is the nine-field table in [Measure First](/01-proven-techniques/01-measure-first/). Record the readings above for the decision line only.

`E-Rows` is the optimizer's prediction for that step. `A-Rows` is what the line actually processed. When they diverge at the decision line, the optimizer's model of that line is wrong, and the access path it chose is built on that wrong model. That is the reading rule.

The worked numbers belong to one pair: the canonical before/after plan pair owned by the [V0 lab](/00-preface/02-how-to-prove-a-win/), where the estimate misses, a filter runs after the read instead of as an access, and the work counter falls when the candidate closes the gap. This page does not restate those values. If a figure here ever disagrees with the V0 lab, the V0 lab wins.

Whether a full scan is acceptable is not decided on this page. The test for one — selectivity, rows examined, cost, partition pruning, and the measured delta — is owned by the [SPA recipe](/04-recipes/02-before-after-with-spa/). This page only requires that you apply it before you reject a plan.

**ILLUSTRATIVE — a scenario, not a measurement.** A report shows a new plan hash after a statistics change and still uses a full scan. The predicate is broad, the scan examines the expected partition, and the controlled before/after trials on the same workload show less work and less elapsed time. The verdict is "the plan changed and the measured result improved," not "full scans are bad."

## 3. Use SQL Monitor for the live run

Real-Time SQL Monitoring is useful when a statement is long-running, parallel, or explicitly monitored. It shows plan-line actual rows, timing, memory, and temporary-space use. It does not replace the cursor-cache plan for every short statement.

Read the active execution from the monitoring view while it runs:

**ILLUSTRATIVE — PLACEHOLDER — SQLcl or SQL\*Plus against `V$SQL_MONITOR`. Replace `&sql_id` with the identity read in section 1. Requires the documented read access to the monitoring views; full reports need the diagnostic and tuning entitlements. Expected output: one row for the monitored execution. Confirm the column list on your installed release.**

```sql
SELECT sql_id, status, elapsed_time, buffer_gets
FROM   V$SQL_MONITOR
WHERE  sql_id = '&sql_id';
```

A practical sequence is:

1. Tag the session with module and action.
2. Run the statement normally.
3. Inspect `V$SQL_MONITOR` or the SQL Monitor report while it is active.
4. Save the report with the SQL ID, child number, timestamp, and candidate change.
5. Compare the plan-line evidence with the controlled trials.

The feature is documented in chapter 21 of the 19c SQL Tuning Guide [S01]. Monitoring thresholds, privileges, and entitlement rules still apply, and full reports need the diagnostic and tuning entitlements in most builds. Check the documentation for your release instead of assuming that every short statement will appear.

## 4. Use ASH to locate the hot line

ASH samples active sessions once per second. It is useful for finding where time accumulated over a window, but it cannot account for every sub-second execution. The live view exposes `SQL_PLAN_LINE_ID`:

**ILLUSTRATIVE — PLACEHOLDER — SQLcl or SQL\*Plus against `V$ACTIVE_SESSION_HISTORY`. Replace `&sql_id` with the identity read in section 1. Requires the diagnostic entitlement and the documented view access. Expected output: one row per plan line and wait event, ordered by sample count.**

```sql
SELECT sql_id, sql_plan_line_id, event, COUNT(*) AS samples
FROM   V$ACTIVE_SESSION_HISTORY
WHERE  sample_time >= SYSTIMESTAMP - INTERVAL '15' MINUTE
AND    sql_id = '&sql_id'
GROUP  BY sql_id, sql_plan_line_id, event
ORDER  BY samples DESC;
```

For retained history, use the DBA view:

**ILLUSTRATIVE — PLACEHOLDER — SQLcl or SQL\*Plus against `DBA_HIST_ACTIVE_SESS_HISTORY`. Replace `&sql_id` and the two bind timestamps. Expected output: the sampled activity for that statement across the declared window.**

```sql
SELECT sample_time, sql_id, sql_plan_line_id, event
FROM   DBA_HIST_ACTIVE_SESS_HISTORY
WHERE  sample_time BETWEEN :begin_time AND :end_time
AND    sql_id = '&sql_id'
ORDER  BY sample_time;
```

The line ID gives ASH a join key to the plan you already captured. Without it you have a list of active SQL. With it you can ask whether a nested loop, hash join, or index line was actually active under the load. ASH and its window-based views are documented in the 19c Performance Tuning Guide [S03] and carry the diagnostic entitlement.

ASH is evidence of sampled presence, not an exact total. If the question is "how many rows did this line return?", use SQL Monitor or plan statistics. If the question is "where were active sessions observed?", use ASH.

## 5. Trace only when the cheaper tools stop answering

SQL Trace plus `tkprof` can break down parse, execute, and fetch counts, recursive SQL, waits, and elapsed time. The mechanism and its interpretation traps are documented in chapter 23 of the 19c SQL Tuning Guide [S01]. It also adds overhead, so trace only in a controlled window with the required `ALTER SESSION`, `DBMS_MONITOR`, or equivalent privileges.

Keep the trace file and its owner protected, and do not put a production password into a command line. A trace is useful when the statement is too short for SQL Monitor, fetches dominate, or recursive work is hiding. It is not a reason to enable tracing across the whole application and call the result a baseline.

## 6. Compare plans without guessing

Save the before and after `DISPLAY_CURSOR` output and diff them yourself: plan hash, access paths, predicates, `E-Rows`, `A-Rows`, `Starts`, `A-Time`, and cost. That path works on 19c and later, the releases this guide supports, and needs no package beyond the one you already used.

The Oracle Database 19c `DBMS_XPLAN` package reference documents two comparison functions, `COMPARE_PLANS` and `DIFF_PLAN` [S05]. Which one you need, what each returns, and the parameters they take are owned by [Measure First](/01-proven-techniques/01-measure-first/); this page does not repeat them.

Confirm the name, the signature, and the availability of each function on your installed release before you call it, and its available parameters once you have it, because update-level and later-release details differ. The [version drift page](/07-appendix-sources/02-version-drift-survival/) explains why the release label belongs next to the behavior.

## Artifact

A saved evidence set, not a screenshot:

- [ ] SQL ID, child number, plan hash, and bind context recorded
- [ ] Executed plan captured with `DISPLAY_CURSOR`
- [ ] `E-Rows` and `A-Rows` compared at the decision line
- [ ] Selectivity, rows examined, cost, I/O, and time recorded
- [ ] SQL Monitor or ASH evidence captured while the statement was live, or `not monitored` recorded with its reason when the monitoring threshold was not met
- [ ] `SET_MODULE` and `SET_ACTION` values recorded
- [ ] Before and after outputs saved for the same workload; `COMPARE_PLANS` or `DIFF_PLAN` used only after verifying the call against the installed release reference, otherwise the saved `DISPLAY_*` outputs diffed by hand

Every block above is `ILLUSTRATIVE`, `PLACEHOLDER`, or `MUTATING`, and every scenario is invented for teaching.

Source IDs and technique IDs resolve in [Appendix Sources](/07-appendix-sources/).

**Decision:** quote the executed plan, the actual rows, and the measured delta before you name a cause, and keep the release label next to any comparison API you print.

**Next required page:** [Freeze Work With STS](/03-toolbox/02-freeze-work-with-sts/).
