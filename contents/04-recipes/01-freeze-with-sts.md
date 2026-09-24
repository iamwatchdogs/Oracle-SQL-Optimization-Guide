---
title: Freeze With STS
description: Capture one tuning set so before and after share the same inputs.
order: 41
draft: false
---

Friday 5pm. A ticket says the checkout query passed in test then missed in prod. You re-ran it twice with different binds. Both timings disagreed. You shipped anyway. You hoped.

You know basic SQL. You write SELECT, JOIN, INSERT, UPDATE. You fear Friday deploys because test and prod never match. This file fixes the first half of that fear. Freeze the input.

An STS is like a saved shopping list, except it stores SQL text plus binds plus plans for replay.

<details><summary>In case you don't know about STS, it's a named set of SQL saved inside Oracle for replay.</summary>STS stores statements from cache or AWR. You name it once such as OPT_LOOP_WL. You reuse it for each compare. Both runs read the same set. Reference: https://docs.oracle.com/en/database/oracle/oracle-database/18/arpls/DBMS_SQLSET.html</details>

<details><summary>In case you don't know about buffer_gets, it's a count of logical reads used to rank work.</summary>High buffer_gets means high logical work. It moves less than wall time across runs. The source sorts by it first. You sort top 20 by it to find heavy hitters.</details>

## 1. Capture one window and stop

Plain claim: one named set beats ten hand runs.

You capture from the cursor cache over a fixed window. You set the name to OPT_LOOP_WL. You set the window to 300 seconds. You set repeat_interval to 1. You use capture_option MERGE. That window and those option names come from the research capture recipe. Unverified — run on your test DB.

No copy-paste capture block is shown here because the capture call shape is SKETCH in the source. Check names and args in your release DBMS_SQLSET reference before you run. Reference: https://docs.oracle.com/en/database/oracle/oracle-database/18/arpls/DBMS_SQLSET.html

Line by line for the capture idea: name picks the set both runs will share. Window sets how long Oracle listens. MERGE adds to the set instead of replacing it. Short window keeps the set small. Long window catches rare statements.

How to read success: the set exists under OPT_LOOP_WL. A count query on it returns rows. The same sql_id values appear on repeat reads.

Rollback line: keep the prior STS name untouched. If the new capture looks wrong, drop OPT_LOOP_WL and re-capture. Nothing in prod changed yet.

Worked progression A — first freeze: pick a quiet hour. Start capture for 300 seconds. Run your normal app flow. Stop. You now hold OPT_LOOP_WL. Do not edit it. Do not add hints. Do not filter rows. Freeze means freeze.

Worked progression B — lock the scope: run the inspect query below. Take the top 20 by buffer_gets. Record sql_id, plan_hash_value, executions. If a statement ran once in 300 seconds, keep it but do not let it decide the verdict. If one ran 10,000 times, weight it. Write those 20 IDs in your run log. That list is your test scope.

## 2. Inspect top 20 by buffer_gets

Plain claim: sort by logical work, not by wall time.

Use this exact check to inspect the set:

```sql
SELECT sql_id, plan_hash_value, elapsed_time, buffer_gets, executions
FROM   TABLE(DBMS_SQLSET.SELECT_SQLSET('OPT_LOOP_WL'))
ORDER  BY buffer_gets DESC FETCH FIRST 20 ROWS ONLY;
```

Line by line: SELECT_SQLSET reads the named set OPT_LOOP_WL. TABLE turns it into rows you can query. sql_id names the statement. plan_hash_value names the plan it used. elapsed_time shows total time. buffer_gets shows total logical reads. executions shows how often it ran. ORDER BY buffer_gets DESC puts heaviest first. FETCH FIRST 20 ROWS ONLY caps the scope.

How to read success: you see 5 to 20 rows that dominate buffer_gets. The top 3 rows hold most of the total. Each row has a stable sql_id and plan_hash_value. You copy those into your evidence log.

Rollback line: no data changed. If the top 20 look empty or wrong, your window missed traffic. Re-capture during load. Keep the old set until the new one looks right.

Worked progression A — capture to inspect to lock: capture 300 seconds. Run the query. Save the 20 rows as CSV in your run folder. Lock the STS name in your script variable. Later SPA steps read that same variable.

Worked progression B — compare two captures: capture once at noon and once at peak. Run the same inspect query on each set. Diff the top 20 lists. If peak adds 5 new IDs, merge them in or widen the window. Your goal is one set that covers both.

## 3. Guard the set between runs

Plain claim: edits between runs void the result.

Same STS. Same binds. Same scope for before and after. Do not touch the set after lock. Pass the STS name into DBMS_SQLPA as sqlset_name. That task reads the frozen rows. Reference: https://docs.oracle.com/en/database/oracle/oracle-database/26/arpls/DBMS_SQLPA.html

No new code in this section. The recipe block above is the only code you need here.

Line by line for the guard: your script holds one variable for the STS name. Before-run reads it. After-run reads it. Compare reads both executions. If names differ, the compare is void.

How to read success: before and after task logs show the same sqlset_name. Row counts match. No statement vanished mid-test.

Rollback line: if the set got edited mid-test, abort the compare. Restore the saved STS from staging or re-capture. Record the abort in your log.

Worked progression A — clean handoff: freeze OPT_LOOP_WL. Hand its name to the SPA step. Run before. Apply change. Run after. Compare. One name flows through all three.

Worked progression B — failed guard: someone filtered the set mid-test. Row count dropped from 200 to 150. You discard the compare. You restore the saved set. You re-run both sides. The log shows why the first verdict was void.

**Keep this: No frozen set means no claim; capture 300 seconds, inspect top 20 by buffer_gets, then lock it.**
