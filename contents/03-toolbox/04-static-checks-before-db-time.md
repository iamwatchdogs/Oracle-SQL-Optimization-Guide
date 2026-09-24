---
title: Static Checks Before DB Time
description: Parse, lint, and regression-test SQL before you spend DB time.
order: 34
draft: false
---

"Can I catch bad SQL before I even connect to Oracle?"

Parse and lint plus stored result tests catch mechanical faults before you burn test hours.

Static checks are like spell-check, except they check SQL shape and stored results before the database runs the full job.

<details><summary>In case you don't know about sqlglot, it's a Python parser that reads 30-plus dialects including Oracle for rewrites and diffs.</summary>It exposes parse_one, transpile, and optimizer calls plus a CLI.</details>

<details><summary>In case you don't know about utPLSQL, it's a test framework for SQL and PL/SQL that guards result meaning.</summary>It runs from PL/SQL APIs plus CLI and CI, and needs Oracle 19c or newer.</details>

Run 3 static gates. sqlglot is MIT, 9,628 stars, last push 2026-09-21. SQLFluff is MIT, 9,883 stars, last push 2026-09-21, with Oracle in its dialect list, plus CLI, Python API, and pre-commit support. Calcite is Apache-2.0, 5,186 stars, last push 2026-09-21, with OracleSqlDialect, rules, and planner for normalize and validate steps.

Then lock meaning with tests. utPLSQL is Apache-2.0, 624 stars, last push 2026-09-18. python-oracledb is dual UPL-1.0 OR Apache-2.0, 452 stars, last push 2026-09-19, with thin mode and no client libs for scripted runs. Formal provers such as VeriEQL, SQLSolver, and WeTune stay candidates here. None show Oracle support in our pass.

**Keep this: Ship no rewrite without a lint pass plus a stored result test.**
