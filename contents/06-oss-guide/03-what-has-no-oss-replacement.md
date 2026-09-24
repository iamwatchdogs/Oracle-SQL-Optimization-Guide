---
title: What Has No OSS Replacement
description: The proven techniques that still need Oracle built-ins, and why.
order: 63
draft: false
---

Most proven Oracle fixes do not have a verified OSS replacement. That is the finding, not a failure to fill a table. Oracle owns the state, semantics, or decision that makes the change safe. OSS can prepare inputs, collect outputs, and run load around it.

The matrix uses `None found` for a narrow reason: no actively maintained OSS implementation of that exact intervention was verified in the **2026-09-22 UTC** pass. It is not a universal claim about every repository, paper, private tool, or future release.

## What the built-ins own

| Technique family                                      | Oracle implementation                                                                                                                               | What OSS can do instead                                                                                                                                                                                                                                                                            |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| T-01–T-08: measurement and diagnosis                  | AWR, ASH, SQL Monitor, `DBMS_XPLAN`, SQL Trace/TKPROF, SQL Tuning Sets, and SQL Test Case Builder                                                   | SQLdb360/SQLd360 can package output. T-08 is **CONDITIONAL**, and the bundle still needs an Oracle cross-check. [S67](https://github.com/sqldb360/sqldb360)                                                                                                                                        |
| T-09–T-23: optimizer statistics                       | `DBMS_STATS`, histograms, extended/expression statistics, plan directives, pending statistics, and Optimizer Statistics Advisor                     | No maintained OSS implementation was verified in this pass. Script the calls; do not invent a second stats authority. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/)                                                                                                  |
| T-24–T-33, T-67–T-68: access, layout, and parallelism | Access paths, partitioning, materialized views, caches, In-Memory, Exadata, Automatic Indexing, compression, and the optimizer's parallel decisions | HammerDB and Swingbench can add load. They do not choose the structure or certify the result. [S76](https://docs.oracle.com/en/database/oracle/oracle-database/19/admin/managing-indexes.html) [S77](https://docs.oracle.com/en/database/oracle/oracle-database/19/vldbg/parallel-exec-intro.html) |
| T-34–T-44: transformations                            | The documented optimizer transformations and their eligibility rules                                                                                | sqlglot and Calcite can generate candidates. VeriEQL, SQLSolver, and WeTune remain research candidates for Oracle coverage. [S48](https://dl.acm.org/doi/10.1145/3514221.3526125) [S50](https://github.com/VeriEQL/VeriEQL)                                                                        |
| T-45–T-57: plan controls and advisors                 | Hints, profiles, patches, SPM, adaptive plans, SQL Tuning Advisor, and SPA                                                                          | A driver can call the APIs and save reports. It cannot become the plan-control policy. [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html) [S07](https://docs.oracle.com/en/database/oracle/oracle-database/18/arpls/DBMS_SPM.html)                         |
| T-62–T-66: safe change and guardrails                 | `DBMS_REDEFINITION`, EBR, Resource Manager, SQL Quarantine, automatic error mitigation, and SQL Repair Advisor                                      | CI can sequence these controls. It cannot replace their release-specific state transitions. [S41](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_REDEFINITION.html) [S40](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLQ.html)            |

This is why the OSS matrix has a thin replacement column for several rows. A text parser can see a predicate. Only Oracle can know whether the executed plan, statistics, binds, and workload make the predicate cheaper.

## The difference between a script and a replacement

Use `python-oracledb` when you need to connect, run a frozen statement, collect timings, and call a release-supported package procedure. That is a harness. [S64](https://github.com/oracle/python-oracledb)

Use SPA when you need the before trial, the after trial, the comparison metric, and the per-statement report. That is Oracle's measurement spine. [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html)

Use `DBMS_STATS` when the change is statistics. A script that gathers data without Oracle's statistics semantics is not a safer substitute. Use a pending-statistics workflow when the release and environment support it, then publish or discard from measured evidence. [S29](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/)

Use `DBMS_SPM` when the question is which plan is allowed to survive a change. Parsing a hint or comparing plan hashes does not answer that question. [S07](https://docs.oracle.com/en/database/oracle/oracle-database/18/arpls/DBMS_SPM.html)

## The load boundary is real, but not magical

HammerDB is GPL-3.0 in the dated snapshot: 786 stars, last push 2026-09-18, and active under the pass's label. [S65](https://github.com/TPC-Council/HammerDB) It can generate a workload that exposes contention, I/O pressure, or resource exhaustion.

Swingbench's dated snapshot recorded 80 stars, a 2026-05-26 push, and no declared license. [S66](https://github.com/domgiles/swingbench-public) Use it only after checking rights and the workload's fit. The research corpus does not establish a universal install history or a universal result.

Neither tool promises a fixed detection window. Run duration depends on the data, session count, hardware, and stop criteria. The important question is whether the test represents the failure mode you care about. Oracle's 19c parallel-execution guidance warns that parallelism can reduce performance on an overutilized system. [S77](https://docs.oracle.com/en/database/oracle/oracle-database/19/vldbg/parallel-exec-intro.html)

## The gap list is part of the answer

The pass did not triage the `oracle-samples/db-sample-schemas` HR/OE/SH schemas or the `opentelemetry-instrumentation-oracledb` instrumentation. It also did not compare migration CI coverage for Liquibase and Flyway on Oracle. It did not establish code, license, or Oracle coverage for SLER [S68] and the survey [S69], QueryBooster [S80], or QED [S51].

Those are **untriaged or candidate** entries, not evidence against the projects. Keep them out of the proven OSS set until the repository, license, version, and Oracle integration are checked. [S68](https://arxiv.org/abs/2603.04169) [S69](https://ieeexplore.ieee.org/iel8/11629178/11629165/11629242.pdf) [S80](https://doi.org/10.14778/3611479.3611497) [S51](https://www.vldb.org/pvldb/vol17/p3602-wang.pdf)

## Release-sensitive controls are not “None found” excuses

SQL Quarantine and its API names are release-sensitive. The research corpus marks names such as `CREATE_QUARANTINE_BY_SQL_ID` and `CREATE_QUARANTINE_BY_SQL_TEXT` as sketches to verify against the installed release. [S40](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLQ.html) Do not paste a signature from another version and call the guardrail implemented.

The same rule applies to `DBMS_XPLAN.COMPARE_PLANS`: the side-by-side `DISPLAY_*` facilities are documented for 19c, while the named comparison API is release-checked for 23ai+. [S05](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html) The 26ai guide documents features introduced across releases; it is not proof that every feature belongs to 26ai. The version boundary belongs in the runbook.

## The artifact

For a candidate with `None found`, save the thin script, the Oracle package call, the release reference, the before/after report, and the rollback command. That packet shows what automation did and what Oracle decided.

**If the matrix says `None found`, script around Oracle. Do not swap Oracle out.**
