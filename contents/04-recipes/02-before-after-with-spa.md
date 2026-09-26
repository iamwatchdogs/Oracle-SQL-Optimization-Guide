---
title: Before and After With SPA
description: Screen cheaply, run named trials on one frozen set, and capture the plan that ran.
order: 42
draft: false
---

One fast run is a sample. A controlled before and after pair on one frozen set is evidence. SQL Performance Analyzer produces the named trials and the comparison report; your harness decides whether the measured difference is larger than the noise.

The [STS runbook](/03-toolbox/02-freeze-work-with-sts/) freezes the input. This page owns the analysis-task sequence it defers to: create the task, run the first trial, apply one change, run the after trial, compare the named trials, and capture the plan that actually executed.

> **Track:** Core (1, 7, When SPA is the wrong instrument) · Practice (3, 4, 5, 6, Decision table) · Recovery (none) · Advanced / gated (2)
>
> **Prerequisites:** [Freeze With STS](/04-recipes/01-freeze-with-sts/) behind you, so the set exists, plus a test target where you may apply one candidate change.
>
> **Evidence status:** The task sequence is A1-sourced and read firsthand from the 19c `DBMS_SQLPA` package reference [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html); plan display comes from the 19c `DBMS_XPLAN` reference [S05](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html) — note that `COMPARE_PLANS` is documented in that 19c reference at §224.5.1 and is absent from 12.2, so 19c introduced it; Database Replay comes from the Real Application Testing guide [S13]; the frozen set comes from [S18](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/managing-sql-tuning-sets.html). The repetition principle is B1 methodology [S58](https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf). Blocks are `ILLUSTRATIVE`, `PLACEHOLDER`, or `MUTATING`. **No live Oracle database was available**, so no trial on this page has been run.
>
> **Next required page:** [Stats Pipeline You Can Script](/04-recipes/03-stats-pipeline-you-can-script/).

## How this page is banded

| Band                 | Sections                               |
| -------------------- | -------------------------------------- |
| **Core**             | 1, 7, When SPA is the wrong instrument |
| **Practice**         | 3, 4, 5, 6, Decision table             |
| **Recovery**         | none                                   |
| **Advanced / gated** | 2                                      |

- **Core (1, 7, When SPA is the wrong instrument):** the cheap screen, the capture of the plan that ran, and the rule for when SPA is the wrong instrument entirely. All three are read actions against a target you already have, and none needs the analysis task.
- **Practice (3, 4, 5, 6, Decision table):** on a real ticket, once the gated task exists: apply exactly one change, compare the named trials, repeat under the policy, summarize outside SQLPA, and read the verdict rows.
- **Recovery (none):** this page measures and reports; it does not undo. The revert that follows a failed verdict belongs to the change class and to the [accept or rollback gate](/05-feedback-loop/03-accept-or-rollback-gate/).
- **Advanced / gated (2):** creating and running an analysis task needs the `ADVISOR` privilege plus the Real Application Testing entitlement that SQL Performance Analyzer depends on. Confirm both before the first trial.

## 1. Screen cheaply, then execute fully

`EXPLAIN PLAN` is a cheap screen. It catches a malformed statement, an obvious access-path surprise, or a missing object before you spend execution budget, and it shows no runtime statistics. The analyzer package also offers `explain plan` as an execution type, which analyzes without executing, so it works as a pre-gate inside the task [S06]. Neither form is a performance verdict.

**A full scan is not automatically wrong.** Evaluate selectivity, rows examined, cost, partition pruning, and the measured after delta. A broad predicate can make a full scan cheaper than an index probe, and a selective predicate can make the same operation expensive. The plan stays a hypothesis until `test execute` measures it.

## 2. Create the task and run the first trial

The set must already exist. Use one task for both sides and give every trial a name:

**MUTATING. Creates an analysis task and runs its first trial. SQLcl or SQL\*Plus with the `ADVISOR` privilege on a target whose Real Application Testing entitlement is confirmed. Structure follows the 19c `DBMS_SQLPA` package reference [S06]; not executed here. Confirm every signature on the installed release. Expected output: the task name, then no rows.**

