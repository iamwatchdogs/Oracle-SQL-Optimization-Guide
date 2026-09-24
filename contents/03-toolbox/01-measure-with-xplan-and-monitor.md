---
title: Measure With XPLAN and Monitor
description: Show the executed plan and per-line actual rows first.
order: 31
draft: false
---

The first question is not “which index should I add?” It is “what did Oracle execute, and where did the estimate break?”

A plan is evidence only when it identifies the statement, the execution, and the observed work. `EXPLAIN PLAN` is a cheap screen. The executed cursor is the run you are trying to explain.

> **Execution boundary:** this page contains no live-database measurements. The SQL is a 19c runbook with placeholders. Confirm privileges, statistics settings, package signatures, and licensing on a test database.

## 1. Tag the execution

Use both module and action. `SET_MODULE` identifies the application or workflow; `SET_ACTION` identifies the trial. Without the action, every before/after run collapses into the same attribution bucket.

```sql
EXEC DBMS_APPLICATION_INFO.SET_MODULE('APP_REPORT', 'baseline');
EXEC DBMS_APPLICATION_INFO.SET_ACTION('RUN_01');
```

Run the statement under test, then find its SQL ID and child cursor:

```sql
SELECT sql_id, child_number, plan_hash_value
FROM   V$SQL
WHERE  sql_text LIKE '%ORDER BY%'
ORDER  BY last_active_time DESC FETCH FIRST 10 ROWS ONLY;
```

Do not use a copied SQL ID. Query the target system.

## 2. Display the plan that ran

For the current session, `DISPLAY_CURSOR` can use its defaults. For a specific execution, pass the SQL ID and child number:

```sql
SELECT * FROM TABLE(
  DBMS_XPLAN.DISPLAY_CURSOR(
    sql_id => '&sql_id',
    cursor_child_no => &child_number,
    format => 'ALLSTATS LAST +PEEKED_BINDS'
  )
);
```

`ALLSTATS` adds I/O and memory statistics when the required plan statistics are available. `LAST` limits those statistics to the last execution. `PEEKED_BINDS` helps you see which bind values shaped the plan. The exact statistics available depend on how the statement was run, including `STATISTICS_LEVEL` or `GATHER_PLAN_STATISTICS`.

### Read the line, not the label

Record these fields for every important line:

| Field                      | What it answers                                        |
| -------------------------- | ------------------------------------------------------ |
| Operation and options      | Which access path or join ran                          |
| `E-Rows`                   | What the optimizer estimated                           |
| `A-Rows`                   | What the line actually produced                        |
| Selectivity and predicates | How narrow the access or filter was                    |
| Rows examined              | How much work reached the line                         |
| Cost and time              | What the optimizer priced versus what the run consumed |
| I/O and memory             | Whether the delay was physical work or in-memory work  |

A large `E-Rows`/`A-Rows` gap is evidence of an estimate problem at that line. It is not proof that the whole query is slow. Check the next lines, the waits, and the measured before/after result.

A full scan is not automatically wrong. It can be the cheapest path when the predicate is broad, the table is small, the result set is large, or the plan is feeding a rewrite. Judge it with selectivity, rows examined, cost, and measured deltas. “I dislike full scans” is not a query plan.

## 3. Use SQL Monitor for the live run

Real-Time SQL Monitoring is useful when a statement is long-running, parallel, or explicitly monitored. It shows plan-line actual rows, timing, memory, and temporary-space information. It does not replace the cursor-cache plan for every short statement.

A practical sequence is:

1. Tag the session with module and action.
2. Run the statement normally.
3. Inspect `V$SQL_MONITOR` or the SQL Monitor report while it is active.
4. Save the report with the SQL ID, child number, timestamp, and candidate change.
5. Compare the plan-line evidence with the SPA trials.

Monitoring thresholds, privileges, and edition/licensing rules still apply. Check the current Oracle documentation for the feature you use instead of assuming that every short statement will appear.

## 4. Use ASH to locate the hot line

ASH samples active sessions. It is useful for finding where time accumulated over a window, but it cannot account for every sub-second execution. The live view exposes `SQL_PLAN_LINE_ID`:

```sql
SELECT sql_id, sql_plan_line_id, event, COUNT(*) AS samples
FROM   V$ACTIVE_SESSION_HISTORY
WHERE  sample_time >= SYSTIMESTAMP - INTERVAL '15' MINUTE
AND    sql_id = '&sql_id'
GROUP  BY sql_id, sql_plan_line_id, event
ORDER  BY samples DESC;
```

For retained history, use the DBA view:

```sql
SELECT sample_time, sql_id, sql_plan_line_id, event
FROM   DBA_HIST_ACTIVE_SESS_HISTORY
WHERE  sample_time BETWEEN :begin_time AND :end_time
AND    sql_id = '&sql_id'
ORDER  BY sample_time;
```

The line ID gives ASH a join key to the plan you already captured. Without it, you have a list of active SQL. With it, you can ask whether a nested loop, hash join, index operation, or another line was actually active under the load.

ASH is evidence of sampled presence, not an exact total. If the question is “how many rows did this line return?”, use SQL Monitor or plan statistics. If the question is “where were active sessions observed?”, use ASH.

## 5. Trace only when the cheaper tools stop answering

SQL Trace plus `tkprof` can break down parse, execute, fetch, recursive SQL, waits, and elapsed time. It also adds overhead. Trace only in a controlled window with the required `ALTER SESSION`, `DBMS_MONITOR`, or equivalent privileges. Keep the trace file and its owner protected, and do not put a production password into a command line.

A trace is useful when the statement is too short for SQL Monitor, fetches dominate, or recursive work is hiding. It is not a reason to enable tracing across the whole application and call the result a baseline.

## 6. Compare plans without guessing

Save the before and after `DISPLAY_CURSOR` output. Compare plan hash, access paths, predicates, `E-Rows`, `A-Rows`, rows examined, cost, and runtime.

On 19c, use the documented `DISPLAY_*` outputs and a saved side-by-side artifact. `DBMS_XPLAN.COMPARE_PLANS` is a 23ai+ release-checked API in this book; verify its exact name and signature in the current release reference before using it. Do not put a 23ai-only call in a 19c runbook and call it portable.

## Illustrative scenario

A report has a new plan hash after a statistics change. The plan still uses a full scan. The predicate is broad, the scan examines the expected partition, and the SPA trials show lower rows examined and lower elapsed time for the full workload. The correct verdict is “the plan changed and the measured result improved,” not “full scans are bad.”

## Output checklist

- [ ] SQL ID, child number, plan hash, and bind context recorded
- [ ] Executed plan captured with `DISPLAY_CURSOR`
- [ ] `E-Rows` and `A-Rows` compared at the decision line
- [ ] Selectivity, rows examined, cost, I/O, and time recorded
- [ ] SQL Monitor or ASH evidence captured when the statement is live
- [ ] `SET_MODULE` and `SET_ACTION` values recorded
- [ ] Before and after outputs compared with the same workload
- [ ] `COMPARE_PLANS` used only after a 23ai+ release check

## References

- [DBMS_XPLAN, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html)
- [Monitoring Database Operations, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/monitoring-database-operations.html)
- [Database Performance Tuning Guide, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgdba/)
- [DBMS_APPLICATION_INFO, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_APPLICATION_INFO.html)

**Keep this: quote the executed plan, actual rows, and measured delta before naming a cause.**
