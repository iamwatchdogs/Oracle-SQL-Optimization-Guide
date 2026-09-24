---
title: Freeze With STS
description: Capture one tuning set so before and after share the same inputs.
order: 41
draft: false
---

The first half of a safe comparison is deciding what “the workload” means. A SQL Tuning Set carries the SQL workload, binds, and recorded context. It does not force the same optimizer statistics or execution plan after a change.

> **Execution boundary:** this is a 19c runbook, not a live capture. Verify the exact capture signature, privileges, and licensing on a test or staging database.

## 1. Create a named workload

Use a name that describes the decision, not the person running it:

```sql
EXEC DBMS_SQLSET.CREATE_SQLSET(
  sqlset_name => 'OPT_LOOP_WL',
  description => 'Frozen peak workload for the measured change'
);
```

The name is part of the evidence. Put it in the run manifest and use the same name for every before and after task.

## 2. Capture a real window

For 19c, use the release-documented `DBMS_SQLSET.CAPTURE_CURSOR_CACHE` interface. Do not combine the package prefix with the capture suffix from another API. Confirm the overload, argument names, and capture window in the installed release reference.

A capture from the cursor cache is still a sample. A hand-curated set is even narrower. Both can be correct for a bounded question, but neither deserves the label “full production workload” unless the sampling method proves it. Hand-curated sets have sampling bias: they can miss rare plans, skew, short statements, and interactions between services.

## 3. Inspect the contents

Do not stop at a successful procedure call. Read the rows:

```sql
SELECT sql_id, plan_hash_value, elapsed_time, buffer_gets,
       executions, parsing_schema_name, module, action
FROM   TABLE(DBMS_SQLSET.SELECT_SQLSET('OPT_LOOP_WL'))
ORDER  BY buffer_gets DESC FETCH FIRST 20 ROWS ONLY;
```

Check the statement count, SQL IDs, plan hashes, bind families, modules, actions, and execution counts. A statement that ran once is not automatically irrelevant, but it should not silently dominate a top-N decision. A statement with many executions and many bind shapes is a workload, not one hero query.

Save the inspection output with the run manifest. If the scope is wrong, create a new set. Do not edit the set between the before and after trials.

## 4. Guard the set from accidental edits

The package provides reference support for clients that need to prevent modification while they use a set. If your workflow needs that protection, use the release-verified form:

```sql
VARIABLE reference_id NUMBER;
EXEC :reference_id := DBMS_SQLSET.ADD_REFERENCE(
  sqlset_name => 'OPT_LOOP_WL',
  description => 'measured before and after trials'
);
```

Keep the reference ID in the run record and release it when the task is complete. The existence of a named set is not a lock against every client; the workflow and the permissions around the set are part of the contract.

## 5. Hand the set to SPA unchanged

Create the task from the frozen name:

```sql
VARIABLE tname VARCHAR2(64);
EXEC :tname := DBMS_SQLPA.CREATE_ANALYSIS_TASK(
  sqlset_name => 'OPT_LOOP_WL',
  description => 'One change, same workload on both sides'
);
```

The before and after executions must use the same STS, same binds, same database state except for the candidate change, and same comparison metric. The next recipe shows the complete trial sequence.

## 6. Decide what the set can prove

| Set construction                                  | Good for                                | Boundary                                          |
| ------------------------------------------------- | --------------------------------------- | ------------------------------------------------- |
| Cursor-cache capture over a representative window | Application or peak workload comparison | Sampling depends on the window and cache turnover |
| AWR-derived set                                   | Historical workload across snapshots    | Requires AWR privileges and retention             |
| Hand-curated set                                  | Focused regression or one SQL family    | Sampling bias; do not call it the full workload   |
| Trace-derived set                                 | Reproducing a specific trace            | Trace coverage and privileges limit the scope     |

## Output checklist

- [ ] STS name, owner, source, window, and filters recorded
- [ ] SQL IDs, plan hashes, binds, and execution counts inspected
- [ ] Sampling bias and set scope stated
- [ ] No STS edits between before and after
- [ ] Same name passed to the SPA task
- [ ] K>=5 trials per side planned, 10–15 preferred
- [ ] Full-workload SPA pass scheduled for the aggregate verdict

## References

- [Managing SQL Tuning Sets, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/managing-sql-tuning-sets.html)
- [DBMS_SQLSET, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLSET.html)
- [DBMS_SQLPA, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html)

**Keep this: no frozen set means no fair claim.**
