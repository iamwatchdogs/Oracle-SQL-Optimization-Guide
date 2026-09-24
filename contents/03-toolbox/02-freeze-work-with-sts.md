---
title: Freeze Work With STS
description: Lock the workload so before and after tests compare the same SQL.
order: 32
draft: false
---

"My fix helped on my laptop, but the team runs 200 queries, not one."

One query fast means nothing. The workload is the grade.

You can run SELECT. You have tuned one statement and watched another one slip. This page freezes the set so before and after test the same SQL.

Freezing work is like bagging evidence, except you store SQL text and binds so the next run tests the same case.

<details><summary>In case you don't know about SQL Tuning Sets, it's a stored copy of SQL text, binds, and stats you can replay and move.</summary>A tuning set freezes statements plus binds plus metrics for replay. `DBMS_SQLSET` is the newer interface in 19c and needs no Tuning Pack for set calls. You create a set such as SALES_JAN, load the top SQL from cache or AWR into it, and move it to test for isolation. Test leads use it before any claim. It drives one decision: is this the exact workload both runs graded. Do not compare live cache to live cache. Live traffic shifts binds and order, and the cost is a void verdict. Sharp line: same set in, fair compare out. Example: load the top sales SQL into SALES_JAN, then query `TABLE(DBMS_SQLSET.SELECT_SQLSET('SALES_JAN'))` for SQL_ID, ELAPSED_TIME, and BUFFER_GETS. See [T-06] https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/managing-sql-tuning-sets.html</details>

## 1. Freeze the top SQL first

Plain claim: without a frozen set, each run tests a new case.

Worked example A — capture last hour from cache into one set:

```sql
BEGIN
  DBMS_SQLSET.CREATE_SQLSET(sqlset_name => 'SALES_JAN', description => 'Top sales SQL Jan');
END;
/

DECLARE
  c DBMS_SQLSET.SQLSET_CURSOR;
BEGIN
  OPEN c FOR SELECT VALUE(p) FROM TABLE(
    DBMS_SQLSET.SELECT_CURSOR_CACHE('parsing_schema_name = ''SALES''')
  ) p;
  DBMS_SQLSET.LOAD_SQLSET(sqlset_name => 'SALES_JAN', populate_cursor => c);
END;
/
```

Shapes from the STS guide ch.24. SELECT_CURSOR_CACHE filters cache rows. LOAD_SQLSET takes INSERT, UPDATE, or MERGE. CAPTURE_CURSOR_CACHE polls over time for a fuller catch. Your filter will differ. Unverified — test on your schema for your module names.

How to read it: query TABLE(DBMS_SQLSET.SELECT_SQLSET('SALES_JAN')) for SQL_ID, SQL_TEXT, ELAPSED_TIME, BUFFER_GETS. Check statement count in USER_SQLSET. If the count is 3 when you expected 200, your filter was too tight.

Decision it drives: low count means widen the filter. Right count means lock it and stop adding. Every later test reads this set, not the live cache.

## 2. Test twice, grade once

Plain claim: SQL Performance Analyzer runs the same set twice and grades each statement.

Worked example B — before change, after change, compare:

```sql
EXEC :tname := DBMS_SQLPA.CREATE_ANALYSIS_TASK(sqlset_name => 'SALES_JAN');

EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(task_name => :tname, execution_type => 'test execute', execution_name => 'before_change');

-- make your change: index, stats, rewrite, patch

EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(task_name => :tname, execution_type => 'test execute', execution_name => 'after_change');

EXEC DBMS_SQLPA.SET_ANALYSIS_TASK_PARAMETER(:tname, 'comparison_metric', 'elapsed_time');

EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(task_name => :tname, execution_type => 'compare performance', execution_name => 'compare_1');

SELECT DBMS_SQLPA.REPORT_ANALYSIS_TASK(:tname, 'TEXT', 'TYPICAL', 'SUMMARY') FROM DUAL;
```

Call shapes from Oracle DBMS_SQLPA 19c docs (https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html). Execution types are `test execute`, `explain plan`, `compare performance`, `convert sqlset`. Comparison metric defaults to elapsed_time. buffer_gets is supported.

How to read it: the report lists improved, regressed, unchanged, plus errors and timeouts. Level TYPICAL shows each statement. Level CHANGED_PLANS shows only plan moves. Order by SQL_IMPACT or WORKLOAD_IMPACT to see what moves the total. A statement can improve while the workload regresses. The workload grade wins.

Decision it drives: any regressed high-impact SQL means stop and revert. All unchanged plus one improved means keep the change and test under load. Errors mean fix binds or privileges, not the plan.

One aside: a solo win that breaks payroll is still a loss. Back to the set.

## 3. Repeat runs, judge the workload

Plain claim: one fast run is noise. Medians across repeats plus matched windows are proof.

Worked example C — harden the verdict. Set DISABLE_MULTI_EXEC to FALSE so each SQL runs more than once and stats average out. Set TIME_LIMIT and LOCAL_TIME_LIMIT so one bad SQL cannot eat the night. Run test execute three times before and three times after. Keep medians, not bests. Hoefler and Belli ask for repeats, variability checks, and runs long enough to split noise from effect.

Then pair the set grade with AWR deltas over matched windows. Same hour, same weekday, same load mix. Compare DB time, top SQL by elapsed, waits. If SPA says improved but AWR DB time is flat, trust the window and dig into load.

How to read it: SPA report gives per-statement verdicts. AWR gives workload truth. If both point the same way, you have a case. If they split, the set missed live traffic — recapture with CAPTURE_CURSOR_CACHE over a longer poll.

Decision it drives: SPA green plus AWR green means ship with a revert note. SPA green plus AWR flat means recapture and rerun. Any red means stop.

<details><summary>In case you don't know about SQL Performance Analyzer, it's Oracle's task runner that tests the same workload twice and grades each statement.</summary>SPA builds two versions of one frozen tuning set and grades each statement. You create the task, run test execute before, apply one change, run test execute after, set the comparison metric, run compare performance, and read the report. It needs ADVISOR privilege. Every change owner uses it. It drives the ship-or-stop verdict. Do not use explain plan only. That skips execution and ships a pretty plan with bad runtime. Sharp line: it turns hope into per-statement improved, regressed, unchanged. Example: an index cuts aggregate buffer_gets 12% with zero regressed rows. Ship. Report levels TYPICAL and CHANGED_PLANS plus SQL_IMPACT ordering come from the same call. See [T-56] https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html</details>

**Keep this: Test the same frozen set twice and keep the graded report.**
