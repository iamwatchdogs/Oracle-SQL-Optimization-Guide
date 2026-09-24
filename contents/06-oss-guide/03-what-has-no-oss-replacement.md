---
title: What Has No OSS Replacement
description: The proven techniques that still need Oracle built-ins, and why.
order: 63
draft: false
---

Most proven Oracle fixes have no OSS replacement. Use built-ins.

"'is there an open source SPM?'"

Short answer: no verified one in this pass. Plan control stays inside Oracle.

Think of these built-ins like prescription meds: only the maker fills them.

<details><summary>In case you don't know about SPA, it's SQL Performance Analyzer that tests SQL before and after a change.</summary>It runs test execute, explain plan, or compare performance. Default metric is elapsed_time, switchable to buffer_gets.</details>

Precise list follows. Measurement Group 1: T-01 AWR, T-02 ASH, T-03 SQL Monitor, T-04 DBMS_XPLAN, T-05 Trace/TKPROF, T-06 Tuning Sets, T-07 Test Case Builder. Verdict: None found. SQLd360 with 65 stars and SQLdb360 with 123 stars only bundle output offline. Both show no license declared. They do not replace the source.

Statistics Group 2: T-09 to T-23. DBMS_STATS, histograms, extended stats, directives, pending stats, restore. Verdict: None found. No OSS tool from this pass gathers or checks optimizer stats safely.

Access Group 3 is mixed. T-24 B-tree paths and T-25 bitmap/IOT still need built-in design plus Advisor input. OSS only adds load. HammerDB: GPL-3.0, 786 stars, 2026-09-18. Swingbench: 80 stars, 2026-05-26, license null. Use them to create concurrency. T-26 partitioning, T-28 MV rewrite, T-29 result cache, T-30 In-Memory, T-31 Exadata Smart Scan, T-32 Automatic Indexing: None found.

Controls Group 5: T-46 profiles, T-47 patches, T-48 baselines, T-49 Auto and Real-Time SPM, T-50 adaptive plans, T-51 cursor sharing, T-52 parameters. Verdict: None found. sqlglot at MIT with 9,628 stars can parse hint text for T-45, but it cannot bless hint safety.

Advisors Group 6: T-54 Tuning Advisor, T-56 SPA, T-57 ADDM. Verdict: None found as logic. python-oracledb at 452 stars with UPL-1.0 OR Apache-2.0 can script SPA task calls. The math stays in Oracle.

Safe-change Group 8: T-62 DBMS_REDEFINITION, T-63 EBR, T-64 Quarantine plus Resource Manager. Verdict: None found.

A team tried to swap SPA with a script that diffed plans by eye. It missed bind effects. It missed load effects. T-68 parallel execution warns about overused systems for this exact reason. HammerDB load would have shown it.

**Keep this: If the annex says None found, script around Oracle — do not swap Oracle out.**