```sql
VARIABLE tname VARCHAR2(64);

EXEC :tname := DBMS_SQLPA.CREATE_ANALYSIS_TASK(
  sqlset_name  => 'OPT_LOOP_WL',
  description  => 'one candidate change on one frozen workload'
);

EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name      => :tname,
  execution_type => 'test execute',
  execution_name => 'before_01'
);
```

This is the baseline. After this line, do not add an index, gather statistics, change a hint, or edit the set unless that action is the single candidate under test. Every block here assumes one owner: the schema that owns `OPT_LOOP_WL` also creates and runs the task, so no owner argument is passed. If the set lives in another schema, pass the documented owner argument and confirm its name on the installed release. Record `sts_owner` and `task_owner` as separate fields in the run manifest.

## 3. Apply one change, then run the after trial

Apply the candidate on the test target, then confirm it actually applied: read the change back from the dictionary — the index, the gathered statistics, the profile, the parameter — and record what you read beside the trial name. An after trial whose candidate was never confirmed shares its label with a second before trial.

Then run the same set with the same execution context:

**MUTATING. Runs the second named trial on the same task. SQLcl or SQL\*Plus, same session rules as section 2. Not executed here. Expected output: no rows returned.**

```sql
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name      => :tname,
  execution_type => 'test execute',
  execution_name => 'after_01'
);
```

The comparison metric defaults to elapsed time [S06]. This guide records `buffer_gets` as the logical-work measure and elapsed time as the user-visible outcome. Set the metric once, record it in the manifest, and do not call either one the truth before you have read the report and the workload context.

SPA compares seven metrics, and the one you pick decides what the report can prove: elapsed time, CPU, buffer gets, disk reads, direct writes, optimizer cost, and interconnect bytes [S06]. Three of them carry a trap.

- **`optimizer_cost`** is an estimate, not a measurement. You can set `comparison_metric` to it — the interface will accept it — and the report will confidently rank your candidates by the optimizer's opinion of them. That is how you ship the plan Oracle liked most instead of the one that measured fastest. **Do not use optimizer cost as a comparison metric or as a ranking key.** If the report shows it, read it as explanation, never as the verdict.
- **`disk_reads` and `direct_writes`** are cache-sensitive. A `disk_reads` improvement between two trials may be a warm cache rather than a better plan. That is why the guide's primary metric is `buffer_gets`, which is close to cache-independent.
- **`interconnect_bytes`** only means something on RAC, where it measures traffic between instances. On a single instance it is a column of zeros that looks like a result.

The report also tells you about _set_ membership, not just per-statement deltas: statements that improved, statements that regressed, statements that are **new**, and statements that are **missing** from the set. New and missing matter more than they sound. A statement missing from the after set did not get faster, it stopped being collected, and a shrinking workload can flatter a regression. Count the statements on both sides and record the difference before you read the improvement percentage.

## 4. Compare the named trials

Point the comparison at the two names, then read the report:

**MUTATING. Sets a task parameter and runs a comparison execution on the same task. SQLcl or SQL\*Plus with the privileges from section 2. Not executed here; confirm `execution_params`, `DBMS_ADVISOR.ARGLIST`, and the report arguments on the installed release. Expected output: no rows returned.**

```sql
EXEC DBMS_SQLPA.SET_ANALYSIS_TASK_PARAMETER(
  :tname, 'comparison_metric', 'buffer_gets'
);

EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name        => :tname,
  execution_type   => 'compare performance',
  execution_name   => 'cmp_01',
  execution_params => DBMS_ADVISOR.ARGLIST(
    'execution_name1', 'before_01',
    'execution_name2', 'after_01'
  )
);
```

**ILLUSTRATIVE — SQLcl or SQL\*Plus, read-only over the task's report. Requires the privilege to read the analysis task. Expected output: one report as text, for the section you asked for.**

```sql
SELECT DBMS_SQLPA.REPORT_ANALYSIS_TASK(
  :tname, 'TEXT', 'TYPICAL', 'ALL'
) FROM dual;
```

The metric is set once, on the task. The same value can ride inside `execution_params` instead: the two placements are alternatives in the package reference, so setting both is redundant [S06]. This page sets it on the task and keeps the `ARGLIST` to the two trial names.

The report's section argument decides what you may cite. `ALL` includes the summary and the per-statement detail, so use it when you claim that a statement improved, regressed, or stayed unchanged. `SUMMARY` returns the workload summary only, and citing it as per-statement evidence is a mistake. Confirm both values in the installed reference. Read plan hash, rows, metric deltas, errors, and workload impact together; a plan change explains the result instead of proving it.

