---
title: Stats Run the Show
description: Fresh optimizer numbers that fix bad cardinality guesses.
order: 12
draft: false
---

"Why did Oracle pick that bad plan? It guessed wrong about my data."

Bad estimates cause bad plans. Fresh numbers fix the estimates.

Fresh statistics are like a headcount before lunch, except Oracle counts rows and value spread to pick join order and access paths.

<details><summary>In case you don't know about a histogram, it's a note on how values spread in a column.</summary>Flat columns need no note. Skewed columns do. Oracle picks frequency, top-frequency, or hybrid by set rules.</details>

<details><summary>In case you don't know about extended statistics, it's a note on columns used together.</summary>City plus state is the classic pair. Single-column numbers miss the link. Group numbers catch it.</details>

Leave auto collection on. Change preferences, not scripts. The 19c gathering brief says that plainly. For large tables, follow the sample-size and parallelism guidance. Do not run 100% gathers by habit. For partitioned tables, set `SET_TABLE_PREFS(...,'INCREMENTAL','TRUE')` and keep global numbers via synopses. For load spikes, add concurrent gathering tied to Resource Manager. For hot DML tables, use Real-Time Statistics from 19c, with regression models added in 26ai. For bulk loads, rely on online gathering during CTAS and direct-path inserts.

When estimates still miss, climb the ladder. Turn on dynamic statistics to sample at parse time. Add histograms only where skew meets the documented criteria. Height-balanced is legacy. Prefer the three current types. Add column-group stats for correlated predicates, or set `AUTO_STAT_EXTENSIONS` to ON for auto creation. Add expression stats for `UPPER(col)` style filters. Read `DBA_SQL_PLAN_DIRECTIVES` to see recorded misses.

Test risky refreshes with `PUBLISH=FALSE` and `PUBLISH_PENDING_STATS`. Keep restores ready. History retention bounds the window.

**Keep this: Fix the estimate first; the plan follows.**
