---
title: Safe DDL and CI Gates
description: Build offline, test the interim object, then gate the promotion job by job.
order: 44
draft: false
---

DDL is where a small mistake becomes a visible outage. The safe pattern accepts a short lock and makes everything around it testable: build the new shape away from the live table, synchronize it, gather on it, test it, gate the result, name the rollback artifact, and only then finish in a window you chose.

This page owns the redefinition sequence, the dependency decision, the gate jobs, and the rollback artifact. It does not own the gate order itself; that belongs to [Static Checks Before DB Time](/03-toolbox/04-static-checks-before-db-time/).

> **Track:** Core (1) · Practice (2, 3, 4, 5) · Recovery (6) · Advanced / gated (7)
>
> **Prerequisites:** [Before and After With SPA](/04-recipes/02-before-after-with-spa/) behind you for the measurement stage, plus a disposable target where you may run the whole sequence twice.
>
> **Evidence status:** The sequence, the mode privileges, the rollback window, and the object-ID note are A1-sourced from the 19c `DBMS_REDEFINITION` reference [S41](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_REDEFINITION.html). The code-switch path comes from _Using Edition-Based Redefinition_ [S42](https://docs.oracle.com/en/database/oracle/oracle-database/18/adfns/editions.html), an **18c** link: Edition-Based Redefinition predates 18c, is available on 19c and later, and needs confirming on your release. The workload gate is A1-sourced [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html), and gate stages carry C1/C2 records on the pages they link to. Blocks are `ILLUSTRATIVE`, `SKETCH`, or `MUTATING`. **No live Oracle database was available**, so no DDL on this page has been run.
>
> **Next required page:** [Feedback Loop That Proves It](/05-feedback-loop/).

## How this page is banded

| Band                 | Sections   |
| -------------------- | ---------- |
| **Core**             | 1          |
| **Practice**         | 2, 3, 4, 5 |
| **Recovery**         | 6          |
| **Advanced / gated** | 7          |

- **Core (1):** choose the path before you touch a schema. The two options solve different problems, and picking the wrong one costs a rollback you had not planned.
- **Practice (2, 3, 4, 5):** on a real ticket against a test target: check eligibility, build the interim object, decide its dependencies, synchronize, gather, and check it, then run the gate jobs that decide whether promotion may start.
- **Recovery (6):** name the rollback artifact and its expiry before the commit point. This section makes the promotion reversible, and every move in it stops working at a stated moment.
- **Advanced / gated (7):** finish runs in a controlled window against a shared target, with a brief lock on the original object, a human approval in front of it, and both prior sections already complete.

## 1. Choose the right online path

For a table-shape change, use the multi-step `DBMS_REDEFINITION` path [S41]. For application code, use Edition-Based Redefinition when editioned objects and the operational switch are already supported [S42]. The two paths solve different problems, and neither replaces the measurement gate.

The multi-step path keeps the original table available while the interim table is created, populated, synchronized, and prepared. `FINISH_REDEF_TABLE` then briefly locks the original table while the redefinition completes. Do not promise uninterrupted access; promise a tested online path with a bounded finish phase, and say where the lock lands.

## 2. Check eligibility and create the interim table

**Privileges first.** The package runs with invoker's rights, and [S41](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_REDEFINITION.html) names two modes: USER mode, where the owner holding `CREATE TABLE` and `CREATE MVIEW` redefines a table in their own schema, and FULL mode, where the `ANY`-mode table grants reach into any schema. Confirm the exact grant list for your release before you schedule the window, and record which mode this run used.

**Eligibility next, on its own.** If the check raises an error, stop: record an inconclusive verdict with the error text, and do not run the DDL below. One failure has a documented alternative — the key method. Re-check with `DBMS_REDEFINITION.CONS_USE_ROWID` when the table has no usable primary key [S41]. Every other failure stays stopped.

**ILLUSTRATIVE — SQLcl or SQL\*Plus. Runs the eligibility check, which raises an error when the table is not a candidate [S41]. Changes no state. Confirm the signature on the installed release. Expected output: no rows when the table qualifies.**

```sql
BEGIN
  DBMS_REDEFINITION.CAN_REDEF_TABLE(
    'APP', 'ORDERS', DBMS_REDEFINITION.CONS_USE_PK
  );
END;
/
```

**The interim table must exist before the start call.** [S41](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_REDEFINITION.html) is explicit: you create an empty interim table, in the same schema, carrying the desired attributes of the post-redefinition table. Create it now and save the DDL in the run manifest:

**MUTATING. Creates the empty interim table in the owning schema. SQLcl or SQL\*Plus; the column list is a stand-in for your own post-redefinition definition. Record this DDL in the manifest. Expected output: table created.**

```sql
CREATE TABLE APP.ORDERS_INT (
  order_id   NUMBER PRIMARY KEY,
  order_date DATE,
  status     VARCHAR2(30)
);
```

With eligibility passed and the interim table present, start the redefinition:

**MUTATING. Starts a redefinition in the owning schema. SQLcl or SQL\*Plus as the table owner or an authorized account. Not executed here; confirm the signature, the `options_flag` values, and the rollback parameter on the installed package reference. Expected output: no rows returned, with the redefinition in progress.**

```sql
EXEC DBMS_REDEFINITION.START_REDEF_TABLE(
  uname           => 'APP',
  orig_table      => 'ORDERS',
  int_table       => 'ORDERS_INT',
  options_flag    => DBMS_REDEFINITION.CONS_USE_PK,
  enable_rollback => FALSE  -- TRUE only when the section 6 window is planned
);
```

Keep the column mapping explicit when names differ, and record the exact DDL and start arguments with the run manifest. The `START_REDEF_TABLE` signature and options are release-sensitive, so verify them before you run this against anything shared.

## 3. Decide how dependent objects are handled

`COPY_TABLE_DEPENDENTS` is optional in this recipe; whether you need it depends on the dependents you must carry and the strategy you choose. Pick one strategy and record it:

1. Let the package clone the dependents you want, then inspect the returned error count.
2. Create the indexes, constraints, triggers, and grants on the interim table yourself, and register them with the release-verified dependent-object APIs.

**MUTATING. Clones dependent objects onto the interim table and reports an error count. SQLcl or SQL\*Plus as in section 2. Not executed here; confirm the overload and the copy flags on the installed package reference. Expected output: no rows returned; read `copy_errors` from the variable.**

```sql
DECLARE
  copy_errors PLS_INTEGER;
BEGIN
  DBMS_REDEFINITION.COPY_TABLE_DEPENDENTS(
    uname            => 'APP',
    orig_table       => 'ORDERS',
    int_table        => 'ORDERS_INT',
    copy_indexes     => DBMS_REDEFINITION.CONS_ORIG_PARAMS,
    copy_triggers    => TRUE,
    copy_constraints => TRUE,
    copy_privileges  => TRUE,
    num_errors       => copy_errors
  );
END;
/
```

Inspect `copy_errors` before proceeding, and do not run both strategies blindly: cloned dependents are not cloned again if they are already registered. Skipping the copy carries its own risk, because finish completes the redefinition with the objects and registrations that exist — triggers and grants you neither cloned nor registered are the ones you re-create yourself afterwards. What finish does with any particular dependent depends on the path you took, so verify triggers, grants, constraints, and indexes by name after finish instead of assuming.

**A clean `copy_errors` is not the attestation.** This page is where a DDL reader looks for the dependency check, and until now it handed you `copy_errors` and implied that was the proof. It is not, and the book's own evidence chapter says so: `ALL_DEPENDENCIES` returning zero rows is one signal, and zero rows alone is not proof that nothing depends on your table. A view can depend on a column rather than the object, a trigger can fire without a declared dependency in some cases, and a synonym or an external reference can point at a name you are about to redefine.

The artifact this page owes you is the one the [evidence chapter](/00-preface/01-why-evidence-grades/) already defines: an owner-provided **dependency-attestation** covering constraints and foreign keys, triggers, views and materialized views, grants and synonyms, and external references, each with exact owner and scope fields, against a declared `expected_dependency_set`. Missing or changed dependencies are `INCONCLUSIVE`, not `PASS`. That contract lives in the evidence chapter; this page links it rather than printing a second, weaker version.

The copy call also has a `copy_statistics` flag, and it defaults to `FALSE` [S41]. Section 4 gathers statistics on the interim table instead, which works under either strategy.

## 4. Synchronize, gather, and test before finish

Long work on the interim table creates a synchronization backlog. Catch it up before the finish phase:

**MUTATING. Synchronizes the interim table with the original. SQLcl or SQL\*Plus as in section 2. Not executed here; confirm the argument names on the installed release. Expected output: no rows returned.**

```sql
EXEC DBMS_REDEFINITION.SYNC_INTERIM_TABLE(
  'APP', 'ORDERS', 'ORDERS_INT'
);
```

The interim table has no statistics of its own until you give it some, and a measurement taken against an unmeasured table is not a before/after. Gather on the interim object before anything measures it:

**MUTATING. Gathers statistics for the interim table. SQLcl or SQL\*Plus as in section 2. Not executed here; confirm the signatures on the installed release. Expected output: no rows returned.**

```sql
EXEC DBMS_STATS.GATHER_TABLE_STATS(
  ownname => 'APP',
  tabname => 'ORDERS_INT',
  degree  => DBMS_STATS.DEFAULT_DEGREE,
  cascade => TRUE
);
```

Read the gathered statistics back and record them with the manifest.

The frozen set cannot reach the interim object as printed. Its statements name `ORDERS`, and until finish runs that name still resolves to the incumbent, so a trial issued now measures the table you are trying to replace. What runs before finish is a correctness pass against the interim by name: row counts, constraint validation, and the representative queries written against `ORDERS_INT`.

The measured before/after lives where the name resolves to the candidate: on the disposable clone where the whole sequence runs twice, which is what the prerequisites ask for, or after finish inside the section 6 observation window. State which target produced your numbers, and treat that comparison as the input to the [Before and After With SPA](/04-recipes/02-before-after-with-spa/) sequence. Finish cannot stand in for testing the interim table.

If the redefinition must be abandoned before the commit point:

**MUTATING. Aborts an in-progress redefinition. SQLcl or SQL\*Plus as in section 2; run it once in a sandbox first. Not executed here; confirm the argument names on the installed release. Expected output: no rows returned, original table unchanged.**

```sql
EXEC DBMS_REDEFINITION.ABORT_REDEF_TABLE(
  'APP', 'ORDERS', 'ORDERS_INT'
);
```

`ABORT_REDEF_TABLE` works only between start and finish [S41]. After finish has run, the table path's rollback is the section 6 window instead. Test abort in the sandbox and keep its evidence.

## 5. Use CI gates with different jobs

The order of the candidate-text stages is owned by [Static Checks Before DB Time](/03-toolbox/04-static-checks-before-db-time/); this section does not restate it. The mapping is one job per stage group: the commit gate wraps that order's text stages, the test-database gate wraps its assertion stage, the workload gate wraps its controlled-comparison stage, and the load gate wraps its load stage. The table below records what each job runs, catches, and cannot catch.

| Job                                  | Runs                                                   | Catches                                                   | Cannot catch                                 |
| ------------------------------------ | ------------------------------------------------------ | --------------------------------------------------------- | -------------------------------------------- |
| Commit gate, no database             | Parse and lint of the migration or candidate SQL       | Malformed text and the configured rule violations         | Semantic change, plan shape, or runtime cost |
| Test-database gate                   | Result assertions against controlled fixtures          | Changed rows, ordering, duplicates, nulls, error behavior | Performance of any kind                      |
| Workload gate                        | Frozen set, named trials, comparison report            | Statement or aggregate regressions beyond the threshold   | Concurrency, memory, locks, and I/O          |
| Load gate, on trigger or entitlement | Concurrency run with guardrails armed before it starts | Contention and capacity failure under a realistic mix     | Correctness of the returned results          |
| Promotion                            | Controlled rollout plus the observation window         | Late plan changes and guardrail events after cutover      | Anything the earlier stages never ran        |

The load gate is required when the change affects contention or resource use — buffer cache, locks, CPU, or I/O, and a busy pipeline is no reason to skip it when it can. That is a trigger rather than the whole rule, and the [load gate page](/03-toolbox/03-load-test-without-prod/) owns the rest of it, including the entitlement fallback. A no-regression result says only that the threshold held. Whether anything improved is the [noise floor](/05-feedback-loop/02-noise-floor-and-repetition/) test, and the sentence about a green badge earning database time rather than promotion belongs to [Static Checks Before DB Time](/03-toolbox/04-static-checks-before-db-time/).

## 6. Make the promotion reversible

Before production, record the path you took, the dependency strategy you chose, the behavior-test result, the comparison report with section `ALL` for per-statement evidence, the load report where the trigger or the entitlement called for one, and the observation window with its owner.

**Name the rollback artifact before you finish, and name its expiry with it.** The table path offers five moves, and each stops working at a stated moment. Confirm every call and parameter in this table against the installed release [S41]:

| Step                | Call                                                                   | Expires                                        |
| ------------------- | ---------------------------------------------------------------------- | ---------------------------------------------- |
| Enable at start     | `START_REDEF_TABLE(..., enable_rollback => TRUE)` in section 2         | Chosen at start; no later call adds the option |
| Roll back in window | `ROLLBACK(...)` returns the table to its original definition, DML kept | Only while the rollback objects exist          |
| Close the window    | `ABORT_ROLLBACK(...)` terminates the possibility of rollback           | Closing is one-way                             |
| Clean up at finish  | `FINISH_REDEF_TABLE(..., disable_rollback => TRUE)`                    | Consumes the window at the commit point        |
| Keep the incumbent  | The interim table, maintained while rollback is enabled                | An ordinary table once the window is closed    |

**Each callable row of that table has a block below.** Rehearse them in the sandbox, at the lifecycle point the row names, before you rely on any of them:

**MUTATING. Section 2's start with the rollback option enabled, the only form that creates the window. SQLcl or SQL\*Plus on the sandbox copy. Not executed here; confirm the parameter name and its type on the installed release. Expected output: no rows returned, redefinition in progress.**

```sql
EXEC DBMS_REDEFINITION.START_REDEF_TABLE(
  uname           => 'APP',
  orig_table      => 'ORDERS',
  int_table       => 'ORDERS_INT',
  options_flag    => DBMS_REDEFINITION.CONS_USE_PK,
  enable_rollback => TRUE
);
```

**MUTATING. Rolls the redefinition back to the original definition and keeps the DML. SQLcl or SQL\*Plus, sandbox only; confirm the argument names on the installed release. Expected output: no rows returned.**

```sql
EXEC DBMS_REDEFINITION.ROLLBACK(
  'APP', 'ORDERS', 'ORDERS_INT'
);
```

**MUTATING. Closes the rollback window and cleans up the objects that enable it. SQLcl or SQL\*Plus, sandbox only; confirm the argument names on the installed release. Expected output: no rows returned.**

```sql
EXEC DBMS_REDEFINITION.ABORT_ROLLBACK(
  'APP', 'ORDERS', 'ORDERS_INT'
);
```

**MUTATING. Finish with the rollback cleanup taken in the same call. SQLcl or SQL\*Plus, in the approved window. Not executed here; confirm the parameter name and type on the installed release, because the 19c reference prints this one inconsistently. Expected output: no rows returned.**

```sql
EXEC DBMS_REDEFINITION.FINISH_REDEF_TABLE(
  uname            => 'APP',
  orig_table       => 'ORDERS',
  int_table        => 'ORDERS_INT',
  dml_lock_timeout => 600,
  disable_rollback => TRUE
);
```

The artifact you can actually name depends on the start you chose. Started with rollback enabled, your post-finish artifact is that maintained interim table plus the open window. Started without it, your artifact is the pre-finish `ABORT_REDEF_TABLE` from section 4 plus the incumbent plan evidence, because no post-finish rollback exists. For a code change the artifact is the prior edition and the switch back, with the same incumbent evidence beside it. Execute the applicable one in a sandbox and keep its verification with the run record.

After finish, abort is no longer available. What remains is the observation window, the approver, and the reversal plan agreed before the window opened. Do not use a result from a target with smaller data volume as proof of production capacity; re-run the relevant workload on a representative environment.

## 7. Finish in a controlled window

Two things must already exist before this section runs: the gate record from section 5 and the named rollback artifact from section 6. If either is missing, do not run this block.

When the candidate is approved and the window is open:

**MUTATING. Completes the redefinition. SQLcl or SQL\*Plus in the approved window; human approval belongs before this line. Not executed here; confirm the parameter names and types on the installed release. Expected output: no rows returned.**

```sql
EXEC DBMS_REDEFINITION.FINISH_REDEF_TABLE(
  uname            => 'APP',
  orig_table       => 'ORDERS',
  int_table        => 'ORDERS_INT',
  dml_lock_timeout => 600  -- seconds to wait for required locks
);
```

If the section 6 window must close at this commit point instead of later, pass the documented cleanup parameter, `disable_rollback`, with finish: the reference documents it as the parameter that disables rollback enabled at start and cleans up the objects that enable it [S41]. The sandbox form of that call is printed in section 6; confirm its name and type on your release before you pass it.

Expect a brief lock on the original table during this step. Test the lock behavior, monitor for blocked sessions, and choose the window from that evidence. After finish, verify object names, constraints, indexes, grants, triggers, row counts, and the executed plans.

Two documented surprises come with that verification. Object IDs are essentially swapped during the operation, so an audit policy created on the original table now audits the interim table; check the audit policies on both tables and alter them as needed [S41]. The interim table holds the incumbent copy: while rollback is enabled it is kept current with the redefined table, and once the window closes it is an ordinary table you drop or keep by decision.

For a code-only change, switch sessions to the new edition only after the editioned code passes the same behavior and measurement gates. The previous edition is the rollback switch until the observation window closes.

**Teardown.** After an abort, drop the interim table you created once the sandbox run proves the original table is untouched. After finish, the retain-or-drop decision belongs to the section 6 window: keep the incumbent copy while the window is open, drop it when the window is closed, and record which of the two you did.

## Artifact

A promotion record:

- [ ] Mode privileges recorded for the account that ran the DDL, confirmed on the installed release
- [ ] `CAN_REDEF_TABLE` passed, or the failure recorded with the rowid alternative evaluated
- [ ] Interim table created from saved DDL, empty, with the post-redefinition definition
- [ ] Dependency strategy chosen, with `copy_errors` checked or manual registrations verified, **and** an owner-provided dependency-attestation covering constraints, triggers, views, grants, synonyms, and external references against a declared `expected_dependency_set` — `ALL_DEPENDENCIES` zero rows alone is not a pass
- [ ] Interim statistics gathered and read back before the correctness checks ran against it
- [ ] Sync lag handled before finish; interim correctness checked against `ORDERS_INT` by name, and the workload measured where `ORDERS` resolves to the candidate, with that target recorded
- [ ] Abort or edition switch executed once in a sandbox, with its evidence kept
- [ ] Gate jobs run, each recorded with what it caught and what it cannot catch
- [ ] Rollback artifact named with its expiry, tested, and stored beside the promotion record
- [ ] Finish lock accepted as a brief commit-point lock, with the window and owner named
- [ ] Audit policies checked on both tables after finish; incumbent copy's keep-or-drop decision recorded
- [ ] "No regression" kept distinct from "performance win" in the verdict text

Every DDL block above is a `MUTATING` shape, and none of them has been executed against a target in this guide. Their signatures, option values, and argument names are confirm-on-release.

**Decision:** gate first, name the rollback artifact second, finish last, and keep the expiry of every option you used next to the artifact itself.
