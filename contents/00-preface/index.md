---
title: Preface - Trust Runs, Not Rumors
description: How this book grades evidence and proves every Oracle SQL win.
order: 1
draft: false
---

Your JOIN runs fast on your laptop. It times out in prod. A blog told you to add a hint. You did. Nothing changed.

This book teaches fixes you can prove on your own database. Nothing else counts.

You write SELECT, JOIN, and WHERE. You trust tips when stuck. Start there. Grade the tip. Prove the win.

An evidence grade is a food label, except it lists the tester and the rerun steps instead of calories.

One aside: I have trusted a tip that failed at scale. Back to grades.

## 1. Grades decide before runs start

Claim: Grades tell you what to trust before you test.

Example: A blog says avoid bind variables for speed. Grade it D. Check the 19c Tuning Guide E96095-19 April 2025 [S01] https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/ . That is A1. D plus A1 is not PROVEN. PROVEN needs 2 sources, or 1 strong source plus a repeatable check. File it as D and demand a rerun.

Why it matters: You argue from sources, not volume. Juniors can push back on bad tips with calm facts.

Number: 68 entries passed. D alone passed zero. Classes are A1/A2/B1/B2/C1/C2/D.

Progression 1: tip to D tag to A1 page to rerun gate.
Progression 2: guess from EXPLAIN PLAN to fact from DISPLAY_CURSOR to trace from SQL Monitor.

## 2. Wins need the same workload twice

Claim: A win is the same workload, two runs, one change.

Example: Use tiny employees and departments. Freeze that JOIN in a Tuning Set. Run V0. Step 1: save the set. Step 2: DBMS_SQLPA test execute for before [S06] https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html . Step 3: change one thing. Step 4: test execute for after, compare on elapsed_time and buffer_gets. Step 5: repeat and keep medians per Hoefler and Belli SC15 [S58] https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf . Step 6: keep DISPLAY_CURSOR for both, as covered in [S01]. Unverified: sqlcl and sqlplus were missing, so no runs here. Run V0 on your DB.

Why it matters: Frozen input stops false wins. Medians stop lucky wins.

Number: 33 tools support V0. DBMS_SQLPA and DBMS_XPLAN are C1. C1 means deterministic tool with readable output.

## 3. Citations you can open

Claim: Every proof points to a page you can open.

Example: Read [S06] — Oracle. DBMS_SQLPA, 19c. https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html . S06 is the ID. A1 is the class. Do the same for [S01] and [S58]. Each [S##] maps to a full record. Learn that once. Use it for all 19 papers and 6 briefs.

Why it matters: You check version scope fast. 19c vs 26ai stops mattering once you see the date.

Number: 19 papers, 6 Oracle briefs, 33 tools. PROVEN = 2 sources or 1 strong source plus a rerun.

<details><summary>In case you don't know about an execution plan, it's Oracle's chosen steps to run your query.</summary>It is the step list Oracle chose for your SELECT and JOIN. It names join order and how each table was read, plus row guesses and cost per line. You get it after you run the query with `SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR());`. `EXPLAIN PLAN FOR` only shows a compile guess and can miss binds. Devs and DBAs pull it when a query slows with no code change. It drives one decision. Same plan hash means look at data or load. New hash means the optimizer picked a new path. Do not use wall time alone. Wall time hides which line moved. Sharp line: it is the only proof of what ran, line by line. Example: save the hash before and after a stats job. Different hash means the job picked a new path. See [T-04][S05] https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/generating-and-displaying-execution-plans.html</details>

<details><summary>In case you don't know about AWR, it's Oracle's built-in history of database activity.</summary>AWR is the Automatic Workload Repository. It stores timed snapshots of load by SQL and event. ADDM reads that history and names suspects. Steps are fixed. Pull the AWR report for the bad hour. Sort SQL by elapsed and buffer gets. Pick one SQL ID. Teams with a slow hour need it first. It drives one decision: which statement deserves tune time. Do not start from single-run feel. Single runs miss the window and tune the wrong SQL. Sharp line: AWR frames the workload, single timing does not. Example: the bad hour shows one join top by elapsed. You tune that ID only. Needs STATISTICS_LEVEL TYPICAL or ALL. Confirm per statement after ADDM triage. See https://docs.oracle.com/en/database/oracle/oracle-database/19/tdppt/automatic-database-performance-monitoring.html [T-01].</details>

Compiled 2026-09-22. No live DB was open. `sqlcl` and `sqlplus` were not on PATH. Nothing here claims we ran it.

In this chapter:

- [Why Evidence Grades Decide What You Trust](/00-preface/01-why-evidence-grades/)
- [How to Prove a Win](/00-preface/02-how-to-prove-a-win/)

**Keep this: If you did not measure it twice, you did not fix it.**
