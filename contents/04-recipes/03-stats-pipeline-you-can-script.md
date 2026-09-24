---
title: Stats Pipeline You Can Script
description: Set prefs, gather, test with pending stats, then publish or restore.
order: 43
draft: false
---

Statistics are inputs to plan choice, not a harmless housekeeping task. The safe pipeline is: record the current preferences, gather one object, make pending statistics visible to a controlled test, measure, then either publish or throw the draft away.

> **Execution boundary:** this is a 19c runbook, not a live statistics test. Verify the exact signatures, privileges, retention setting, and licensing on a test or staging database.

## 1. Record the current policy

Statistics preferences are part of the change. Before editing them, record the current values for the target object:

- `PUBLISH`
- `STALE_PERCENT`
- `INCREMENTAL`
- `ESTIMATE_PERCENT`
- `GRANULARITY`
- `CASCADE`
- `DEGREE`

A value such as `STALE_PERCENT = 5` is an example policy, not a universal Oracle recommendation. Use the documented guidance for the object, volatility, partitioning, and maintenance window. Record whether each value is local or inherited before changing it. After the test, restore the prior local value or use the documented `NULL` reset for an inherited value, then verify the effective result with `DBMS_STATS.GET_PREFS`.

## 2. Gather the candidate statistics

For a partitioned table, the following is a starting shape:

```sql
EXEC DBMS_STATS.SET_TABLE_PREFS(
  USER, 'BIG_PART_TAB', 'INCREMENTAL', 'TRUE'
);

EXEC DBMS_STATS.SET_TABLE_PREFS(
  USER, 'BIG_PART_TAB', 'STALE_PERCENT', '5'
);

EXEC DBMS_STATS.GATHER_TABLE_STATS(
  ownname => USER,
  tabname => 'BIG_PART_TAB',
  degree => DBMS_STATS.DEFAULT_DEGREE,
  cascade => TRUE
);
```

The `GATHER_TABLE_STATS` call is the important mutation. If you change `PUBLISH` to `FALSE` but skip the gather, there are no new pending statistics to test.

Use a maintenance window appropriate to the object. `CASCADE` and degree choices have resource and DML consequences; record them instead of copying a global script blindly.

## 3. Gather as pending statistics

For a risky refresh on a hot table:

```sql
EXEC DBMS_STATS.SET_TABLE_PREFS(
  USER, 'HOT_TAB', 'PUBLISH', 'FALSE'
);

EXEC DBMS_STATS.GATHER_TABLE_STATS(
  ownname => USER,
  tabname => 'HOT_TAB',
  degree => DBMS_STATS.DEFAULT_DEGREE,
  cascade => TRUE
);
```

After this sequence, the new statistics are pending. The old published statistics still drive ordinary optimizer sessions. Gathering pending statistics does not automatically make them visible to every test path.

## 4. Make the candidate visible to the test

For a direct test session, turn on pending-statistics visibility explicitly:

```sql
ALTER SESSION SET optimizer_use_pending_statistics = TRUE;
```

Run the controlled SQL workload in that session and capture the plan and trial metrics. For SPA, use the release-supported Optimizer Statistics workflow and verify that the task is using the pending-statistics set. Do not assume an ordinary SPA task sees unpublished statistics merely because the gather ran.

The visibility switch is a test condition, not a production setting to leave enabled. Reset the session or close it after the test.

## 5. Measure before committing

Use the frozen STS and the SPA sequence from the previous recipe. Keep the candidate statistics visible for the after trial, then compare:

- the plan hash and operations;
- `E-Rows` and `A-Rows`;
- selectivity and rows examined;
- `buffer_gets` and elapsed time;
- per-statement regressions;
- the aggregate workload result.

Use **K>=5 trials per side**, with **10–15 preferred** for noisy metrics, plus a full-workload SPA pass per side. The book’s harness calculates medians and bootstrap confidence intervals. SQLPA supplies the comparison trials, not those book-level statistics. SC15 supports the variability and repetition method; it does not prescribe this K floor.

A full scan is not a verdict. A statistics change can make a full scan correct by improving selectivity estimates, or make it wrong by changing the cost model. Read the measured deltas.

## 6. Choose one of three endings

### Discard

Use discard when the candidate regresses or the result is inconclusive and the old published statistics are still the approved state:

```sql
EXEC DBMS_STATS.DELETE_PENDING_STATS(USER, 'HOT_TAB');
```

Discard removes the unpublished candidate. It does not restore an already published bad gather. Restore the prior `PUBLISH` preference value recorded in step 1.

### Publish

Use publish when the test passes and a human approves the commit point:

```sql
EXEC DBMS_STATS.PUBLISH_PENDING_STATS(USER, 'HOT_TAB');
```

Publishing makes the pending statistics part of the normal optimizer input. Restore the recorded `PUBLISH` preference after the commit. If it was inherited rather than local, use the documented `NULL` reset; then verify it with `DBMS_STATS.GET_PREFS`. Publishing pending statistics does not replace the workflow’s preference-reset step. After publication, re-run the representative workload and monitor for late plan changes.

### Restore

Use restore when a published statistics change causes a regression and history covers the prior point:

```sql
EXEC DBMS_STATS.RESTORE_TABLE_STATS(
  ownname => USER,
  tabname => 'HOT_TAB',
  as_of_timestamp => SYSTIMESTAMP - INTERVAL '1' DAY
);
```

Restore brings back the retained historical statistics. It is different from discard: discard removes an unpublished candidate, while restore changes the published state back to a history point. Check `DBMS_STATS.GET_STATS_HISTORY_AVAILABILITY` before relying on a timestamp.

## 7. Let the advisor propose, not decide

Optimizer Statistics Advisor can produce findings, recommendations, and a script. Review the script, map each action to an object, and run it through the same pending-statistics and SPA gates. An advisor report is a proposal. It is not evidence that a gather improved the workload.

Keep the generated script, the gathered object list, the publication decision, and the restore command in the run record.

## Output checklist

- [ ] Existing preferences and history availability recorded
- [ ] `PUBLISH=FALSE` set before the candidate gather
- [ ] `DBMS_STATS.GATHER_TABLE_STATS` actually called
- [ ] Direct test uses `OPTIMIZER_USE_PENDING_STATISTICS=TRUE`
- [ ] SPA path uses the release-supported Optimizer Statistics workflow
- [ ] K>=5 trials per side, 10–15 preferred
- [ ] Full-workload SPA pass completed
- [ ] Discard, publish, or restore chosen explicitly
- [ ] Rollback tested in a sandbox

## References

- [DBMS_STATS, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_STATS.html)
- [Controlling the Use of Optimizer Statistics, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/controlling-the-use-of-optimizer-statistics.html)
- [Best Practices for Gathering Optimizer Statistics, 19c](https://www.oracle.com/docs/tech/database/technical-brief-bp-for-stats-gather-19c.pdf)
- [DBMS_SQLPA, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html)
- [Hoefler and Belli, SC15 benchmarking methodology](https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf)

**Keep this: pending statistics are a draft; publish is the commit; restore is the rollback.**
