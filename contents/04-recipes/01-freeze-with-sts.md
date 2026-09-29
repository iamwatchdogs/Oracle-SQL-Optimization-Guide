---
title: Freeze With STS
description: Create one named set, capture a real window, and hand both trials the same workload.
order: 41
draft: false
---

A fair comparison starts with a workload you can name. A SQL Tuning Set carries the statements, the binds, and the recorded context; optimizer statistics and execution plans arrive later, when a change produces them. Freeze the input and both trials answer the same question.

The [STS runbook](/03-toolbox/02-freeze-work-with-sts/) chooses the window and owns the inspection query. This page owns the blocks it defers to: create the set, capture from the cursor cache, guard it, and hand it over unchanged. The set name used throughout this chapter is `OPT_LOOP_WL`. That name is this chapter's own toy name, chosen so its blocks stand alone and read as a complete procedure.
It is **not** the V0 lab's set, which is `V0_EMP_WL`; the [runbook](/03-toolbox/02-freeze-work-with-sts/) that points here uses the lab's name.
If you copy a block from this chapter, change the set name to the one your own run record names, and change it in every block.

> **Track:** Core (1, 2, 3) · Practice (4, 6) · Recovery (none) · Advanced / gated (5)
>
> **Prerequisites:** [Freeze Work With STS](/03-toolbox/02-freeze-work-with-sts/) for the window and what a capture can omit, plus a target where you may create a SQL tuning set.
>
> **Evidence status:** The sequence is A1-sourced from _Managing SQL Tuning Sets_ in the 19c SQL Tuning Guide [S18](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/managing-sql-tuning-sets.html). Create, capture, and guard blocks are labeled `SKETCH`, every block that writes is also `MUTATING`, and the privilege names are confirm-on-release. **No live Oracle database was available**, so no capture on this page has been run.
>
> **Next required page:** [Before and After With SPA](/04-recipes/02-before-after-with-spa/).

## How this page is banded

| Band                 | Sections |
| -------------------- | -------- |
| **Core**             | 1, 2, 3  |
| **Practice**         | 4, 6     |
| **Recovery**         | none     |
| **Advanced / gated** | 5        |

- **Core (1, 2, 3):** name the set, capture a window, and read what the capture actually contains. Run these on a test target first; a wrong answer here is visible before anything is compared.
- **Practice (4, 6):** on a real ticket, guard the set while the trials use it, remove that guard afterwards, and state, with the result, what the set may be used to prove.
- **Recovery (none):** this page adds named objects rather than an undo. Restoring or discarding belongs to the change class under test and to the [accept or rollback gate](/05-feedback-loop/03-accept-or-rollback-gate/).
- **Advanced / gated (5):** the handoff leads into the analysis-task creation, whose `ADVISOR` privilege and Real Application Testing entitlement the next page states and owns. Confirm both before you schedule the handoff.

## 1. Create a named workload

Name the set after the decision it settles; the person running it tells the next reader nothing. The name is part of the evidence: put it in the run manifest and pass the same name to every before and after task.

**MUTATING — SKETCH. Creates a tuning set in the database. SQLcl or SQL\*Plus with the capture privilege named in section 2. Not executed here; confirm the argument names in the installed package reference. Expected output: no rows returned.**

```sql
EXEC DBMS_SQLSET.CREATE_SQLSET(
  sqlset_name => 'OPT_LOOP_WL',
  description => 'loop workload for the measured change'
);
```

`DBMS_SQLSET` is the interface this page uses. The same tuning-set operations also exist on `DBMS_SQLTUNE`, and the two do not share every procedure name [S18]. Pick one package per runbook and record which one you picked. Every block here assumes a single owner: the session that creates the set keeps it, so no owner argument is passed. If the set must live in another schema, pass the documented owner argument and confirm its name on the installed release.

## 2. Capture a real window

Capture from the cursor cache over the window that represents the decision you have to make: peak traffic, the batch job, or the bind family under investigation. Record the window start and end, the poll interval, any filter, and whether recursive SQL was included.

**MUTATING — SKETCH. Captures workload into `OPT_LOOP_WL`. SQLcl or SQL\*Plus; runs for `time_limit` seconds and polls the cache every `repeat_interval` seconds. Not executed here; confirm the procedure name and its arguments in the installed package reference. Expected output: no rows returned, and a set that now contains statements.**

```sql
EXEC DBMS_SQLSET.CAPTURE_CURSOR_CACHE(
  sqlset_name     => 'OPT_LOOP_WL',
  time_limit      => 300,   -- seconds of capture
  repeat_interval => 1,     -- seconds between cache polls
  capture_option  => 'MERGE'
);
```

**Privilege.** Capture needs the SQL tuning-set administration privilege: `ADMINISTER SQL TUNING SET` in 19c for sets you own, `ADMINISTER ANY SQL TUNING SET` for sets you do not [S18]. Confirm the exact grant and its scope on the installed release before you write the call. Record `sts_owner` separately from the session that later runs the analysis task; they are different handoff fields. Reading a set later goes through the same subprograms, so the same privilege or ownership applies.

