---
title: Accept or Rollback Gate
description: Five checks must pass or you restore and log the lesson.
order: 53
draft: false
---

"'when do we keep a fix and when do we throw it away?'"

Keep only changes that clear all five checks on the frozen STS.

An accept gate is like a border check, except five stamps are needed and one miss sends the change back.

<details><summary>In case you don't know about SQL quarantine, it's Oracle control that blocks plans that blew up.</summary>It tracks runaway executions. Check DBA_SQL_QUARANTINE after promote. Any event triggers review.</details>

<details><summary>In case you don't know about SPM evolve, it's vendor verification that accepts only better plans.</summary>It tests non-accepted plans with verify YES. It commits only on win. Use it for plan promote.</details>

Checks are strict. One: aggregate buffer_gets beats noise floor plus margin, where margin is max of 2x noise or 5%. Two: 95% CI for median difference excludes zero. Three: no statement in the STS regresses past the same margin. Four: semantic gate passes with same results and green utPLSQL. Five: rollback command is recorded and was run once in sandbox.

Reject means act fast. Run the class rollback at once. Stats use RESTORE. Pending publish gets discarded before commit. Profile drops. Patch drops through DBMS_SQLDIAG. Baseline disables through ALTER_SQL_PLAN_BASELINE. Index drops. Redefine aborts before finish. Edition switches back. Runaway plans hit Resource Manager kill plus quarantine. Then verify. DISPLAY_CURSOR must show the old plan hash again. SPA re-run must show no residual delta. Only then is rollback done.

Log each path. Save run id, git sha, DB version, task names, medians, CI bounds, samples, plan hashes, SPA report hash, XPLAN text, rollback text, operator. No improved line goes in the log without artifact hash. That rule stops wishful writes.

Human gates stay. Schema redesign needs approval. Prod parameter change needs approval. Prod index drop needs approval. Loop never mutates prod first.

**Keep this: Five checks pass means promote; one miss means roll back, verify hash, and log.**