## 5. Repeat enough to separate signal from noise

Repeat enough to separate signal from noise, and let the policy say how much is enough. The [noise floor and repetition policy](/05-feedback-loop/02-noise-floor-and-repetition/) owns the trial count, the A/A control, the estimator, and the confidence interval. SQLPA supplies the trials; the harness stores their metrics, calculates the medians, and bootstraps the interval. SQLPA produces none of those statistics itself.

The repetition principle behind that policy is documented by the benchmarking methodology source [S58](https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf): repeat, measure long enough, and report variability rather than a point estimate. It is methodology rather than an Oracle rule, and it sets no trial count of its own.

A trial is invalid if the set, the binds, the database state, the host, the metric, or the candidate boundary changed. If the rows came back differently, the faster number buys nothing.

**ILLUSTRATIVE — the harness record shape for one trial. Not a result, and not a schema you must copy verbatim.**

```text
run_id, task_name, execution_name, sql_id, metric,
metric_value, plan_hash_value, started_at, finished_at,
candidate_change, database_version
```

## 6. Use a cheap summary for the harness

A harness can calculate the summary around the SPA trials without pretending that SQLPA calculated it:

The estimator itself lives in exactly one place: the [noise floor and repetition policy](/05-feedback-loop/02-noise-floor-and-repetition/) states it as the difference of the side medians, `median(before) - median(after)`, so a positive value means the after side used less work, and its `COPYABLE` block is this book's one implementation — unpaired by default, paired when repetition i corresponds across sides, with the sign convention, seed, and resample count written in. This page links to that block instead of printing a second copy that could disagree with it.

Record the seed beside the interval: two runs with the same seed and the same samples must print the same numbers, which is the contract this chapter opens with. The harness must also compare the per-statement deltas, the aggregate workload delta, and the no-regression rule. A lower median for one hero statement cannot erase a regression elsewhere in the set.

## 7. Capture the executed plan

For the top movers, capture the plan that actually ran:

**PLACEHOLDER — SQLcl or SQL\*Plus. Replace `&sql_id` with an identity read from the target system, never from memory. Requires read access to `V$SQL`, `V$SQL_PLAN`, `V$SESSION`, and `V$SQL_PLAN_STATISTICS_ALL`; confirm the view list on your release. Expected output: the plan for the named cursor, with runtime statistics when they were gathered.**

```sql
SELECT * FROM TABLE(
  DBMS_XPLAN.DISPLAY_CURSOR(
    sql_id => '&sql_id',
    cursor_child_no => NULL,
    format => 'ALLSTATS LAST +PEEKED_BINDS'

  )
);
```

That view list is the one [Measure First](/01-proven-techniques/01-measure-first/) records for `DISPLAY_CURSOR`. `A-Rows` appears only where row-source statistics were gathered — through the session's statistics level or the `GATHER_PLAN_STATISTICS` hint, as [the plan-statistics mechanism](/01-proven-techniques/01-measure-first/) explains — so without that mechanism you get a plan shape and no actuals. Compare `E-Rows` with `A-Rows`, selectivity, rows examined, cost, predicates, and the measured deltas. Reading the line itself is the [toolbox runbook](/03-toolbox/01-measure-with-xplan-and-monitor/), which this page does not repeat. One label this format string needs: `PEEKED_BINDS` works on 19c, but it is **not enumerated** in the printed format list in either the 19c or the 26ai `DBMS_XPLAN` reference — an Oracle documentation gap, not a release boundary. Check it on your own instance before you build a runbook around it.

For a written diff of saved plans, `DBMS_XPLAN` ships two comparison functions [S05](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html), and **both are on the 19c primary path** — `COMPARE_PLANS` is documented at §224.5.1 of the 19c reference and is absent from 12.2, so 19c introduced it, while `DIFF_PLAN`'s signature changed between those two releases. Which one you would need, what each returns, and the parameters each takes are [Measure First](/01-proven-techniques/01-measure-first/)'s decision; this page does not repeat them.

