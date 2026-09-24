---
title: Freeze Work With STS
description: Lock the workload so before and after tests compare the same SQL.
order: 32
draft: false
---

A tuning set is a workload contract. It carries the SQL workload, binds, and recorded context. It does not force the same optimizer statistics or execution plan after a change. Without that boundary, “before” and “after” are two anecdotes wearing the same name.

> **Execution boundary:** this is a 19c runbook, not a live measurement. Confirm the exact capture API, privileges, licensing, and workload window on a test or staging database.

## 1. Choose a representative window

Do not hand-pick three statements because they are convenient. Capture the window that represents the decision you need to make: peak traffic, the batch job, the problematic bind family, or the full application slice.

Record:

- database and application version;
- schema and service boundary;
- capture start and end time;
- module and action filters;
- bind distributions and execution counts;
- whether recursive SQL is included;
- the STS name and owner.

A hand-curated STS is useful for isolation, but it has sampling bias. It can omit rare plans, skew, short statements, and workload interactions. If the goal is a production claim, validate the hand-curated set against a broader cursor-cache or AWR-derived workload.

## 2. Create and capture the set

For 19c, use the release-documented `DBMS_SQLSET.CAPTURE_CURSOR_CACHE` interface. Do not combine the package prefix with the capture suffix from another API. Confirm the overload, argument names, and capture window in the installed release reference. The important invariant is the named STS and its recorded capture window, not the suffix on a procedure name.

## 3. Inspect before you freeze

A capture is not successful because the name exists. Inspect its contents:

```sql
SELECT sql_id, plan_hash_value, elapsed_time, buffer_gets,
       executions, parsing_schema_name, module, action
FROM   TABLE(DBMS_SQLSET.SELECT_SQLSET('SALES_JAN'))
ORDER  BY buffer_gets DESC FETCH FIRST 20 ROWS ONLY;
```

Check the count, SQL IDs, bind coverage, plans, and execution context. If the set contains only the statements a DBA already suspected, record that as a hand-curated subset and do not call it representative.

A useful set has more than one bind shape when the application has skew, more than one plan when the workload legitimately uses them, and the right module/action boundary. Rare statements still matter; one execution does not necessarily make a statement unimportant.

## 4. Use the set on both sides

Create one SPA task from the frozen set. Use named executions for the before and after trials:

```sql
VARIABLE tname VARCHAR2(64);
EXEC :tname := DBMS_SQLPA.CREATE_ANALYSIS_TASK(sqlset_name => 'SALES_JAN');

EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name => :tname,
  execution_type => 'test execute',
  execution_name => 'before_01'
);
```

Apply exactly one candidate change, then run the after trial against the same STS:

```sql
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name => :tname,
  execution_type => 'test execute',
  execution_name => 'after_01'
);

EXEC DBMS_SQLPA.SET_ANALYSIS_TASK_PARAMETER(
  :tname, 'comparison_metric', 'buffer_gets'
);

EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name => :tname,
  execution_type => 'compare performance',
  execution_name => 'compare_01',
  execution_params => DBMS_ADVISOR.ARGLIST(
    'execution_name1', 'before_01',
    'execution_name2', 'after_01',
    'comparison_metric', 'buffer_gets'
  )
);

SELECT DBMS_SQLPA.REPORT_ANALYSIS_TASK(
  :tname, 'TEXT', 'TYPICAL', 'ALL'
) FROM dual;
```

Use `section => 'ALL'` when you want per-statement rows. `SUMMARY` is only the workload summary. The report is evidence for the trial; it is not the statistical gate by itself.

## 5. Repeat the workload, do not repeat the anecdote

The book’s policy is **K>=5 trials per side**, with **10–15 preferred** for noisy or high-impact measurements. Add one full-workload SPA pass per side for the aggregate verdict. SC15 supports repetition, variability, and confidence reporting as benchmarking principles; it does not supply this exact K floor.

SQLPA supplies the comparison trials. The harness calculates medians and bootstrap 95% confidence intervals from the comparable metrics. SQLPA does not calculate the book’s medians or bootstrap intervals. Keep the raw trial samples, the task name, the STS name, and the comparison metric together.

A repeat is invalid if any of these changed:

- SQL text or bind values;
- STS membership or statement attributes;
- host, service, or database state;
- statistics, indexes, hints, profiles, patches, or baselines;
- the measurement window or cache state.

## Decision table

| Result                                                               | Action                       |
| -------------------------------------------------------------------- | ---------------------------- |
| Aggregate and key statements improve beyond the measured noise floor | Move to load testing         |
| One statement regresses beyond the threshold                         | Reject or isolate the change |
| Only a plan hash changes                                             | Keep investigating           |
| Trial counts or workload context differ                              | Void the comparison          |

## References

- [Managing SQL Tuning Sets, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/managing-sql-tuning-sets.html)
- [DBMS_SQLSET, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLSET.html)
- [DBMS_SQLPA, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html)
- [Hoefler and Belli, SC15 benchmarking methodology](https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf)

**Keep this: same STS in, fair comparison out.**
