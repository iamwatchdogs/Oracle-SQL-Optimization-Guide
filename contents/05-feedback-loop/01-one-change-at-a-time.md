---
title: One Change at a Time
description: Propose a single candidate, apply in isolation, then re-baseline.
order: 51
draft: false
---

"'why did two good fixes combine into a slowdown?'"

Test one change per loop or you lose attribution for every number.

A single-change loop is like a taste test, except you add one spice then ask the same 20 eaters.

<details><summary>In case you don't know about SQL Tuning Advisor, it's an Oracle tool that suggests profiles plus stats plus plan fixes.</summary>It takes sql_id plus scope plus 600 second limit. Its report is a proposal. It still needs SPA proof.</details>

<details><summary>In case you don't know about isolated apply, it's change in test where failure costs little.</summary>Use clone, standby, or interim table. Prod sees only promoted wins. ABORT stays ready.</details>

Agents love ideas. Advisors add more. SQL Tuning Advisor, SQL Access Advisor, Statistics Advisor, and auto-index reports each propose candidates. Pick one. Write its rationale. Apply it in test only. Leave prod untouched. Standby or clone takes the risk. Cheap screens go first with explain plan.

Interleaved changes destroy proof. Stats plus index plus rewrite in one go hides which step helped. It also hides which step hurt a different statement in the same STS. Oracle plan evolution checks candidates against baselines one by one. Auto-index verification tests one index effect through workload. Copy that discipline.

Steps stay small. S1 propose exactly one candidate from advisor output or hypothesis. S2 parse with sqlglot, lint with SQLFluff oracle dialect, run utPLSQL suites. S3 apply to test schema or interim table. S4 run SPA test execute on the frozen STS plus DISPLAY_CURSOR per statement. S5 decide on stats. S6 roll back on reject and verify plan hash returns. S7 log artifacts with hashes.

Do not stack a second idea before the verdict. Do not edit binds mid-loop. Do not widen the STS mid-loop. Re-baseline after each accept. New baseline becomes the next incumbent.

**Keep this: One proposal, one apply in test, one SPA verdict, then re-baseline.**
