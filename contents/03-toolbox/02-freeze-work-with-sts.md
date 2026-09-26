---
title: Freeze Work With STS
description: Capture a representative workload once, then use the same set on both sides of every trial.
order: 32
draft: false
---

A tuning set is a workload contract. It carries the SQL workload, binds, and recorded context. It does not force the same optimizer statistics or execution plan after a change. Without that boundary, "before" and "after" are two anecdotes wearing the same name.

This page is the capture runbook: choose a representative window, create and capture the set, inspect it before you freeze it, use it on both sides, and repeat the workload rather than the anecdote. The theory of why a frozen set matters, and the decision rules for the trials built from it, live in the [recipes chapter](/04-recipes/) and are linked rather than repeated here.

> **Track:** Core (1, 3) · Practice (2, 5, Decision table) · Recovery (none) · Advanced / gated (4)
>
> **Prerequisites:** [Measure With XPLAN and Monitor](/03-toolbox/01-measure-with-xplan-and-monitor/), plus a target where you may create a SQL tuning set and run analysis tasks.
>
> **Evidence status:** The capture and inspection steps below follow A1 sources: _Managing SQL Tuning Sets_ in the 19c SQL Tuning Guide [S18](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/managing-sql-tuning-sets.html) and the 19c `DBMS_SQLPA` package reference [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html). Blocks are labeled `ILLUSTRATIVE`. **No live Oracle database was available**, so no capture below has been run. Confirm the capture API, privileges, entitlement, and workload window on a test or staging database.
>
> **Next required page:** [Before and After With SPA](/04-recipes/02-before-after-with-spa/), then [Load Test Without Prod](/03-toolbox/03-load-test-without-prod/) when the candidate can affect contention or resource use.

## How this page is banded

| Band                 | Sections             |
| -------------------- | -------------------- |
| **Core**             | 1, 3                 |
| **Practice**         | 2, 5, Decision table |
| **Recovery**         | none                 |
| **Advanced / gated** | 4                    |

- **Core (1, 3):** choose the window and read what the capture actually contains. Both are read actions, and a wrong answer here is visible before anything is frozen.
- **Practice (2, 5, Decision table):** capture the set and repeat the trials on a real ticket, with the owner who supplied the workload in the loop.
- **Recovery (none):** this page adds named objects and trials; it does not undo a candidate. The rollback belongs to the change class under test.
- **Advanced / gated (4):** analysis tasks need the `ADVISOR` privilege plus the entitlement that Real Application Testing and the tuning features require. Confirm them before you create the task.

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

A hand-curated set is useful for isolation, but it has sampling bias. It can omit rare plans, skew, short statements, and workload interactions. If the goal is a production claim, validate the hand-curated set against a broader cursor-cache or AWR-derived workload.

## 2. Create and capture the set

This runbook freezes the workload under the lab's own set name, `V0_EMP_WL`, so the runbook, the [V0 lab](/00-preface/02-how-to-prove-a-win/), and the recipe all talk about one set. Run the recipe's create and capture steps for that name, then return here: [Freeze With STS](/04-recipes/01-freeze-with-sts/) owns the `DBMS_SQLSET.CREATE_SQLSET` call, the release-documented `DBMS_SQLSET.CAPTURE_CURSOR_CACHE` interface, the capture modes, and the stop conditions for an unusable capture. That recipe deliberately prints its blocks under its own toy name, `OPT_LOOP_WL`, so its blocks stand alone.
When you copy one of them, change only the set name to `V0_EMP_WL`.

Capture needs the SQL tuning-set administration privilege, `ADMINISTER SQL TUNING SET` in 19c, or the owner support the recipe describes. Confirm the exact grant, the overload, the argument names, and the capture window in the installed release reference before you write the call, and do not combine a package prefix from one API with a capture suffix from another.

