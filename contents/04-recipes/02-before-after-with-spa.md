---
title: Before and After With SPA
description: Run test execute twice and compare on buffer_gets before you trust a change.
order: 42
draft: false
---

One fast run is a sample. A controlled before/after pair is evidence. SQL Performance Analyzer gives you the controlled trials; your harness decides whether the measured difference is larger than the noise.

> **Execution boundary:** this page contains no live Oracle results. Run the sequence on a test or staging database with the required `ADVISOR` privilege and the licensing appropriate to your environment.

## 1. Screen cheaply, then execute fully

`EXPLAIN PLAN` is a cheap screen. It can catch a malformed statement, an obvious access-path surprise, or a missing object before you spend time on execution. It is not a performance verdict.

A full scan is not automatically wrong. Evaluate selectivity, rows examined, cost, partition pruning, and the measured after delta. A broad predicate can make a full scan cheaper than an index probe; a selective predicate can make the same operation expensive. The plan is a hypothesis until `test execute` measures it.

## 2. Create the task and run the first trial

The STS must already exist. Use one task and give every trial a name:

```sql
VARIABLE tname VARCHAR2(64);
EXEC :tname := DBMS_SQLPA.CREATE_ANALYSIS_TASK(
  sqlset_name => 'OPT_LOOP_WL',
  description => 'One candidate change on one frozen workload'
);

EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name => :tname,
  execution_type => 'test execute',
  execution_name => 'before_01'
);
```

This is the baseline. Do not add an index, gather statistics, change a hint, or edit the STS after this trial unless that action is the one candidate under test.

## 3. Apply one change, then run the after trial

Apply the candidate in the test environment. Then run the same set with the same execution context:

```sql
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name => :tname,
  execution_type => 'test execute',
  execution_name => 'after_01'
);
```

The SQLPA comparison metric defaults to elapsed time. This book records `buffer_gets` as a useful logical-work measure and elapsed time as the user-visible outcome. Do not call either one the truth before looking at the full report and the workload context.

## 4. Compare the named trials

```sql
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

The report’s section argument matters:

- `ALL` includes the summary and per-statement details. Use it when you claim that a statement improved, regressed, or stayed unchanged.
- `SUMMARY` returns the workload summary only. Do not cite it as per-statement evidence.

Read plan hash, rows, metric deltas, errors, and workload impact together. A plan change is useful context. It does not decide the verdict.

## 5. Repeat enough to separate signal from noise

Use the book policy: **K>=5 trials per side**, with **10–15 preferred** for a noisy or important statement. Add one full-workload SPA pass per side for the aggregate workload gate.

SC15 supports the general need to repeat measurements, measure long enough, and report variability and confidence. It does not prescribe this exact K floor. SQLPA supplies the comparison trials; the harness stores their metrics, calculates medians, and bootstraps 95% confidence intervals. SQLPA does not produce the book’s medians or bootstrap intervals.

The harness should keep at least:

```text
run_id, task_name, execution_name, sql_id, metric,
metric_value, plan_hash_value, started_at, finished_at,
candidate_change, database_version
```

A trial is invalid if the STS, binds, database state, host, metric, or candidate boundary changed. A faster result with a changed result set is not a win.

## 6. Use a cheap Python summary for the harness

A harness can calculate the summary around the SPA trials without pretending that SQLPA calculated it:

```python
import random
import statistics

def median_difference_ci(before, after, draws=2000):
    differences = []
    for _ in range(draws):
        before_median = statistics.median(random.choices(before, k=len(before)))
        after_median = statistics.median(random.choices(after, k=len(after)))
        differences.append(after_median - before_median)
    ordered = sorted(differences)
    return (
        statistics.median(differences),
        ordered[int(0.025 * draws)],
        ordered[int(0.975 * draws)],
    )
```

This is an unpaired bootstrap for the median difference. If the trials are genuinely paired, bootstrap the paired median differences instead. The harness must also compare per-statement deltas, the aggregate workload delta, and the no-regression rule. A lower median for one hero statement cannot erase a regression elsewhere in the STS.

## 7. Capture the executed plan

For the top movers, capture the plan that actually ran:

```sql
SELECT * FROM TABLE(
  DBMS_XPLAN.DISPLAY_CURSOR(
    sql_id => '&sql_id',
    cursor_child_no => NULL,
    format => 'ALLSTATS LAST +PEEKED_BINDS'
  )
);
```

Compare `E-Rows` with `A-Rows`, selectivity, rows examined, cost, predicates, and the measured deltas. If you need a plan comparison API, `DBMS_XPLAN.COMPARE_PLANS` is a 23ai+ release-checked API in this book. Verify the current release reference first. On 19c, save and compare the `DISPLAY_*` outputs.

## Decision table

| Evidence                                                                                                 | Verdict                     |
| -------------------------------------------------------------------------------------------------------- | --------------------------- |
| Aggregate improves, key statements do not regress, and the confidence interval clears the measured noise | Candidate for the next gate |
| Aggregate improves but one important statement regresses beyond threshold                                | Reject or split the change  |
| Only the plan hash changes                                                                               | Keep investigating          |
| `EXPLAIN PLAN` looks good but `test execute` regresses                                                   | Reject the explanation      |
| No live test was run                                                                                     | Record NOT-VERIFIED         |

## References

- [DBMS_SQLPA, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html)
- [DBMS_XPLAN, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html)
- [Managing SQL Tuning Sets, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/managing-sql-tuning-sets.html)
- [Hoefler and Belli, SC15 benchmarking methodology](https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf)

**Keep this: same STS, named trials, measured deltas, and a rollback.**
