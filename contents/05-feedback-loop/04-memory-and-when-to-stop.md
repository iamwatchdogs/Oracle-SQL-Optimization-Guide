---
title: Memory and When to Stop
description: Save lessons from rejects and halt on N=3 misses, plateau, or budget.
order: 54
draft: false
---

"'why does the agent keep trying the same bad index?'"

Loops improve only when rejects turn into searchable memory plus a hard stop.

A lesson store is like a fence, except it blocks paths that already failed under the same conditions.

<details><summary>In case you don't know about Reflexion, it's a loop that learns from failure text without retraining.</summary>It saves what failed and why. Next propose reads those notes. Tuning reuses that pattern.</details>

<details><summary>In case you don't know about convergence, it's the set of stop rules that ends the loop.</summary>N=3 rejects, plateau below noise, budget end, or risk rise. Any one stops work.</details>

Memory is simple. Each lesson stores change class, precondition signature, action, outcome, measured_delta, reason_rejected, banned_until, discovered_version. Before propose, fetch matching lessons. Skip or amend. No hand-typed numbers. Measured_delta comes from SPA report columns for buffer_gets and elapsed_time plus plan hash from DISPLAY_CURSOR. A lesson without both artifacts is invalid. Drop it.

Stops are hard. Halt on N=3 straight rejects; the idea space is spent under current facts. Halt when last M accepts gain less than noise floor; you hit plateau. Halt on budget end for iterations, time, or objects. Halt when quarantine fires or the same object fails twice after rollback; that flags oscillation. Auto SPM uses the same logic when best-versus-worst gap falls below threshold. Real-Time SPM keeps the old accepted plan when the new plan is not better. Copy that calm.

Observe after promote. Watch AWR and ASH deltas for the window. Watch quarantine. Watch SPM activity. Auto roll back on regression signal. Write the final report with every artifact hash linked to SPA output. If a step could not run for licence, standby, or privilege, write NOT-VERIFIED. Claim nothing.

**Keep this: Log each reject with deltas, respect N=3 and plateau, and never claim without artifacts.**
