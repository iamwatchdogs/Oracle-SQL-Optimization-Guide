---
title: What Doesn't Transfer to Oracle
description: Why non-Oracle results stay candidates until Oracle tests them.
order: 23
draft: false
---

"If it worked on Postgres, will it work on Oracle?"

A win on PostgreSQL, MySQL, Spark, or Calcite stays a candidate for Oracle until someone tests it on Oracle.

A tuning trick is like a power plug, except the socket shape changes with each database.

<details><summary>In case you don't know about optimizer knobs, it's settings and hints that steer which plan the database picks.</summary>AutoSteer and Bao work by tuning those controls from outside the core engine.</details>

<details><summary>In case you don't know about bounded verification, it's a proof that 2 queries match for inputs up to a set size.</summary>VeriEQL uses SMT solvers to build that proof or show a counterexample.</details>

AutoSteer was tested on PostgreSQL, Presto, Spark, MySQL, and DuckDB. Bao is a PostgreSQL prototype with per-query hints, tree models, and Thompson sampling. OtterTune was tested on PostgreSQL and MySQL. Its repo is archived and read-only since 2020-11-13 with 1,233 stars. All 3 give design ideas. Unverified — I haven't run this mapping on Oracle, so use them for ideas only.

Rewrite proof has the same gap. SQLSolver proved 346 of 359 pairs from Calcite and Spark SQL rules. WeTune found and checked rules on queries from the 20 most popular open-source projects, with a SIGMOD 2022 repro report. VeriEQL targets complex SQL with integrity constraints to check optimizations. QED offers another prover path. QueryBooster adds a middleware rewrite service with human review. None list Oracle dialect support in our pass.

Calcite helps a bit. It ships an Oracle SQL dialect in code. That helps parse and normalize text before you test on a real Oracle DB.

**Keep this: Mark every non-Oracle result as candidate until Oracle runs show a win.**
