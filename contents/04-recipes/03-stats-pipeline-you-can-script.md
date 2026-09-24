---
title: Stats Pipeline You Can Script
description: Set prefs, gather, test with pending stats, then publish or restore.
order: 43
draft: false
---

Last quarter new stats fixed one query and broke three others. The gather ran at night. Nobody logged prefs. Morning brought new plans. Nobody knew which table tipped it. Rollback took hours.

You know basic SQL. You write DML each day. You fear Friday deploys because stats ship as invisible code. This file makes stats visible, testable, and reversible.

A stats pipeline is like a thermostat, except it sets sample rules plus publish rules for the optimizer.

<details><summary>In case you don't know about pending stats, it's gathered stats held aside until you publish them.</summary>Pending stats are fresh numbers stored aside with PUBLISH FALSE. Old published stats still drive plans. You test with pending, then publish or discard. Steps: `SET_TABLE_PREFS` PUBLISH FALSE on HOT_TAB, gather, test with pending in session, then `PUBLISH_PENDING_STATS` or discard. Unverified — run on your test DB. Schema owners use it for risky refreshes on hot tables. It drives one decision: publish this gather or throw it away. Do not gather direct with PUBLISH TRUE on critical SQL. That flips plans at gather end with no trial, and the cost is a Monday regression with no quick undo. Sharp line: it turns stats from a blind flip into a draft you can grade. Example: gather HOT_TAB pending, run SPA on buffer_gets, see clean, publish at low traffic. If dirty, discard pending and keep old plans. See [T-21] https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/controlling-the-use-of-optimizer-statistics.html</details>

<details><summary>In case you don't know about RESTORE_TABLE_STATS, it's the call that brings back stats from 1 day ago.</summary>RESTORE_TABLE_STATS brings back table, column, and index stats as of a timestamp. It is the rollback for a bad gather. Shape: restore HOT_TAB to yesterday via `SYSDATE - 1` (docs idiom; `SYSTIMESTAMP - INTERVAL '1' DAY` also type-checks but reads odd — use `SYSDATE - 1`). Check retention covers that point. Test restore once in sandbox and record the text. Unverified — run on your test DB. On-call DBAs use it right after a stats-driven regression. It drives one decision: return to last known-good numbers now. Do not re-gather hoping for better numbers. Fresh gather adds new variance, and the cost is a second plan flip during an incident. Sharp line: it undoes the numbers change without touching data rows. Example: publish at 10am, two queries regress by 11am, restore to yesterday, confirm the old plan hash returns in DISPLAY_CURSOR plus a clean SPA re-run. See [T-22] https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_STATS.html</details>

## 1. Set prefs in script, then gather

Plain claim: prefs as text stop silent drift.

Use these exact lines for the base path:

```sql
EXEC DBMS_STATS.SET_TABLE_PREFS(USER, 'BIG_PART_TAB', 'INCREMENTAL', 'TRUE');
EXEC DBMS_STATS.SET_TABLE_PREFS(USER, 'BIG_PART_TAB', 'STALE_PERCENT', '5');
EXEC DBMS_STATS.GATHER_TABLE_STATS(USER, 'BIG_PART_TAB', degree => DBMS_STATS.DEFAULT_DEGREE, cascade => TRUE);
```

Line by line: first SET_TABLE_PREFS sets INCREMENTAL TRUE on BIG_PART_TAB for partitioned objects. Second sets STALE_PERCENT 5 so gather triggers at 5% change. Third GATHER_TABLE_STATS collects with DEFAULT_DEGREE and cascade TRUE for indexes too. Each value lives in a script. Each run repeats. Call shapes follow DBMS_STATS docs. Unverified — run on your test DB.

How to read success: prefs query shows TRUE and 5 stored. Gather log shows degree used and cascade done. Plans stay stable unless data truly moved.

Rollback line: prefs are just rows. Reset them to prior values in script. Re-gather if needed. No data rows changed.

Worked progression A — prefs to gather to check: set INCREMENTAL TRUE. Set STALE_PERCENT 5. Gather BIG_PART_TAB. Query prefs to confirm. Run SPA on your STS. Only a measured win moves forward.

Worked progression B — stale gate in action: small daily loads stay under 5%. No gather fires. A big backfill crosses 5%. Gather fires once. You get one plan shift to review, not daily noise.

## 2. Test with pending stats before publish

Plain claim: PUBLISH FALSE turns a scary gather into a safe draft.

Use these exact lines for test and rollback:

```sql
EXEC DBMS_STATS.SET_TABLE_PREFS(USER, 'HOT_TAB', 'PUBLISH', 'FALSE');
EXEC DBMS_STATS.PUBLISH_PENDING_STATS(USER, 'HOT_TAB');
EXEC DBMS_STATS.RESTORE_TABLE_STATS(USER, 'HOT_TAB', SYSDATE - 1);
```

Line by line: first line sets PUBLISH FALSE on HOT_TAB so new stats stay pending. Middle line publishes pending stats only after a win. Last line restores stats from 1 day ago if the publish hurts. Gather step between line one and line two is the same GATHER_TABLE_STATS call shape above. Publish is the commit point. Reference: https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_STATS.html Unverified — run on your test DB.

How to read success: pending views hold the new numbers. Published views still show old numbers until publish. SPA compare with pending in place shows no regression. You publish. If it regresses, you restore and the old plans return.

Rollback line: before publish, run DELETE_PENDING_STATS to discard. After publish, run RESTORE_TABLE_STATS with the timestamp above. Test the restore once in sandbox before you need it.

Worked progression A — prefs to gather to pending test to publish-or-restore: set PUBLISH FALSE on HOT_TAB. Gather HOT_TAB. Run SPA before and after on buffer_gets. If clean, run PUBLISH_PENDING_STATS. If dirty, discard pending and walk away. One script holds all four steps.

Worked progression B — publish then regret: you published at 10am. At 11am two queries regressed. You run RESTORE_TABLE_STATS to yesterday. You confirm old plan hashes return. You log the lesson. Total harm is one hour, not one week.

## 3. Let the advisor propose, you dispose

Plain claim: advisor output is a proposal, never an accepted change.

Optimizer Statistics Advisor returns a script of fixes. You review it. You apply it in test. You measure it with SPA. You never publish blind on critical tables. Test DB first. Pending in prod. Human gate for risky publishes.

No new code here. The two blocks above are the code. The advisor adds judgment, not new calls.

Line by line for the flow: advisor suggests prefs or gather choices. You copy them into your script. You run the pending-stats path above. SPA decides. Human approves publish on critical tables.

How to read success: advisor script is short and specific. Each suggestion maps to one table. SPA shows no regressed statement. Publish log names who approved.

Rollback line: same as section 2. Discard pending or restore published. Keep the advisor script in git so the retry is exact.

Worked progression A — advisor to test to verdict: advisor suggests a histogram change. You stage it with PUBLISH FALSE. SPA shows one win and zero losses. You publish with a note.

Worked progression B — advisor to reject: advisor suggests a broad gather. SPA shows three regressions on buffer_gets. You discard pending. You keep old stats. You log why the suggestion failed on your data.

**Keep this: Prefs in script, gather in test, pending before publish, restore tested before need.**
