---
title: Proven Techniques - What Actually Works
description: 68 Oracle SQL fixes in 8 groups, each with a rerun check.
order: 10
draft: false
---

"There are 68 tricks here? Do I need them all? No."

You need 5 moves in order: measure, feed estimates, fix layout, let rewrites happen, lock the plan.

A technique group is like a hospital floor, except each floor treats one cause of slow queries and has its own discharge test.

<details><summary>In case you don't know about a plan baseline, it's a saved good plan Oracle may reuse.</summary>Oracle stores accepted plans. New plans must prove faster before use. Bad plans stay out.</details>

<details><summary>In case you don't know about an index, it's a shortcut to rows without scanning the table.</summary>You pay on writes. You gain on selective reads. You prove the trade with a rerun.</details>

The count is exact. Group 1: measure with AWR, ASH, Monitor, XPLAN, Trace, Tuning Sets. Group 2: statistics, 15 entries, the largest family. Group 3: access and layout, from B-tree paths to In-Memory to Exadata offload. Group 4: rewrites Oracle does for you, 11 entries. Group 5: controls that stabilize plans. Group 6: advisors and SPA pipelines. Group 7: app habits and test deploys. Group 8: safe ship tools, from online redefinition to quarantine.

Two numbers set the tone. Automatic Indexing showed around 15% gain on customer loads in the VLDB 2025 paper, with up to 60% space reclaim in scope. Real-Time SPM moved verification into foreground execution in the 2026 paper, to cut background delay.

Each topic names when to use it, when to skip it, what must exist first, and how V0 proves it.

In this chapter:

- [Measure First](/01-proven-techniques/01-measure-first/)
- [Stats Run the Show](/01-proven-techniques/02-stats-run-the-show/)
- [Indexes and Layout](/01-proven-techniques/03-indexes-and-layout/)
- [Let Oracle Rewrite](/01-proven-techniques/04-let-oracle-rewrite/)
- [Stabilize and Ship Safely](/01-proven-techniques/05-stabilize-and-ship-safely/)

**Keep this: Work the groups in order; never ship without the Group 1 check.**
