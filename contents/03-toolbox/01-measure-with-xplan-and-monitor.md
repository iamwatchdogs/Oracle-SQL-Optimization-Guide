---
title: Measure With XPLAN and Monitor
description: Show the executed plan and per-line actual rows first.
order: 31
draft: false
---

Picture a junior saying the query feels slow after a stats job.

Show the executed plan plus per-line actual rows before you claim what is slow.

Measuring a query is like checking a race split sheet, except each plan line reports its own time and row counts.

<details><summary>In case you don't know about DBMS_XPLAN, it's Oracle's package that prints plans from memory, history, and baselines.</summary>DISPLAY_CURSOR shows the executed plan. DISPLAY_AWR shows history. DISPLAY_SQL_PLAN_BASELINE shows baseline plans.</details>

<details><summary>In case you don't know about E-Rows and A-Rows, it's estimated rows versus actual rows for one plan line.</summary>A large gap points to a bad estimate that pushed the optimizer to a bad plan.</details>

Start with plan hash plus DISPLAY_CURSOR before and after. That proves the plan changed. Use format options and hint reports in 19c. Use plan comparison where 19c and 21c+ docs describe it. Keep both outputs side by side.

Then open Real-Time SQL Monitoring through V$SQL_MONITOR and DBMS_SQL_MONITOR. It shows actual versus estimated rows per plan line, per-line timing, plus memory and temp use. It supports MONITOR and NO_MONITOR hints. Thresholds apply. Docs cover 19c and 26ai. Our map uses this output to answer if estimate error caused the bad plan.

Add trace only when needed. SQL Trace plus TKPROF gives parse, execute, and fetch counts with elapsed, CPU, waits, and recursive SQL. TRCSESS merges files. Read the documented traps before you trust the text output.

**Keep this: Quote plan hash plus A-Rows versus E-Rows before you name a cause.**
