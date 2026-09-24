---
title: The Parse-Lint-Test Trio That Is Safe to Use
description: sqlglot for parse, SQLFluff for lint, utPLSQL for test, plus a Python harness.
order: 62
draft: false
---

Run three cheap gates before you touch the DB. Parse, lint, test.

"'why did my lint pass but prod still break?'"

Short answer: lint checks text. Prod checks meaning plus data plus load. You need all three gates.

Think of the trio like three gates at an airport: ticket, bag, ID.

<details><summary>In case you don't know about AST parsing, it's turning SQL text into a tree the machine can walk.</summary>sqlglot builds that tree for Oracle dialect SQL. You can then rewrite, compare, and print it back to text.</details>

<details><summary>In case you don't know about utPLSQL, it's a unit-test framework that lives inside Oracle DB.</summary>Tests are PL/SQL packages. They assert expected versus actual. They need 19c or newer per the README.</details>

Gate 1 means parse with sqlglot. MIT, 9,628 stars, push 2026-09-21, Active. It reads Oracle dialect SQL into a tree. Use it to normalize text, diff two rewrites, and build candidates for T-34 to T-44. It also parses hint text for T-45. It does not prove speed. It proves structure.

Gate 2 means lint with SQLFluff. MIT, 9,883 stars, push 2026-09-21, Active. Docs list an Oracle dialect. Use it as a CI gate for T-58. It blocks bad patterns early. It costs seconds. It never replaces EXPLAIN PLAN.

Gate 3 means test with utPLSQL. Apache-2.0, 624 stars, push 2026-09-18, Active. README requires Oracle Database 19c or newer. Use it for T-60 result checks. Assert row counts and values before and after a rewrite. A green lint plus a red unit test still means stop.

Harness means python-oracledb. UPL-1.0 OR Apache-2.0, 452 stars, push 2026-09-19, Active. GitHub shows NOASSERTION because the license is dual, so read LICENSE.txt. Use it to connect, run, time, and script calls to built-ins such as SPA tasks. It does the plumbing. Oracle does the verdict.

What about proof of sameness? VeriEQL: 27 stars, no license declared, push 2026-03-26. SQLSolver: Apache-2.0, 70 stars, push 2025-11-22. Both are candidates only. Oracle coverage is unverified. Do not present them as gates.

A junior once shipped a rewrite with clean lint and no unit test. Lint was happy. Rows dropped from 400 to 380. The unit test would have caught it in 30 seconds. SPA would have caught the plan shift next.

**Keep this: Parse the text, lint the style, test the meaning — then measure in Oracle.**
