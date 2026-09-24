---
title: Stabilize and Ship Safely
description: Baselines, profiles, advisors, and guardrails that block regressions.
order: 15
draft: false
---

"It got faster on my laptop. Can I ship it? Not yet."

Keep the fast plan. Block the bad one. Ship with a rollback ready.

A plan baseline is like a saved game, except Oracle reloads the known-good plan and tests new plans before they go live.

<details><summary>In case you don't know about a SQL profile, it's extra numbers attached to one SQL ID.</summary>It corrects bad estimates without editing code. Drop it to roll back. V0 proves if it helped.</details>

<details><summary>In case you don't know about a SQL patch, it's a hint attached to one SQL ID.</summary>It works around a defect without editing the app. Treat it as short-term. Revisit the root cause.</details>

Use hints last. Check the hint report to confirm Oracle used the hint, not ignored it. Prefer baselines for control. Capture from cursor cache, AWR, or Tuning Set. Evolve only verified plans. View them with `DISPLAY_SQL_PLAN_BASELINE`. On 19c, Auto SPM verifies in back office. On 26ai, Real-Time SPM verifies in foreground and reinstates the prior plan on regression. Keep adaptive plans on unless V0 says off. They switch join method at run time. Keep binds in code. Do not set `CURSOR_SHARING=FORCE` as a fix. Watch `V$SQL` for child-cursor counts and bind-aware flags.

Propose with advisors. SQL Tuning Advisor gives 4 checks: numbers, profile, access path, structure. Apply one tip at a time. SPA with `comparison_metric` of `elapsed_time` or `buffer_gets` is the gate. ADDM is triage only. Deploy via test systems first. For layout changes without downtime, use DBMS_REDEFINITION with `CAN_REDEF_TABLE` checks and `ABORT_REDEF_TABLE` ready. For code deploys, use Edition-Based Redefinition and keep the old edition live. For runaways, set Resource Manager limits plus SQL Quarantine. On 26ai, note `SQL_ERROR_MITIGATION` as a net, not a fix.

**Keep this: One change, one SPA compare, one rollback path; otherwise do not ship.**
