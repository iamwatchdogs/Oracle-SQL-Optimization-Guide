---
title: Recipes You Can Script
description: Frozen inputs, measured change, and gates that block harm.
order: 40
draft: false
---

A tuning loop is a pipeline with a boring job: keep the input fixed, change one thing, measure the result, and keep the evidence if the result earns promotion.

These recipes are written to be copied into a runbook. They are not claims about a particular database. Validate the installed release, package signatures, privileges, licensing, and data on a test or staging system before executing them.

> **Execution boundary:** no live Oracle database was available for this editorial pass. The calls and outputs below are illustrative runbooks, not measurements from a production system.

## Operating contract

Freeze the representative SQL Tuning Set, capture incumbent plans, run the before trial, apply one candidate, run the after trial, compare the named trials, repeat enough to measure variability, and roll back when the gate fails.

The book's operating policy is **K>=5 per side**, with **10–15 preferred** for noisy or high-impact measurements, plus a full-workload SPA pass per side for the aggregate verdict. SC15 supports repetition, duration, variability, and confidence reporting; it does not prescribe this exact K floor.

SQLPA supplies the comparison trials and reports. The external harness calculates medians and bootstrap 95% confidence intervals from the comparable trial metrics. SQLPA does not calculate the book's medians or bootstrap intervals.

## Claim / decision table

| Change class                                                                   | What it freezes                              | What earns promotion                         | Rollback                                                         |
| ------------------------------------------------------------------------------ | -------------------------------------------- | -------------------------------------------- | ---------------------------------------------------------------- |
| [Freeze With STS](/04-recipes/01-freeze-with-sts/)                             | SQL, binds, context, statistics, and plans   | Both sides tested the same workload          | Restore the prior STS and discard the candidate capture          |
| [Before and After With SPA](/04-recipes/02-before-after-with-spa/)             | Named SPA trials and comparison metric       | Per-statement and aggregate deltas           | Revert the one change and rerun the incumbent trial              |
| [Stats Pipeline You Can Script](/04-recipes/03-stats-pipeline-you-can-script/) | Statistics preferences and publication state | Pending-statistics impact before publication | Discard pending values, or restore published history             |
| [Safe DDL and CI Gates](/04-recipes/04-safe-ddl-and-ci-gates/)                 | Redefinition objects and dependency strategy | Correctness, performance, and rollout safety | Abort before finish, switch edition, or promote only after gates |

A plan hash is an identifier, not an improvement claim. Check structure, estimates, cost, and workload together. A full scan is not automatically wrong: reject it only when the measured evidence says the work is excessive.

## Execution boundary and CI

Static checks can run without Oracle. Behavior tests and SPA need a controlled database. Load testing is optional for changes that cannot create contention or capacity risk, but it is required before promoting a change whose failure mode is concurrency, memory, locks, or I/O. A no-regression result is not a performance win; a performance win must clear the measured noise floor.

## Checklist / artifact

- [ ] Record the STS hash, binds, workload window, metric, and K policy.
- [ ] Keep the incumbent and candidate plan evidence with the named trials.
- [ ] Retain raw samples, the external median/CI calculation, and the no-regression check.
- [ ] Store the class-specific rollback command and its verification evidence.

**Artifact:** a frozen workload, one change record, a named comparison, and a tested rollback.

## References

- [Managing SQL Tuning Sets, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/managing-sql-tuning-sets.html)
- [DBMS_SQLSET, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLSET.html)
- [DBMS_SQLPA, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html)
- [DBMS_STATS, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_STATS.html)
- [DBMS_REDEFINITION, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_REDEFINITION.html)
- [SQLFluff dialect reference](https://docs.sqlfluff.com/en/stable/reference/dialects.html)
- [utPLSQL](https://www.utplsql.org/)
