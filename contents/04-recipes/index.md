---
title: Recipes You Can Script
description: Frozen inputs, measured change, and gates that block harm.
order: 40
draft: false
---

Two years ago I spent three days re-running a slow report by hand. It cost 14 hours and three late rewrites. Each run used new binds. Each timing proved nothing.

Scripted steps turn tuning from luck into repeatable proof.

A recipe run is like a lab test, except the sample is SQL text plus binds plus plans.

<details><summary>In case you don't know about STS, it's a named set of SQL saved inside Oracle for replay.</summary>STS holds text, binds, and plan data. Both runs read the same set. That makes the compare fair.</details>

<details><summary>In case you don't know about SPA, it's the Oracle tool that runs a workload twice and compares the two runs.</summary>SPA reports per-statement deltas. It can compare on buffer_gets or elapsed_time. It writes a report you can parse.</details>

That shift matters. Hand runs change inputs by accident. Scripted runs freeze inputs first. Then they apply one change. Then they measure before and after on the same set. The source orders this from capture to promote. Capture with STS. Test with SPA. Guard stats. Guard DDL. Gate each step in CI.

You will see four moves in this chapter. Freeze with STS. Compare before and after with SPA. Script the stats pipeline. Guard DDL and CI. Each move has code you can run. Each move names its rollback. No step mutates prod first.

Numbers set the tone. Capture runs 300 seconds. SPA needs K>=5 reps per side. Stats use 5% stale limits. CI has 5 gates. Small numbers. Clear pass or fail.

In this chapter:

- [Freeze With STS](/04-recipes/01-freeze-with-sts/)
- [Before and After With SPA](/04-recipes/02-before-after-with-spa/)
- [Stats Pipeline You Can Script](/04-recipes/03-stats-pipeline-you-can-script/)
- [Safe DDL and CI Gates](/04-recipes/04-safe-ddl-and-ci-gates/)

**Keep this: Freeze first, change once, measure twice, promote only on proof.**
