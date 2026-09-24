---
title: Toolbox
description: Deterministic tools that prove what changed and what is safe.
order: 30
draft: false
---

Picture a junior with 4 screens open, each showing a different plan for the same query.

Deterministic tools give the same class of proof for the same inputs, so use them before you trust any guess.

A toolbox is like a test bench, except each tool checks one claim and writes down its proof.

<details><summary>In case you don't know about deterministic, it's output you can repeat with machine-readable proof when inputs and DB state match.</summary>Our set lists only tools with docs checked on 2026-09-22.</details>

This chapter has 4 topics. First you measure with plan and monitor output. Then you freeze work with tuning sets. Then you load-test without prod. Then you run static checks before you spend DB time.

You will meet DBMS_XPLAN, DBMS_SQLPA, HammerDB, SQLFluff, and 10 more. Each has a clear job.

In this chapter:

- [Measure With XPLAN and Monitor](/03-toolbox/01-measure-with-xplan-and-monitor/)
- [Freeze Work With STS](/03-toolbox/02-freeze-work-with-sts/)
- [Load Test Without Prod](/03-toolbox/03-load-test-without-prod/)
- [Static Checks Before DB Time](/03-toolbox/04-static-checks-before-db-time/)

**Keep this: Match each claim to one tool that can prove or reject it.**
