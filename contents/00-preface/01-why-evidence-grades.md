---
title: Why Evidence Grades Decide What You Trust
description: A1 to D grades, the proven bar, and what stays out.
order: 2
draft: false
---

"What is this? Some kinda report card? Kind of."

A grade tells you how much to trust a claim before you run it.

An evidence class is like a referee badge, except it names the source type, not the person.

<details><summary>In case you don't know about optimizer statistics, it's the numbers Oracle keeps about your tables.</summary>Row counts. Value spread. Fresh numbers lead to sound plans. Old numbers lead to poor guesses.</details>

<details><summary>In case you don't know about the Tuning Guide, it's Oracle's versioned manual for SQL speed.</summary>The 19c edition is E96095-19 from April 2025. This book treats it as a primary source.</details>

Here are the grades. A1 is Oracle versioned docs. Example: SQL Tuning Guide 19c, DBMS_XPLAN reference. A2 is Oracle briefs. Example: statistics gathering brief for 19c. B1 is peer-reviewed papers. Example: Automatic Indexing in VLDB 2025, Real-Time SPM in PVLDB 2026. B2 is a third-party repeat of a paper. C1 is a deterministic tool with readable output. Example: DBMS_XPLAN, DBMS_SQLPA, SQL Monitor, TKPROF. C2 is kept open source with a live repo. Example: HammerDB, python-oracledb. D is blogs and forums. Useful for context. Never proof alone.

The proven bar is simple. You need 2 separate sources. Or you need 1 strong source from A1, A2, or B1 plus a repeatable check with SQLcl or SQL*Plus. Failed that bar? It goes to candidate. Examples: learned optimizers Bao and AutoSteer. Proven on Postgres and other engines. Not proven on Oracle here. Same for LLM rewrites. Interesting. Out of scope until someone shows Oracle runs.

The catalog was built bottom-up from docs to papers to tools. No remembered list. 68 entries passed. The rest stayed out.

**Keep this: Trust A1 plus a rerun; treat D as a hint, never proof.**
