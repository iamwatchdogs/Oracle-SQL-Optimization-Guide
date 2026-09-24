---
title: OSS Guide - What Open Source Can and Can't Do for Oracle SQL
description: Which OSS tools help Oracle SQL work, and where built-ins still rule.
order: 60
draft: false
---

Open source is the prep crew. It can parse, lint, test, collect, and generate load. It does not decide whether an Oracle workload is safe, eligible, or better after the change. Keep that boundary sharp.

## The matrix has a date and a scope

The OSS matrix is a **scoped pass dated 2026-09-22 UTC**. Its GitHub API facts—stars, last push, license metadata, and `archived`—are snapshots from that date. They are not live guarantees and do not describe what a repository will do tomorrow.

`None found` means no actively maintained OSS implementation of that exact intervention was verified in this pass. It does not mean that no code, paper, private tool, or future project exists. It is a bounded search result, not a universal claim.

## The useful OSS lanes

| Lane                | Tool                                                                                                                            | What it can do                                                           | What it cannot prove                                                               |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------ | ---------------------------------------------------------------------------------- |
| Parse and normalize | [sqlglot](https://github.com/tobymao/sqlglot) [S60]                                                                             | Read Oracle SQL, expose an AST, and diff or generate rewrite candidates. | It does not prove the rewrite is equivalent or faster in your database.            |
| Lint                | [SQLFluff](https://github.com/sqlfluff/sqlfluff) [S61]                                                                          | Apply documented Oracle-dialect rules in CI.                             | A clean lint is not a correct result or a good plan.                               |
| Behavior tests      | [utPLSQL](https://github.com/utplsql/utplsql) [S63]                                                                             | Assert rows, aggregates, and errors inside an Oracle test database.      | A passing test does not establish performance under production load.               |
| Measurement harness | [python-oracledb](https://github.com/oracle/python-oracledb) [S64]                                                              | Connect, execute, collect metrics, and orchestrate Oracle calls.         | The driver is not an optimizer, advisor, or before/after judge.                    |
| Load                | [HammerDB](https://github.com/TPC-Council/HammerDB) [S65] and [Swingbench](https://github.com/domgiles/swingbench-public) [S66] | Exercise representative concurrency and resource pressure.               | A run has no guaranteed duration and cannot diagnose every regression by itself.   |
| Evidence bundles    | [SQLdb360](https://github.com/sqldb360/sqldb360) and [SQLd360](https://github.com/mauropagano/sqld360) [S67]                    | Package diagnostic output for later review.                              | A bundle is not proof by itself; cross-check it with `DBMS_XPLAN` and SQL Monitor. |
| Candidate rewrites  | [Apache Calcite](https://calcite.apache.org) [S62]                                                                              | Apply dialect-aware rules and generate candidates.                       | `OracleSqlDialect` is not an Oracle runtime or a correctness proof.                |

The useful workflow is deliberately boring: use OSS to make a candidate cheaper to inspect, then use Oracle to decide whether the candidate is valid, legal, and faster.

## Three checks before a rewrite touches the database

1. **Parse.** Use an Oracle-aware parser to compare the before and after text. A dropped predicate is a text failure before it becomes a timeout.
2. **Lint.** Run the repository's documented rules. This removes mechanical noise; it does not settle semantics.
3. **Test.** Run a behavior fixture against a disposable database or schema. Check rows, aggregates, duplicate behavior, and error cases.

Then measure with `DBMS_XPLAN`, SQL Performance Analyzer, and a representative workload. `python-oracledb` can script that measurement. It cannot replace the Oracle package doing the measurement. [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html) [S64](https://github.com/oracle/python-oracledb)

## The swap you should not make

For statistics, SQL Plan Management, SQL Tuning Advisor, SQL Performance Analyzer, and the core guardrails, the maintained implementation is Oracle's. A thin Python script can schedule, call, collect, and report those APIs. That is orchestration, not a replacement.

For example, use `python-oracledb` to call a release-supported `DBMS_SQLPA` workflow and save the report. The comparison logic still belongs to Oracle. Use `sqlglot` to generate a candidate rewrite. The result still needs an Oracle plan, a semantic test, and a before/after comparison. Parsing text is not plan control.

Load tools occupy a narrower lane. HammerDB and Swingbench can expose contention or resource pressure that a single-session test misses. Oracle's parallel-execution guidance specifically warns about overutilized systems and limited I/O, so a concurrency-realistic run is part of the evidence. [S77](https://docs.oracle.com/en/database/oracle/oracle-database/19/vldbg/parallel-exec-intro.html) No tool promises a fixed detection window. The run takes as long as the workload and environment require.

## Archived code is a source, not a shortcut

OtterTune is a good example of why stars are the wrong first filter. The repository snapshot recorded 1,233 stars, a last push on **2020-11-13**, and an **archived/read-only** state. The research pass did not establish an install history, and this page does not invent one. Treat OtterTune as design evidence for a tuning loop, not as runnable Oracle tooling. [S54](https://github.com/cmu-db/ottertune)

SQLd360 and SQLdb360 make the same maintenance point from the other direction. The dated snapshot marked SQLd360 dormant after a 2018-01-14 push and SQLdb360 low activity after a 2024-12-03 push. Both returned `NOASSERTION` for license metadata. Prefer the newer collector only after checking its current license and release fit; neither is an Oracle built-in. [S67](https://github.com/sqldb360/sqldb360) [S75](https://dincosman.com/2025/02/23/oracle-database-health/)

## What this pass did not close

The search did not triage the `oracle-samples/db-sample-schemas` HR/OE/SH schemas or the `opentelemetry-instrumentation-oracledb` instrumentation. It did not compare migration CI coverage for Liquibase and Flyway on Oracle. It also left SLER [S68] and the survey [S69], QueryBooster [S80], and QED [S51] outside the maintained OSS proof set: papers exist, but code, license, or Oracle coverage was not verified.

That list is a boundary, not a claim that the projects are unusable. It is a reminder not to turn “not checked” into “does not exist.”

## Source boundaries worth keeping

- **S76** is the 19c Administrator's Guide material on index compression. It supports the T-67 discussion and its compatibility restrictions; it is not a promise that compression improves every query. [S76](https://docs.oracle.com/en/database/oracle/oracle-database/19/admin/managing-indexes.html)
- **S77** is the 19c VLDB and Partitioning Guide material on parallel execution. It supports the load-and-resource gate for T-68, not a universal performance claim. [S77](https://docs.oracle.com/en/database/oracle/oracle-database/19/vldbg/parallel-exec-intro.html)
- **S78** is the official Lifetime Support Policy PDF. The file was located, but its text was not extracted in this pass, so no support date is asserted. [S78](https://www.oracle.com/assets/lifetime-support-technology-069183.pdf)
- **S79** is the 19c SQL*Plus User's Guide. Cite it only when SQL*Plus is part of the client assumption; it is not a universal client guarantee. [S79](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqpug/)
- **S80** is QueryBooster paper evidence. Oracle support was not verified, so it remains a candidate. [S80](https://doi.org/10.14778/3611479.3611497)

In this chapter:

- [How to Vet Any OSS Repo in 2 Minutes](/06-oss-guide/01-how-to-vet-oss/)
- [The Parse-Lint-Test Trio That Is Safe to Use](/06-oss-guide/02-parse-lint-test-trio/)
- [What Has No OSS Replacement](/06-oss-guide/03-what-has-no-oss-replacement/)

**The rule: use OSS to prepare, inspect, test, and load. Let Oracle decide the plan.**
