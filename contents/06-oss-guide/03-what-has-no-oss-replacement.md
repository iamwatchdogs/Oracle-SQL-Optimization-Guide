---
title: What Has No OSS Replacement
description: The proven techniques that still need Oracle built-ins, and why.
order: 63
draft: false
---

A team tried to swap SPA with a script that diffed plans by eye. It missed bind effects. It missed load effects. Parallel query regressed on an overused box. T-68 warns about that exact mode. A HammerDB run would have shown it in an hour.

You want one OSS swap for each Oracle feature. That swap does not exist for most proven fixes. The annex says None found for a reason. None found means no actively kept OSS implements that step. It does not mean no code exists. It means nothing passed the vet.

Prescription meds from one maker are more like these built-ins, where only Oracle fills the order.

## 1. Measurement and stats stay inside Oracle

Plain claim: T-01 to T-08 and T-09 to T-23 have no OSS replacement, only bundlers.

Worked example: map SPM, stats, and SPA to None found. First measurement Group 1. T-01 AWR, T-02 ASH, T-03 SQL Monitor, T-04 DBMS_XPLAN, T-05 Trace with TKPROF, T-06 Tuning Sets, T-07 Test Case Builder. Verdict None found. SQLd360 with 65 stars Dormant and SQLdb360 with 123 stars Low activity only bundle output offline, both no license declared, see S67. They do not replace the source. Then stats Group 2. T-09 to T-23, DBMS_STATS, histograms, extended stats, directives, pending stats, restore. Verdict None found. No OSS from this pass gathers stats safely. First pass you list the technique ID. Second pass you write None found or the bundler name next to it. You script around Oracle after.

Why it matters: stats drive every plan. Bad stats mean bad plans. Only DBMS_STATS plus Advisor checks keep that path safe.

Sourced number: SQLd360 65 stars push 2018-01-14 Dormant. SQLdb360 123 stars push 2024-12-03 Low activity. Both NOASSERTION no license declared. Core stats guide is S01 Tuning Guide 19c E96095-19 Apr 2025, stats brief S08 19c.

## 2. Controls and advisors stay inside Oracle, OSS only scripts the edge

Plain claim: profiles, patches, baselines, SPM, advisors, and SPA logic have no verified OSS clone.

Worked example: map three control points. First T-48 SPM baselines. Verdict None found. You load from cursor cache and evolve with DBMS_SPM. sqlglot at MIT 9,628 stars can parse hint text for T-45, but it cannot bless hint safety. Then T-46 profiles and T-47 patches. Verdict None found. Same rule. Then T-56 SPA. Verdict None found as logic. python-oracledb at 452 stars with UPL-1.0 OR Apache-2.0 can script task calls, the math stays in Oracle, see S64 and S06 DBMS_SQLPA. First pass you parse text outside Oracle. Second pass you enforce the plan inside Oracle. Do not present parsing as control.

Why it matters: plan control decides which plan runs in prod. A text diff cannot verify elapsed_time or buffer_gets. SPA can, with test execute or compare performance.

Sourced number: sqlglot MIT 9,628 push 2026-09-21 Active. python-oracledb UPL-1.0 OR Apache-2.0 452 push 2026-09-19 Active. S06 DBMS_SQLPA read firsthand with comparison_metric default elapsed_time. S07 DBMS_SPM for baselines.

## 3. Load is the one place OSS helps at scale

Plain claim: for T-24, T-25, and T-68, OSS adds concurrency Oracle alone does not fake well.

Worked example: validate an index and a parallel setting under load. First T-24 B-tree paths and T-25 bitmap with IOT. Built-ins design the index, Advisor input guides it. Then HammerDB GPL-3.0 786 stars push 2026-09-18 Active, see S65, drives TPROC-C concurrency while you watch waits. Then T-68 parallel execution. S77 Parallel Execution Concepts lists when to use and when not to use parallel, with overuse warning. Swingbench 80 stars push 2026-05-26 Active license null, see S66, drives Oracle-specific load. First pass you test one session for logic. Second pass you test many sessions for contention. The second pass exposes the overused-system regress.

Why it matters: single-session speed hides latch and IO queue effects. Load shows them. T-26 partitioning, T-28 MV rewrite, T-29 result cache, T-30 In-Memory, T-31 Exadata Smart Scan, T-32 Automatic Indexing still read None found for logic. Safe-change Group 8 with T-62 redefinition, T-63 EBR, T-64 Quarantine plus Resource Manager also reads None found.

Sourced number: HammerDB GPL-3.0 786 push 2026-09-18 Active. Swingbench 80 push 2026-05-26 Active license null. T-68 gate per S77. T-67 compression per S76 where relevant.

<details><summary>In case you don't know about SPA, it's SQL Performance Analyzer that tests SQL before and after a change.</summary>It runs test execute, explain plan, or compare performance. Default metric is elapsed_time, switchable to buffer_gets. See S06.</details>

<details><summary>In case you don't know about None found, it's the annex verdict that no kept OSS implements that step.</summary>The technique still relies on Oracle built-ins. Script around Oracle. Do not swap Oracle out. See file 06 section 6.4.</details>

**Keep this: If the annex says None found, script around Oracle — do not swap Oracle out.**
