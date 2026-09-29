---
title: Stats Pipeline You Can Script
description: Record the policy, gather as pending, measure, then discard, publish, or restore.
order: 43
draft: false
---

Statistics change plan choice, so a gather deserves the same scrutiny as any candidate you might ship. The pipeline below records the current policy, decides whether the object is critical before anything publishes, gathers one object, measures it — through the pending-visibility step when that branch applies — and picks one of three endings.

It is scriptable end to end. The pending path never publishes on the way in, and no ending leaves the object in a state you did not record.

> **Track:** Core (1) · Practice (2, 3, 4, 5) · Recovery (6) · Advanced / gated (7)
>
> **Prerequisites:** [Stats Run the Show](/01-proven-techniques/02-stats-run-the-show/) for what a gather changes, and [Before and After With SPA](/04-recipes/02-before-after-with-spa/) for the measurement the candidate must survive.
>
> **Evidence status:** Preference and publication behavior is A2-sourced from the 19c statistics best-practices brief [S08](https://www.oracle.com/docs/tech/database/technical-brief-bp-for-stats-gather-19c.pdf), with A1 records for the workflow from _Controlling the Use of Optimizer Statistics_ [S29], _Gathering Optimizer Statistics_ [S28], and _Analyzing Statistics Using Optimizer Statistics Advisor_ [S27], all TOC-verified in this guide's ledger; the comparison path is the 19c `DBMS_SQLPA` reference [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html). Every package call here carries its own confirm-on-release hedge. Blocks are `ILLUSTRATIVE`, `SKETCH`, `PLACEHOLDER`, or `MUTATING`. **No live Oracle database was available**, so no gather on this page has been run.
>
> **Next required page:** [Safe DDL and CI Gates](/04-recipes/04-safe-ddl-and-ci-gates/).

## How this page is banded

| Band                 | Sections   |
| -------------------- | ---------- |
| **Core**             | 1          |
| **Practice**         | 2, 3, 4, 5 |
| **Recovery**         | 6          |
| **Advanced / gated** | 7          |

- **Core (1):** read the current preferences before you touch them, and capture the restore anchor while you are there. Sections 2, 3, and 6 read those values back.
- **Practice (2, 3, 4, 5):** on a real ticket against a test target: pass the critical-object gate, gather the candidate or gather it as pending, make it visible in the test session, and measure before anything is committed.
- **Recovery (6):** the three endings are where this page touches rollback. Discard, publish, and restore each name an artifact you keep and a state you end in.
- **Advanced / gated (7):** an advisor script reaches production only through the same gates, and publishing risky statistics on a critical object is a human decision rather than a scheduled job.

## 1. Record the current policy

Statistics preferences are part of the change. Before editing them, read the current values for the target object:

**ILLUSTRATIVE — SQLcl or SQL\*Plus, read-only over the preferences of one object. Owner and table are both passed by name, as the documented examples do. Expected output: one preference value per call. Confirm the parameter order on the installed release.**

```sql
SELECT DBMS_STATS.GET_PREFS('PUBLISH', ownname => USER, tabname => 'HOT_TAB') FROM dual;
```

The names matter. The second positional slot of `GET_PREFS` is `ownname`, so the positional call `('PUBLISH', 'HOT_TAB')` reads the owner slot and never reaches the table; this page passes owner and table by name in every preference read, including the verify step in section 6.

Record `PUBLISH`, `STALE_PERCENT`, `INCREMENTAL`, `ESTIMATE_PERCENT`, `GRANULARITY`, `CASCADE`, and `DEGREE`. A value such as `STALE_PERCENT = 5` is one example policy; this guide treats none of them as a universal recommendation. Use the documented guidance for the object, its volatility, its partitioning, and the maintenance window [S08].

Record whether each value is local or inherited before you change it. After the test, restore the prior local value, or use the documented `NULL` reset for an inherited value, then verify the effective result with `GET_PREFS` in the named form again.

Before you gather in section 2 or 3, capture the restore anchor and the history floor together:

**ILLUSTRATIVE — SQLcl or SQL\*Plus, read-only. The floor function takes no arguments; the anchor is emitted as UTC text with an explicit `+00:00` zone, which is the shape section 6's parameter takes. Save both values in the run manifest. Expected output: one row. Confirm the names on the installed release.**

```sql
SELECT DBMS_STATS.GET_STATS_HISTORY_AVAILABILITY AS history_floor,
       TO_CHAR(SYS_EXTRACT_UTC(SYSTIMESTAMP), 'YYYY-MM-DD HH24:MI:SS.FF6')
         || ' +00:00' AS restore_anchor
FROM   dual;
```

The `restore_anchor` string is the pre-candidate timestamp section 6 restores to, captured before you gather the same `HOT_TAB` this page uses everywhere. The `history_floor` is the oldest point the statistics history still covers [S29]; re-read it before the restore, because an anchor older than the floor ends that ending.

## 2. Gather the candidate statistics

**The gate comes first: is this object critical?** If it is, skip the block below and go to section 3, because this block publishes as it gathers. For a non-critical object, the default path is preferences first, then the gather:

**MUTATING. Sets two preferences and gathers statistics for one object. SQLcl or SQL\*Plus as the object owner or an authorized account. Not executed here; confirm the signatures on the installed package reference. Expected output: no rows returned.**

```sql
EXEC DBMS_STATS.SET_TABLE_PREFS(
  USER, 'HOT_TAB', 'INCREMENTAL', 'TRUE'   -- partitioned objects only
);

EXEC DBMS_STATS.SET_TABLE_PREFS(
  USER, 'HOT_TAB', 'STALE_PERCENT', '5'
);

EXEC DBMS_STATS.GATHER_TABLE_STATS(
  ownname => USER,
  tabname => 'HOT_TAB',
  degree  => DBMS_STATS.DEFAULT_DEGREE,
  cascade => TRUE
);
```

The `GATHER_TABLE_STATS` call is the mutation, and on this path the new statistics publish immediately. That is what makes this the non-critical path. Choose a maintenance window appropriate to the object, and record the `CASCADE` and degree choices instead of copying a global script; both have resource and DML consequences [S08][S28]. Record the candidate gather timestamp with the run; section 6 needs it.

## 3. Gather as pending statistics

This is the path section 2 sends critical objects down. Set the publication preference before you gather:

**MUTATING. Sets `PUBLISH` to `FALSE` and gathers statistics that stay pending. SQLcl or SQL\*Plus with the same privileges as section 2. Not executed here; confirm the signatures on the installed release. Expected output: no rows returned.**

```sql
EXEC DBMS_STATS.SET_TABLE_PREFS(
  USER, 'HOT_TAB', 'PUBLISH', 'FALSE'
);

EXEC DBMS_STATS.GATHER_TABLE_STATS(
  ownname => USER,
  tabname => 'HOT_TAB',
  degree  => DBMS_STATS.DEFAULT_DEGREE,
  cascade => TRUE
);
```

After this sequence the new statistics are pending and the previously published statistics still drive ordinary optimizer sessions. Gathering pending statistics does not by itself make them visible to every test path [S29]. Record this gather's timestamp with the run, exactly as section 2 records its own.

## 4. Make the candidate visible to the test

The supported mechanism is a direct test session:

**MUTATING. Changes session state for the test session only. SQLcl or SQL\*Plus in the session under test. Confirm the parameter name on the installed release. Expected output: no rows returned.**

```sql
ALTER SESSION SET optimizer_use_pending_statistics = TRUE;
```

Read the effective value of that session parameter back before you measure, save the readback with the trial, and confirm on your installed release where that readback lives. Then run the controlled workload in the session and capture the plan and the trial metrics. The switch serves the test session alone: leave it enabled and you have changed the session you meant to observe. Reset it, or close the session, when the test ends.

The analyzer-over-pending variant is `NOT-VERIFIED` on this page. An analysis task that reads unpublished statistics needs a release-supported workflow you have confirmed on your own target [S29]; this guide has not run that check. Record `NOT-VERIFIED` for the variant and keep measuring pending statistics in the direct session until you have verified the workflow yourself.

## 5. Measure before committing

How you measure depends on the path you took in section 2. On the default path the gather publishes immediately, so the before trial has to exist from before that gather: capture it on the incumbent statistics first, gather, then run the after trial under the named-trial sequence from [Before and After With SPA](/04-recipes/02-before-after-with-spa/). On the pending path, run the before trial with visibility off, switch the section 4 session to the candidate, and run the after trial in that same session.

Either way, compare the readings that recipe's plan-capture step lists: plan hash, estimates against actuals, selectivity, rows examined, cost, predicates, and the measured deltas, along with its per-statement and aggregate checks.

How many trials, which estimator, and what interval are the [noise floor and repetition policy](/05-feedback-loop/02-noise-floor-and-repetition/)'s decisions; this page runs the trials that policy asks for. Whether the plan the gather produced is right, including any full scan in it, is a test the [SPA recipe](/04-recipes/02-before-after-with-spa/) runs.

## 6. Choose one of three endings

Each ending names the artifact you keep and the state you end in. Pick one explicitly; leaving the object in the middle state is not an ending.

### Discard

Use discard when the candidate regresses or the result is inconclusive and the published statistics are still the approved state:

**MUTATING. Removes pending statistics for one object; the arguments are owner then table. SQLcl or SQL\*Plus with the privileges from section 2. Not executed here; confirm the argument order on the installed release. Expected output: no rows returned.**

```sql
EXEC DBMS_STATS.DELETE_PENDING_STATS(USER, 'HOT_TAB');
```

**Artifact kept:** the gather record for the discarded candidate, its timestamp, plus the untouched published statistics. **State you end in:** no pending candidate remains and ordinary sessions still run on the incumbent values; you restore the recorded `PUBLISH` preference yourself. Discard cannot undo a gather that was already published; that is restore.

### Publish

Use publish when the test passes and a human has approved the commit point:

**MUTATING. Publishes pending statistics for one object. SQLcl or SQL\*Plus, after the approval recorded in the run manifest. Not executed here; confirm the argument names on the installed release. Expected output: no rows returned.**

```sql
EXEC DBMS_STATS.PUBLISH_PENDING_STATS(USER, 'HOT_TAB');
```

**Artifact kept:** the published statistics, the approval record, and the comparison that earned it. **State you end in:** the candidate now drives the optimizer, so restore the recorded `PUBLISH` preference, using the documented `NULL` reset if it was inherited, and verify it with `DBMS_STATS.GET_PREFS('PUBLISH', ownname => USER, tabname => 'HOT_TAB')`. Publishing does not replace that reset step. Re-run the representative workload afterwards and watch for late plan changes.

### Restore

Use restore when an already published gather caused a regression and history still covers your anchor. The 19c signature types the parameter `as_of_timestamp TIMESTAMP WITH TIME ZONE`, and the SQL\*Plus `VARIABLE` command offers types such as `NUMBER`, `VARCHAR2`, and `CLOB` rather than a timestamp with a time zone — confirm the bind types on your client — so there is no bind for it.

The anchor travels instead as a zone-qualified timestamp literal built from the section 1 string. Re-read the section 1 floor with the same zero-argument call first: if your anchor predates it, this ending changes.

**PLACEHOLDER. Restores published statistics for one object to the recorded anchor. SQLcl or SQL\*Plus with the privileges from section 2. Replace the literal with your section 1 `restore_anchor` string, same object, same mechanism. Not executed here; confirm the argument names and types on the installed release. Expected output: no rows returned.**

```sql
EXEC DBMS_STATS.RESTORE_TABLE_STATS(
  ownname         => USER,
  tabname         => 'HOT_TAB',
  as_of_timestamp => TIMESTAMP '2026-09-26 09:45:00.000000 +00:00'
);
```

That is a `TIMESTAMP WITH TIME ZONE` literal — the offset inside the quotes is what makes it the parameter's type — and the format matches the `restore_anchor` string section 1 printed, so you swap in your own value and keep the `+00:00`. Confirm the argument names and types on the installed release before you run it. A relative interval can land on a different version of the statistics, so the recorded anchor is the only value this block accepts.

**Artifact kept:** the anchor string, the floor readback, and the evidence that the restore took effect. **State you end in:** published statistics are back at the anchor, which is a different ending from discard, where nothing published ever changed. What makes a restore verified, and who approves it, belongs to the [accept or rollback gate](/05-feedback-loop/03-accept-or-rollback-gate/); this page only names the call.

## 7. Let the advisor propose, not decide

Optimizer Statistics Advisor can produce findings, recommendations, and a script [S27]. Read the script, map each action to an object, and route every action back through sections 3 to 5 as its own candidate.

An advisor output is a proposal, never a verdict. It becomes evidence only after the same pending-state test, the same measurement, and the same gate that any other candidate would face. Keep the generated script, the gathered object list, the publication decision, and the restore command in the run record so the proposal and the decision stay separate artifacts.

## Artifact

A statistics run record:

- [ ] Existing preferences recorded, with local or inherited noted, before any edit
- [ ] Restore anchor and the gather timestamp recorded with the run
- [ ] Critical-object decision recorded before the gather was issued
- [ ] `PUBLISH = FALSE` set before a candidate gather on a risky object
- [ ] Direct test used pending-statistics visibility, and the parameter read back before the measurement
- [ ] Analyzer-over-pending marked `NOT-VERIFIED`, or your own verification recorded
- [ ] Measurement run under the feedback loop's repetition policy
- [ ] Discard, publish, or restore chosen explicitly, with its artifact and end state
- [ ] Preference restore read back in the named-argument form after any reset
- [ ] Rollback rehearsed in a sandbox before the ending that changes published state

Blocks above are `ILLUSTRATIVE` or `MUTATING` shapes, and the restore block is a `PLACEHOLDER` that substitutes your recorded anchor. None of them has been run in this guide.

**Decision:** pending statistics are a draft, publish is the commit, restore is the rollback; record the policy you started from so you can prove which of the three you ended in.
