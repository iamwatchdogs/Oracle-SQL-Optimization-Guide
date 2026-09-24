---
title: Before and After With SPA
description: Run test execute twice and compare on buffer_gets before you trust a change.
order: 42
draft: false
---

"'why did it get faster once then slower the next hour?'"

One fast run proves nothing; two frozen runs plus a compare prove a change.

A SPA task is like a weigh-in, except it weighs logical reads before and after on the same workload.

<details><summary>In case you don't know about SPA, it's the Oracle package DBMS_SQLPA that predicts workload impact.</summary>It builds two versions of a workload. It compares them. It needs ADVISOR privilege for analysis tasks.</details>

<details><summary>In case you don't know about comparison_metric, it's the SPA setting that picks the score.</summary>Default is elapsed_time. Switch to buffer_gets for lower variance. Report both.</details>

SPA is the spine. You create one analysis task over OPT_LOOP_WL. You run test execute with name before_change. You apply the candidate change. You run test execute with name after_change. You set comparison_metric to buffer_gets. You run compare performance. You read the report.

That order blocks self-deception. Cheap pre-gates exist. Explain plan costs little and screens bad ideas. Convert sqlset reuses saved stats without re-execution. But the verdict needs test execute on both sides. Same STS. Same binds. Same metric.

Use this exact shape:

```sql
EXEC :tname := DBMS_SQLPA.CREATE_ANALYSIS_TASK(sqlset_name => 'OPT_LOOP_WL');
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(task_name => :tname,
       execution_type => 'test execute', execution_name => 'before_change');
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(task_name => :tname,
       execution_type => 'test execute', execution_name => 'after_change');
EXEC DBMS_SQLPA.SET_ANALYSIS_TASK_PARAMETER(:tname, 'comparison_metric', 'buffer_gets');
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(task_name => :tname,
       execution_type => 'compare performance', execution_name => 'cmp_buffergets');
SELECT DBMS_SQLPA.REPORT_ANALYSIS_TASK(:tname, 'TEXT', 'TYPICAL', 'ALL') FROM dual;
```

Read per-statement rows first. Then read the aggregate. Check buffer_gets first. Check elapsed_time second. Record plan hash per statement. A plan change alone is not proof. Only measured deltas count.

**Keep this: Same STS, two test executes, one compare on buffer_gets, then read the report.**
