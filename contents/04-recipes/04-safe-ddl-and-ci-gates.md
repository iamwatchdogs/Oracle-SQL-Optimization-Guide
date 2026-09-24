---
title: Safe DDL and CI Gates
description: Redefine without downtime and fail builds on regression.
order: 44
draft: false
---

DDL is where a small mistake becomes a visible outage. The safe pattern is not “DDL never locks.” It is: build the new shape away from the live table, synchronize it, test it, and accept a brief finish lock at the commit point.

> **Execution boundary:** no DDL was executed for this editorial pass. Validate `CAN_REDEF_TABLE`, object privileges, dependent-object behavior, lock timing, and rollback procedures on a disposable copy before using any of this in a shared environment.

## 1. Choose the right online path

For a table-shape change, use the multi-step `DBMS_REDEFINITION` path. For application code, use Edition-Based Redefinition when editioned objects and the operational switch are already supported. These paths solve different problems.

The multi-step path keeps the original table available while the interim table is created, populated, synchronized, and prepared. The `FINISH_REDEF_TABLE` step briefly locks the original table while the redefinition is completed. Do not promise uninterrupted access; promise a tested online path with a bounded finish phase.

## 2. Check eligibility and create the interim table

Run the eligibility check first:

```sql
EXEC DBMS_REDEFINITION.CAN_REDEF_TABLE(
  'APP', 'ORDERS', DBMS_REDEFINITION.CONS_USE_PK
);
```

Create `APP.ORDERS_INT` separately with the desired post-change definition. `START_REDEF_TABLE` expects an empty interim table to exist. Keep the column mapping explicit if names differ:

```sql
EXEC DBMS_REDEFINITION.START_REDEF_TABLE(
  uname => 'APP',
  orig_table => 'ORDERS',
  int_table => 'ORDERS_INT',
  options_flag => DBMS_REDEFINITION.CONS_USE_PK
);
```

The exact `START_REDEF_TABLE` signature and options are release-sensitive. Verify them in the current package reference before running a production script.

## 3. Decide how dependent objects are handled

`COPY_TABLE_DEPENDENTS` is **optional in this multi-step recipe**, not universally required. Choose one of these strategies:

1. Let the package clone the dependent objects you want and inspect the returned error count.
2. Create the indexes, constraints, triggers, grants, and other dependents manually on the interim table and register them with the release-verified dependent-object APIs.

Do not claim that `FINISH_REDEF_TABLE` drops or recreates every trigger, grant, or index. It completes the redefinition using the objects and registrations that are present. The dependency choice must be explicit and tested.

If you use the package helper, treat the call as a **release-check sketch**:

```sql
DECLARE
  copy_errors PLS_INTEGER;
BEGIN
  DBMS_REDEFINITION.COPY_TABLE_DEPENDENTS(
    uname => 'APP',
    orig_table => 'ORDERS',
    int_table => 'ORDERS_INT',
    copy_indexes => DBMS_REDEFINITION.CONS_ORIG_PARAMS,
    copy_triggers => TRUE,
    copy_constraints => TRUE,
    copy_privileges => TRUE,
    num_errors => copy_errors
  );
END;
/
```

Inspect `copy_errors` before proceeding. The 19c/current package reference documents the available flags and the rule that cloned dependent objects are not cloned again if already registered. If you register objects manually, omit the helper rather than running both strategies blindly.

## 4. Synchronize and test before finish

Long work on the interim table creates a synchronization backlog. Catch it up before the finish phase:

```sql
EXEC DBMS_REDEFINITION.SYNC_INTERIM_TABLE(
  'APP', 'ORDERS', 'ORDERS_INT'
);
```

Run the frozen SQL workload against the candidate definition, then run the controlled before/after comparison. Check row correctness, constraints, indexes, triggers, grants, and the measured performance deltas. A finish operation is not a substitute for testing the interim table.

If the redefinition must be abandoned before the commit point:

```sql
EXEC DBMS_REDEFINITION.ABORT_REDEF_TABLE(
  'APP', 'ORDERS', 'ORDERS_INT'
);
```

Test that abort in the sandbox. If you enabled the release-specific rollback feature at start, follow the current `ROLLBACK` procedure and lifecycle instead of guessing between abort and rollback.

## 5. Finish in a controlled window

When the candidate is approved:

```sql
EXEC DBMS_REDEFINITION.FINISH_REDEF_TABLE(
  'APP', 'ORDERS', 'ORDERS_INT'
);
```

Expect a brief lock on the original table during this step. Test the lock behavior, monitor for blocked sessions, and choose the operational window. After finish, verify object names, constraints, indexes, grants, triggers, row counts, and the executed plans.

For a code-only change, switch sessions to the new edition only after the editioned code passes the same behavior and SPA gates. The previous edition is the rollback switch until the observation window closes.

## 6. Use CI gates with different jobs

| Gate                    | Required when                                     | Pass condition                                                         |
| ----------------------- | ------------------------------------------------- | ---------------------------------------------------------------------- |
| Parse and lint          | Any SQL or migration change                       | Selected static rules pass; parser accepts the text                    |
| Behavior tests          | Any query rewrite or semantic change              | Expected rows, aggregates, and error behavior pass                     |
| SPA workload comparison | Any performance candidate                         | No important statement regresses beyond threshold                      |
| Load check              | Concurrency, memory, locks, I/O, or capacity risk | Throughput, errors, waits, and guardrails are within the agreed limits |
| Observation window      | Any production promotion                          | AWR/ASH, plan evidence, and rollback signals remain clean              |

The load gate is **optional** for changes that cannot create a contention or capacity risk. It is not optional merely because the CI pipeline is busy. A no-regression SPA result means the change did not exceed the agreed regression threshold. It does not mean the change improved performance. Call it a performance win only when the measured improvement clears the noise floor and the confidence interval supports the direction.

## 7. Make the promotion reversible

Before production, record:

- the exact redefinition or edition path;
- the dependency-copy or manual-registration strategy;
- the sandbox abort or edition rollback command;
- the behavior-test result;
- the SPA report with `section => 'ALL'` for per-statement evidence;
- the optional load report;
- the observation window and owner.

Do not use a result from a test database with a smaller data volume as proof of production capacity. Re-run the relevant workload on a representative environment.

## Output checklist

- [ ] `CAN_REDEF_TABLE` passed
- [ ] Interim table created explicitly
- [ ] `COPY_TABLE_DEPENDENTS` chosen or intentionally omitted
- [ ] Dependency errors checked or manual registrations verified
- [ ] Sync lag handled before finish
- [ ] Abort or edition rollback tested
- [ ] Finish lock accepted as a brief commit-point lock
- [ ] Static, behavior, and SPA gates passed
- [ ] Load gate marked optional or required with a reason
- [ ] “No regression” kept distinct from “performance win”

## References

- [DBMS_REDEFINITION, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_REDEFINITION.html)
- [Online Data Reorganization and Redefinition](https://www.oracle.com/database/technologies/online-operations/)
- [Edition-Based Redefinition, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/adfns/editions.html)
- [DBMS_SQLPA, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html)
- [SQLFluff dialect reference](https://docs.sqlfluff.com/en/stable/reference/dialects.html)
- [utPLSQL](https://www.utplsql.org/)

**Keep this: build offline, test the interim, accept a brief finish lock, and keep the rollback.**
