---
title: How to Prove a Win
description: The before-and-after harness every chapter uses.
order: 3
draft: false
---

A query runs fast once after your fix. You tell the team it is done. Next day it is slow again. One run proved nothing. That is the incident V0 prevents.

This topic gives you V0. Six steps. Same workload. Two runs. One change.

You write SELECT and JOIN. You can read a plan at a basic level. You have copied tips that worked once. Baseline accepted. V0 builds from there. No stats degree needed.

A before-and-after test is a weigh-in on the same scale, except you freeze the workload and compare medians.

One aside: I have celebrated a one-run win that vanished. Back to V0.

## 1. Freeze the work before you change it

Claim: Fair compares need frozen input.

Example: Grade the blog claim "parallel hint always wins." Mark it D. D means blog or forum. Open the 19c Tuning Guide E96095-19 April 2025 [S01] https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/ for parallel and hint scope. That is A1. D plus A1 is not PROVEN. PROVEN needs 2 sources, or 1 strong A1/A2/B1 plus a repeatable check. So freeze a tiny employees-to-departments JOIN in a SQL Tuning Set first. That set is your frozen input. No frozen set, no fair compare. Log the D grade, link the A1 page, and move to V0.

Why it matters: Prod shifts daily. A frozen set stops drift from faking a win.

Number: 68 catalog entries all assume frozen input. 33 tools include Tuning Sets and loaders. D alone covers zero entries.

Progression 1: ad-hoc SQL to saved Tuning Set to versioned task.
Progression 2: oral "it felt faster" to elapsed_time median to buffer_gets check.

## 2. Run V0 step by step

Claim: Six steps turn a hunch into a decision.

Example: Run V0 on tiny employees and departments. Step 1: save the workload into a Tuning Set. Step 2: create a DBMS_SQLPA task and run test execute for before [S06] https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html . Step 3: apply one change only, such as fresh stats or one index. Step 4: run test execute for after, then compare performance. Default metric is elapsed_time. Second metric is buffer_gets. Set it with SET_ANALYSIS_TASK_PARAMETER. Step 5: repeat and keep medians. Hoefler and Belli SC15 [S58] https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf gives the method: duration, repetition, confidence. Faster once is not faster. Statistically faster is faster. Step 6: save DBMS_XPLAN DISPLAY_CURSOR for both plans, as covered in [S01]. Compare plan hash value, E-Rows vs A-Rows, access and filter predicates. Accept only if medians beat noise with no regression. Else roll back. Unverified here: sqlcl and sqlplus were missing in the research pass, so V0 was not executed here. These are steps to run on your DB, not results from this book.

Why it matters: Each step removes one error. Frozen input stops drift. Test execute stops guesses. Medians stop luck. Plans show why.

Number: DBMS_SQLPA and DBMS_XPLAN are C1. C1 means deterministic tool with readable output. 19 papers back the theory. The loop uses Oracle tools for Oracle proof.

The split juniors miss: EXPLAIN PLAN shows a compile-time guess. DISPLAY_CURSOR shows the plan that ran. The 19c guide documents that split. One shows intent. One shows fact. Save both. Trust the second for proof.

## 3. File the proof so others can check it

Claim: A win without a record will be reverted by doubt.

Example: Read [S06] — Oracle. DBMS_SQLPA, PL/SQL Packages and Types Reference 19c. https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html . S06 is the ID. A1 is the class. 19c is the version. The page lists CREATE_ANALYSIS_TASK, EXECUTE_ANALYSIS_TASK, compare performance, comparison_metric. Read [S13] for Real Application Testing task flow. Read [S58] for SC15 rigor. Each [S##] maps to a full record dated 2026-09-22. File your task ID, both DISPLAY_CURSOR outputs, metric medians, and these IDs. Anyone can reopen that file and see the same decision.

Why it matters: Teams trust files, not memory. Your proof survives on-call handoffs.

Number: 19 papers, 6 Oracle briefs, 33 tools. Classes A1/A2/B1/B2/C1/C2/D. PROVEN = 2 sources or 1 strong source plus a rerun. Your file should show which path you took.

<details><summary>In case you don't know about DBMS_SQLPA, it's Oracle's before-and-after compare tool.</summary>SPA builds two versions of one frozen tuning set and grades each statement. You create the task, run test execute before, apply one change, run test execute after, set the comparison metric, run compare performance, and read the report. Exact shape: `EXEC :tname := DBMS_SQLPA.CREATE_ANALYSIS_TASK(sqlset_name => 'OPT_LOOP_WL');` then test execute for before_change and after_change, then `SET_ANALYSIS_TASK_PARAMETER` to buffer_gets, then compare performance, then `SELECT DBMS_SQLPA.REPORT_ANALYSIS_TASK(:tname, 'TEXT', 'TYPICAL', 'ALL') FROM dual;`. It needs ADVISOR privilege. Every change owner uses it. It drives the ship-or-stop verdict. Do not use explain plan only. That skips execution and ships a pretty plan with bad runtime. Sharp line: it turns hope into per-statement improved, regressed, unchanged. Example: an index cuts aggregate buffer_gets 12% with zero regressed rows. Ship. See [T-56] https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html</details>

Run V0 for each change. One at a time. Roll back on regression. No live DB was open here. sqlcl and sqlplus were missing. Nothing here claims a local run.

**Keep this: Same workload, two runs, one change; keep the plan output.**
