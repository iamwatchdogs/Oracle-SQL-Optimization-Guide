---
title: Measure First
description: AWR, ASH, Monitor, XPLAN, and traces that show where time goes.
order: 11
draft: false
---

Do not add an index to a feeling. First name the statement, the window, the wait, and the plan line that consumed the time.

That sounds obvious until the same SQL text behaves differently at 2 a.m., at 9 a.m., and after a statistics job. Measurement turns a vague slowdown into a testable target.

## 1. Start with the workload window

Use **AWR** to frame the period and rank SQL by elapsed time, CPU, and work done. Use **ASH** to sample active sessions and events in that same window. ADDM can summarize findings from AWR data, but a finding is triage, not proof that a proposed change will help.

A practical sequence is:

1. Pull the AWR report for the bad interval.
2. Rank SQL by elapsed time and by `buffer_gets`.
3. Check ASH for active SQL, event, and module deltas in that interval.
4. Choose one SQL ID for statement-level diagnosis.

ASH is sampled. It can miss short statements, so pair it with SQL Monitor or a trace for the specific execution you care about. AWR retention and snapshot interval also matter. If the bad event fell outside the retained window, the absence of evidence is not evidence of absence. [S03](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgdba/) [S04](https://docs.oracle.com/en/database/oracle/oracle-database/19/tdppt/automatic-database-performance-monitoring.html)

AWR, ASH, and full diagnostic features have licensing implications in some editions. Check the current Oracle licensing guide before making a production plan depend on them.

## 2. Zoom to the executed plan

`EXPLAIN PLAN` is a compile-time explanation. It can miss the bind values and runtime decisions that matter. Run the statement, then inspect the cursor that actually executed:

```sql
SELECT * FROM employees WHERE dept_id = :dept_id;
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR(format => 'ALLSTATS LAST +PEEKED_BINDS'));
```

Read three fields before proposing a fix:

- **Plan hash value:** identifies the plan shape, but a hash change alone is not a speedup.
- **Estimated rows versus actual rows:** a large gap points to a cardinality problem on that line.
- **Access and filter predicates:** shows where Oracle expected to find rows and where it actually found them.

For long-running, parallel, or monitored statements, open SQL Monitor and the relevant `V$SQL_MONITOR` or `DBMS_SQL_MONITOR` output. It adds execution-level row and timing information that a single `EXPLAIN PLAN` cannot provide. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/) [S05](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html)

If you need a plan comparison API, treat `COMPARE_PLANS` as a **23ai+ release-checked API**. It is not a 19c guarantee. On 19c, use the documented side-by-side display facilities and save both outputs. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/generating-and-displaying-execution-plans.html) [S05](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html)

## 3. Split elapsed time

Wall-clock time tells you that something was slow. It does not tell you whether the statement spent its time parsing, executing, fetching, or waiting.

For a focused test, enable SQL Trace for the session or statement, collect the trace, and summarize it with TKPROF. Read parse, execute, and fetch counts; buffer and disk gets; and wait behavior. The tracing guide also documents traps around argument transformation, read consistency, schema interpretation, and time accounting. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/)

The next artifact is not just a faster number. It is a line in the trace or plan that explains where the work went.

## 4. Freeze the workload for the rerun

A SQL Tuning Set gives the before and after runs a shared input. Capture the representative SQL, binds, and relevant execution metadata with `DBMS_SQLTUNE` or `DBMS_SQLSET`. Use the same set for SQL Tuning Advisor, SQL Access Advisor, and SQL Performance Analyzer. [S18](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/managing-sql-tuning-sets.html)

For a reproducible incident, package the statement, plan, statistics, and DDL context with SQL Test Case Builder. For a portable offline bundle around a SQL ID, SQLdb360 can collect plans, statistics, ASH, and bind context. Treat that bundle as a collection artifact, not proof by itself. T-08 is CONDITIONAL, the repositories declare no clear license in the research pass, and the output still needs cross-checking against `DBMS_XPLAN` and SQL Monitor. [S67](https://github.com/mauropagano/sqld360)

The tooling inventory counts **18 Oracle built-in tool rows, 3 client rows, and 12 external rows**: **33 tool entries**. SQL Quarantine is a separate guardrail row, so the rendered inventory has **34 displayed rows**. The taxonomy matters more than the headline count because candidates, clients, and Oracle built-ins prove different things.

<details><summary>How the measurement tools divide the work</summary>

AWR answers “what happened during this window?” ASH answers “where were active sessions sampled?” SQL Monitor answers “what happened in this execution?” `DBMS_XPLAN` answers “which plan and row estimates are attached to the statement?” A Tuning Set answers “can both runs receive the same workload?” None of those tools replaces the others. [S03](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgdba/) [S05](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html) [S18](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/managing-sql-tuning-sets.html)
</details>

No live Oracle database was available for the research pass. `sqlcl` and `sqlplus` were not on `PATH`. The plans and timings described here are procedures or illustrative conditions, not measurements taken by this page.

Source IDs and technique IDs resolve in `.agents/research/07-sources-bibliography.md` and `.agents/research/01-proven-techniques-catalog.md`.

**Artifact: a SQL ID, a retained workload set, a noise baseline, and a saved before plan are the only valid starting point for a tuning change.**
