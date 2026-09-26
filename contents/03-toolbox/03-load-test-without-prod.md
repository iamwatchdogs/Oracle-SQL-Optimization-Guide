---
title: Load Test Without Prod
description: Prove a change survives concurrency on a guarded test target, with a rollback that has already been run.
order: 33
draft: false
---

A statement that wins alone can lose when many sessions compete for the same buffer cache, locks, CPU, and I/O. Load testing is not a second stopwatch. It is a controlled workload with a rollback decision attached.

Production is never a first load target. The run below happens on a disposable test copy or a staging system with representative data and capacity, and it starts only when an approved test plan exists.

An approved test plan names the target environment and its owner, the data volume and where its statistics came from, the script and user count, the warm-up, ramp, hold, and cool-down, the metrics to record, the guardrails and their thresholds, the rollback command for the change class under test, and the person who can stop the run. A blank field means the run does not start.

> **Track:** Core (none) · Practice (1) · Recovery (5) · Advanced / gated (2, 3, 4)
>
> **Prerequisites:** [Freeze Work With STS](/03-toolbox/02-freeze-work-with-sts/) and [Before and After With SPA](/04-recipes/02-before-after-with-spa/) behind you, plus a non-production target an owner has approved for load.
>
> **Evidence status:** The tool rows are C1/C2 records from this guide's ledger: HammerDB [S65](https://www.hammerdb.com/) and Swingbench [S66](https://www.dominicgiles.com/swingbench/) for load generation. Resource Manager is A1 [S39](https://docs.oracle.com/en/database/oracle/oracle-database/19/admin/managing-resources-with-oracle-database-resource-manager.html); SQL Quarantine is A1 plus class-D corroboration [S40](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLQ.html), whose package reference was not retrieved firsthand. Tracing [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/) and test-case packaging [S43](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLDIAG.html) are A1. **No live Oracle database was available for this page**, no load run was executed, and no number here is a measurement.
>
> **Next required page:** [Static Checks Before DB Time](/03-toolbox/04-static-checks-before-db-time/).

## How this page is banded

| Band                 | Sections |
| -------------------- | -------- |
| **Core**             | none     |
| **Practice**         | 1        |
| **Recovery**         | 5        |
| **Advanced / gated** | 2, 3, 4  |

- **Core (none):** nothing here is a solo junior action. Every section assumes an approved environment and an owner who can stop the run.
- **Practice (1):** build the mix on a real ticket, from the application's actual shape rather than a vendor's demo schema.
- **Recovery (5):** the rollback loop is how you undo the candidate, not a way to improve a result. Read it before the run, not after the failure.
- **Advanced / gated (2, 3, 4):** guardrails are configured database features, tracing needs privileges and adds overhead, and test-case packaging needs the diagnosis APIs. Confirm release, edition, and entitlement first.

## 1. Build a realistic mix

Use the application's real shape: concurrency, think time, bind distribution, DML versus queries, and the statements that dominate the incident. HammerDB offers TPROC-C and TPROC-H style workloads under GPL-3.0 [S65]. Swingbench offers Oracle-specific mixes such as Order Entry, SH, and call-style workloads, and its repository declares no license [S66](https://github.com/domgiles/swingbench-public). Neither is automatically representative of your application.

Keep the script fixed across the before and after runs:

1. Prepare a test database with representative volume and statistics.
2. Warm the system the same way on both sides.
3. Ramp users, hold a defined peak, and cool down.
4. Record throughput, errors, latency distribution, waits, CPU, I/O, and guardrail events.

How many trials, how long each must run, and how the median and confidence interval are calculated are owned by the [noise floor and repetition policy](/05-feedback-loop/02-noise-floor-and-repetition/), which this page links instead of restating. The controlled SQL comparison on each side comes from the [SPA recipe](/04-recipes/02-before-after-with-spa/).

**ILLUSTRATIVE — a scenario, not a measurement.** A new index lowers one query's logical reads but increases lock waits across the order-entry mix. The hero statement improved; the workload did not. Reject the change.

## 2. Put guardrails in place before the run

The two guardrails solve different problems:

| Mechanism        | Action                                                       | Evidence                                 |
| ---------------- | ------------------------------------------------------------ | ---------------------------------------- |
| Resource Manager | Kills or switches runaway work under configured directives   | `V$RSRC_*` views and session outcomes    |
| SQL Quarantine   | Blocks a configured execution plan when its threshold is met | `DBA_SQL_QUARANTINE` rows and thresholds |

They are documented as separate mechanisms from 19c [S39] [S40], but they are coupled. Per the quarantine reading in [Stabilize and Ship Safely](/01-proven-techniques/05-stabilize-and-ship-safely/), a quarantine condition does not fire without a Resource Manager plan and threshold in play, so a quarantine configuration on its own is not a runaway-work control.

A Resource Manager kill is still not a quarantine block. One is an action on a session, the other a block on a plan; record them separately.

Arm both guardrails and read them back before the run starts. No read-back in the test plan means no run:

