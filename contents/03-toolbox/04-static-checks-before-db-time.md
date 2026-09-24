---
title: Static Checks Before DB Time
description: Parse, lint, and regression-test SQL before you spend DB time.
order: 34
draft: false
---

"Can I catch bad SQL before I even connect to Oracle?"

Yes. Parse and lint plus stored result tests catch shape faults before you burn test hours.

You can run SELECT. You have pushed a rewrite that looked right and returned wrong rows. This page gates that rewrite before DB time.

Static checks are like spell-check, except they check SQL shape and stored results before the database runs the full job.

<details><summary>In case you don't know about sqlglot, it's a Python parser that reads 30-plus dialects including Oracle for rewrites and diffs.</summary>It exposes parse_one, transpile, and optimizer calls plus a CLI. MIT, 9,628 stars, last push 2026-09-21. Repo: https://github.com/tobymao/sqlglot</details>

## 1. Parse before you run

Plain claim: if the parser cannot read it the same way twice, the DB will not run it the way you think.

Worked example A — parse and transpile gate. Feed both old and new SQL through sqlglot with the Oracle dialect:

```python
import sqlglot
old = sqlglot.parse_one("SELECT a FROM t WHERE x = 1", read="oracle")
new = sqlglot.parse_one("SELECT a FROM t WHERE x = 1 AND y = 2", read="oracle")
print(old.sql(dialect="oracle"))
print(sqlglot.transpile("SELECT a FROM t", read="oracle", write="oracle")[0])
```

API names parse_one, transpile, optimizer are from sqlglot docs. Your SQL text will differ. Unverified — test on your schema for dialect edge cases.

How to read it: same parse tree shape means same structure. Diff in tree means the rewrite changed joins, filters, or scope. Transpile output shows how Oracle reads types and quotes. A parse error here is a free catch — no DB minutes spent.

Worked example B — Calcite normalize check. Apache Calcite (Apache-2.0, 5,186 stars, last push 2026-09-21, https://calcite.apache.org/) ships OracleSqlDialect plus rules plus planner. Use it to normalize and validate a candidate rewrite before execution. If Calcite normalizes both forms to the same rel tree, structure likely held. If trees split, read the rule that fired. Java API only. Unverified — test on your schema for rule coverage.

Decision it drives: parse fail means fix text now. Tree split means prove row meaning with tests before you proceed.

## 2. Lint the shape

Plain claim: most bad rewrites share a shape. A linter names that shape in seconds.

Worked example C — SQLFluff Oracle gate. SQLFluff (MIT, 9,883 stars, last push 2026-09-21, Oracle in dialects list, https://docs.sqlfluff.com/) runs from CLI plus Python API plus pre-commit and CI:

```bash
sqlfluff lint --dialect oracle queries/sales_report.sql
sqlfluff fix --dialect oracle queries/sales_report.sql
```

How to read it: lint lists rule code, line, and short reason — missing alias, SELECT *, implicit cross join, style drift. Fix applies safe rewrites. A clean lint run means shape faults are out. A rule hit means fix the file, not the DB.

Worked example D — pre-commit block demo. Add SQLFluff to pre-commit with dialect oracle. Push a file with `SELECT *` plus an old-style comma join. The hook fails in 5 seconds with the rule ID. You fix aliases and ANSI join, push again, hook passes. No Oracle connection used. Config file paths vary by repo layout. Unverified — test on your schema for your hook path.

One aside: paying for DB time to find a comma hurts. Back to the gate.

Decision it drives: lint red means do not book DB time. Lint green means spend DB time on meaning and speed, not on typos.

## 3. Lock meaning with stored tests

Plain claim: fast wrong rows are still wrong. Stored result tests lock meaning.

Worked example E — utPLSQL regression gate. utPLSQL (Apache-2.0, 624 stars, last push 2026-09-18, needs Oracle 19c or newer, https://github.com/utplsql/utplsql) runs from PL/SQL API plus CLI utPLSQL-cli plus CI per docs. Store one test per rewrite: run old SQL on a frozen sample, save row count plus checksum, run new SQL, compare. Pass means same rows on that sample. Fail means the rewrite changed filters or joins.

How to read it: test output gives pass or fail per case plus failing assertion. Read the assertion, not just the count. A count match with a checksum miss means same size, new values — still a fail.

Worked example F — scripted run with python-oracledb. python-oracledb (dual UPL-1.0 OR Apache-2.0, 452 stars, last push 2026-09-19, https://github.com/oracle/python-oracledb) gives DB-API 2.0 with thin mode and no client libs. Use it to run the old and new SQL with the same binds, fetch rows, and diff in Python. Formal provers VeriEQL, SQLSolver, WeTune stay candidates here — none show Oracle support in our pass, so they do not gate Oracle rewrites today.

Decision it drives: stored-test fail means stop the rewrite. Stored-test pass plus lint pass means book SPA and load time with confidence.

<details><summary>In case you don't know about utPLSQL, it's a unit-test framework that lives inside Oracle DB.</summary>Tests are PL/SQL packages. They assert expected versus actual. They need 19c or newer per the README. Run them before any SPA task.</details>

**Keep this: Ship no rewrite without a lint pass plus a stored result test.**
