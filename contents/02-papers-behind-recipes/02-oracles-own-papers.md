---
title: Oracle's Own Papers
description: What 3 Oracle engineer papers prove about plans and indexes.
order: 22
draft: false
---

Picture an Oracle engineer watching a new plan fail during a live user run. The user waits. The old plan was fine. The new plan hangs. The engineer needs a rule that swaps back fast. That rule is the core of all 3 Oracle papers.

A new plan is like a replacement brake pad, except you test it while the car is moving.

Start with plan control. Then add auto indexes. Finally add error cover. First you trace the timeline from 11g to 26ai. Next you run the index lifecycle. Then you state the vendor rule in plain words.

## 1. Verify each plan before you trust it

Claim: Oracle uses only known or verified plans, and reinstates the last good plan on regression.

Example: run the timeline demo from P1 [P1] PVLDB 19(12):4169–4181, 2026, DOI 10.14778/3827998.3828024, https://arxiv.org/html/2608.27758v1, [read firsthand].

- Step 1: 11g manual capture. DBAs capture plans by hand.
- Step 2: 12c Auto SPM Evolve Advisor. Checks move to the background.
- Step 3: 19c Auto SPM with Auto STS. Auto STS grabs real load SQL. A regression threshold on plan metrics gates accept.
- Step 4: 26ai Real-Time SPM. Checks move into the foreground user run. A new plan is verified during execution. On regression the prior accepted plan returns at once.

The paper reports production deployment. It states background checks ran too slow for cloud systems with tight resources.

Why it matters: this is the model for any safe change loop. Propose. Verify with measures. Revert fast on loss. No revert path means no ship.

Number: PVLDB 19(12):4169–4181. That page range marks a full systems paper, not a brief. W4 states the vendor rule in plain words: only known or verified plans are used, and a new plan will not be used until verified to perform better. Source: https://www.oracle.com/technetwork/database/bi-datawarehousing/twp-sql-plan-mgmt-19c-5324207.pdf [S12].

## 2. Let indexes prove value, then keep or drop them

Claim: automatic indexes follow the same propose, verify, accept or drop path.

Example: run the lifecycle demo from P2 [P2] PVLDB 18(12):4924, 2025, DOI 10.14778/3750601.3750616, [snippet-verified].

- The feature ships since 19c and in Autonomous Database.
- It creates candidate indexes. It validates them on real load. It deploys winners. It removes losers. It covers expression indexes.

Juniors often stop at create. Oracle does not. Validate and drop are the parts that save space and write cost.

Why it matters: an index speeds reads and taxes writes. Auto drop removes dead weight. That trade is why space numbers matter as much as speed numbers.

Number: abstract reports about 15% speed gain and up to 60% space-reclamation potential on customer load, [snippet-verified, abstract-level figures]. Treat both as vendor-reported until you test on your schema and load.

## 3. Cover compile errors with a fallback plan

Claim: a safe system also handles plans that fail to build.

Example: read P3 [P3] PVLDB 16:3835, 2023, https://www.vldb.org/pvldb/vol16/p3835-pasupuleti.pdf, [snippet-verified], next to W4.

- P3 adds mitigation during compile with failover to other plans.
- W4 adds the policy line that only known or verified plans run.

Together they form a full guard: check at compile, check at run, keep a fallback ready. A junior loop can copy that shape. Test the SQL shape first. Test the runtime next. Keep the last good plan ID in the log.

Why it matters: most rewrite guides skip failure paths. Oracle papers do not. A loop without a fallback will strand users on a bad plan.

Number: P3 is PVLDB 16:3835, 2023. W4 is the 19c SPM brief [S12]. W2 Best Practices for Gathering Optimizer Statistics 19c, https://www.oracle.com/docs/tech/database/technical-brief-bp-for-stats-gather-19c.pdf [S08], sets stat policy that feeds those plan choices.

<details><summary>In case you don't know about SQL Plan Management, it's Oracle's control that keeps only accepted plans in use.</summary>SQL Plan Management has three parts: capture, selection, evolution. Capture stores plans in the SQL Management Base. Selection picks only from accepted baselines. Evolution verifies new plans before they join. You control it with `OPTIMIZER_CAPTURE_SQL_PLAN_BASELINES` and `OPTIMIZER_USE_SQL_PLAN_BASELINES` plus `DBMS_SPM` load and evolve calls. Unverified — run on your test DB. Platform owners use it to protect upgrades and stats jobs. It drives one decision: which set of plans is legal to run tonight. Do not rely on hints or profiles alone. Those fix one statement with no history or fallback, and the cost is silent drift on the next refresh. Sharp line: it makes plan change explicit, tested, and reversible across the fleet. Example: an upgrade adds ten candidate plans. SPM keeps serving accepted plans until each candidate proves faster. See [T-48] https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/overview-of-sql-plan-management.html</details>

<details><summary>In case you don't know about Auto STS, it's an automatic capture of real workload SQL that Oracle uses to drive plan checks.</summary>Auto STS is Oracle-managed capture of real production SQL. Auto SPM reads it, compares best against worst plan metrics, and gates evolve when the gap crosses a regression threshold. Real-Time SPM in 26ai then checks in the foreground during user runs. Setup is vendor-managed background capture plus evolve task config. Ops teams use it when manual capture misses peak shapes. It drives one decision: which statements deserve automatic verification now. Do not hand-build a tiny STS instead. Hand sets miss binds and skew, and the cost is a clean lab win that fails at noon peak. Sharp line: it feeds the verifier with the load users truly run. Example: checkout SQL runs 10,000 times at noon with skewed binds. Auto STS holds those binds, Auto SPM flags the regression, and the prior accepted plan returns. See [T-49] https://arxiv.org/html/2608.27758v1</details>

**Keep this: Accept no plan without a measured win, and keep the last good plan ready.**