1. Create and enable a resource plan through `DBMS_RESOURCE_MANAGER`, working inside the pending area: open it with `CREATE_PENDING_AREA`, make your plan and directive changes, validate them with `VALIDATE_PENDING_AREA`, then submit them with `SUBMIT_PENDING_AREA`. Those subprogram names are release-documented; confirm them on your installed release. Give the plan a directive that kills or switches runaway work at a threshold for the resource you are guarding.
2. Map the load users' sessions to the consumer group that plan governs. Treat where that mapping is defined as release-documented, not settled here: this runbook points you at `DBA_RSRC_CONSUMER_GROUP_MAPPINGS` rather than at the active-plan views. Confirm the view name and the column list on your installed release, then check the mapping row there.
3. Read the running plan and its directives back from the `V$RSRC_*` views [S39], and record the directive threshold for each guarded resource. That those views report the active plan and its active sessions rather than the mapping definition is equally release-documented; confirm it on your installed release. Steps 2 and 3 stay separate evidence either way.
4. Create the quarantine configuration through `DBMS_SQLQ`, with the threshold for the resource you are guarding.
5. Read the rows, the `ENABLED` state, and the thresholds back from `DBA_SQL_QUARANTINE` [S40], then check the numeric coupling. For the same resource, the Resource Manager directive threshold must be equal to or below the quarantine threshold. A directive threshold above the quarantine threshold means the quarantine block can never fire, so this read-back fails even though both sides are configured and enabled.
6. Record both read-backs in the approved test plan, and gate the run on them.

Steps 2 and 5 read back like this:

**ILLUSTRATIVE — SQLcl or SQL\*Plus, read-only against `DBA_RSRC_CONSUMER_GROUP_MAPPINGS`. Requires the documented dictionary read access. Expected output: the mapping rows for the load users' consumer group; confirm the view name and column list on your installed release.**

```sql
SELECT * FROM DBA_RSRC_CONSUMER_GROUP_MAPPINGS;
```

**ILLUSTRATIVE — SQLcl or SQL\*Plus, read-only against `DBA_SQL_QUARANTINE`. Requires the documented dictionary read access. Expected output: one row per quarantine configuration with its thresholds; confirm the column list on your installed release.**

```sql
SELECT * FROM DBA_SQL_QUARANTINE;
```

The creation names `DBMS_SQLQ.CREATE_QUARANTINE_BY_SQL_ID` and `DBMS_SQLQ.CREATE_QUARANTINE_BY_SQL_TEXT` are release-sensitive **SKETCH** names in this runbook. Verify the exact signatures, threshold parameters, and dictionary view names on your installed release before you write the call.

A zero-kill run is not automatically a healthy run; it can mean the caps were too loose. A zero-quarantine run is not a performance win either; it means the tested mix stayed below the configured block conditions.

## 3. Know what tracing costs

SQL Trace and `tkprof` can explain waits, recursive SQL, parse and execute counts, and fetch behavior under load, as documented in chapter 23 of the 19c SQL Tuning Guide [S01]. They also add overhead. Use the required `ALTER SESSION`, `DBMS_MONITOR`, or equivalent privileges, keep the trace narrow and time-bounded, and measure whether tracing changed the workload.

Do not enable broad tracing as a permanent production observability strategy. Save the trace file, protect its contents, and record the trace overhead in the test record so a traced run is never compared against an untraced one.

## 4. Use SQL Test Case Builder for reproduction, not capacity

SQL Test Case Builder packages a SQL problem with its DDL, statistics, plans, data samples, and execution context for an isolated database. The packaging path is documented in chapter 22 of the 19c SQL Tuning Guide [S01] and driven through the `DBMS_SQLDIAG` APIs [S43]. It is useful for reproducing an error or a plan where someone else can see it.

It does not reproduce the production data-volume boundary. A test case that reproduces the plan does not prove throughput, cache behavior, or concurrency at production scale. Use it to reproduce first, then use the controlled comparison and a realistic load run to measure.

## 5. Close the rollback loop

Before the run, record the rollback for the change class:

- statistics: discard pending statistics or restore a retained history point [S29];
- index: drop the candidate index;
- SQL patch: drop it through `DBMS_SQLDIAG` [S43]; profile: drop or disable it;
- SQL plan baseline: disable, drop, or evolve back to the accepted plan with `DBMS_SPM`, whose package reference is the 18c edition [S07](https://docs.oracle.com/en/database/oracle/oracle-database/18/arpls/DBMS_SPM.html), with the 19c _Managing SQL Plan Baselines_ chapter as its companion;
- DDL: abort the redefinition before its commit point [S41](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_REDEFINITION.html), or switch the application edition back, using edition-based redefinition, whose linked guide is the 18c reference [S42](https://docs.oracle.com/en/database/oracle/oracle-database/18/adfns/editions.html).

After a rejected run, restore the prior state, run a small verification query, and repeat the load sample. A rollback command that has never been executed in a sandbox is a note, not a rollback.

## Artifact

A guarded load record:

- [ ] Test environment has representative volume and workload shape
- [ ] Script, users, binds, duration, and warm-up are identical on both sides
- [ ] Trial counts **and** the per-repetition duration follow the [noise floor and repetition policy](/05-feedback-loop/02-noise-floor-and-repetition/)
- [ ] Controlled SQL comparison completed for both sides
- [ ] Throughput, errors, latency, waits, and resource use recorded
- [ ] Resource plan created, load users' consumer group mapped, and the active plan and directives read back
- [ ] Quarantine rows, `ENABLED` state, and thresholds read back from `DBA_SQL_QUARANTINE`
- [ ] Both read-backs recorded in the test plan; the run gated on them
- [ ] Resource Manager kills separated from quarantine blocks
- [ ] Trace privileges and trace overhead recorded
- [ ] Test Case Builder output treated as reproduction evidence, not capacity evidence
- [ ] Rollback executed and verified before promotion

No load run was executed for this page, and no number in it is a measurement.

Source IDs and technique IDs resolve in [Appendix Sources](/07-appendix-sources/).

**Decision:** a parallel run with armed guardrails is a safety check. It becomes a performance claim only when the same frozen workload, the same script, and the measured policy say so.

**Next required page:** [Static Checks Before DB Time](/03-toolbox/04-static-checks-before-db-time/).
