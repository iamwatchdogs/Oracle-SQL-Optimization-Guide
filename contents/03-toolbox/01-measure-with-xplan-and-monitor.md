---
title: Measure With XPLAN and Monitor
description: Tag the execution, read the plan that ran, and compare two saved plans without guessing.
order: 31
draft: false
---

The first question is not "which index should I add?" It is "what did Oracle execute, and where did the estimate break?" A plan is evidence only when it identifies the statement, the execution, and the observed work.

`EXPLAIN PLAN` is a cheap screen. The executed cursor is the run you are trying to explain. This page is the runbook: tag the execution, display the plan that ran, read the line instead of the label, use SQL Monitor and ASH while the statement is live, trace only when the cheaper tools stop answering, compare two saved plans, route what you saw to a cause class, and — if nothing is licensed — use the ungated tools that do the same job.

Two warnings before you start, because both produce a confident wrong answer. `plan_hash_value` is a fingerprint, not a plan: two plans that differ where the hash cannot see will share it. And for a parallel statement, `ALLSTATS LAST` can report the coordinator's numbers and leave the slaves out.

> **Track:** Core (1, 2) · Practice (6, 7) · Recovery (none) · Advanced / gated (3, 4, 5, 8)
>
> **Prerequisites:** [Measure First](/01-proven-techniques/01-measure-first/) for the plan vocabulary and the target worksheet, plus a read session on the target database.
>
> **Evidence status:** The procedures below are documented against A1 sources: the 19c `DBMS_XPLAN` package reference [S05](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html), the `DBMS_MONITOR` package reference [S81](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_MONITOR.html), the 19c SQL Tuning Guide [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/), and the 19c Performance Tuning Guide [S03](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgdba/). Every fenced block is labeled `ILLUSTRATIVE`, `PLACEHOLDER`, or `MUTATING`. **No live Oracle database was available**, so no output here is a measurement. Two claims on this page rest on A2 or D sources and are marked where they appear: the documented `EXPLAIN PLAN` divergence [S83], and the parallel-execution `ALLSTATS LAST` caution [S92]. Confirm privileges, statistics settings, package signatures, and licensing on a test database.
>
> **Next required page:** [Freeze Work With STS](/03-toolbox/02-freeze-work-with-sts/).

## How this page is banded

| Band                 | Sections   |
| -------------------- | ---------- |
| **Core**             | 1, 2       |
| **Practice**         | 6, 7       |
| **Recovery**         | none       |
| **Advanced / gated** | 3, 4, 5, 8 |

- **Core (1, 2):** tag the session and read the executed cursor. Both read like lookups, but section 1 tags the session, so its first block writes a client identifier and is `MUTATING`. Section 2 only reads.
- **Practice (6, 7):** compare two saved plans on a real ticket, then route what you saw to a cause class and a next test. The artifacts already exist, so the work is judgment rather than entitlement.
- **Recovery (none):** this page produces evidence, not a rollback. The revert path belongs to the change class that applied the candidate.
- **Advanced / gated (3, 4, 5, 8):** Real-Time SQL Monitoring, ASH, and AWR carry entitlement questions, and SQL Trace needs tracing privileges while adding overhead. Section 8 is the ungated alternative for anyone without a pack. Confirm release, edition, and entitlement before you reach for the first four.

## 1. Tag the execution

A shared drive where every file is named `final.docx` is a drive nobody can measure a change on. Module and action are the two fields that stop that: one names the workflow, the other names the trial, and two runs that differ only in the second field are the only kind you can still compare next week.

Use both module and action. `SET_MODULE` identifies the application or workflow; `SET_ACTION` identifies the trial. Without the action, every before/after run collapses into the same attribution bucket.

**MUTATING — session and package state. Not executed here. SQLcl or SQL\*Plus, run in the session under test. Expected output: no rows returned; the session now reports these values to monitoring views.**

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

### Pick the child cursor on purpose

