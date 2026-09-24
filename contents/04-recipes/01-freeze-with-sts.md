---
title: Freeze With STS
description: Capture one tuning set so before and after share the same inputs.
order: 41
draft: false
---

"'why did it pass in test then miss in prod?'"

You cannot claim a win unless before and after share one frozen set of SQL.

An STS is like a saved shopping list, except it stores SQL text plus binds plus plans for replay.

<details><summary>In case you don't know about STS, it's a named set of SQL saved inside Oracle for replay.</summary>STS stores statements from cache or AWR. You name it once. You reuse it for each compare. The source calls this apples-to-apples.</details>

<details><summary>In case you don't know about buffer_gets, it's a count of logical reads used to rank work.</summary>High buffer_gets means high logical work. It moves less than wall time. The source sorts by it first.</details>

Start with the input. Oracle lets you save a workload as a SQL Tuning Set. You capture from the cursor cache over a fixed window. You set a name such as OPT_LOOP_WL. You set a time limit of 300 seconds. You set repeat_interval to 1. You use capture_option MERGE. Both later runs read that same set.

That list stops drift. Without it, binds shift. Plans shift. Data shifts. Timings shift. With it, the same 20 top statements face each test. You sort by buffer_gets to find the heavy hitters. You lock the scope. You compare apples to apples.

Use this exact check to inspect the set:

```sql
SELECT sql_id, plan_hash_value, elapsed_time, buffer_gets, executions
FROM   TABLE(DBMS_SQLSET.SELECT_SQLSET('OPT_LOOP_WL'))
ORDER  BY buffer_gets DESC FETCH FIRST 20 ROWS ONLY;
```

Run it after capture. Look for 5 to 20 rows that dominate buffer_gets. Record sql_id and plan_hash_value. Record executions. Those IDs form your test scope. If a statement has 1 execution in 300 seconds, keep it but do not let it decide the verdict. If a statement has 10,000 executions, weight it. Same set. Same binds. Same scope.

Do not edit the set between runs. Do not add hints mid-test. Do not filter rows mid-test. Freeze means freeze.

**Keep this: No frozen set means no claim; capture 300 seconds, inspect top 20 by buffer_gets, then lock it.**
