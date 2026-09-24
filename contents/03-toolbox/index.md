---
title: Toolbox
description: Deterministic tools that prove what changed and what is safe.
order: 30
draft: false
---

A fast query is not evidence. Match every claim to an instrument that can prove or reject it.

This chapter keeps the toolchain small: capture the input, read the executed plan, compare the same workload, test the failure modes, and reject anything that cannot show its work. The child pages carry the runbooks; this page is the map.

> **Execution boundary:** no live Oracle database was available for this editorial pass. The statements here are runbooks and illustrative outputs, not measurements from a production system. Validate package signatures, privileges, licences, and data on a test or staging database before running them.

## Match the claim to the tool

| Claim                              | Minimum evidence                                                                                      | Decision                                             |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------- | ---------------------------------------------------- |
| The plan or estimate changed       | SQL ID, child number, plan hash, predicates, `E-Rows`, `A-Rows`, selectivity, rows examined, and cost | Change recorded; not yet a win                       |
| The workload improved              | Same frozen STS, named trials, raw samples, and measured deltas                                       | Compare against the A/A floor and no-regression rule |
| The change holds under concurrency | Realistic mix, errors, waits, throughput, and guardrail events                                        | Promote only after a controlled load test            |
| The rewrite preserves meaning      | Parse, lint, result assertions, and a controlled execution test                                       | Approve only after the semantic gate                 |

A plan-hash change is a change, not a win. A clean lint result is a selected ruleset passed, not a proof that the SQL is correct. A lower wall-clock number is not useful until the input and comparison are fixed.

## Child pages

- [Measure With XPLAN and Monitor](/03-toolbox/01-measure-with-xplan-and-monitor/) — executed plans, runtime rows, and ASH evidence.
- [Freeze Work With STS](/03-toolbox/02-freeze-work-with-sts/) — frozen workload, named trials, and comparison evidence.
- [Load Test Without Prod](/03-toolbox/03-load-test-without-prod/) — realistic concurrency, resource pressure, and guardrails.
- [Static Checks Before DB Time](/03-toolbox/04-static-checks-before-db-time/) — parse, lint, and result assertions before database time.

## Checklist / artifact

- [ ] Tag the run and save the SQL ID, child number, and plan hash.
- [ ] Save the STS identity, binds, host, workload window, and metric.
- [ ] Keep before/after XPLAN, raw trial samples, and the comparison report.
- [ ] Record rollback, privilege, licensing, and test-target assumptions.

**Artifact:** a reproducible before/after evidence set, not a screenshot.

## References

- [DBMS_XPLAN, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html)
- [DBMS_SQLPA, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html)
- [Managing SQL Tuning Sets, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/managing-sql-tuning-sets.html)
- [Database Performance Tuning Guide, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgdba/)
- [HammerDB](https://www.hammerdb.com/)
- [sqlglot](https://github.com/tobymao/sqlglot)
- [SQLFluff](https://docs.sqlfluff.com/)
- [Hoefler and Belli, SC15 benchmarking methodology](https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf)

**Keep this: match every claim to a tool that can prove or reject it.**
