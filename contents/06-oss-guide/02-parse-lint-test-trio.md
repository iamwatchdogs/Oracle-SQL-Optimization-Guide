---
title: The Parse-Lint-Test Trio That Is Safe to Use
description: sqlglot for parse, SQLFluff for lint, utPLSQL for test, plus a Python harness.
order: 62
draft: false
---

A junior shipped a rewrite with clean lint and no unit test. Lint was happy. Rows dropped from 400 to 380. A 30-second unit test would have caught it. SPA would have caught the plan shift next. Two gates were skipped to save a minute. Debug took a day.

You know basic SQL and you trust a green check. Green from a linter means clean text. Green from prod means same rows and fast plan. This page shows three cheap gates that run before you touch the DB, plus the harness that calls the DB when you are ready.

Three gates at an airport are more like ticket plus bag plus ID, where each gate blocks a different risk.

## 1. Parse proves structure, never speed

Plain claim: sqlglot turns Oracle text into a tree you can diff and normalize.

Worked example: parse v1 and v2 of a join rewrite. First you run parse_one on v1 with Oracle dialect. You get a tree. You print it back to text. Syntax holds. Then you run parse_one on v2 and diff the two trees. You spot a dropped predicate in seconds. Output A: parse OK, 2 tables, 1 join key. Output B: parse OK, 2 tables, 0 join keys, full cross product flagged by eye on the diff. First pass you parse one file to learn the shape. Second pass you diff two files to catch the rewrite fault. You never claim speed from this step.

Why it matters: structure faults are cheap to find in text. In prod they read as timeouts. Parse moves the find earlier.

Sourced number: sqlglot MIT 9,628 stars push 2026-09-21 Active, Oracle among 30+ dialects, see S60. Apache Calcite Apache-2.0 5,186 stars push 2026-09-21 Active with OracleSqlDialect, see S62, for rule-based normalization in the T-34 to T-44 lane. sqlglot also parses hint text for T-45 but does not bless hint safety.

## 2. Lint blocks style faults in CI in seconds

Plain claim: SQLFluff with Oracle dialect stops bad patterns before review.

Worked example: gate a pull request with two files. First good.sql. SQLFluff with Oracle dialect returns exit 0, 0 violations. Pull request proceeds. Then bad.sql with mixed case keywords and a trailing comma fault. SQLFluff returns exit 1, 3 violations, lines flagged. CI blocks merge. First pass you lint one file locally to learn rule IDs. Second pass you gate the full pull request in CI for T-58. You still need EXPLAIN PLAN after. Lint never replaces the optimizer.

Why it matters: style faults create noise in diffs and hide logic faults. A seconds-fast gate keeps main clean. Review time drops.

Sourced number: SQLFluff MIT 9,883 stars push 2026-09-21 Active, Oracle dialect documented, see S61. Use as CI gate for T-58 methodology checks. Cost is seconds. Verdict stays with Oracle.

## 3. Test asserts meaning, harness connects the DB

Plain claim: utPLSQL asserts rows, python-oracledb runs the calls.

Worked example: test the same rewrite end to end. First utPLSQL. Apache-2.0, 624 stars, push 2026-09-18, Active, needs 19c or newer, see S63. You write a package with one test: expect 400 rows, expect sum 1,204,500. Run. Output: FAIL, got 380 rows. Stop. No SPA run needed yet. Fix the predicate, rerun. Output: PASS. Then python-oracledb. UPL-1.0 OR Apache-2.0, 452 stars, push 2026-09-19, Active, see S64. You connect, run before and after timing, and script DBMS_SQLPA calls for T-56. First pass you assert meaning inside Oracle. Second pass you script measurement around Oracle. VeriEQL 27 stars no license declared push 2026-03-26, see S50, and SQLSolver Apache-2.0 70 stars push 2025-11-22, see S49, stay candidates only with unverified Oracle cover.

Why it matters: a green lint plus a red unit test still means stop. Meaning beats style. Measurement beats both.

Sourced number: utPLSQL Apache-2.0 624 push 2026-09-18 Active needs 19c or newer. python-oracledb UPL-1.0 OR Apache-2.0 452 push 2026-09-19 Active. VeriEQL 27 Low no license. SQLSolver Apache-2.0 70 Low.

<details><summary>In case you don't know about AST parsing, it's turning SQL text into a tree the machine can walk.</summary>AST parsing turns SQL text into a tree. Each clause becomes a node, and columns, tables, and filters become walkable objects. Install with `pip3 install sqlglot` per the README. Run `parse_one("SELECT a FROM t", read="oracle")` then inspect nodes. Devs use it before rewrites: compare v1 and v2 trees to spot a lost join key. It drives one decision: structure held or rewrite broke scope. Regex cannot track nesting and misses scope, costing a cross product. Tree walk costs seconds. Sharp line: AST parsing proves structure, never speed. Example: diff two trees where output A shows 2 tables with 1 join key and output B shows 2 tables with 0 keys, flagging the fault. Unverified — check the repo docs for dialect edge cases. See https://github.com/tobymao/sqlglot MIT 9628 stars push 2026-09-21 Active [S60].</details>

<details><summary>In case you don't know about utPLSQL, it's a unit-test framework that lives inside Oracle DB.</summary>utPLSQL is a unit-test framework inside Oracle DB. Tests are PL/SQL packages that assert expected versus actual rows. It needs Oracle 19c or newer per the README. Install from source with `sqlplus` as SYSDBA per docs, or headless with `install_headless.sql`. Run tests with `ut.run` and serveroutput on. Teams use it after lint, before SPA. It drives one decision: stop the rewrite or book SPA time. Lint alone passes while rows drop from 400 to 380, and that gap costs a day of debug. A test costs 30 seconds. Sharp line: utPLSQL locks meaning, lint only checks shape. Example: expect 400 rows and a fixed sum, get FAIL at 380, fix the predicate, get PASS. CLI is `utPLSQL-cli` for CI. Unverified — check the repo docs for hook paths. See https://github.com/utplsql/utplsql Apache-2.0, 624 stars, push 2026-09-18 [S63].</details>

**Keep this: Parse the text, lint the style, test the meaning — then measure in Oracle.**