`child_number` is not a tiebreaker. The same SQL text can sit in the shared pool several times over, and each child can hold a different plan. Oracle creates a new child cursor when bind values change selectivity, when the optimizer environment changes, when object metadata changes, when adaptive cursor sharing kicks in, when the authorization context differs, or when the statement is simply not shareable. Pass one child number and you have picked one of those worlds without saying so.

Read all of them, then choose:

**ILLUSTRATIVE — SQLcl or SQL\*Plus, read-only. Expected output: one row per child for the statement, with the sharing reason when the children were not shared.**

```sql
SELECT sql_id, child_number, plan_hash_value, executions, is_bind_sensitive
FROM   V$SQL
WHERE  sql_id = '&sql_id'
ORDER  BY child_number;
```

`V$SQL_SHARED_CURSOR` gives the reason a child was not shared, which is the field that tells you whether you are looking at a plan difference or a context difference. Two children with different plan hashes and the same bind values is a finding. Two children with different plan hashes and different bind selectivity is just bind sensitivity, and the fix is a different bind set, not a baseline. `V$SQL` also carries an `is_bind_sensitive` flag that answers the same question in one column.

### The current-state view set

The cursor-cache views give you a number; the session views give you the context the number depends on. Neither class is optional and they are cheap.

| Question                                    | View                                                             |
| ------------------------------------------- | ---------------------------------------------------------------- |
| What did this statement do, over many runs? | `V$SQL`, `V$SQLSTATS`                                            |
| What did this line do, last time?           | `V$SQL_PLAN`, `V$SQL_PLAN_STATISTICS_ALL`                        |
| Why is the session waiting right now?       | `V$SESSION`, `V$SESSION_EVENT`, `V$SESSTAT`, `V$SESS_TIME_MODEL` |
| Why is TEMP growing?                        | `V$SQL_WORKAREA_ACTIVE`                                          |
| How is the parallel work distributed?       | `V$PQ_TQSTAT`, `GV$PX_SESSION`                                   |
| Why did this child not get shared?          | `V$SQL_SHARED_CURSOR`                                            |

`V$SQLSTATS` is the low-churn one. `V$SQL` carries parse counts, module and action, and optimizer environment that `V$SQLSTATS` drops, and it churns hard on a busy instance. Poll `V$SQLSTATS` for top-SQL and query `V$SQL` for the statement you already picked.

Sort by lifetime totals and you will rank statements by how long the instance has been up, not by how much they hurt. Normalize before you compare: `elapsed_time / executions`, `buffer_gets / executions`, `rows_processed / executions`. Then keep the plan hash, the child number, the module and action, the service, and the time window on every capture, because a per-execution average still hides the bind value that was slow.

## 2. Display the plan that ran

Turning on verbose logging across the whole application to understand one function is the debugging move everybody tries once, and the bill arrives everywhere except the function. `GATHER_PLAN_STATISTICS` on the one statement you are actually asking about is the scoped version, and this section is built on it.

For the current session, `DISPLAY_CURSOR` can use its defaults. For a specific execution, pass the SQL ID and the child number:

**PLACEHOLDER — SQLcl or SQL\*Plus. Replace `&sql_id` and `&child_number` with values read in section 1. Requires read access to `V$SQL_PLAN`, `V$SESSION`, and `V$SQL_PLAN_STATISTICS_ALL`. Expected output: the plan for the named child, with runtime statistics when they were gathered.**

```sql
SELECT * FROM TABLE(
  DBMS_XPLAN.DISPLAY_CURSOR(
    sql_id => '&sql_id',
    cursor_child_no => &child_number,
    format => 'ALLSTATS LAST +PEEKED_BINDS'

  )
);
```

`ALLSTATS` adds I/O and memory statistics when the required plan statistics are available. `LAST` limits those statistics to the last execution. `PEEKED_BINDS` shows which bind values shaped the plan. One label this format string needs: `PEEKED_BINDS` works on 19c, but it is **not enumerated** in the printed format list in either the 19c or the 26ai `DBMS_XPLAN` reference — an Oracle documentation gap, not a release boundary. Check it on your own instance before you build a runbook around it, and do not cite a reference page as proof that it exists.

