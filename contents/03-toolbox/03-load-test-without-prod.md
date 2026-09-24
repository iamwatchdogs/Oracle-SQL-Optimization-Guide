---
title: Load Test Without Prod
description: Prove a change holds under parallel work before prod sees it.
order: 33
draft: false
---

A statement that wins alone can lose when thirty sessions compete for the same buffer cache, locks, CPU, and I/O. Load testing is not a second stopwatch. It is a controlled workload with a rollback decision attached.

> **Execution boundary:** no load run was executed for this editorial pass. Use a disposable test copy or a staging environment with representative data and capacity. Never point a new load script at production without an approved test plan.

## 1. Build a realistic mix

Use the application’s real shape: concurrency, think time, bind distribution, DML versus queries, and the statements that dominate the incident. HammerDB TPROC-C or TPROC-H-style workloads are useful generic drivers. Swingbench provides Oracle-specific mixes such as Order Entry, SH, and call-style workloads. Neither is automatically representative of your application.

Keep the script fixed across the before and after runs:

1. Prepare a test database with representative volume and statistics.
2. Warm the system in the same way on both sides.
3. Ramp users, hold a defined peak, and cool down.
4. Record throughput, errors, latency distribution, waits, CPU, I/O, and guardrail events.
5. Run at least K>=5 trials per side when the load metric is the acceptance evidence. Use 10–15 preferred for noisy environments, and add a full-workload SPA pass on each side for the controlled SQL comparison.

The K policy is a book rule, not a SQLPA feature. SC15 supports the need to quantify variability; it does not prescribe this exact floor. SQLPA supplies controlled SQL comparison trials. The harness calculates medians and bootstrap confidence intervals.

Illustrative scenario: a new index lowers one query’s buffer gets but increases lock waits across the order-entry mix. The hero query improved; the workload did not. Reject the change.

## 2. Put guardrails in place before the run

The two guardrails solve different problems:

| Mechanism        | Action                                                       | Evidence                                    |
| ---------------- | ------------------------------------------------------------ | ------------------------------------------- |
| Resource Manager | Kills or switches runaway work under configured directives   | Resource Manager views and session outcomes |
| SQL Quarantine   | Blocks a configured execution plan when its threshold is met | Quarantine configuration or event metadata  |

The SQL Quarantine creation names `DBMS_SQLQ.CREATE_QUARANTINE_BY_SQL_ID` and `DBMS_SQLQ.CREATE_QUARANTINE_BY_SQL_TEXT` are **SKETCH** names in this runbook. Verify the exact 19c/current signatures, threshold parameters, and dictionary view names in the release reference. A Resource Manager kill is not a quarantine block. Record them separately.

A zero-kill run is not automatically a healthy run. It can mean the caps were too loose. A zero-quarantine run is not automatically a performance win either. It means the tested mix stayed below the configured block conditions.

## 3. Know what tracing costs

SQL Trace and `tkprof` can explain waits, recursive SQL, parse/execute counts, and fetch behavior under load. They also add overhead. Use the required `ALTER SESSION`, `DBMS_MONITOR`, or equivalent privileges, keep the trace narrow and time-bounded, and measure whether the trace changed the workload.

Do not enable broad tracing as a permanent production observability strategy. Save the trace file, protect its contents, and include the trace overhead in the test record.

## 4. Use SQL Test Case Builder for reproduction, not capacity

SQL Test Case Builder packages a SQL problem with relevant DDL, statistics, plans, samples, and execution context. It is useful for reproducing an error or plan on an isolated database.

It does not reproduce the full production-data volume boundary. A test case that reproduces the plan does not prove throughput, cache behavior, or concurrency behavior at production scale. Use it to reproduce first, then use SPA and a realistic load run to measure performance.

## 5. Close the rollback loop

Before the run, record the rollback for the change class:

- statistics: discard pending statistics or restore a retained history point;
- index: drop the candidate index;
- SQL patch or profile: drop or disable the object;
- SPM baseline: disable, drop, or evolve back to the accepted plan;
- DDL: abort redefinition before its commit point, or switch the application edition back.

After a rejected run, restore the prior state, run a small verification query, and repeat the load sample. A rollback command that has never been executed in a sandbox is a note, not a rollback.

## Acceptance checklist

- [ ] Test environment has representative volume and workload shape
- [ ] Script, users, binds, duration, and warm-up are identical on both sides
- [ ] K>=5 trials per side; 10–15 preferred for noisy metrics
- [ ] Full-workload SPA pass completed for the controlled SQL comparison
- [ ] Throughput, errors, latency, waits, and resource use recorded
- [ ] Resource Manager kills separated from quarantine blocks
- [ ] Trace privileges and overhead recorded
- [ ] Test Case Builder reproduction treated as functional evidence, not capacity evidence
- [ ] Rollback executed and verified before promotion

## References

- [HammerDB](https://www.hammerdb.com/)
- [Swingbench](https://www.dominicgiles.com/swingbench/)
- [SQL Test Case Builder, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/gathering-diagnostic-data-with-sql-test-case-builder.html)
- [DBMS_SQLDIAG, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLDIAG.html)
- [DBMS_RESOURCE_MANAGER, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_RESOURCE_MANAGER.html)
- [DBMS_SQLQ, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLQ.html)
- [Database Performance Tuning Guide, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgdba/)

**Keep this: a parallel run with clean guardrails is a safety check, not a performance claim by itself.**
