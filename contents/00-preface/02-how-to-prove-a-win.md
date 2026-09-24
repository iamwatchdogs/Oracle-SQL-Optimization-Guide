---
title: How to Prove a Win
description: The before-and-after harness every chapter uses.
order: 3
draft: false
---

One fast run is an anecdote. A production-safe win is a repeatable comparison.

That comparison is V0: same workload, measured noise, one change, before and after evidence, and a rollback decision. It is deliberately boring. Boring is what makes it useful during an incident.

## 1. Freeze the question

A fair comparison starts with the same question on both sides. Put the representative statement, binds, and execution context into a SQL Tuning Set. If the workload is a report, include the report's relevant bind range. If it is an OLTP path, include both common and skewed values. [S18](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/managing-sql-tuning-sets.html)

Do not let a changed data distribution masquerade as a code improvement. The Tuning Set is a repeatable input, not a promise that a tiny sample matches production.

## 2. Measure the incumbent and the noise

Run the unchanged workload first. Then repeat it without a change. Record elapsed time and `buffer_gets` for each run, and keep the spread. A difference smaller than that spread is not a decision-grade result.

The research recommends at least five repetitions per side and treats 10–15 as a useful starting budget for statement-level measurements. Calibrate the budget to the runtime, cache state, workload mix, and confidence you need. More short samples do not automatically beat fewer sufficiently long samples. [S58](https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf)

## 3. Capture the executed plan

The plan is part of the result. Save the plan that actually ran for the before workload, including the plan hash, predicates, and runtime row estimates when available.

```sql
SELECT * FROM employees WHERE dept_id = :dept_id;
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR(format => 'ALLSTATS LAST +PEEKED_BINDS'));
```

`EXPLAIN PLAN` is useful for a quick pre-check, but it is not a substitute for the executed plan. `DBMS_XPLAN.DISPLAY_CURSOR` is the evidence format for the statement you measured. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/generating-and-displaying-execution-plans.html) [S05](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html)

## 4. Apply one change

Choose one intervention: a statistics gather, one index, one rewrite, one parameter, or one plan control. Do not combine a new index with a new profile and a stats gather. If the result improves, you will not know which part helped.

For a risky statistics change, use pending statistics and a direct test path. `PUBLISH=FALSE` stores a candidate; it does not by itself make the optimizer use that candidate. For direct testing, use:

```sql
ALTER SESSION SET OPTIMIZER_USE_PENDING_STATISTICS = TRUE;
```

Alternatively, use SQL Performance Analyzer's Optimizer Statistics workflow where available. Record which path was used. [S29] [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html)

## 5. Run the after workload

The after side must use the same SQL Tuning Set, the same binds, and the same comparison method. `DBMS_SQLPA` supplies the before/after harness:

```sql
VARIABLE tname VARCHAR2(64);
EXEC :tname := DBMS_SQLPA.CREATE_ANALYSIS_TASK(sqlset_name => 'OPT_LOOP_WL');
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(task_name => :tname, execution_type => 'test execute', execution_name => 'before_change');
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(task_name => :tname, execution_type => 'test execute', execution_name => 'after_change');
EXEC DBMS_SQLPA.SET_ANALYSIS_TASK_PARAMETER(:tname, 'comparison_metric', 'buffer_gets');
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(task_name => :tname, execution_type => 'compare performance', execution_name => 'cmp_buffergets');
SELECT DBMS_SQLPA.REPORT_ANALYSIS_TASK(:tname, 'TEXT', 'TYPICAL', 'ALL') FROM dual;
```

`elapsed_time` is the default comparison metric. `buffer_gets` is a useful logical-work metric, but it is not automatically a substitute for user-visible time. Report both when the question matters to users. [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html)

## 6. Decide, then file the artifact

Accept only when the after result beats the measured noise, the confidence or repeatability is adequate, no relevant statement regresses, and the semantic checks pass. Reject or roll back when any of those checks fail.

The artifact is small and specific:

- SQL Tuning Set name and statement count.
- A/A noise result and repetition policy.
- Before and after `DISPLAY_CURSOR` output.
- SPA task and comparison report.
- Semantic test result.
- Change SQL or DDL, operator, timestamp, and rollback command.
- Decision and the next workload step.

A 23ai+ `COMPARE_PLANS` API can help when it is present and checked in your release reference. Do not promise it for 19c; use the documented 19c side-by-side display facilities until the exact API is verified in your environment. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/) [S05](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html)

<details><summary>Why DBMS_SQLPA is the measurement spine</summary>

SPA creates two versions of the same workload, executes them as `before_change` and `after_change`, and reports per-statement comparisons. It can compare `elapsed_time`, `buffer_gets`, and other supported metrics. The report is a proposal to accept or reject, not a substitute for reading the plan and checking the result set. [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html) [S13](https://docs.oracle.com/en/database/oracle/oracle-database/19/ratug/creating-an-analysis-task.html)
</details>

No live Oracle database was available for the research pass. `sqlcl` and `sqlplus` were not on `PATH`. The commands above are a procedure to run, not a benchmark result produced by this page.

Source IDs and technique IDs resolve in `.agents/research/07-sources-bibliography.md` and `.agents/research/01-proven-techniques-catalog.md`.

**Decision: keep the change when the artifact beats the noise; otherwise keep the incumbent.**
