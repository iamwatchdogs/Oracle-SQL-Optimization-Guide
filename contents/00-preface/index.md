---
title: Preface - Trust Runs, Not Rumors
description: How this book grades evidence and proves every Oracle SQL win.
order: 1
draft: false
---

"What is this book? Some kinda list of fast queries? Kind of."

This book teaches only fixes you can prove on your own database.

An evidence grade is like a food label, except it tells you who tested the claim and how to re-test it.

<details><summary>In case you don't know about an execution plan, it's Oracle's chosen steps to run your query.</summary>You read it to see what Oracle did. You compare two plans to see what changed. No plan, no proof.</details>

<details><summary>In case you don't know about AWR, it's Oracle's built-in history of database activity.</summary>It takes snapshots on a schedule. You compare before and after windows to see what moved.</details>

The research behind this book was compiled 2026-09-22. It holds 68 proven entries in 8 groups. It cites 18 papers, 6 Oracle briefs, and 33 tools. No live Oracle DB was open during that pass. The `sqlcl` and `sqlplus` tools were not on PATH. So nothing here claims "we ran it here."

Proven here means one of two paths. Path 1: 2 separate sources agree. Path 2: 1 Oracle guide or peer-reviewed paper plus a repeatable check you can run. The oldest anchor is the 19c Tuning Guide E96095-19 from April 2025. The newest is the Real-Time SPM paper in PVLDB 19 from 2026.

Read in this order. First, evidence grades. Next, how to prove a win. Then the 5 technique chapters. Each ends with one rule to keep.

In this chapter:

- [Why Evidence Grades Decide What You Trust](/00-preface/01-why-evidence-grades/)
- [How to Prove a Win](/00-preface/02-how-to-prove-a-win/)

**Keep this: If you did not measure it twice, you did not fix it.**
