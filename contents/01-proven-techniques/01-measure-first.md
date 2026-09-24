---
title: Measure First
description: AWR, ASH, Monitor, XPLAN, and traces that show where time goes.
order: 11
draft: false
---

"Where do I start? Just add an index? Not yet."

Measure first. Change second. A guess without numbers stays a guess.

Measuring first is like finding which pipe leaks, except you use history snapshots and plan output instead of your eyes.

<details><summary>In case you don't know about AWR, it's Oracle's timed snapshots of DB activity.</summary>It stores load by SQL and event. ADDM reads that history and names suspects. You still confirm per statement.</details>

<details><summary>In case you don't know about ASH, it's a sampler of who was active and when.</summary>It shows which SQL and wait ate time. Short statements can slip past it. Long ones show up clear.</details>

Start wide, then narrow. AWR frames the window. ASH names the SQL and event. Real-Time SQL Monitoring zooms to the slow execution and shows ACTUAL_ROWS against estimates per plan line. That gap is cardinality error. It drives half the fixes in this book.

Then freeze evidence. Save `DISPLAY_CURSOR` for the run that happened, not EXPLAIN PLAN for a guess. The 19c guide from April 2025 documents that split. Compare E-Rows to A-Rows. Note plan hash and access predicates. For elapsed splits, use SQL Trace plus TKPROF. It breaks parse, execute, and fetch counts, plus disk against buffer gets. Watch the four documented traps in chapter 23: argument, read-consistency, schema, and time.

Bundle the workload in a Tuning Set so before and after use the same input. For a portable repro, build a SQL Test Case with plan, numbers, and DDL samples. For a fast offline pack, run SQLdb360 around one SQL ID. It pulls plans, numbers, and binds into one zip. The older SQLd360 from 2018 is dormant. Use SQLdb360 from 2024 and cross-check against Monitor output.

**Keep this: Save the plan and counts before you touch SQL.**