If your display has no actual rows, you do not have a question yet, you have a plan shape. Fix that first: runtime statistics are what separate a measurement from an opinion.

### Get the actuals: the hint, not the instance switch

Row-source statistics have to be collected before `ALLSTATS` has anything to print. There are two ways to ask for them, and one of them is a trap.

Put the hint on the statement:

**PLACEHOLDER — the hint goes in the statement under test. The text after `/*+` is Oracle's, not a comment to you. Expected output: the statement behaves normally, and its row-source statistics are retained in the dynamic performance views for `ALLSTATS` to read.**

```sql
SELECT /*+ GATHER_PLAN_STATISTICS */ /* your real statement */ ...
```

The alternative is `STATISTICS_LEVEL = ALL` at the instance or session level. Do not reach for it to analyze one statement. It instruments everything running on that instance, the overhead is real, and a database-wide setting changed to satisfy one ticket is a database-wide setting nobody remembers reverting. The hint is scoped to the statement you are actually asking about, which is the scope you wanted.

The hint is not free either. It adds overhead per execution, so keep it to the target statement, and prefer a pre-production target for anything long, parallel, or high-frequency. The setting is a _measurement_ decision, and like every other one on this page it belongs in the run record.

### When `ALLSTATS LAST` is the wrong instrument

For a parallel statement, `ALLSTATS LAST` is not a summary of the whole execution. "Last" can resolve to the coordinator, and a coordinator's row counts are not the slave processes' row counts. The plan will print, the numbers will look plausible, and the per-line work will be understated by whatever the slaves did.

For parallel execution, get the operation-level view from SQL Monitor instead (section 3), which tracks the per-plan-line activity including the parallel servers. If you cannot, record the limitation next to the numbers rather than letting a reader treat an understated count as a measurement. This caution rests on practitioner reports rather than a package reference, so it is a rule to verify on your own release, not a documented guarantee [S92].

### Read the line, not the label

Record these readings for every line that decides the outcome, keyed to what `DISPLAY_CURSOR` prints:

| Reading               | Where it comes from                                           | Status                                              |
| --------------------- | ------------------------------------------------------------- | --------------------------------------------------- |
| Operation and options | `Operation` column in the printed plan                        | as printed                                          |
| `E-Rows`              | `E-Rows` column                                               | as printed; the estimate                            |
| `A-Rows`              | `A-Rows` column                                               | as printed; the actual                              |
| Predicates            | `Predicates` block below the plan: `access` versus `filter`   | as printed                                          |
| `Cost`                | `Cost` column                                                 | as printed; an estimate, not time                   |
| `Starts`              | `Starts` column with `ALLSTATS`                               | as printed; a count of operation starts, not a time |
| `A-Time`              | `A-Time` column with `ALLSTATS`                               | as printed; accumulated, and not exclusive          |
| `Buffers`             | `Buffers` column with `ALLSTATS`                              | as printed; logical reads                           |
| `Reads`               | `Reads` column with `ALLSTATS`                                | as printed; physical reads, and cache-dependent     |
| Work area             | `OMem`, `1Mem`, `Used-Mem`, `TempSpc` columns with `ALLSTATS` | as printed; demand versus what was actually used    |
| Rows examined         | the step's `A-Rows` before a `filter` discards rows           | derived, not printed                                |
| Selectivity           | inferred from the predicates and the row counts               | derived, not printed                                |

Three of those rows need the warning attached, because each one is routinely read as more than it is.

`A-Time` is accumulated, and a parent operation's time includes its children's. A line showing 90% of the statement's time may simply be the one that called the other 90%. Use it to find where to look, not to bill a line for work it did not do.

`Buffers` and `Reads` are different questions. `Buffers` is logical reads and is close to cache-independent, which makes it the most stable number to compare between two trials on the same data. `Reads` is physical reads and swings with cache state, so a `Reads` improvement between two runs may be a warm cache rather than a better plan. When you want a comparison metric, compare `Buffers`.