**Name check.** One capture exists under two names: `DBMS_SQLSET.CAPTURE_CURSOR_CACHE` on the tuning-set package and `DBMS_SQLTUNE.CAPTURE_CURSOR_CACHE_SQLSET` on the tuning package [S18]. Do not combine the package prefix from one with the suffix of the other. Confirm the overload, the argument names, and the capture window on the installed release before you write the call.

A capture from the cursor cache samples the window; a hand-curated set samples narrower still. Neither deserves the label "full production workload" unless the sampling method proves it. What the sample omits — rare plans, skew, short statements, interactions between services — is the [STS runbook's](/03-toolbox/02-freeze-work-with-sts/) sampling boundary, and it travels with your result.

## 3. Inspect the contents

A procedure call that returns cleanly tells you the set exists; it says nothing about whether the capture worked. Read the rows with the inspection query in the [STS runbook](/03-toolbox/02-freeze-work-with-sts/), pointed at `OPT_LOOP_WL`. It returns the highest-work statements in the set with their plan hashes and execution context.

Check the statement count, SQL IDs, plan hashes, bind families, modules, actions, and execution counts. A statement that ran once should not silently dominate a top-N decision, and a statement with many executions and many bind shapes is a workload while one hero query is only a slice of it.

Save the inspection output with the run manifest. If the scope is wrong, create a new set; do not edit the set between the before and after trials.

## 4. Guard the set from accidental edits

Naming a set does not lock it. Register the set while the trials are using it, so other clients can see that it is claimed, and keep write access to the set with the capture owner.

**MUTATING — SKETCH. Adds a client reference to an existing set. SQLcl or SQL\*Plus with the privilege from section 2. Not executed here; confirm the function name and its arguments in the installed package reference. Expected output: the reference ID in `:reference_id`.**

```sql
VARIABLE reference_id NUMBER;
EXEC :reference_id := DBMS_SQLSET.ADD_REFERENCE(
  sqlset_name => 'OPT_LOOP_WL',
  description => 'measured before and after trials'
);
```

Keep the reference ID in the run record. The guard's undo is a named call, and it runs before anything attempts a drop:

**MUTATING — SKETCH. Removes the client reference added above. SQLcl or SQL\*Plus with the privilege from section 2. Not executed here; confirm the argument names on the installed release. Expected output: no rows returned.**

```sql
EXEC DBMS_SQLSET.REMOVE_REFERENCE(
  sqlset_name  => 'OPT_LOOP_WL',
  reference_id => :reference_id
);
```

The guard is the reference plus the permissions and the workflow around it: a client that holds the privilege to modify the set can still modify it, so the guard you can enforce is the one your procedure enforces.

## 5. Hand the set to SPA unchanged

The analysis task that consumes this set is created on the next page, from this frozen name and from nothing else. This page stops at the handoff, because creating the task twice would leave one comparison with two tasks and two evidence trails.

Three things must hold when you hand over. The name is `OPT_LOOP_WL`. The capture window, filters, and inspection output travel with that name. Nothing edits the set after this line: if the set changes, the trials built on it are void. Record `sts_owner` separately from the `task_owner` the next page uses, and carry the single-owner assumption from section 1 into that page's call.

## 6. Decide what the set can prove

| Set construction                                  | Good for                                | Boundary                                              |
| ------------------------------------------------- | --------------------------------------- | ----------------------------------------------------- |
| Cursor-cache capture over a representative window | Application or peak workload comparison | Sampling depends on the window and cache turnover     |
| AWR-derived set                                   | Historical workload across snapshots    | Needs AWR access and retained snapshots; confirm both |
| Hand-curated set                                  | Focused regression or one SQL family    | Sampling bias; do not call it the full workload       |
| Trace-derived set                                 | Reproducing a specific trace            | Trace coverage and privileges limit the scope         |

A captured set proves your workload, not a workload you did not capture. Statements that ran outside the window, statements the filter excluded, and statements the cache had already evicted are not in the set, and no comparison built on this set speaks for them. State that boundary in the same paragraph as the result, so the reader never has to guess which workload the number belongs to.

**Teardown.** With the reference removed in section 4, `DBMS_SQLSET.DROP_SQLSET` drops the set — but only while no client still references it, so remove first, drop second, and confirm the name on your release. Keeping the set is equally a decision: record which of the two you chose, and why.

## Artifact

A frozen workload record:

- [ ] Set name, owner, source, window, and filters recorded
- [ ] SQL IDs, plan hashes, binds, and execution counts inspected and saved
- [ ] Sampling bias and set scope stated next to the result
- [ ] No set edits between the before and after trials
- [ ] The same set name passed to the analysis task
- [ ] Reference removed after the trials, with its ID kept in the record
- [ ] Set dropped or retained by decision, recorded either way
- [ ] Repetition policy taken from the [feedback loop](/05-feedback-loop/02-noise-floor-and-repetition/)

The create, capture, and guard blocks are `SKETCH` procedure shapes, and none of them has been run against a target in this guide.

**Decision:** a frozen set is the input half of an honest comparison. If the two sides did not see the same set, there is nothing to compare.