The important invariant is the named set and its recorded capture window, not the suffix on a procedure name. Record `sts_owner` separately from the session that later runs the analysis task; the two owners are different handoff fields and are not interchangeable.

## 3. Inspect before you freeze

A capture is not successful because the name exists. Inspect its contents:

**ILLUSTRATIVE — SQLcl or SQL\*Plus, read-only over the set's collection rows. Requires the privilege to read the named set. Expected output: the highest-cost statements in the set with their plans and execution context.**

```sql
SELECT sql_id, plan_hash_value, elapsed_time, buffer_gets,
       executions, parsing_schema_name, module, action
FROM   TABLE(DBMS_SQLSET.SELECT_SQLSET(sqlset_name => 'V0_EMP_WL'))
ORDER  BY buffer_gets DESC FETCH FIRST 20 ROWS ONLY;
```

Check the count, SQL IDs, bind coverage, plans, and execution context. If the set contains only the statements a DBA already suspected, record it as a hand-curated subset and do not call it representative.

A useful set has more than one bind shape when the application has skew, more than one plan when the workload legitimately uses them, and the right module and action boundary. Rare statements still matter; one execution does not make a statement unimportant.

## 4. Use the set on both sides

Build the analysis task from the frozen name, give every trial a name, and run both sides against that one set. The task, trial, comparison, and report calls are owned by the [Before and After With SPA recipe](/04-recipes/02-before-after-with-spa/), which this page does not repeat.

Three things are specific to a frozen set. Create the task from `V0_EMP_WL` and from nothing else. Name each trial so the report you save later can be tied to the state that produced it, `before_01` on the incumbent side and `after_01` after exactly one candidate change. Keep the comparison metric identical on both sides.

`test execute` executes the query part only by default, and the full-DML mode, where your release documents one, rolls the work back instead of committing it, so a DML trial stays a read test until you have checked the installed release reference.

The report is evidence for the trial, not the statistical gate by itself, and SPA does not calculate the medians or the confidence interval this guide requires.

## 5. Repeat the workload, do not repeat the anecdote

One before/after pair is a sample. Both sides must run the same set, the same binds, the same host, and the same database state, and the number of trials is set by the book's [noise floor and repetition policy](/05-feedback-loop/02-noise-floor-and-repetition/) rather than by whichever pair was convenient. That policy also owns the median and confidence-interval calculation, which runs outside SQLPA.

The repetition principle itself is supported by the benchmarking methodology source [S58](https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf), which argues for repetition, variability, and duration rigor in measured results. It is a method source, not an Oracle rule, and it supplies no trial count of its own.

Keep the raw trial samples, the task name, the set name, and the comparison metric together. A repeat is invalid if any of these changed:

- SQL text or bind values;
- set membership or statement attributes;
- host, service, or database state;
- statistics, indexes, hints, profiles, patches, or baselines;
- the measurement window or cache state.

## Decision table

| Result                                                      | Action                       |
| ----------------------------------------------------------- | ---------------------------- |
| Aggregate and key statements improve beyond the noise floor | Move to load testing         |
| One statement regresses beyond the threshold                | Reject or isolate the change |
| Only a plan hash changes                                    | Keep investigating           |
| Trial counts or workload context differ                     | Void the comparison          |

## Artifact

A frozen workload record: the set name and owner, the capture window and filter, the inspection output you saved, the task name, the named trials on both sides, the comparison metric, and the raw samples kept with them. An empty inspection output or an unexplained `N/A` in the identity fields voids the record.

The block above is an `ILLUSTRATIVE` procedure shape, not a result.

Source IDs and technique IDs resolve in [Appendix Sources](/07-appendix-sources/).

**Decision:** same set in, fair comparison out. If the two sides did not see the same workload, there is no comparison to report.

**Next required page:** [Before and After With SPA](/04-recipes/02-before-after-with-spa/), then [Load Test Without Prod](/03-toolbox/03-load-test-without-prod/) when the candidate can affect contention or resource use.
