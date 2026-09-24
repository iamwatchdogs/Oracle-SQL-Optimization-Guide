---
title: Oracle's Own Papers
description: What 3 Oracle engineer papers prove about plans and indexes.
order: 22
draft: false
---

Picture an Oracle engineer watching a new plan fail during a live user run.

Oracle's own papers say test a new plan before you trust it, then bring back the last good plan the moment it loses.

A new plan is like a replacement brake pad, except you test it while the car is moving.

<details><summary>In case you don't know about SQL Plan Management, it's Oracle's control that keeps only accepted plans in use.</summary>New plans stay idle until proof shows they win. Old accepted plans stay ready for instant return.</details>

<details><summary>In case you don't know about Auto STS, it's an automatic capture of real workload SQL that Oracle uses to drive plan checks.</summary>19c Auto SPM uses it with a regression threshold on plan metrics.</details>

P1 makes the rule clear. The PVLDB 2026 paper traces 11g manual capture to 12c Auto SPM Evolve Advisor in the background to 19c Auto SPM with Auto STS to 26ai Real-Time SPM. The 26ai step verifies in the foreground during user execution. On regression it reinstates a prior accepted plan at once. The paper says background checks ran too slow for cloud systems with tight resources. It reports production deployment.

P2 covers automatic indexing since 19c and in Autonomous Database. It creates, validates, deploys, and removes indexes, including expression indexes. The abstract reports about 15% speed gain and up to 60% space-reclamation potential. Our source marks those figures snippet-verified, so treat them as vendor-reported until you test.

P3 covers automatic error mitigation during compile, with failover to other plans. W4 states the vendor rule in plain words. Only known or verified plans run.

**Keep this: Accept no plan without a measured win, and keep the last good plan ready.**
