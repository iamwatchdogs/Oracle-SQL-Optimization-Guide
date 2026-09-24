---
title: How to Prove a Win
description: The before-and-after harness every chapter uses.
order: 3
draft: false
---

"But it ran faster once. Is that not proof? Not yet."

One fast run proves nothing. A repeated before-and-after run proves a win.

A before-and-after test is like a weigh-in on the same scale, except you weigh the same workload twice and keep the scale settings fixed.

<details><summary>In case you don't know about a SQL Tuning Set, it's a saved bundle of SQL plus run numbers.</summary>You freeze the workload once. You run the same bundle before and after each change. Same input means fair compare.</details>

<details><summary>In case you don't know about DBMS_SQLPA, it's Oracle's before-and-after compare tool.</summary>You run a task before the change. You run it again after. It reports improved, regressed, or unchanged per statement.</details>

The check is called V0. Six steps. Step 1: save the workload into a Tuning Set. Step 2: run `DBMS_SQLPA.CREATE_ANALYSIS_TASK` then `EXECUTE_ANALYSIS_TASK(...,'test execute')` for the before snapshot. Step 3: apply one change only. Step 4: run `EXECUTE_ANALYSIS_TASK(...,'test execute')` again for after, then set `SET_ANALYSIS_TASK_PARAMETER(task,'comparison_metric','buffer_gets')` and run `EXECUTE_ANALYSIS_TASK(...,'compare performance')`. The default metric is `elapsed_time`. `buffer_gets` is the second option. Step 5: accept only if medians beat noise across repeats. The method comes from Hoefler and Belli SC15 on scientific benchmarking. Step 6: save `DISPLAY_CURSOR` output for both plans. Compare plan hash, E-Rows versus A-Rows, and access predicates.

The simplest proof in this book is old. EXPLAIN PLAN shows a compile-time guess. DISPLAY_CURSOR shows the plan that ran. The 19c guide documents that split. Juniors mix them up. Do not. One shows intent. One shows fact.

Run V0 for each change. One at a time. Roll back on regression.

**Keep this: Same workload, two runs, one change; keep the plan output.**