`TempSpc` above zero means a sort or hash join ran out of work area and spilled. That is a sizing signal, not a plan defect on its own, and it points at the input volume or the work area setting rather than at the SQL text.

The full field list, including plan hash, `buffer_gets`, wait events, and where each value lives, is the nine-field table in [Measure First](/01-proven-techniques/01-measure-first/). Record the readings above for the decision line only.

`E-Rows` is the optimizer's prediction for that step. `A-Rows` is what the line actually processed. When they diverge at the decision line, the optimizer's model of that line is wrong, and the access path it chose is built on that wrong model. That is the reading rule.

The worked numbers belong to one pair: the canonical before/after plan pair owned by the [V0 lab](/00-preface/02-how-to-prove-a-win/), where the estimate misses, a filter runs after the read instead of as an access, and the work counter falls when the candidate closes the gap. This page does not restate those values. If a figure here ever disagrees with the V0 lab, the V0 lab wins.

Whether a full scan is acceptable is not decided on this page. The test for one — selectivity, rows examined, cost, partition pruning, and the measured delta — is owned by the [SPA recipe](/04-recipes/02-before-after-with-spa/). This page only requires that you apply it before you reject a plan.

**ILLUSTRATIVE — a scenario, not a measurement.** A report shows a new plan hash after a statistics change and still uses a full scan. The predicate is broad, the scan examines the expected partition, and the controlled before/after trials on the same workload show less work and less elapsed time. The verdict is "the plan changed and the measured result improved," not "full scans are bad."

### Get a statement total from the client

`DISPLAY_CURSOR` answers "which line". For "how much, in total", the client's own trace is faster and needs no package grant:

**ILLUSTRATIVE — SQL\*Plus and SQLcl session settings, not SQL. `AUTOTRACE TRACEONLY` runs the statement and fetches the result without printing it. Expected output: the plan plus statement-level statistics after the query completes.**

```sql
SET TIMING ON
SET AUTOTRACE TRACEONLY STATISTICS
SET ARRAYSIZE 1000

<the statement under test>;

SET AUTOTRACE OFF
```

You get consistent gets, physical reads, redo, and round trips. That is a good total and a bad diagnosis, because a statement total tells you the query cost 4 million logical reads without telling you which of fourteen plan lines spent them.

Now read those client settings as part of the experiment, not as decoration. `ARRAYSIZE` sets how many rows the client fetches per round trip, so it changes the round-trip count, the elapsed time, and the client's CPU. Whether you fetched every row or let the application stream the first screen changes the work by orders of magnitude. Network distance between your client and the database is in the same list. Any of these can turn a 400 ms query into a 4 s one with the plan untouched.

That is the rule: **client settings are benchmark inputs.** If you change one between the before run and the after run, the comparison is void, and the reason will not be visible in the plan.

## 3. Use SQL Monitor for the live run

Real-Time SQL Monitoring is useful when a statement is long-running, parallel, or explicitly monitored. It shows plan-line actual rows, timing, memory, and temporary-space use. It does not replace the cursor-cache plan for every short statement.

**If the report comes back empty where you expect a statement, check configuration before you blame the plan.** Real-Time SQL Monitoring depends on the `CONTROL_MANAGEMENT_PACK_ACCESS` initialization parameter, which is not at its permissive default in every deployment, and on a licensed option. Neither of those is a plan problem, and this book prints no pack table — the licensing guide for your exact release and deployment is the authority [S90]. If the parameter is right and the option is absent, section 8 below is the ungated path that answers the same question.

It also starts on its own. Oracle begins monitoring qualifying statements automatically, which includes parallel SQL and statements that have burned several seconds of CPU or I/O. You do not switch it on per statement, and a statement that finished in 40 ms may never appear at all. `not monitored` is a normal result with a normal reason, and the reason belongs in the artifact.

Read the active execution from the monitoring view while it runs:

**PLACEHOLDER — SQLcl or SQL\*Plus against `V$SQL_MONITOR`. Replace `&sql_id` with the identity read in section 1. Requires the documented read access to the monitoring views. Confirm the column list and the entitlement for your release before you rely on the report. Expected output: one row for the monitored execution.**

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

The feature is documented in chapter 21 of the 19c SQL Tuning Guide [S01], with the per-line detail in `V$SQL_PLAN_MONITOR`. Monitoring thresholds, privileges, and entitlement rules still apply. Check the licensing guide for your release rather than assuming a pack list: this book deliberately prints none, because the sources that state one are feature documentation and a decade-old datasheet, and neither is license text [S90](https://docs.oracle.com/en/database/oracle/oracle-database/19/dblic/Licensing-Information.html).

One substitution to refuse. If the monitoring entitlement is not there, the answer is `DISPLAY_CURSOR` with the `GATHER_PLAN_STATISTICS` hint, or a session trace, not "we will use the monitor because it is free to click." A tool you do not have licensed is not a plan, and an unlicensed report is not evidence.

## 4. Use ASH to locate the hot line

ASH samples active sessions once per second. It is useful for finding where time accumulated over a window, but it cannot account for every sub-second execution. The live view exposes `SQL_PLAN_LINE_ID`:

**PLACEHOLDER — SQLcl or SQL\*Plus against `V$ACTIVE_SESSION_HISTORY`. Replace `&sql_id` with the identity read in section 1. Requires the diagnostic entitlement and the documented view access. Expected output: one row per plan line and wait event, ordered by sample count.**

```sql
SELECT sql_id, sql_plan_line_id, event, COUNT(*) AS samples
FROM   V$ACTIVE_SESSION_HISTORY
WHERE  sample_time >= SYSTIMESTAMP - INTERVAL '15' MINUTE
AND    sql_id = '&sql_id'
GROUP  BY sql_id, sql_plan_line_id, event
ORDER  BY samples DESC;
```

For retained history, use the DBA view:

**PLACEHOLDER — SQLcl or SQL\*Plus against `DBA_HIST_ACTIVE_SESS_HISTORY`. Replace `&sql_id` and the two bind timestamps. Expected output: the sampled activity for that statement across the declared window.**

```sql
SELECT sample_time, sql_id, sql_plan_line_id, event
FROM   DBA_HIST_ACTIVE_SESS_HISTORY
WHERE  sample_time BETWEEN :begin_time AND :end_time
AND    sql_id = '&sql_id'
ORDER  BY sample_time;
```

The line ID gives ASH a join key to the plan you already captured. Without it you have a list of active SQL. With it you can ask whether a nested loop, hash join, or index line was actually active under the load. ASH and its window-based views are documented in the 19c Performance Tuning Guide [S03]. Confirm the entitlement for your release before you query them; the licensing guide, not a feature page, settles it [S90](https://docs.oracle.com/en/database/oracle/oracle-database/19/dblic/Licensing-Information.html).

ASH is evidence of sampled presence, not an exact total. If the question is "how many rows did this line return?", use SQL Monitor or plan statistics. If the question is "where were active sessions observed?", use ASH.

### AWR and ADDM answer a different question

> **"When did performance change?"**

ASH samples. AWR aggregates across snapshots, and ADDM reads those aggregates and hands you findings for an interval. Neither replaces an exact trace for a single request.

The questions those three answer well are worth writing down, because they are the questions people actually arrive with:

- When did performance change?
- Which plan hashes and child cursors existed in that window?
- Was database time CPU, I/O, concurrency, cluster, commit, or network?
- Which objects and plan lines were active during the incident?
- Is this statement globally expensive, or only occasionally slow?

That last one is the one people skip and the one that changes the fix. A statement that is 12% of all database time needs a rewrite. A statement that is 0.4% of database time but owns every slow report needs a bind problem.

A SQL-specific AWR report, generated by `awrsqrpt.sql` for a single SQL ID over a snapshot range, is the narrower instrument [S03]. Reach for it when you have a window and an ID, and you want the per-execution history rather than a sampled slice.

## 5. Trace only when the cheaper tools stop answering

SQL Trace plus `tkprof` can break down parse, execute, and fetch counts, recursive SQL, waits, and elapsed time. The mechanism and its interpretation traps are documented in chapter 23 of the 19c SQL Tuning Guide [S01] and in the `DBMS_MONITOR` package reference [S81]. It also adds overhead, so trace only in a controlled window with the required `ALTER SESSION`, `DBMS_MONITOR`, or equivalent privileges.

Enable it as narrowly as the interface allows:

**PLACEHOLDER — this is the mutating pair. Replace `&sid` and `&serial_no` with the values for the session under test. `waits => TRUE` records wait events, `binds => TRUE` records bind values, and `plan_stat` records plan statistics. Expected output: no rows; a server-side trace file is being written for that session only. Requires the tracing privilege.**

```sql
BEGIN
  DBMS_MONITOR.SESSION_TRACE_ENABLE(
    session_id => &sid,
    serial_num => &serial_no,
    waits      => TRUE,
    binds      => TRUE,
    plan_stat  => 'ALL_EXECUTIONS'
  );
END;
/

-- Reproduce only the target operation.

BEGIN
  DBMS_MONITOR.SESSION_TRACE_DISABLE(
    session_id => &sid,
    serial_num => &serial_no
  );
END;
/
```

Then format the server trace file:

**ILLUSTRATIVE — shell command against a trace file you copied off the server. The sort keys put CPU time, fetch time, and parse time first, which is the order that matters when you are asking why the request was slow. Expected output: a formatted report. Confirm the tool and the sort keys on your host.**

```bash
tkprof input.trc output.prf waits=yes sort=exeela,fchela,prsela
```

Four cautions, and the first one is a security problem rather than a performance one.

`binds => TRUE` captures the actual values your application passed. Those are production data, and if the query touches a customer table they are now sitting in a file on a database server. Decide before you enable it, and if the answer is no, enable waits without binds and accept a less specific report.

Tracing a busy service writes a large file and charges real overhead to every session caught in it. Scope to a session where you can, a client identifier or module/action where you cannot, and never enable it across an application to "get a baseline."

Pooled connections are the reason `DBMS_MONITOR` accepts a client identifier and a service/module/action pair. A session ID captured before a connection is returned to the pool is a session ID that will be somebody else's by the time you look.

On RAC, one logical session can produce trace files on more than one instance. Correlate them by instance and time, or the report you assemble will double-count.

Keep the trace file and its owner protected, and do not put a production password into a command line. A trace is useful when the statement is too short for SQL Monitor, fetches dominate, or recursive work is hiding. It is not a reason to enable tracing across the whole application and call the result a baseline.

### When TKPROF is too coarse

`tkprof` aggregates. When the call sequence or the composition of the response time is the question, aggregation is the wrong shape. Method R's `mrprof` reads a 10046 event trace and builds a response-time profile at microsecond resolution [S85]. That resolution figure comes from the vendor's own manual, so treat it as a claim to test on your own traces rather than a benchmark — the honest way to decide is to run both over one bounded trace you already have and compare what you can see. It is commercial, and it is only as good as the trace you fed it, which brings back the bounding rule above.

The purchase case for it is narrow and worth stating plainly: reach for it when you already collect traces regularly and TKPROF's aggregation is what is stopping you. If you trace once a quarter, the learning curve costs more than the answer.

## 6. Compare plans without guessing

Save the before and after `DISPLAY_CURSOR` output and diff them yourself: the plan lines, access paths, predicates, `E-Rows`, `A-Rows`, `Starts`, `A-Time`, work area, and the row-source statistics on both sides. That path works on every release this guide supports, and it needs no package beyond the one you already used.

Do not diff the plan hash and call it done. The 19c reference describes comparing two `PLAN_HASH_VALUE` values as the cheap way to find out whether two plans are the same, without reading them line by line — and that is exactly what it is good for. What it cannot do is tell you **which** line changed. The hash is computed over the plan, not over your SQL text, so rewording the statement leaves it alone while a structurally different plan moves it. The hash tells you _whether_ to look. The rows tell you what you found. See the [19c `V$SQL_PLAN` reference](https://docs.oracle.com/en/database/oracle/oracle-database/19/refrn/V-SQL_PLAN.html).

`DBMS_XPLAN` also ships two comparison functions, and **both are callable on this guide's primary path.** `COMPARE_PLANS` is documented in the 19c reference at §224.5.1 and is absent from the 12.2 reference, so 19c introduced it; `DIFF_PLAN`'s signature changed between 12.2 and 19c, so the signature is what you release-check. Their parameters are owned by [Measure First](/01-proven-techniques/01-measure-first/); this page does not repeat them.

Verify the name, the signature, and the availability of each function against the package reference for your installed release before you call it, and read the subprogram table rather than the Overview. The 19c Overview lists only the package's five table functions, so a plain function like `COMPARE_PLANS` looks missing there while being present in Table 224-2. The [version drift page](/07-appendix-sources/02-version-drift-survival/) explains why, and plan comparison is a live case of the rule: **a later release extending an API is not the same as a later release introducing it** — and the corollary that this book once got wrong, which is that a function missing from an Overview's prose list is not a function missing from the package.

One aside: the hash is free to compute and the line-by-line diff is not, which is why the cheap answer wins so often. Back to the plan.

## 7. From the reading to a hypothesis

> **"Is this statement globally expensive, or only occasionally slow?"**

You now have numbers. Numbers do not name a cause, and guessing here is how three hours disappear before a release. This is the routing table from measurement to cause class to the next deterministic test.

| What you saw                                     | What it usually means                                           | The next test                                                                                                                                                                                             |
| ------------------------------------------------ | --------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| First big `E-Rows` versus `A-Rows` divergence    | The optimizer's row estimate is wrong                           | Histograms, extended column-group or expression statistics, bind selectivity, and when statistics last changed [S82](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_STATS.html) |
| High `Starts` multiplied by the inner row source | A nested loop is amplifying, or a scalar subquery is re-running | An alternative join method or join order, or preaggregate the inner side                                                                                                                                  |
| High `Buffers`, low `Reads`                      | Inefficient logical work, not slow storage                      | Access path, join order, partition pruning, or a rewrite                                                                                                                                                  |
| High `Reads` with low `Buffers`                  | A direct-path read or a genuinely large scan                    | Partition or index strategy, storage throughput, parallelism                                                                                                                                              |
| `TempSpc` above zero                             | The work area was too small for the input                       | Fix the cardinality, preaggregate, change the join method, or test a larger work area                                                                                                                     |
| Parallel servers badly unbalanced                | Distribution or data skew, not bad SQL                          | Partition key, join distribution, DOP, and the skew in the data itself                                                                                                                                    |
| Lock, cluster, or commit waits dominating        | A concurrency problem, not a text problem                       | The blocking session, the cluster waits, and the commit rate. A rewrite will not fix this                                                                                                                 |
| Many parses, many child cursors                  | Cursor sharing, bind typing, or environment drift               | `V$SQL_SHARED_CURSOR`, the bind types, and whether the application reuses the statement text                                                                                                              |
| Fast database time, slow client elapsed          | Fetch, network, or client-side work                             | Trace round trips, array size, result volume, and the application's own profile                                                                                                                           |

Two of those rows are the ones people skip, and both are worth the habit. The last row is the most common real cause of "the database is fine but the page is slow": the query finished in 40 ms and the client spent 3 seconds moving the rows. You will never find that in a plan, because the plan is not where the time went.

The parallel row is second, and it is the one that saves a rewrite. If the parallel servers are unbalanced, the SQL may be correct and the plan may be the best available; the problem is that one server got the data and the other twenty-three waited.

Every hypothesis this table produces is a **CANDIDATE** until the [SPA recipe](/04-recipes/02-before-after-with-spa/) runs it on the frozen workload. Reading the plan decides what to test. It never decides the verdict.

## 8. When no pack is licensed

Everything so far needs a licence. This does not.

**Snapper** is a single SQL\*Plus script that takes deltas from the core dynamic views — `GV$SESSTAT`, `GV$SESS_TIME_MODEL`, `GV$SESSION_EVENT`, and ASH-like samples from `GV$SESSION` — and reports what a session is doing, whether it is on CPU or waiting, and which waits dominate [S87]. It installs nothing, creates no schema, and reads only core views, which is what makes it the right answer to "what is this session actually doing right now" on a deployment where the licensed reports are not available. The repository is Apache-2.0 and not archived [S87].

Two boundaries, both of which people get wrong. Snapper is not historical: if you do not save the output, you have a snapshot and not a record. And its ASH-like sampling is not Oracle ASH — it samples the core views itself, at its own interval, and a sample count from it is not comparable to a sample count from `V$ACTIVE_SESSION_HISTORY`. Do not put the two in the same column.

**Statspack** is the historical lane most often reached for when AWR is not the answer. `SPREPORT.SQL` compares two snapshots and `SPREPSQL.SQL` focuses on a SQL hash value, showing the statistics and plans captured in the period [S93]. It is less granular than AWR and less convenient, and it needs a schema installed and maintained. The trade is interval history for a maintenance burden; whether it is licensed on your deployment is a question for the licensing guide.

**One dossier instead of twelve queries.** SQLd360 is an install-nothing SQL\*Plus collector that gathers plans, metadata, optimizer context, and whatever performance history is available for one SQL ID into an offline HTML, CSV, or text bundle — and it asks whether Tuning, Diagnostics, or neither is licensed so it can skip the repositories it is not entitled to read [S67]. For handing a complete statement dossier from a DBA to a developer, it is the best-shaped tool in this chapter. It organizes evidence; it does not run a rewrite search for you.

Oracle Support also ships collection tools of this kind, SQL Health Check and SQLTXPLAIN, which bundle plans, object metadata, statistics, and parameters for one statement. This book names them without a link on purpose: their availability and current support matrix are settled through My Oracle Support rather than through public documentation, and a secondary write-up is not a substitute for checking it yourself. Treat both as a **CANDIDATE** until you have confirmed the current matrix.

## Artifact

A saved evidence set, not a screenshot:

- [ ] SQL ID, child number, plan hash, and bind context recorded
- [ ] Every child cursor for the statement listed, and the child you chose justified by `V$SQL_SHARED_CURSOR` or `is_bind_sensitive`
- [ ] Row-source statistics present, and how they were collected recorded — the `GATHER_PLAN_STATISTICS` hint, not an instance-wide `STATISTICS_LEVEL` change
- [ ] `E-Rows` and `A-Rows` compared at the decision line
- [ ] `Starts` read as a count and `A-Time` read as non-exclusive; `Buffers` and `Reads` not conflated
- [ ] Parallel statements measured through SQL Monitor, or the `ALLSTATS LAST` limitation recorded next to the numbers
- [ ] Client fetch shape, `ARRAYSIZE`, and result count recorded, because they are part of the measurement
- [ ] Hypothesis written as a cause class and a next test, using the routing table in section 7
- [ ] SQL Monitor or ASH evidence captured while the statement was live, or `not monitored` recorded with its reason when the monitoring threshold was not met
- [ ] `SET_MODULE` and `SET_ACTION` values recorded
- [ ] Before and after outputs saved for the same workload and diffed line by line; `COMPARE_PLANS` or `DIFF_PLAN` used only after confirming the function exists on the installed release, otherwise the saved `DISPLAY_*` outputs diffed by hand
- [ ] If no pack is licensed, the pack-free instruments you used instead recorded by name, and the limitation of each one recorded too

Every block above is `ILLUSTRATIVE`, `PLACEHOLDER`, or `MUTATING`, and every scenario is invented for teaching.

**Decision:** quote the executed plan, the actual rows, and the measured delta before you name a cause, and keep the release label next to any comparison API you print.
