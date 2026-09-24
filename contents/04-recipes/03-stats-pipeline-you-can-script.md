---
title: Stats Pipeline You Can Script
description: Set prefs, gather, test with pending stats, then publish or restore.
order: 43
draft: false
---

"'why did new stats fix one query and break three others?'"

Stats are code; set prefs in text, test unpublished, then publish or roll back.

A stats pipeline is like a thermostat, except it sets sample rules plus publish rules for the optimizer.

<details><summary>In case you don't know about pending stats, it's gathered stats held aside until you publish them.</summary>Queries keep old plans until publish. You can test new plans first. Discard costs nothing.</details>

<details><summary>In case you don't know about RESTORE_TABLE_STATS, it's the call that brings back stats from 1 day ago.</summary>It needs history retention. Test the restore once in sandbox. Record the command.</details>

Stats drive plans. Bad prefs cause bad plans. Scripted prefs stop that. You set INCREMENTAL to TRUE for big partitioned tables. You set STALE_PERCENT to 5. You gather with DEFAULT_DEGREE and cascade TRUE. Each value lives in a script. Each run repeats.

Pending stats add safety. You set PUBLISH to FALSE on HOT_TAB. You gather. You run the SPA compare with pending stats in place. You publish only on a win. You discard on a loss. Publish is the commit point.

Use these exact lines for the base path:

```sql
EXEC DBMS_STATS.SET_TABLE_PREFS(USER, 'BIG_PART_TAB', 'INCREMENTAL', 'TRUE');
EXEC DBMS_STATS.SET_TABLE_PREFS(USER, 'BIG_PART_TAB', 'STALE_PERCENT', '5');
EXEC DBMS_STATS.GATHER_TABLE_STATS(USER, 'BIG_PART_TAB', degree => DBMS_STATS.DEFAULT_DEGREE, cascade => TRUE);
```

Use these exact lines for test and rollback:

```sql
EXEC DBMS_STATS.SET_TABLE_PREFS(USER, 'HOT_TAB', 'PUBLISH', 'FALSE');
EXEC DBMS_STATS.PUBLISH_PENDING_STATS(USER, 'HOT_TAB');
EXEC DBMS_STATS.RESTORE_TABLE_STATS(USER, 'HOT_TAB', SYSTIMESTAMP - INTERVAL '1' DAY);
```

The advisor path helps too. Optimizer Statistics Advisor returns a script of fixes. Review it. Apply it in test. Measure it with SPA. Never publish blind on critical tables. Test DB first. Pending in prod. Human gate for risky publishes.

**Keep this: Prefs in script, gather in test, pending before publish, restore tested before need.**
