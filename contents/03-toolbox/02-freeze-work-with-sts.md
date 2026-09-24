---
title: Freeze Work With STS
description: Lock the workload so before and after tests compare the same SQL.
order: 32
draft: false
---

"My fix helped on my laptop, but the team runs 200 queries, not one."

A frozen tuning set plus a before-and-after analyzer turns a guess into a repeatable verdict.

Freezing work is like bagging evidence, except you store SQL text and binds so the next run tests the same case.

<details><summary>In case you don't know about SQL Tuning Sets, it's a stored copy of SQL text, binds, and stats you can replay and move.</summary>DBMS_SQLTUNE and DBMS_SQLSET build it with CREATE_SQLSET, LOAD_SQLSET, UPDATE_SQLSET, plus transport.</details>

<details><summary>In case you don't know about SQL Performance Analyzer, it's Oracle's task runner that tests the same workload twice and grades each statement.</summary>DBMS_SQLPA drives it with CREATE_ANALYSIS_TASK, EXECUTE_ANALYSIS_TASK, REPORT_ANALYSIS_TASK, and SET_ANALYSIS_TASK_PARAMETER.</details>

Build the set first. Load the top SQL from cache or AWR into one STS. DBMS_SQLSET is the newer interface in 19c docs. Move that set to test when you need isolation.

Then run DBMS_SQLPA. Pick test execute or explain plan or compare performance or convert sqlset. Set the comparison metric to elapsed_time by default, or buffer_gets where reads matter. Read the per-statement improved or regressed grade in the report. That grade is your accept or reject signal.

Repeat runs. Hoefler and Belli require repeats, variability checks, and runs long enough to separate noise from effect. Use medians and intervals, not one fast run. Pair STS with AWR deltas over matched windows to judge whole-workload change.

**Keep this: Test the same frozen set twice and keep the graded report.**
