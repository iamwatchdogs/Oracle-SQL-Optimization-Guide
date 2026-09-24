---
title: OSS Guide - What Open Source Can and Can't Do for Oracle SQL
description: Which OSS tools help Oracle SQL work, and where built-ins still rule.
order: 60
draft: false
---

A junior on a billing team saw a slow report query last quarter. He pip-installed the highest-star SQL package he found. He reformatted the query to please the linter. Prod still timed out after 40 seconds. Stars had told him nothing about Oracle fit. The license file would have. The push date would have. The dialect list would have.

You start from the same baseline. You know SELECT, JOIN, WHERE, GROUP BY. You trust stars because stars feel safe. You pip-install and move on. This chapter breaks that habit and replaces it with a 2-minute check you can run every time.

OSS here is more like a metal detector on a beach that beeps on shape but never digs.

## 1. No repo fixes a slow query, it only preps the text

Plain claim: the fix lives inside Oracle, OSS only cleans text before it gets there.

Worked example: take three repos and vet them in 2 minutes. First sqlglot. MIT, 9,628 stars, push 2026-09-21, Active. Oracle listed among 30+ dialects, see S60. Second SQLFluff. MIT, 9,883 stars, push 2026-09-21, Active. Docs list an Oracle dialect, see S61. Third OtterTune. 1,233 stars, push 2020-11-13, Archived read-only, no license declared, see S54. First pass you read stars. Second pass you read license plus push plus archived flag. OtterTune fails the second pass even with high stars.

Why it matters: you stop installing dead code. You stop citing archived design notes as runnable tools. You save the lost afternoon.

Sourced number: sqlglot MIT 9,628 push 2026-09-21 Active. SQLFluff MIT 9,883 push 2026-09-21 Active. OtterTune 1,233 Archived 2020-11-13. Rules used: Active means push within 6 months, Low activity means within 24 months, Dormant means over 24 months, Archived means read-only. All facts checked 2026-09-22 via GitHub API.

## 2. Three gates are safe, each gate does one job

Plain claim: parse, lint, test. Parse reads structure. Lint flags style. Test asserts meaning.

Worked example: run the trio on one bad rewrite. First sqlglot parses Oracle text into a tree and prints it back. You diff v1 and v2 and catch a dropped filter in seconds. Then SQLFluff lints the same file with the Oracle dialect and blocks the pull request on style. Then utPLSQL runs inside the DB and asserts row counts. First pass you check text without a DB. Second pass you check meaning with a DB. Lint can pass while the unit test fails. That split is the point.

Why it matters: text checks cost seconds. Meaning checks catch lost rows. You need both before you measure plans.

Sourced number: sqlglot MIT 9,628 push 2026-09-21 Active. SQLFluff MIT 9,883 push 2026-09-21 Active Oracle dialect. utPLSQL Apache-2.0 624 stars push 2026-09-18 Active, README needs 19c or newer, see S63. Apache Calcite Apache-2.0 5,186 stars push 2026-09-21 Active with OracleSqlDialect, see S62, for rule-based rewrites.

## 3. Most proven fixes have no OSS swap

Plain claim: for SPM, stats, and SPA, the annex says None found. Use built-ins.

Worked example: map three controls. First SPM baselines T-48. No verified OSS implements it. You script around DBMS_SPM, you do not replace it. Then stats T-09 to T-23. No OSS gathers optimizer stats safely. You use DBMS_STATS. Then SPA T-56. No OSS repeats compare-performance logic. You call DBMS_SQLPA and you can orchestrate calls with python-oracledb UPL-1.0 OR Apache-2.0 452 stars push 2026-09-19 Active, see S64. First pass you accept None found as a verdict. Second pass you build a thin script around Oracle instead of a swap.

Why it matters: swaps miss bind effects and load effects. Built-ins see them. HammerDB GPL-3.0 786 stars push 2026-09-18 Active, see S65, plus Swingbench 80 stars push 2026-05-26 Active license null, see S66, add load. SQLdb360 123 stars Low activity and SQLd360 65 stars Dormant only bundle output offline.

Sourced number: HammerDB GPL-3.0 786 push 2026-09-18 Active. Swingbench 80 push 2026-05-26 Active license null. SQLdb360 123 Low, SQLd360 65 Dormant, both no license declared, see S67.

<details><summary>In case you don't know about SPDX license IDs, it's the short code GitHub reports for a repo license.</summary>SPDX IDs are short license codes from the GitHub API. MIT means permissive reuse. Apache-2.0 means permissive reuse with patent grant. GPL-3.0 means share-alike. Setup is a two-step check: read `license.spdx_id` from the API, then open LICENSE.txt in the repo. DBAs use it before any install, vetting in two minutes with license first, push second, Oracle fit third, stars last. It drives one decision: install or reject. Stars hide risk, and that risk costs a blocked ship. Sharp line: SPDX decides legal use, stars never do. Example: sqlglot MIT 9628, Calcite Apache-2.0 5186, HammerDB GPL-3.0 786, all Active on push dates 2026-09-21 or 2026-09-18. See file 07 for full rows, verified 2026-09-22.</details>

<details><summary>In case you don't know about Oracle dialect support, it's the explicit promise that a tool reads Oracle SQL text.</summary>Oracle dialect support is the explicit promise a tool reads Oracle SQL. sqlglot lists Oracle among 30+ dialects. SQLFluff lists `oracle` in its dialect reference. Calcite ships `OracleSqlDialect`. Set it every run: `parse_one(sql, read="oracle")` for sqlglot, `sqlfluff lint --dialect oracle file.sql` for SQLFluff. Teams use it at the start of every parse or lint gate. It drives one decision: trust the parse or reject the tool. Generic SQL misreads hints and date math, and that misread costs a wrong rewrite. Sharp line: no Oracle line in docs means no Oracle use. Example: `sqlfluff dialects` must show oracle before you lint with `--dialect oracle`. Unverified — check the repo docs for config paths. See [S60][S61][S62].</details>

In this chapter:

- [How to Vet Any OSS Repo in 2 Minutes](/06-oss-guide/01-how-to-vet-oss/)
- [The Parse-Lint-Test Trio That Is Safe to Use](/06-oss-guide/02-parse-lint-test-trio/)
- [What Has No OSS Replacement](/06-oss-guide/03-what-has-no-oss-replacement/)

**Keep this: No license, no push, no Oracle dialect, no use.**
