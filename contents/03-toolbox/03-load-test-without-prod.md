---
title: Load Test Without Prod
description: Prove a change holds under parallel work before prod sees it.
order: 33
draft: false
---

Picture a fix that wins solo at midnight and locks 30 sessions at 10 a.m.

A concurrency run with a realistic mix plus guardrail checks proves a change is safe to keep.

Load testing is like a fire drill, except you run fake users against a copy so real users never feel the fault.

<details><summary>In case you don't know about HammerDB, it's a free load runner with TPROC-C and TPROC-H style work for Oracle and other systems.</summary>It runs from hammerdbcli with Tcl scripts for repeatable capacity tests.</details>

<details><summary>In case you don't know about SQL Quarantine, it's Oracle's block that stops a known-bad plan from running again.</summary>Resource Manager plus quarantine views show terminations and blocks as proof.</details>

Pick one loader. HammerDB is GPL-3.0, has 786 stars, last push 2026-09-18, and is hosted by the TPC Council. Swingbench is Oracle-focused with Order Entry and Call-Circle style mixes, charbench, oewizard data gen, plus a Docker image. It has 80 stars, last push 2026-05-26, and no license declared in the repo. Check rights before you ship it in CI.

Set guardrails first. DBMS_RESOURCE_MANAGER caps runaway work. Quarantine blocks repeat offenders. DBMS_SQLDIAG packages the failing case with DDL, stats, plan, and data samples through SQL Test Case Builder for an isolated DB. That bundle lets you repro without prod data.

Close the loop on revert. Restore stats, drop the patch or profile or baseline, then check plan hash returns.

**Keep this: Pass a parallel run with zero quarantine hits before you call it safe.**