Confirm the name, the signature, and the availability of each function against the package reference for your installed release before you call it. If a call is not there, save both `DISPLAY_*` outputs and diff them yourself; that path works on every release and needs nothing you have not already used. The [version drift page](/07-appendix-sources/02-version-drift-survival/) explains why the release label belongs next to the behavior.

## When SPA is the wrong instrument

SPA runs a SQL Tuning Set. It is the strongest tool available for one question — _did this change make this set of statements better or worse_ — and it is the wrong tool for a different question: _what happens to the system when 200 sessions arrive at once_.

The distinction is scope, and it decides the instrument:

| The change under test can affect                               | Use                                                                             |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| One statement's plan, cost, or logical work                    | SPA on the frozen set — this is its home                                        |
| Index or statistics choice across many statements              | SPA, because the regression is the point                                        |
| Parameter, patch, or schema change across a set                | SPA, which reports per-statement and workload deltas                            |
| Concurrency, lock contention, or connection behavior           | Database Replay, which replays captured production calls with production timing |
| Commit rates, transactional dependencies, whole-system effects | Database Replay                                                                 |

Database Replay captures the external calls your application made and replays them on a test system with production timing, concurrency, and transaction dependencies intact [S13]. It is a different evidence class from both SPA and a synthetic load generator: the workload is _yours_, recorded, rather than a script that resembles yours. Where a load generator asks "does this survive 200 users", Database Replay asks "did this change what happened when your real application ran".

If you have no Real Application Testing entitlement, the honest fallback is the [load gate](/03-toolbox/03-load-test-without-prod/) with a representative mix, and the artifact should say which of the two you ran. "Load tested" without naming the workload's origin is not a claim anyone can check.

## Decision table

| Evidence                                                                           | Disposition                                                   |
| ---------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| Aggregate improves, key statements hold, and the interval clears the noise         | Hand to the gate; load first if it can contend                |
| Aggregate improves but one important statement regresses beyond the threshold      | Hand to the gate — candidate for `REJECT_CANDIDATE`           |
| The plan and the row sources were not compared, only the plan hash                 | Keep investigating                                            |
| The report shows new or missing statements, and the count difference is unrecorded | Keep investigating — a shrinking set can flatter a regression |
| Only the plan hash changes                                                         | Keep investigating                                            |
| `EXPLAIN PLAN` looks good but `test execute` regresses                             | Reject the explanation                                        |
| The comparison metric was optimizer cost                                           | Discard the ranking and re-run on a measured metric           |
| No test execute was run for this candidate                                         | Record `NOT-VERIFIED`                                         |

Voiding a comparison — different set, different binds, different context — is the [STS runbook's row](/03-toolbox/02-freeze-work-with-sts/), and this table only runs on comparisons that survived it. The threshold, the interval, and the gate that turns these rows into a verdict belong to the [accept or rollback gate](/05-feedback-loop/03-accept-or-rollback-gate/). This page reports evidence; that gate decides with it.

**Teardown.** When the reports and the plans are saved, drop the analysis task with `DBMS_SQLPA.DROP_ANALYSIS_TASK` in the task-owner session, confirming the name on your release: keep the evidence and let the task go. The set's fate belongs to [Freeze With STS](/04-recipes/01-freeze-with-sts/).

## Artifact

A comparison record another engineer can recompute:

- [ ] Task name, set name, and both trial names recorded once, with the metric
- [ ] Both trials run on the same set, binds, database state, and host
- [ ] Candidate read back from the dictionary before the after trial ran
- [ ] The report saved with section `ALL` whenever a statement-level claim is made
- [ ] Raw samples kept outside the report, with the harness calculation and its seed beside them
- [ ] Executed plan captured for the top movers, with the release label on any comparison call
- [ ] Analysis task dropped after the evidence was saved
- [ ] Disposition row written, or `NOT-VERIFIED` written because no trial ran
- [ ] What the next loop inherits from this comparison recorded on [Memory and When to Stop](/05-feedback-loop/04-memory-and-when-to-stop/)

The task blocks are `MUTATING` shapes, the report read is `ILLUSTRATIVE`, the plan capture carries a `PLACEHOLDER` token, and the estimator lives on the [noise floor and repetition policy](/05-feedback-loop/02-noise-floor-and-repetition/). None of them has produced a number in this guide.

**Decision:** same set in, named trials out, measured delta saved. The report is evidence for one trial; the gate decides what the trial means.
