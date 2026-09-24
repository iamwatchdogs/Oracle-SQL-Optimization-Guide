---
title: Before and After With SPA
description: Run test execute twice and compare on buffer_gets before you trust a change.
order: 42
draft: false
---

Tuesday morning. A query ran fast once. You added an index. It ran fast again. At noon it ran slow. One fast run had proved nothing. You had no before log. You had no after log. You had hope.

You know basic SQL. You write SELECT, JOIN, UPDATE. You fear Friday deploys because speed jumps around. This file gives you a spine for proof. Same workload. Two runs. One compare.

A SPA task is like a weigh-in, except it weighs logical reads before and after on the same workload.

<details><summary>In case you don't know about SPA, it's the Oracle package DBMS_SQLPA that predicts workload impact.</summary>SPA builds two versions of one frozen tuning set and grades each statement. Exact shape: `EXEC :tname := DBMS_SQLPA.CREATE_ANALYSIS_TASK(sqlset_name => 'OPT_LOOP_WL');` then test execute for before_change and after_change, then `SET_ANALYSIS_TASK_PARAMETER` to buffer_gets, then compare performance, then `SELECT DBMS_SQLPA.REPORT_ANALYSIS_TASK(:tname, 'TEXT', 'TYPICAL', 'ALL') FROM dual;`. It needs ADVISOR privilege. Every change owner uses it. It drives the ship-or-stop verdict. Do not use explain plan only. That skips execution, and the cost is a pretty plan with bad runtime. Sharp line: it turns hope into per-statement improved, regressed, unchanged. Example: an index cuts aggregate buffer_gets 12% with zero regressed rows. Ship. See [T-56] https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html</details>

<details><summary>In case you don't know about comparison_metric, it's the SPA setting that picks the score.</summary>Comparison_metric tells SPA which column decides the verdict. Default is elapsed_time. Switch to buffer_gets for lower variance, then report both plus CPU and rows. Exact call: `EXEC DBMS_SQLPA.SET_ANALYSIS_TASK_PARAMETER(:tname, 'comparison_metric', 'buffer_gets');` before the compare performance run. Test owners set it right after the after_change run. It drives one decision: which metric is primary for accept. Do not use elapsed_time alone on a noisy host. Noon load can swing it 40% with zero code change, and the cost is false wins and false rejects. Sharp line: it picks the ruler before you argue about the length. Example: buffer_gets spreads 10% across K=10 while elapsed_time spreads 40%. The verdict rests on buffer_gets. Confirm on your own A/A run. Unverified — run on your test DB. See [S06] https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html</details>

## 1. Run before and after on the frozen set

Plain claim: two test executes beat one stopwatch timing.

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

Line by line: VARIABLE tname holds the task name. CREATE_ANALYSIS_TASK builds one task over OPT_LOOP_WL. First EXECUTE with test execute and before_change runs the frozen workload as-is. You apply the candidate change here. Second EXECUTE with test execute and after_change runs the same workload with the change. SET_ANALYSIS_TASK_PARAMETER sets comparison_metric to buffer_gets. EXECUTE with compare performance and cmp_buffergets diffs the two runs. REPORT_ANALYSIS_TASK prints TEXT TYPICAL ALL for humans and logs.

How to read success: the report shows per-statement rows first, then the aggregate. buffer_gets drops or holds on every key statement. elapsed_time is shown second. Each row carries plan hash values. No regressed statement hides in the STS.

Rollback line: the task itself changes nothing. To undo, drop the task or ignore it. To undo the candidate change, revert the index, hint, or rewrite you applied between the two runs.

Worked progression A — before to after to compare: create task over OPT_LOOP_WL. Run before_change. Add the index. Run after_change. Set metric to buffer_gets. Run cmp_buffergets. Read the report. One task holds all three executions.

Worked progression B — cheap pre-gate then full gate: run explain plan first to screen a bad idea. It costs little and runs no data. If it looks sane, run the full test execute pair above. If explain plan shows a full scan on a huge table, stop before you spend test time.

## 2. Repeat enough to trust the delta

Plain claim: K>=5 reps per side, same binds, same host.

The research repetition rule sets K>=5 reps per side as the floor. Same STS. Same binds. Same metric. Wall time jumps with cache and load. buffer_gets moves less. That is why the recipe compares on buffer_gets first. Confirm the lower variance with your own A/A run. Unverified — run on your test DB.

No new code here. The block above is the code. Repetition lives in how you schedule it.

Line by line for the rule: K counts runs per side. 5 is the floor, not the goal. Same binds means no swapped literals. Same host means no cross-machine compares. buffer_gets first means the verdict sorts by logical work.

How to read success: medians separate more than noise. The interval for the difference excludes zero. No key statement regressed even if the total improved.

Rollback line: if reps disagree wildly, void the verdict. Check for cache warmth, noisy neighbors, or changed binds. Re-run both sides clean.

Worked progression A — noisy noon run: before side shows 5 reps within 10% on buffer_gets. Elapsed_time spreads 40%. You trust buffer_gets. You report both. The verdict rests on buffer_gets.

Worked progression B — one regressed statement: total buffer_gets fell 30%. One statement in the set rose 50%. You reject the change. The rule is no regressed statement elsewhere in the STS. You log the offender sql_id.

## 3. Capture plan evidence with each run

Plain claim: plans explain the delta, numbers decide it.

Use this exact check for the statement just measured:

```sql
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR(sql_id => '&sql_id', cursor_child_no => NULL, format => 'ALLSTATS LAST +PEEKED_BINDS'));
```

Line by line: DISPLAY_CURSOR pulls the executed plan plus runtime stats. sql_id picks the statement. cursor_child_no NULL picks the last child. ALLSTATS LAST adds actual rows and buffers. PEEKED_BINDS shows which binds shaped the plan. Reference: DBMS_XPLAN docs and SQL Tuning Guide plan chapter. Structural plan-compare function names vary by release. Unverified — run on your test DB.

How to read success: plan hash matches the SPA row for that sql_id. Buffers and rows line up with the report. A plan change alone is not proof. Only measured deltas count.

Rollback line: evidence capture is read-only. If the plan looks wrong, keep the DISPLAY output in your log and revert the candidate change. The log makes the revert exact.

Worked progression A — read the report then the plan: open SPA report. Find the top mover by buffer_gets. Copy its sql_id. Run DISPLAY_CURSOR. Save both. Your evidence folder holds report plus plan.

Worked progression B — history check: pull the same sql_id from AWR with DISPLAY_AWR on a prior plan hash. Diff operation lines by eye. If the new plan adds a nested loop over millions of rows, you have a cause to match the numbers.

**Keep this: Same STS, two test executes, one compare on buffer_gets, then read the report.**
