---
title: Oracle's Own Papers
description: What 3 Oracle engineer papers prove about plans and indexes.
order: 22
draft: false
---

Oracle’s own papers answer a narrower question than “Will this make my query fast?” They show what Oracle has built, documented, and chosen to automate. P1 is [read firsthand]. P2 and P3 are [snippet-verified]. This research pass executed no Oracle workload, so these papers are Oracle-authored/specific evidence, not an Oracle benchmark produced here.

## 1. Verify a plan before trusting it

P1, Real-time SQL Plan Management in Oracle, is PVLDB 19(12):4169–4181, 2026, DOI 10.14778/3827998.3828024, https://arxiv.org/html/2608.27758v1, [read firsthand]. Its timeline is a design history, not one feature with one release label:

- **11g:** manual plan capture.
- **12c:** Auto SPM Evolve Advisor moves plan checks into the background.
- **19c:** Auto SPM uses Auto STS and a regression threshold on plan metrics. This is Auto SPM in 19c.
- **26ai:** Real-Time SPM evaluates a candidate during the regressing user execution. If it regresses, the candidate is rejected at the end of that execution and a prior known plan is used for subsequent executions. The statement already running is not rewritten retroactively. This is Real-Time SPM in 26ai, not a relabeling of 19c Auto SPM.

Auto STS supplies the captured workload SQL to automatic plan-management checks. The release boundary stays explicit: 19c Auto SPM and 26ai Real-Time SPM are not the same feature.

The paper reports deployment in Oracle production and argues that background verification can be too slow for cloud systems with constrained resources. Those are paper findings. They are not measurements from this project.

The transferable rule is narrow: propose a plan, measure it, and keep the prior accepted plan available when the candidate loses. W4 states the vendor policy in plain words: only known or verified plans are used, and a new plan is not used until it is verified to perform better. Source: [S12](https://www.oracle.com/technetwork/database/bi-datawarehousing/twp-sql-plan-mgmt-19c-5324207.pdf).

Number: PVLDB 19(12):4169–4181. The page range identifies a full systems paper; it does not turn a paper citation into a local Oracle test.

## 2. Let automatic indexes prove their value

P2, Automatic Indexing, is PVLDB 18(12):4924, 2025, DOI 10.14778/3750601.3750616, [snippet-verified]. The paper describes an automatic index lifecycle: create a candidate, validate it, deploy a winner, and remove an index that does not earn its place. The feature is documented as available since 19c and in Autonomous Database, and the paper covers expression indexes.

The lifecycle matters because an index is not free. It can improve reads and tax writes. A feature that only creates indexes stops before the interesting part. The interesting part is deciding which ones survive the measured workload.

The abstract reports about 15% performance improvement and up to 60% space-reclamation potential on customer workloads. Those are snippet-verified, abstract-level, vendor-reported figures. Treat them as a reason to test, not as a result to paste into your own performance claim.

## 3. Cover compile-time failure

P3, Automatic SQL Error Mitigation in Oracle, is PVLDB 16:3835, 2023, https://www.vldb.org/pvldb/vol16/p3835-pasupuleti.pdf, [snippet-verified]. It describes mitigation during query compilation, including failover to alternative plans.

That is a different boundary from plan performance. A query can compile into a plan that runs badly, or it can fail while a plan is being selected. A safe change loop needs both a measured acceptance gate and a documented fallback. W4 supplies the known-or-verified plan policy; W2 supplies the 19c statistics policy that feeds plan choices. W2, Best Practices for Gathering Optimizer Statistics with Oracle Database 19c, is [S08](https://www.oracle.com/docs/tech/database/technical-brief-bp-for-stats-gather-19c.pdf).

The evidence supports a design shape. It does not prove the shape will behave the same way on your schema, data distribution, release, or workload.

## The brief shelf is selective

The bibliography catalogues six Oracle technical briefs, W1–W6. W1, Optimizer with Oracle Database 18c, and W3, Understanding Optimizer Statistics with Oracle Database 19c, are catalogued, but this page does not discuss all six briefs. It uses W2 for current statistics policy, W4 for SQL Plan Management, W5 as historical SPA context, and W6 as the superseded 2012 statistics baseline. A catalog entry is not a claim that every brief was read or reproduced in this chapter.

<details><summary>What is SQL Plan Management?</summary>SQL Plan Management is a control for plan baselines. Capture stores plans, selection uses accepted baselines, and evolution verifies a candidate before it joins the accepted set. W4 states the verify-before-commit policy: only known or verified plans are used. The 19c overview is [T-48](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/overview-of-sql-plan-management.html).</details>

**Keep this: verify before acceptance, reject a regressing candidate at the execution boundary, and keep the last known plan ready.**
