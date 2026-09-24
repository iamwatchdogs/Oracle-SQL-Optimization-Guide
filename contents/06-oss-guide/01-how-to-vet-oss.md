---
title: How to Vet Any OSS Repo in 2 Minutes
description: License, push date, archived flag, and Oracle fit before you trust a tool.
order: 61
draft: false
---

A repository becomes a candidate only after four checks pass: **license, maintenance, Oracle fit, and role**. Stars are a popularity signal, not a dependency decision.

This is a two-minute review target, not a measured guarantee. The expensive part is not reading a README. It is discovering after installation that the project has no usable license, no current release behavior, or no Oracle path.

## The snapshot rule

The matrix records GitHub API data read on **2026-09-22 UTC**. The status labels are labels for that dated snapshot, not promises about the live repository:

- **Active**: last push within six months of the snapshot.
- **Low activity**: last push within 24 months.
- **Dormant**: last push older than 24 months.
- **Archived**: GitHub marks the repository read-only.

Stars, `pushed_at`, `license.spdx_id`, and `archived` can all change. Re-read them before you depend on a project.

## Gate 1: License

Read the repository's license text. Do not infer rights from a public URL, a vendor page, or a high star count.

- `MIT` and `Apache-2.0` are explicit repository metadata in the dated pass for sqlglot, SQLFluff, Calcite, and utPLSQL. [S60](https://github.com/tobymao/sqlglot) [S61](https://github.com/sqlfluff/sqlfluff) [S62](https://github.com/apache/calcite) [S63](https://github.com/utplsql/utplsql)
- `NOASSERTION` is not public domain. It means GitHub did not return a confirmed SPDX identifier. Read the repository's license file before using the code in a product.
- python-oracledb returned `NOASSERTION` because its `LICENSE.txt` uses a dual `UPL-1.0 OR Apache-2.0` grant. The file is the evidence, not the API label. [S64](https://github.com/oracle/python-oracledb/blob/main/LICENSE.txt)
- Swingbench returned `license: null` in the dated snapshot. Treat its rights as unresolved rather than calling the repository open source by default. [S66](https://github.com/domgiles/swingbench-public)

If the legal answer is unclear, the install decision is `NO`. Stars do not change that.

## Gate 2: Maintenance and archive state

Read `pushed_at` and `archived` before the README's promises.

| Repository         | Dated snapshot                                                                        | Practical reading                                                                                                       |
| ------------------ | ------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| sqlglot            | MIT; 9,628 stars; push 2026-09-21; Active                                             | Installable candidate; still test the Oracle dialect. [S60](https://github.com/tobymao/sqlglot)                         |
| SQLFluff           | MIT; 9,883 stars; push 2026-09-21; Active                                             | Installable candidate; confirm the `oracle` dialect and project version. [S61](https://github.com/sqlfluff/sqlfluff)    |
| Apache Calcite     | Apache-2.0; 5,186 stars; push 2026-09-21; Active                                      | Usable framework for candidate rules, not an Oracle runtime. [S62](https://github.com/apache/calcite)                   |
| utPLSQL            | Apache-2.0; 624 stars; push 2026-09-18; Active                                        | Usable when the installed Oracle release meets the README's current floor. [S63](https://github.com/utplsql/utplsql)    |
| python-oracledb    | UPL-1.0 OR Apache-2.0; 452 stars; push 2026-09-19; Active                             | Usable driver; read `LICENSE.txt` because the API says `NOASSERTION`. [S64](https://github.com/oracle/python-oracledb)  |
| HammerDB           | GPL-3.0; 786 stars; push 2026-09-18; Active                                           | Usable load generator after license review. [S65](https://github.com/TPC-Council/HammerDB)                              |
| Swingbench         | No license declared; 80 stars; push 2026-05-26; Active snapshot                       | Oracle load candidate, but rights remain a gate. [S66](https://github.com/domgiles/swingbench-public)                   |
| OtterTune          | 1,233 stars; push 2020-11-13; archived/read-only; no license asserted                 | Design evidence only. No install history is claimed. [S54](https://github.com/cmu-db/ottertune)                         |
| SQLd360 / SQLdb360 | 65 / 123 stars; pushes 2018-01-14 / 2024-12-03; dormant / low activity; `NOASSERTION` | Diagnostic collectors, not a foundation to depend on without a fresh check. [S67](https://github.com/sqldb360/sqldb360) |

Archived does not mean the code is useless. It means the repository no longer promises maintenance. OtterTune is still useful as a paper-and-design reference. It is not evidence that you can safely install it today.

Research-only repositories have a separate maintenance boundary:

| Project            | Dated snapshot                                                                                                         | Boundary                                                                                                                               |
| ------------------ | ---------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| Bao for PostgreSQL | AGPL-3.0; 223 stars; push 2024-09-17; Dormant                                                                          | PostgreSQL steering evidence; Oracle hint mapping is unverified. [S53](https://github.com/learnedsystems/baoforpostgresql)             |
| VeriEQL            | `NOASSERTION`; 27 stars; push 2026-03-26; Low activity                                                                 | Candidate equivalence gate; Oracle dialect coverage is unverified. [S50](https://github.com/VeriEQL/VeriEQL)                           |
| SQLSolver          | Apache-2.0; 70 stars; push 2025-11-22; Low activity                                                                    | Candidate equivalence gate; Oracle dialect coverage is unverified. [S49](https://github.com/SJTU-IPADS/SQLSolver)                      |
| WeTune             | Code location reported by the third-party reproducibility report; no API-verifiable host, license, stars, or last push | Candidate rule discovery and verification evidence, not verified Oracle tooling. [S48](https://dl.acm.org/doi/10.1145/3514221.3526125) |

A research repository can be valuable without being a safe Oracle dependency. Preserve the role label and the dated facts.

## Gate 3: Oracle fit

“Supports SQL” is not the same as “supports Oracle SQL.” Check the exact dialect, driver, client, and release floor.

- **sqlglot** documents Oracle among its dialects. That supports a parse/diff lane, not semantic equivalence or a speed claim. [S60](https://sqlglot.com/sqlglot/dialects.html)
- **SQLFluff** documents an `oracle` dialect. Use that configuration rather than assuming generic SQL rules are equivalent. [S61](https://docs.sqlfluff.com/en/stable/reference/dialects.html)
- **Calcite** ships `OracleSqlDialect`. Use it for rule experiments; do not confuse dialect parsing with an Oracle execution engine. [S62](https://calcite.apache.org/javadocAggregate/org/apache/calcite/sql/dialect/OracleSqlDialect.html)
- **utPLSQL**'s current README names Oracle Database 19c or newer. Older releases have different support claims, so match the version you actually run. [S63](https://www.utplsql.org/)
- **python-oracledb** is the official driver boundary. It connects and executes; Oracle packages still provide the tuning decisions. [S64](https://oracle.github.io/python-oracledb/)
- **HammerDB** and **Swingbench** are load tools. Their value depends on a workload, session count, hardware profile, and license decision—not on the tool name.

A parser that cannot read a release-specific construct is not a pass. A linter that has no Oracle rule is not a pass. A driver can be current while the API or feature you need is absent on your database.

## Gate 4: Name the role

A tool can be useful without being a production replacement. Label the role before you install it:

- **Installable candidate:** sqlglot, SQLFluff, utPLSQL, python-oracledb, HammerDB, and possibly Swingbench after rights review.
- **Framework or candidate generator:** Apache Calcite.
- **Conditional collector:** SQLdb360/SQLd360; cross-check output against Oracle diagnostics.
- **Research candidate:** VeriEQL, SQLSolver, WeTune, QED, SLER, and QueryBooster. Their papers do not establish Oracle dialect coverage, code health, or license terms in this pass. [S49](https://github.com/SJTU-IPADS/SQLSolver) [S50](https://github.com/VeriEQL/VeriEQL) [S51](https://www.vldb.org/pvldb/vol17/p3602-wang.pdf) [S68](https://arxiv.org/abs/2603.04169) [S80](https://doi.org/10.14778/3611479.3611497)
- **Design evidence:** OtterTune and other archived research prototypes.

The honest answer is often “candidate,” not “replacement.” That label is useful.

## The two-minute target

1. Open the license file and record the actual grant.
2. Read the dated API fields: stars, last push, and `archived`.
3. Confirm the Oracle dialect, client, or release floor in the project documentation.
4. Write down the tool's job and its boundary: parse, lint, test, collect, load, or research only.

A missing license, missing Oracle path, or missing maintenance evidence leaves you with a lead—not a dependency. A tool with an archived repository can still inform the design; it just cannot borrow credibility from stars.

**License first. Maintenance second. Oracle fit third. Stars last.**
