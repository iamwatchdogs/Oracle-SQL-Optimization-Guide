---
title: Memory and When to Stop
description: Save lessons from rejects and halt on N=3 misses, plateau, or budget.
order: 54
draft: false
---

An agent proposed the same bad index four times in one week. Each run burned test time. Each verdict rejected it. No lesson was saved. The fifth try finally halted on budget, not on sense.

You have seen a query run faster once then run slower in prod. Repeat tries without memory repeat that pain. Thesis up front: log each reject with deltas, respect N=3 and plateau, and never claim without artifacts.

A lesson store is like a fence, except it blocks paths that already failed under the same conditions.

Status: designed, not run. This env had no live Oracle DB. No sqlcl or sqlplus on PATH. All lesson writes, stop checks, and observe steps are NOT-VERIFIED here. Authority comes from sources. [S56] Reflexion NeurIPS 2023, arXiv:2303.11366, https://github.com/noahshinn/reflexion. [S57] ReAct ICLR 2023, arXiv:2210.03629, https://github.com/ysymyth/ReAct. [S55] CHESS arXiv:2405.16755, https://github.com/shayantalaei/chess. [S06] DBMS_SQLPA, https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html. [S05] DBMS_XPLAN, https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html. [S11] Real-Time SPM, https://arxiv.org/html/2608.27758v1. [S40] quarantine, https://oracle-base.com/articles/19c/sql-quarantine-19c.

## 1. Turn rejects into searchable memory

Claim: each reject writes a lesson keyed to measured deltas, and next propose must read it.

Walkthrough A: SQL patch for sql_id abc123 fails check 3. Aggregate drops 9%. One statement regresses 7% past a 6% margin. Rollback drops the patch. DISPLAY_CURSOR shows old hash 1842217434 again. SPA re-run shows no residual delta. Lesson stores change_class, signature, action, measured_delta from SPA rows, reason STS regression, banned_until next schema change. Deltas come from SPA output. Hash comes from DISPLAY_CURSOR. No hand-typed numbers enter the store.

Walkthrough B: next loop proposes again. Retrieval finds the lesson by matching change class plus signature. Agent sees the same predicate shape and the same stats date. It skips the same hint. It amends to a stats refresh test instead. That skip saves one full K=10 cycle. If stats date moved or data volume band changed, ban lifts and retest is allowed with fresh A/A. Lesson without both SPA and XPLAN artifacts is invalid and gets dropped. This read and write path is NOT-VERIFIED here.

Why this rule exists: Reflexion shows verbal failure notes improve later tries without retraining [S56]. ReAct pairs reasoning traces with actions and test calls [S57]. CHESS validates SQL candidates against a test DB with unit checks [S55]. D10 applies that pattern to tuning. D8 plus S7 through S8 demand artifact linkage so lessons trace to proof, not memory of a chat.

Cost of skipping it: same index returns each week. Test budget burns. Reviewers re-argue settled facts. The loop never compounds. It just spins.

## 2. Halt on hard rules, not on hope

Claim: stop on N=3 straight rejects, plateau, budget end, or risk rise.

Walkthrough C: three straight proposes fail. Run 14 index fails CI. Run 15 patch fails no-regression. Run 16 stats refresh fails margin. N=3 triggers halt. Hypothesis space is spent under current facts. Lessons are saved per [S56]. Final report lists all artifact hashes. No fourth guess runs to fill time. Halt logic is NOT-VERIFIED here because no runs executed in this env.

Walkthrough D: plateau and risk paths. Last two accepts each gain 2% against a 3% noise floor. Plateau triggers halt. Quarantine view shows one event for sql_id xyz789. Risk triggers halt. Same ORDERS object fails twice after rollback. Oscillation guard triggers halt. Iteration cap hits 20 loops or 4-hour cap hits. Budget triggers halt.

Why this rule exists: Auto SPM stops capture when best-versus-worst gap falls below threshold [S11]. Real-Time SPM keeps the prior accepted plan when the new plan is not better [S11]. Convergence copies that calm. SC15 backs plateau logic because gains below noise are not effects [S58]. Resource Manager plus quarantine back the risk halt [S39][S40]. Change budget G4 stops unbounded retry.

Cost of skipping it: loop runs 40 more tries chasing 1% ghosts. Test host saturates. Other teams wait. A risky retest touches a quarantined object and pages on-call.

## 3. Observe after promote and close with proof

Claim: promoted changes face AWR plus quarantine watch, and the final report links every hash.

Walkthrough E: index passes the gate and promotes through a controlled path. Stats path publishes pending stats after verification [S29]. Plan path runs DBMS_SPM.EVOLVE_SQL_PLAN_BASELINE with verify YES. DDL path uses FINISH_REDEF_TABLE or edition switch [S41][S42]. Promotion gate re-runs SPA on the target env and re-checks the acceptance rule. AWR and ASH deltas get watched for the window [S03]. DBA_SQL_QUARANTINE gets checked. SPM activity gets checked. Regression signal triggers auto rollback. All observe actions are NOT-VERIFIED here.

Walkthrough F: close-out. Report holds STS name, sql_ids, hashes, K samples, medians, 95% CI bounds, margin math, SPA hash, XPLAN hash, rollback text, operator, DB version. If licence, standby, or privilege blocked a step, that step is marked NOT-VERIFIED and no win is claimed.

Why this rule exists: S10 observe confirms prod effect and catches late regressions. AWR plus ASH give load context [S03]. Quarantine gives runaway signal [S40]. SPM gives plan stability signal [S11][S12]. S7 log plus S8 reflect make evidence persist and feed forward. Without that close, wins fade into tribal recall.

Cost of skipping it: promote ships without watch. Regression surfaces a week later as p95 drift. No hashes exist to compare. Team re-runs the full loop from zero. Time lost is measured in days, not minutes.

<details><summary>In case you don't know about Reflexion, it's a loop that learns from failure text without retraining.</summary>It saves what failed and why. Next propose reads those notes. Tuning reuses that pattern with lessons keyed to SPA deltas. Store step is NOT-VERIFIED here.</details>

<details><summary>In case you don't know about convergence, it's the set of stop rules that ends the loop.</summary>N=3 rejects, plateau below noise, budget end, or risk rise. Any one stops work. That halt keeps test spend bounded.</details>

**Keep this: Log each reject with deltas, respect N=3 and plateau, and never claim without artifacts.**
