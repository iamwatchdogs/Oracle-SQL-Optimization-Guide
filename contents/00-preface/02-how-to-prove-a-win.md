---
title: How to Prove a Win
description: 'The canonical V0 lab: create a toy fixture, capture a SQL Tuning Set, measure noise, test one candidate, and hand off an auditable verdict.'
order: 3
draft: false
---

One fast run is an anecdote. V0 is the first controlled state transition: create the fixture, capture the workload, measure unchanged trials, apply one named candidate, capture the same trials again, and decide with the result in hand.

This page assumes you have read the [environment and setup hub](/00-preface/). A reader without a database can inspect the synthetic V0 procedure and its pass/fail contracts. Do not run the blocks and call the result local.

> **Track:** Core (Start here: the 10-step core path · 1 · 2 · 3 · 4 · 5 · 11A) · Practice (6 · 7 · 8 · 9 · 10) · Recovery (12 · 13) · Advanced / gated (Block taxonomy · The terms used by the lab · 11B · 14 · Evidence-pack manifest · The evidence handoff)
>
> **Prerequisites:** Basic SQL, a safe non-production target, and the [setup checklist](/00-preface/).
>
> **Evidence status:** Oracle procedures are ILLUSTRATIVE. Toy data, plans, and performance numbers are SYNTHETIC. Research and catalog counts are repository metadata. **No live Oracle database was available**, so every block below is a procedure and pass/fail contract rather than an executed run.
>
> **Next required page:** [The proven-technique groups](/01-proven-techniques/) — the route puts them immediately after this lab, and the measurement pages you will want next all declare them as their own prerequisite.

## How this page is banded

| Band                 | Sections                                                                                              |
| -------------------- | ----------------------------------------------------------------------------------------------------- |
| **Core**             | Start here: the 10-step core path · 1 · 2 · 3 · 4 · 5 · 11A                                           |
| **Practice**         | 6 · 7 · 8 · 9 · 10                                                                                    |
| **Recovery**         | 12 · 13                                                                                               |
| **Advanced / gated** | Block taxonomy · The terms used by the lab · 11B · 14 · Evidence-pack manifest · The evidence handoff |

**Advanced evidence appendix** is a container, not a band. It is the `##` wrapper that holds every section from **Block taxonomy** through **The evidence handoff**; the bands above are on the sections inside it, and the appendix itself claims none.

- **Core (the decision map, then 1, 2, 3, 4, 5, 11A):** the decision map names every section and the order they run in; then the ordered execution up to the intervention. **These are the sections a database reader runs on a real lab**, and the Core band is deliberately placed so that everything a reader acts on alone is inside it. The one ordering wrinkle is section 11A, which prints after section 6 because it belongs to the regression workload; section 6 says so and sends you back. The decision map is the only Core section outside the **Advanced evidence appendix** container.
- **Practice (6, 7, 8, 9, 10):** the intervention and everything after it. Section 6 is where the write happens, so it needs an authorized owner; 7 to 10 are the read-back and the comparison.
- **Recovery (12, 13):** the recovery rehearsal, the candidate rollback, and the owner-approved cleanup. These **undo** and **preserve**; they do not improve a result.
- **Advanced / gated (Block taxonomy, The terms used by the lab, 11B, 14, Evidence-pack manifest, The evidence handoff):** read before you need them. Each names a privilege, an owner, an entitlement, or a release check you must confirm on the installed release. These are the only banded sections that sit directly under **Advanced evidence appendix** without a numbered parent.

## Start here: the 10-step core path

This section is a **map**, not the lab. Every item below is a _Plan_ step: it names the section that does the work and the order the work runs in. Nothing here executes, because the executable version of each step is a numbered section later on this same page. Read this once, then go and run sections 1 to 5 and 11A, which are the Core band.

First pass, up to the intervention: section 1 **Choose one target**, section 2 **Create the toy fixture**, section 3 **Formal capture and STS inspection**, section 4 **Identify the statement without using cumulative counters**, section 5 **Incumbent A/A and before-side baseline plus noise floor (SPA)**, and section 11A **Regression incumbent and semantic baseline**.

Second pass, from the intervention to the verdict: section 6 **Intervention boundary**, section 7 **Capture the after side and report**, section 8 **Compare the plan pair**, section 9 **Keep raw samples and map artifacts to trials**, section 10 **Candidate semantic comparison**, section 11B **Regression candidate comparison**, section 12 **Recovery rehearsal and candidate recovery**, section 13 **Final lab cleanup (default preserve accepted state)**, and section 14 **Make the final verdict**.

Section 11A, including incumbent F1–F6 semantics, must finish before section 6. **11A prints later on this page than 6 does**, because it belongs to the regression workload; section 6 opens by sending you back to it. Section 11B and candidate semantics resume only after sections 7 and 10.

1. **Choose one target and target identity.** Record the symptom, statement, representative bind family, metric, window, and owner. Section 4, **Identify the statement without using cumulative counters**, defines the exact `sql_id`/`child_number`/`parsing_schema_name`/`con_id`/`con_id_reason`/applicable `instance_id`/`instance_scope_reason`/`session_instance_id`/`plan_hash_value` identity to use after capture.
2. **Plan the toy fixture.** Record the disposable schema, expected rows, and bind cases.
3. **Plan formal capture and STS inspection.** Section 3, **Formal capture and STS inspection**, follows sections 1 and 2; do not start capture before the target and toy fixture are defined. It defines capture and the bind manifest; keep the STS owner separate from the SPA task owner.
4. **Plan the incumbent baseline and regression incumbent floor.** Section 5, **Incumbent A/A and before-side baseline plus noise floor (SPA)**, and section 11A, **Regression incumbent and semantic baseline**, produce the incumbent artifacts; 11A also records write A/A samples/floors and locks the write thresholds before applying the candidate in section 6.
5. **Choose one candidate and precheck its boundary.** Section 6, **Intervention boundary**, defines the intervention; record object, owner, privilege, and recovery decisions.
6. **Plan the after side and SPA report.** Section 7, **Capture the after side and report**, defines named comparisons, complete report capture, and status checks.
7. **Plan the plan pair and raw samples.** Section 8, **Compare the plan pair**, and section 9, **Keep raw samples and map artifacts to trials**, define the plan and per-execution evidence handoffs.
8. **Plan the candidate semantic comparison.** Section 10 compares the candidate against the incumbent F1–F6 baseline collected in 11A; it runs after section 7.
9. **Plan the regression candidate comparison and preliminary decision.** Section 11B resumes after sections 7 and 10, compares every `REG-01`–`REG-03` row with its own floor, uses the write A/A artifacts and locked thresholds, records `PRELIMINARY_GATE_FAILURE` or `BLOCKED_PENDING_DECISION` when a gate cannot pass, and then maps the evidence at the single preliminary decision gate to `ACCEPT_CANDIDATE`, `REJECT_CANDIDATE`, or `INCONCLUSIVE`.
10. **Plan recovery, final cleanup, and the final verdict.** Section 12 handles candidate recovery, section 13 handles owner-approved cleanup, and section 14 records final `ACCEPT`, `REJECT`, or `INCONCLUSIVE` only after recovery and cleanup state are known.

> **Core boundary:** The ten steps above are a decision map and nothing more. The lab itself is sections 1 to 5 and 11A. **Read the one thing below before you run any of it.**
>
> Section 2 creates two tables and inserts fourteen rows — three departments and eleven employees. That is `MUTATING` work, and it is inside Core on purpose — a disposable lab schema is the right place for it, and a reader who cannot create a fixture cannot run this lab at all. What Core does **not** include is anything touching a database you did not create: section 6's index DDL, the SPA analysis task, and every privilege below need an authorized owner. If your schema is not one you just created from scratch, stop here and go to the [setup checklist](/00-preface/).
>
> Four things Core needs that Core does not hand you: the `ADVISOR` privilege to create an analysis task, `DBMS_SQLPA` in the installed release, a `SQL Tuning Set` you can write to, and a service connection you can reconnect through. Each is requested at the [setup checklist](/00-preface/), not here. A reading-only reader can still do all of Core as a paper exercise — the pass/fail contracts are written to be checkable without a database — but a database reader needs those four first.

**Preliminary candidate gate:** Semantic, read, write, and measurement checks before the gate use only `PRELIMINARY_GATE_FAILURE` for a complete failed check or `BLOCKED_PENDING_DECISION` for missing evidence, thresholds, or samples. At the single gate after section 11B, record exactly one preliminary decision: `ACCEPT_CANDIDATE`, `REJECT_CANDIDATE`, or `INCONCLUSIVE`. A complete semantic/read/write gate that passes, including separate `write_elapsed_threshold` and `write_buffer_gets_threshold` checks, maps to `ACCEPT_CANDIDATE`; `PRELIMINARY_GATE_FAILURE` maps to `REJECT_CANDIDATE`; `BLOCKED_PENDING_DECISION` maps to `INCONCLUSIVE`. This is not the final verdict.

## Advanced evidence appendix

The detailed capture, SPA, regression, clone-rehearsal, and teardown procedures follow. Read only the sections needed for the approved lab. Keep every `ILLUSTRATIVE`, `SKETCH`, `SYNTHETIC`, and `PLACEHOLDER` label attached to the artifact it describes.

The advanced sections are:

- **Choose one target** — section 1.
- **Create the toy fixture** — section 2.
- **Formal capture and STS inspection** — section 3.
- **Identify the statement without using cumulative counters** — section 4.
- **Incumbent A/A and before-side baseline plus noise floor (SPA)** — section 5.
- **Intervention boundary** — section 6.
- **Capture the after side and report** — section 7.
- **Compare the plan pair** — section 8.
- **Keep raw samples and map artifacts to trials** — section 9.
- **Candidate semantic comparison** — section 10, against incumbent F1–F6 artifacts collected in section 11A.
- **Complete V0 regression workload** — section 11A incumbent and semantic baseline before section 6, then section 11B candidate comparison after sections 7 and 10.
- **Recovery rehearsal and candidate recovery** — section 12.
- **Final lab cleanup (default preserve accepted state)** — section 13.
- **Make the verdict** — section 14.

### Block taxonomy

These labels answer different questions, and only three of them tell you what you may _do_ with a block: `MUTATING`, `PLACEHOLDER`, and `COPYABLE`. The rest describe evidence status.

- **ILLUSTRATIVE:** A procedure shape with the client, privilege assumptions, and expected output described. It was not executed here.
- **SKETCH:** An incomplete procedure. It needs an owner decision or a missing capability before it becomes an experiment.
- **SYNTHETIC:** Invented data, plans, output, or numbers for teaching. It is never a local result.
- **MUTATING:** The block changes database, session, or plan state — it creates, alters, gathers, publishes, restores, drops, starts, stops, or traces. Read the rollback for that change class before you run it. A `MUTATING` block is never read-only, whatever else it is labeled. The [rollback matrix](/05-feedback-loop/03-accept-or-rollback-gate/) maps each change class to its undo.
- **PLACEHOLDER:** The block contains at least one value only you can supply, so it cannot be run as printed. Most such values are literal tokens such as `<known-sql-id>`, but the label is broader than that: a block is `PLACEHOLDER` when it needs a schema, an owner, a `sql_id`, a date range, or any other fact this book cannot know. A block with an unresolved placeholder is not `COPYABLE`, and one that names no token at all is still `PLACEHOLDER` if it asks you for something.
- **COPYABLE:** A complete, disposable, non-production procedure block with an explicit client, no unresolved placeholders (or no placeholder needed), required privileges, and an expected output shape. `COPYABLE` describes the block contract, not a live execution or result. The book's only `COPYABLE` block is the [noise-floor harness](/05-feedback-loop/02-noise-floor-and-repetition/); experiment blocks remain `ILLUSTRATIVE`.

Two labels are allowed, from two different axes. The **action axis** says what you may do with the block — `MUTATING` outranks `PLACEHOLDER`, outranks `COPYABLE`. The **evidence axis** says what kind of artifact it is — `SYNTHETIC` outranks `ILLUSTRATIVE`. One from each, as [Freeze With STS](/04-recipes/01-freeze-with-sts/) does with `MUTATING — SKETCH`, because that block both writes and is incomplete. Two from the same axis is a real ambiguity, and the higher one wins. Everything else a block needs to know — client, privileges, expected output, whether it ran — is in the sentence under the label, not in another label.

### The terms used by the lab

- **Plan:** The sequence of operations Oracle chose for a statement. Runtime statistics can add actual rows and work to the plan artifact.
- **Plan hash:** A value that identifies a plan shape. It is not a performance score and does not prove that two plans return the same rows.
- **SQL ID:** Oracle's identifier for normalized SQL text. Record `child_number`, `con_id`, `con_id_reason`, applicable `instance_id`, `instance_scope_reason`, `session_instance_id`, and `plan_hash_value` as well; the SQL ID alone does not describe a cursor, container, instance, or plan.
- **Bind:** A value supplied separately from SQL text, such as `:dept_id`. Keep the bind values in a manifest so both sides ask the same question.
- **Workload:** The statements, binds, execution context, data conditions, and time window under test. The V0 workload is frozen, but it is still only a sample of the real system.
- **`buffer_gets`:** Oracle's logical count of block requests served through the buffer cache. It is a work indicator, not elapsed time and not necessarily physical disk I/O. Cumulative counters in workload views are not per-trial samples.
- **STS:** SQL Tuning Set, a named database object that may include SQL, binds, execution context, execution statistics, and plans for repeatable comparison. The [STS guidance](/03-toolbox/02-freeze-work-with-sts/) is the reference here.
- **SPA:** SQL Performance Analyzer, the Oracle package workflow that can run named before and after trials and report comparison metrics. Verify the package, privilege, release, and entitlement before using it.
- **A/A:** An unchanged control. Run the same statement, binds, context, and metric before the candidate change. The control is a scale check: the same input tells you how much this system moves when nothing changes. The exception is that it measures this database and window, not every future production run.
- **SPA trial report:** A named result from a SQL Performance Analyzer execution such as `aa_01` or `before_01`. It is a controlled trial artifact, not automatically one raw row per SQL execution; SPA can repeat and aggregate executions.
- **Trial:** One named SPA trial report or one owner-runner execution, as the label states. Keep `aa_01`, `before_01`, and `after_01` as distinct records and record the aggregation level.
- **Raw sample:** One owner-approved runner, trace, or report-extraction row for one execution. It needs statement identity, bind identity, metric, units, timestamps, and an explicit `per_execution` aggregation level. If only an SPA report exists, label it `SPA_TRIAL_REPORT`, not `RAW_EXECUTION`.
- **E-Rows:** The optimizer's estimated rows for a plan step. It is an estimate, not a measurement.
- **A-Rows:** Actual rows processed for a plan step when runtime statistics are available. Compare it with E-Rows to look for estimate error, but do not treat a small ratio as a win by itself.
- **Noise floor:** The spread or uncertainty in unchanged A/A results for the same target, binds, metric, and window. V0 shows a deterministic range for teaching; the formal gate is the [K>=5 and bootstrap policy](/05-feedback-loop/02-noise-floor-and-repetition/).
- **The three owner names.** This lab separates three roles, and most of its confusion comes from collapsing them. **`sts_owner_schema`** owns the SQL Tuning Set — the account that creates and populates it, and the session the `DBMS_SQLSET` calls run in or the one the documented `sqlset_owner` argument names. **`object_owner_schema`** owns the tables and indexes the statements touch, and it is the parsing schema a capture filter names. The fixture DDL below is unqualified, so it lands in whichever schema you connect as — connect as this owner, or owner-qualify the statements. **`task_owner_schema`** owns the SPA analysis task and runs the `CREATE_ANALYSIS_TASK` / `SET_ANALYSIS_TASK_PARAMETER` / `EXECUTE_ANALYSIS_TASK` / `DROP_ANALYSIS_TASK` calls. All three may be one account, and in a disposable lab they usually are — but they are three roles, and the create privilege for one is not the create privilege for another.
- **Semantic fixture:** A small input case with an expected row, null, ordering, or error contract. The incumbent and candidate must agree on the contract before their timings are compared.

V0 is a minimal range-based teaching lab. A formal performance claim uses at least K>=5 comparable raw samples per side, preferably 10–15, a complete V0 regression workload SPA pass per side, and an external median-difference bootstrap 95% confidence interval. A smaller illustrative set can teach the workflow, but it cannot satisfy the formal gate by itself.

A frozen workload is a labeled test fixture: keep the same inputs so the candidate has one thing to answer for. The exception is that a small fixture can still miss production skew, concurrency, or data growth.

### 1. Choose one target

Do not tune a whole database because a dashboard feels slow. Choose one statement or one repeatable workload tied to a user-visible outcome.

Record:

- The business symptom and the time window.
- The statement text or a stable statement identity.
- The `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, applicable `instance_id`, `instance_scope_reason`, `session_instance_id`, and `plan_hash_value` when monitoring can provide them; record the scope reason for any `N/A` identity field.
- The representative bind values.
- The data scale and relevant null or duplicate cases.
- The release, service, schema, client, and metric.
- The person who can approve and recover the candidate.

A report query, an online transaction processing (OLTP) statement, and a batch job have different workloads. Pick the one the ticket names. If you cannot name the target, the next step is measurement, not an index.

### 2. Create the toy fixture

Do not invent object names at the measurement step. Use this small disposable fixture in a lab schema owned by the lab user or an approved data-definition language (DDL) owner.

**MUTATING — the disposable lab fixture.** Oracle Database 19c-compatible SQLcl or SQL\*Plus setup. Run only in a disposable lab schema with permission to create and populate toy tables. Expected output shape: three department rows and eleven employee rows: ten distinct employee IDs, with `employee_id = 5` inserted twice, followed by a committed fixture. This is a copyable setup procedure, not a live result.

```sql
CREATE TABLE departments (
  dept_id NUMBER,
  dept_name VARCHAR2(30)
);

CREATE TABLE employees (
  employee_id NUMBER,
  dept_id NUMBER,
  salary NUMBER,
  manager_id NUMBER,
  updated_at TIMESTAMP
);

INSERT INTO departments (dept_id, dept_name)
VALUES (10, 'Platform');

INSERT INTO departments (dept_id, dept_name)
VALUES (42, 'Finance');

INSERT INTO departments (dept_id, dept_name)
VALUES (99, 'Support');

INSERT INTO employees (employee_id, dept_id, salary, manager_id, updated_at)
VALUES (1, 10, 100, NULL, TIMESTAMP '2026-01-01 09:00:00');

INSERT INTO employees (employee_id, dept_id, salary, manager_id, updated_at)
VALUES (2, 10, 120, 1, TIMESTAMP '2026-01-01 09:01:00');

INSERT INTO employees (employee_id, dept_id, salary, manager_id, updated_at)
VALUES (3, 42, 200, 1, TIMESTAMP '2026-01-01 09:02:00');

INSERT INTO employees (employee_id, dept_id, salary, manager_id, updated_at)
VALUES (4, 42, 220, 3, TIMESTAMP '2026-01-01 09:03:00');

INSERT INTO employees (employee_id, dept_id, salary, manager_id, updated_at)
VALUES (5, 99, 300, NULL, TIMESTAMP '2026-01-01 09:04:00');

INSERT INTO employees (employee_id, dept_id, salary, manager_id, updated_at)
VALUES (5, 99, 300, NULL, TIMESTAMP '2026-01-01 09:04:00');

INSERT INTO employees (employee_id, dept_id, salary, manager_id, updated_at)
VALUES (6, NULL, NULL, NULL, TIMESTAMP '2026-01-01 09:05:00');

INSERT INTO employees (employee_id, dept_id, salary, manager_id, updated_at)
VALUES (7, 42, 180, 999, TIMESTAMP '2026-01-01 09:06:00');

INSERT INTO employees (employee_id, dept_id, salary, manager_id, updated_at)
VALUES (8, 42, NULL, 3, TIMESTAMP '2026-01-01 09:07:00');

INSERT INTO employees (employee_id, dept_id, salary, manager_id, updated_at)
VALUES (9, 77, 500, NULL, TIMESTAMP '2026-01-01 09:08:00');

INSERT INTO employees (employee_id, dept_id, salary, manager_id, updated_at)
VALUES (10, 10, 110, 2, TIMESTAMP '2026-01-01 09:09:00');

COMMIT;
```

The `employees` table has no primary key so the intentional duplicate physical row remains visible. The fixture contains 11 physical employee rows and 10 distinct employee IDs. The target statement is a report over one bind.

**SYNTHETIC — toy fixture data.** SQLcl or SQL\*Plus. The connected lab user needs `SELECT` on `employees`. Expected output shape: one row per matching employee; no live output is supplied.

```sql
SELECT employee_id,
       dept_id,
       salary
FROM employees
WHERE dept_id = :dept_id;
```

Use these bind cases in the manifest:

| Bind   | Expected employee IDs in the target | Purpose                                                  |
| ------ | ----------------------------------- | -------------------------------------------------------- |
| `10`   | `1, 2, 10`                          | Common small department                                  |
| `42`   | `3, 4, 7, 8`                        | Common larger department with a null salary              |
| `99`   | `5, 5`                              | Duplicate rows must survive                              |
| `9999` | none                                | No-match case                                            |
| `NULL` | none for `dept_id = :dept_id`       | Equality with null is not the null fixture; use F1 below |

The setup path is disposable. The owner records the schema, table names, row counts, and bind manifest in the evidence pack. The canonical execution identity is `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, and `instance_id`; every bind-manifest, raw-sample, regression-gate, and evidence-pack row carries those five fields plus `con_id_reason`, `instance_scope_reason`, and `session_instance_id`, and every exact plan artifact also carries `plan_hash_value`. An `N/A` scope requires its corresponding reason.

### 3. Formal capture and STS inspection

Choose one capture mode and record it. Neither mode is complete by default. An STS is a workload contract; its existence does not prove that every application bind, execution, or rare plan was captured.

#### Mode A: owner/application-driven capture with a bind manifest

Use this mode when the application or an owner-approved external runner can record exact binds and construct the required SQL tuning set rows. The application sets `MODULE` to `V0_LAB` and `ACTION` to `EMPLOYEE_REPORT`, runs one execution for each manifest case, records the resulting `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, applicable `instance_id` (or `N/A` with `instance_scope_reason`), `instance_scope_reason`, `session_instance_id`, bind case, and UTC timestamps, and hands protected values to the approved loader.

The external per-bind runner is the bind-completeness authority: a release-documented `SQLSET_ROW` keyed by `sql_id` and `plan_hash_value` does not prove that every manifest value survived.

The STS is workload metadata; the runner trace and `bind-manifest.csv` are the bind evidence.

Inputs are an owner-approved cursor of the release-documented `SQLSET_ROW` type, `sts_owner_schema`, the STS name, a bind manifest reference, and the owner-approved module/action.

The package/type qualification for `SQLSET_ROW` is release-dependent and remains `UNVERIFIED` until the installed release signature is checked.

Outputs are a load status, collection row count, distinct SQL IDs, bind-case coverage, exact `sql_id`/`child_number`/`parsing_schema_name`/`con_id`/`con_id_reason`/applicable `instance_id`/`instance_scope_reason`/`session_instance_id`/`plan_hash_value` plan artifact references, scope reasons for `N/A` fields, and UTC capture timestamps.

If the owner cannot produce the exact cursor, external per-bind runner, and load contract on the installed release, the owner-driven mode is `BLOCKED_PENDING_DECISION` until the owner or release owner supplies it.

**SKETCH — release-checked owner/application loader contract.** This is a procedure shape, not a copyable script. It is labeled `MUTATING`, because it creates and loads a named SQL Tuning Set in the database.

```sql
DEFINE sts_owner_schema = <sts-owner-schema>

BEGIN
  DBMS_SQLSET.CREATE_SQLSET(
    sqlset_name => 'V0_EMP_WL',
    description => 'V0 employee report, owner-driven bind cases',
    sqlset_owner => '&sts_owner_schema'
  );
  DBMS_SQLSET.LOAD_SQLSET(
    sqlset_name => 'V0_EMP_WL',
    sqlset_owner => '&sts_owner_schema',
    populate_cursor => owner_cursor,
    load_option => 'MERGE',
    update_option => 'REPLACE',
    update_attributes => 'EXECUTION_CONTEXT,EXECUTION_STATISTICS,SQL_BINDS,SQL_PLAN'
  );
END;
/
```

Run this block in the `sts_owner_schema` session, or have the STS owner execute it there; do not let one account create an STS while another silently owns it. The owner-approved cursor, its construction, and the installed release signature are part of the handoff. This page does not invent a constructor for the release-documented `SQLSET_ROW` type or a bind loader signature.

#### Mode B: DBA cursor-cache capture

Use this mode when the owner cannot supply a user-defined workload and a DBA or authorized owner can run a shared-SQL-area capture. The capture samples the shared SQL area during a declared window. It does not guarantee every bind, every execution, or every rare plan. The owner must still match the result to a bind manifest; otherwise the set is not a representative baseline.

This STS block uses `sts_owner_schema` for STS ownership and `object_owner_schema` for the SQL parsing schema.

The two owners may differ: run the `DBMS_SQLSET` calls in the `sts_owner_schema` session or with the documented owner support, while the capture filter must match the synthetic SQL's `object_owner_schema`. Do not substitute `sts_owner_schema` for the parsing-schema filter unless the owner explicitly establishes that they are the same schema.

The account needs an owned STS privilege (`ADMINISTER SQL TUNING SET` or owner support) and the shared SQL area access required by the installed release.

Expected output: `V0_EMP_WL` exists under `&sts_owner_schema`, the capture filter names `&object_owner_schema`, and the capture records the declared 30-second window, subject to the bind-completeness gate below.

**MUTATING — release-checked DBA cursor-cache capture for SQL\*Plus.** The capture call polls the shared SQL area for `time_limit` seconds, pausing `repeat_interval` seconds between samples, and applies `basic_filter` to each sample. The set name is this lab's own `V0_EMP_WL`; the filter names `&object_owner_schema` as the parsing schema. Not executed here; confirm the overload, the argument names, and the `basic_filter` predicate on the installed release before you run it. Expected output: no rows returned, and a set that now holds the captured statements.

```sql
DEFINE sts_owner_schema = <sts-owner-schema>
DEFINE object_owner_schema = <object-owner-schema>

EXEC DBMS_SQLSET.CAPTURE_CURSOR_CACHE(
  sqlset_name     => 'V0_EMP_WL',
  sqlset_owner    => '&sts_owner_schema',
  time_limit      => 30,
  repeat_interval => 5,
  capture_option  => 'MERGE',
  basic_filter    => 'parsing_schema_name = ''&object_owner_schema'''
);
```

The capture call above writes the set and nothing else. The bind manifest is a separate artifact that the external per-bind runner produces, one row per captured execution, with this header:

**ILLUSTRATIVE — the bind-manifest header this mode must produce. It is not a capture call and no package subprogram writes it.**

```text
capture_id,run_id,statement_id,bind_case_id,execution_id,sql_id,child_number,parsing_schema_name,con_id,con_id_reason,instance_id,instance_scope_reason,session_instance_id,sts_row_ref,bind_name,bind_family,bind_position,bind_value_ref,bind_value_shared,representative_reason,started_at_utc,finished_at_utc,captured_at_utc,source,redaction_status
```

`statement_id` is the canonical stable statement key in the target and regression manifests; there is no second statement-label field.

`bind_case_id` is the canonical bind-case identity; `bind_family` is descriptive metadata only and never substitutes for it. The owner records whether each case is common, skewed, null, duplicate, or no-match, and why it belongs in the representative workload.

The regression manifest uses the same shape and records `statement_id = REG-03`, `bind_family = dept_id`, and the representative aggregate cases.

The external runner must show the bind value used for each `bind_case_id` and `execution_id`; the STS row count or `sql_id`/`plan_hash_value` cannot fill that gap.

The file must not contain production credentials, customer rows, or unredacted customer bind values. A protected value reference is enough to verify execution; a shared value is a token, hash, or synthetic replacement.

#### Inspect and save the exact output

For SQL*Plus inspection, set the owner substitution in the same session before calling the owner-qualified collection functions.

**PLACEHOLDER — SQL\*Plus STS owner binding.**

```sql
DEFINE sts_owner_schema = <sts-owner-schema>
```

**ILLUSTRATIVE — release/owner-dependent STS inspection.** The 19c contract substantiates `sql_id` in the release-documented `SQLSET_ROW` type, but the row shape, package/type qualification, and available attributes can still vary by release, owner, and load path. Use `SELECT *` for the full local inspection and save it without publishing raw bind payloads.

```sql
SELECT COUNT(*) AS set_rows,
       COUNT(DISTINCT sql_id) AS statement_count
FROM TABLE(DBMS_SQLSET.SELECT_SQLSET(sqlset_name => 'V0_EMP_WL', sqlset_owner => '&sts_owner_schema'));
```

Plan identity is a separate `V$SQL`/`GV$SQL` artifact. The 19c `V$SQL` view does not expose `INSTANCE_NUMBER`.

A single-instance `V$SQL` lookup is instance-local; record `instance_id = N/A` and `instance_scope_reason = single_instance_vsql`. For RAC or any capture spanning instances, query `GV$SQL` and record `INST_ID AS instance_id`; qualify the lookup by the known `SQL_ID`, `CHILD_NUMBER`, `PARSING_SCHEMA_NAME`, `CON_ID`, and `INST_ID`.

Prefer the documented `CON_ID` column from `V$SQL`/`GV$SQL`, after verifying the view columns on the installed release.

Neither `V$SQL` nor `GV$SQL` returns `session_instance_id`; obtain that value from the separate `V$INSTANCE` query in section 4 and join it during evidence-pack assembly.

If the installed view or session cannot supply `CON_ID`, record `con_id = N/A`, `con_id_reason = <reason>`, and the current container scope separately; do not call the tuple global.

**PLACEHOLDER — single-instance/container-local `V$SQL` plan identity artifact.** Use this path when the installed 19c view exposes `CON_ID`. The query must return exactly one row for the known SQL ID, child number, parsing schema, and container ID. `instance_id` is deliberately `N/A`; do not substitute an `INSTANCE_NUMBER` column that `V$SQL` does not expose.

```sql
DEFINE parsing_schema_name = <known-parsing-schema>
DEFINE con_id = <known-con-id>

SELECT sql_id,
       child_number,
       parsing_schema_name,
       con_id,
       NULL AS con_id_reason,
       'N/A' AS instance_id,
       plan_hash_value,
       'V$SQL' AS cursor_view,
       'container_local' AS container_scope,
       'single_instance_vsql' AS instance_scope_reason
FROM V$SQL
WHERE sql_id = '<known-sql-id>'
  AND child_number = <known-child-number>
  AND parsing_schema_name = '&parsing_schema_name'
  AND con_id = &con_id;
```

**PLACEHOLDER — RAC/multiple-instance `GV$SQL` plan identity artifact.** Use `GV$SQL` when the capture spans instances. `INST_ID` is the instance identity; it is not `V$SQL.INSTANCE_NUMBER`. The container and instance predicates are both required.

```sql
DEFINE parsing_schema_name = <known-parsing-schema>
DEFINE con_id = <known-con-id>
DEFINE instance_id = <known-inst-id>

SELECT sql_id,
       child_number,
       parsing_schema_name,
       con_id,
       NULL AS con_id_reason,
       inst_id AS instance_id,
       plan_hash_value,
       'GV$SQL' AS cursor_view,
       'con_id_and_inst_id_filtered' AS container_scope,
       'multi_instance_gv$sql' AS instance_scope_reason
FROM GV$SQL
WHERE sql_id = '<known-sql-id>'
  AND child_number = <known-child-number>
  AND parsing_schema_name = '&parsing_schema_name'
  AND con_id = &con_id
  AND inst_id = &instance_id;
```

**PLACEHOLDER — session-container fallback when `CON_ID` is unavailable.** This fallback is valid only for the connected container/session and is not a global cross-container lookup. If `SYS_CONTEXT` cannot return a container ID, save `con_id = N/A` with a reason instead of claiming a global tuple.

```text
sql_id,child_number,parsing_schema_name,con_id,con_id_reason,instance_id,instance_scope_reason,session_instance_id,plan_hash_value,cursor_view,container_scope
```

When `con_id` is `N/A`, `con_id_reason` is mandatory; when `instance_id` is `N/A`, `instance_scope_reason` is mandatory. The owner may derive `vsql_plan_hashes` from the distinct `plan_hash_value` entries in this saved artifact; do not call it an STS plan count. An aged-out or unresolved row leaves plan identity unresolved.

Stop if any condition is true:

- `set_rows` is zero.
- `statement_count` is not one for `V0_EMP_WL` (or is not three for the regression set in section 11A).
- A `sql_id` and `plan_hash_value` pair is duplicated without a documented reason, or a duplicate manifest row has conflicting values.
- The target SQL text, declared filters, or capture window is missing.
- The target bind family is absent, unbound, or cannot be checked against the manifest.
- The capture contains unrelated schemas, modules, actions, or statements, or the owner cannot establish that the bind cases are representative.
- The exact `sql_id`/`child_number`/`parsing_schema_name`/`con_id` lookup, or the `GV$SQL` lookup with the applicable `instance_id`, returns zero rows or multiple remaining rows, or the exact child artifact is not saved with `con_id_reason`, `instance_scope_reason`, and the separately joined `session_instance_id`.

Any empty, duplicate, unrepresentative, or unbound set is `BLOCKED_PENDING_DECISION`, not a baseline. Ask the application owner, DBA, or release owner to fix the runner, grant, filter, or loader, then capture a new artifact. Do not pass a hand-picked statement to SPA under the same name without recording the narrower scope.

#### Owner handoff checklist

Before running any STS or SPA procedure, the owner records and verifies:

- [ ] `sts_owner` and `task_owner` are recorded as separate identities. The session for every STS operation runs as `sts_owner` or uses the documented `sqlset_owner` argument; the session for `CREATE_ANALYSIS_TASK`, `SET_ANALYSIS_TASK_PARAMETER`, `EXECUTE_ANALYSIS_TASK`, and `DROP_ANALYSIS_TASK` runs as `task_owner`. `REPORT_ANALYSIS_TASK` may use the documented `task_owner` argument.
- [ ] No `task_owner` argument is passed to `CREATE_ANALYSIS_TASK`, `SET_ANALYSIS_TASK_PARAMETER`, `EXECUTE_ANALYSIS_TASK`, or `DROP_ANALYSIS_TASK`; a `task_owner` argument is used only on a `REPORT_ANALYSIS_TASK` call when the installed release documents it.
- [ ] `bind-manifest.csv` maps each `bind_case_id` to an external-runner `execution_id`, protected value reference, and UTC timestamps.
- [ ] The SPA task owner, STS owner, required privilege, entitlement, release, `USER_ADVISOR_TASKS` access, and approved complete-CLOB writer are recorded.
- [ ] For every `GV$SQL` artifact, `INST_ID AS instance_id`, `session_instance_id`, and the instance-specific connection used for `DBMS_XPLAN.DISPLAY_CURSOR` are recorded and match; the exact plan-display session has the scoped `V$INSTANCE` `SELECT`/read access needed to produce `session_instance_id`.

Stop if either owner is unresolved, an STS operation cannot run in the `sts_owner` session or bind the documented `sqlset_owner` value, a task operation cannot run in the `task_owner` session, the installed release does not support the documented `REPORT_ANALYSIS_TASK` `task_owner` argument, the exact `DBMS_XPLAN` instance is unknown or mismatched, or the external runner cannot map a bind case. Do not promise owner support while omitting the owner; the result is `BLOCKED_PENDING_DECISION` until the handoff is complete.

### 4. Identify the statement without using cumulative counters

Use monitoring, the application runner, or the DBA to provide the known SQL ID, child number, parsing schema owner, and container scope. Add `instance_id` only when the capture uses `GV$SQL` across instances; a single-instance `V$SQL` lookup records `instance_id = N/A` with a reason.
**PLACEHOLDER.** SQLcl or SQL\*Plus. Use the single-instance `V$SQL` or RAC `GV$SQL` identity query from section 3, including the known `CON_ID` and, when applicable, `INST_ID AS instance_id`.

```sql
SELECT INSTANCE_NUMBER AS session_instance_id
FROM V$INSTANCE;
```

Compare `session_instance_id` with the manifest's `instance_id` for a `GV$SQL` artifact. For the single-instance `V$SQL` path, save the session instance identity with the artifact but do not invent a `V$SQL` instance column.

**PLACEHOLDER.** Requires the least-privilege `SELECT` or release-approved read access to `V$INSTANCE`, `V$SQL`, `V$SQL_PLAN`, `V$SESSION`, and `V$SQL_PLAN_STATISTICS_ALL`; the owner may provide scoped direct grants or confirm an appropriate catalog role for these fixed views, not a blanket `DBA` grant. Expected output: the plan for the named child, with runtime statistics when available.

```sql
SELECT *
FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR(
  sql_id => '<known-sql-id>',
  cursor_child_no => <known-child-number>,
  format => 'ALLSTATS LAST'
));
```

Do not use a no-argument cursor display in the canonical lab. If the cursor is no longer resident, use the release-supported saved SPA/advisor plan artifact for the trial or an owner-approved advisor task export; do not substitute an unrelated last statement. `ALLSTATS LAST` does not make bind values safe to publish. Redact sensitive SQL text, predicates, literals, and bind values before sharing, and keep the protected values in the bind handoff artifact.

`V$SQL` execution counters are cumulative, and `V$SQL.ELAPSED_TIME` is measured in microseconds. Do not use those cumulative fields as A/A or before/after samples. Use the named SPA trial reports, separately extracted raw samples, and saved plan artifacts for the experiment.

### 5. Incumbent A/A and before-side baseline plus noise floor (SPA)

Create one SPA task from the inspected set. Keep the STS owner and SPA task owner as separate handoff fields.

Run `CREATE_ANALYSIS_TASK`, `SET_ANALYSIS_TASK_PARAMETER`, `EXECUTE_ANALYSIS_TASK`, and `DROP_ANALYSIS_TASK` in the task-owner session; do not pass a `task_owner` argument to those lifecycle operations. `REPORT_ANALYSIS_TASK` may use the documented `task_owner` argument when the installed release supports it. The report calls below are the only operations that may use that argument.

The account needs the `ADVISOR` privilege for SPA analysis-task interfaces, plus owner-confirmed entitlement and licensing. A DBA or task owner may own the task when the lab account cannot create it, but that owner and session must be explicit.

The five named records below are the minimal teaching shape. A formal claim needs K>=5 separately extracted raw samples per side, a complete V0 regression workload SPA pass, and the external statistical gate described below.

**MUTATING — SQL\*Plus before-side procedure.** Oracle Database 19c-compatible `DBMS_SQLPA` calls. Requires an existing `V0_EMP_WL` set owned by `&sts_owner_schema`, the `ADVISOR` privilege or owner support, and an owner-confirmed entitlement. Create and execute the task in the `&task_owner_schema` task-owner session. Expected output: one task handle, five `aa_01`–`aa_05` SPA trial reports, and five `before_01`–`before_05` SPA trial reports. These records are not automatically raw per-execution samples. This block was not executed here.

```sql
DEFINE sts_owner_schema = <sts-owner-schema>
DEFINE task_owner_schema = <task-owner-schema>
VARIABLE tname VARCHAR2(64)
EXEC :tname := DBMS_SQLPA.CREATE_ANALYSIS_TASK(
  sqlset_name => 'V0_EMP_WL',
  sqlset_owner => '&sts_owner_schema',
  description => 'V0 A/A control and before candidate'
)
EXEC DBMS_SQLPA.SET_ANALYSIS_TASK_PARAMETER(
  :tname,
  'DISABLE_MULTI_EXEC',
  'TRUE'
)
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name => :tname,
  execution_type => 'test execute',
  execution_name => 'aa_01'
)
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name => :tname,
  execution_type => 'test execute',
  execution_name => 'aa_02'
)
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name => :tname,
  execution_type => 'test execute',
  execution_name => 'aa_03'
)
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name => :tname,
  execution_type => 'test execute',
  execution_name => 'aa_04'
)
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name => :tname,
  execution_type => 'test execute',
  execution_name => 'aa_05'
)
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name => :tname,
  execution_type => 'test execute',
  execution_name => 'before_01'
)
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name => :tname,
  execution_type => 'test execute',
  execution_name => 'before_02'
)
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name => :tname,
  execution_type => 'test execute',
  execution_name => 'before_03'
)
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name => :tname,
  execution_type => 'test execute',
  execution_name => 'before_04'
)
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name => :tname,
  execution_type => 'test execute',
  execution_name => 'before_05'
)
```

The A/A and before sides use the same task, STS, bind manifest, metric, host, and database state. Do not change SQL, statistics, indexes, hints, profiles, or session controls between those ten trials.

Keep the `DISABLE_MULTI_EXEC` setting identical on both sides. The illustrative call uses the documented 19c string value `'TRUE'`; verify the installed overload and owner contract before using it. The 19c contract describes this setting as a way to execute each SQL in the STS once.

If it is unavailable, keep SPA reports labeled `SPA_TRIAL_REPORT` and mark the raw-sample gate `BLOCKED_PENDING_DECISION` until an owner-approved extraction path exists.

After each owner-approved execution, use the exact `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, applicable `instance_id`, `instance_scope_reason`, and `session_instance_id` identity in section 4; add the `instance_id` from `GV$SQL` only for a multi-instance capture, and join `session_instance_id` from the separate `V$INSTANCE` artifact, or use the saved SPA/advisor plan artifact. Save `before_01.plan` before running `before_02`; do the same for `after_01` and `rollback_01`. Do not call a no-argument cursor display a trial plan.

#### Separate SPA reports from raw samples

SPA `test execute` can repeat SQL and aggregate runtime statistics. Its named report is therefore not proof of a one-row-per-execution sample. For a formal result, use a separate owner-approved runner, trace, or report extraction that records one row per execution. Save raw output separately from SPA reports.

**ILLUSTRATIVE — raw-sample extraction contract.** Replace the runner and trace/report source with the owner-approved implementation. Every row carries the canonical `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, `instance_id`, `instance_scope_reason`, and `session_instance_id` fields. An `N/A` identity field requires its reason; unexplained N/A values are `BLOCKED_PENDING_DECISION`. Required fields:

```text
run_id,task_name,execution_name,statement_id,sql_id,child_number,parsing_schema_name,con_id,con_id_reason,instance_id,instance_scope_reason,session_instance_id,bind_case_id,metric,metric_value,unit,started_at_utc,finished_at_utc,aggregation_level,source_artifact,status
```

Note before you grep for it: `aggregation_level` is a column in **this book's evidence schema, not an Oracle column.** You populate it yourself; Oracle does not supply it, and it appears in no `V$` view. A row is raw only when `aggregation_level` is `per_execution`, the `statement_id` and `bind_case_id` identities are exact, and the source artifact is saved. A row extracted from an SPA report without that evidence remains `SPA_TRIAL_REPORT`. If the runner cannot prove one execution per row, the performance claim is `BLOCKED_PENDING_DECISION`.

#### Calculate the noise floor deterministically

For each metric, use the same simple rule.

**ILLUSTRATIVE — deterministic calculation rule, not a result.**

```text
noise_floor = max(A/A samples) - min(A/A samples)
relative_noise_floor = noise_floor / median(A/A samples)
```

Use the same metric and units on both sides. This range is the V0 teaching floor. For a formal verdict, use the canonical [K>=5 and bootstrap policy](/05-feedback-loop/02-noise-floor-and-repetition/): at least five comparable raw samples per side, 10–15 preferred, a complete V0 regression workload SPA pass per side, and an external median-difference bootstrap 95% confidence interval. A team may choose a stricter rule, but it must be written before the candidate runs.

### 6. Intervention boundary

> **Read this before you start section 6.** The incumbent state is not complete until **section 11A** has run, and 11A is further down this page under _Complete V0 regression workload_. Go and do 11A first, then come back. Skipping it means comparing the candidate against a regression baseline that does not exist, which is the one failure this lab exists to prevent.

Everything above is the incumbent state. Everything below is the candidate state. Do not hide a second change in this boundary.

The V0 example uses one candidate: an index on `employees(dept_id)`. It is a safe teaching example only when the toy-schema object owner is explicit and an authorized owner or role can create the index and recover it. The object owner is `&object_owner_schema`; it is not the SPA task owner or the STS owner. Any synthetic query using unqualified `employees` or `departments` must run with `&object_owner_schema` as the current schema or use owner-qualified names. It is not a universal first move.

#### Precheck the candidate name and columns

**ILLUSTRATIVE — SQLcl or SQL\*Plus.** Requires `SELECT` access to the owner-filtered `ALL_INDEXES`, `ALL_IND_COLUMNS`, and `ALL_TABLES` views, plus the exact `&object_owner_schema` value. Expected output before creation: `employee_table_count = 1`, `candidate_index_count = 0`, and no candidate column rows. If the name already exists, the table owner differs, or any view is unavailable, stop and obtain an owner-qualified report.

```sql
DEFINE object_owner_schema = <object-owner-schema>

SELECT COUNT(*) AS candidate_index_count
FROM ALL_INDEXES
WHERE OWNER = '&object_owner_schema'
  AND TABLE_OWNER = '&object_owner_schema'
  AND TABLE_NAME = 'EMPLOYEES'
  AND INDEX_NAME = 'IDX_EMP_DEPT_ID_CANDIDATE';

SELECT COLUMN_NAME,
       COLUMN_POSITION
FROM ALL_IND_COLUMNS
WHERE INDEX_OWNER = '&object_owner_schema'
  AND TABLE_OWNER = '&object_owner_schema'
  AND TABLE_NAME = 'EMPLOYEES'
  AND INDEX_NAME = 'IDX_EMP_DEPT_ID_CANDIDATE'
ORDER BY COLUMN_POSITION;

SELECT COUNT(*) AS employee_table_count
FROM ALL_TABLES
WHERE OWNER = '&object_owner_schema'
  AND TABLE_NAME = 'EMPLOYEES';
```

**MUTATING — SQLcl or SQL\*Plus.** Requires the object owner or an authorized DDL role with the owner-confirmed privilege to create an index in `&object_owner_schema`. Expected output: one successful DDL operation and no row change to the owner-qualified `EMPLOYEES` table. Do not run this in production.

```sql
DEFINE object_owner_schema = <object-owner-schema>

CREATE INDEX &object_owner_schema.IDX_EMP_DEPT_ID_CANDIDATE
  ON &object_owner_schema.employees (dept_id);
```

Do not assume `CREATE INDEX` and `DROP INDEX` use the same grant. The object owner, an authorized DDL role, or the DBA must confirm the privilege boundary and the exact `&object_owner_schema` target. A person who can create the candidate may not be the person authorized to recover it.

#### Verify the intended column

**ILLUSTRATIVE — SQLcl or SQL\*Plus.** Requires `SELECT` access to the owner-filtered `ALL_INDEXES` and `ALL_IND_COLUMNS` views and the exact `&object_owner_schema` value. Expected output: one index row with `status = VALID`, one column row with `column_name = DEPT_ID`, and `column_position = 1`. A name match alone is not enough; if the views or owner predicate are unavailable, stop.

```sql
DEFINE object_owner_schema = <object-owner-schema>

SELECT i.index_name,
       i.status,
       c.column_name,
       c.column_position
FROM ALL_INDEXES i
JOIN ALL_IND_COLUMNS c
  ON c.index_owner = i.owner
 AND c.index_name = i.index_name
WHERE i.owner = '&object_owner_schema'
  AND i.table_owner = '&object_owner_schema'
  AND i.table_name = 'EMPLOYEES'
  AND i.index_name = 'IDX_EMP_DEPT_ID_CANDIDATE'
ORDER BY c.column_position;
```

If the object is missing, invalid, or points at another column, stop. The candidate trial is not ready.

### 7. Capture the after side and report

Run the same STS, bind manifest, client assumptions, metric, comparison method, and `DISABLE_MULTI_EXEC` setting. Run five after-candidate SPA trial reports, compare the named before and after trials, and request the full report. These reports are not automatically raw per-execution samples.

**MUTATING — SQL\*Plus after-side procedure.** Requires the task created before the intervention in the `&task_owner_schema` task-owner session, the `ADVISOR` privilege or owner support, owner-confirmed entitlement, and permission to use `DBMS_SQLPA`. Expected output: five `after_01`–`after_05` SPA trial reports, a `cmp_elapsed` comparison, and a text report. This block was not executed here.

```sql
DEFINE sts_owner_schema = <sts-owner-schema>
DEFINE task_owner_schema = <task-owner-schema>
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name => :tname,
  execution_type => 'test execute',
  execution_name => 'after_01'
)
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name => :tname,
  execution_type => 'test execute',
  execution_name => 'after_02'
)
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name => :tname,
  execution_type => 'test execute',
  execution_name => 'after_03'
)
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name => :tname,
  execution_type => 'test execute',
  execution_name => 'after_04'
)
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name => :tname,
  execution_type => 'test execute',
  execution_name => 'after_05'
)
EXEC DBMS_SQLPA.SET_ANALYSIS_TASK_PARAMETER(
  :tname,
  'comparison_metric',
  'elapsed_time'
)
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name => :tname,
  execution_type => 'compare performance',
  execution_name => 'cmp_elapsed',
  execution_params => DBMS_ADVISOR.ARGLIST(
    'execution_name1', 'before_01',
    'execution_name2', 'after_01',
    'comparison_metric', 'elapsed_time'
  )
)
SELECT DBMS_SQLPA.REPORT_ANALYSIS_TASK(
  task_name => :tname,
  type => 'TEXT',
  level => 'TYPICAL',
  section => 'ALL',
  execution_name => 'cmp_elapsed',
  task_owner => '&task_owner_schema'
) AS report
FROM dual;
```

The final SQL*Plus query ends with a semicolon; the preceding `EXEC` lines are SQL*Plus commands in the same illustrative session. The report explicitly names `cmp_elapsed` and `&task_owner_schema`, so it cannot silently follow another task execution. Repeat the comparison with a distinct comparison name such as `cmp_elapsed_02` and pass that same `execution_name` to the report. Keep the task handle, SPA report, and separately extracted raw samples in different evidence files. A report without an owner-approved extraction contract cannot upgrade the raw-sample gate.

**ILLUSTRATIVE — SQL\*Plus transcript capture, not complete-CLOB proof.** Spooling preserves a client transcript, but SQL\*Plus formatting and CLOB display limits may truncate or alter the report. Use it as a transcript only; it does not upgrade the report artifact to complete evidence unless an approved writer verifies the CLOB.

```text
spool /approved/lab/output/cmp_elapsed.txt
SELECT DBMS_SQLPA.REPORT_ANALYSIS_TASK(
  task_name => :tname,
  type => 'TEXT',
  level => 'TYPICAL',
  section => 'ALL',
  execution_name => 'cmp_elapsed',
  task_owner => '&task_owner_schema'
) AS report
FROM dual;
spool off
```

**ILLUSTRATIVE — Python `oracledb` complete-CLOB writer.** This is an advanced artifact path, not a core-path command. It requires Python 3, the external `oracledb` package, an owner-approved connection, and a protected output directory. Populate `ORACLE_DSN`, `ORACLE_USER`, `ORACLE_PASSWORD`, `REPORT_OUTPUT_PATH`, `SPA_TASK_NAME`, `SPA_TASK_OWNER`, and `SPA_EXECUTION_NAME` through the lab's environment/secret mechanism; do not put the password in a command or save it in the repository.

```python
import os
from pathlib import Path

import oracledb

dsn = os.environ['ORACLE_DSN']
user = os.environ['ORACLE_USER']
password = os.environ['ORACLE_PASSWORD']
output_path = Path(os.environ['REPORT_OUTPUT_PATH'])
task_name = os.environ['SPA_TASK_NAME']
task_owner = os.environ['SPA_TASK_OWNER']
execution_name = os.environ['SPA_EXECUTION_NAME']

with oracledb.connect(user=user, password=password, dsn=dsn) as connection:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            SELECT DBMS_SQLPA.REPORT_ANALYSIS_TASK(
              task_name => :task_name,
              type => 'TEXT',
              level => 'TYPICAL',
              section => 'ALL',
              execution_name => :execution_name,
              task_owner => :task_owner
            ) FROM dual
            """,
            task_name=task_name,
            execution_name=execution_name,
            task_owner=task_owner,
        )
        report = cursor.fetchone()[0]
        if report is None:
            raise RuntimeError('SPA report returned NULL')
        if hasattr(report, 'read'):
            report = report.read()
        if isinstance(report, bytes):
            text = report.decode('utf-8')
        else:
            text = report if isinstance(report, str) else str(report)
        if not text:
            raise RuntimeError('SPA report returned an empty CLOB')
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(text, encoding='utf-8')
        print(
            f'report_path={output_path} report_chars={len(text)} '
            f'task={task_name} execution={execution_name}'
        )
```

Expected output is a non-empty UTF-8 report file at `REPORT_OUTPUT_PATH`, plus a line recording its path, character count, task name, and exact execution name. Use the same approved writer for each regression report. SQLcl requires an equivalent owner-approved CLOB writer; if no complete writer is available, mark the report artifact `BLOCKED_PENDING_DECISION` rather than treating a spool transcript as complete.
**ILLUSTRATIVE — 19c-safe SPA task status check.** Run this in the `task_owner_schema` session. The caller needs the owner-confirmed SPA `ADVISOR` privilege and entitlement plus `SELECT`/view access to `USER_ADVISOR_TASKS`; `ADVISOR` alone does not prove that the view is accessible. A DBA using a broader advisor view must have its owner-confirmed `SELECT` access and must not substitute another task's status.

```text
task_name,task_owner,report_execution_name,status,status_message,timeout_or_error_flag,completion_flag,checked_at_utc,client_release,source
```

Missing or unknown status is `BLOCKED_PENDING_DECISION`; do not accept a comparison merely because a report query returned text.

If the SQL\*Plus session changes, bind the existing task handle instead of creating a second task. SQLcl is not assumed here. With SQLcl, use an equivalent `var` plus anonymous PL/SQL block for each call and verify the installed client behavior; do not paste the SQL\*Plus `EXEC` lines blindly.

The [DBMS_SQLPA package reference](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html), [SQL Tuning Guide](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/), and [analysis-task guide](https://docs.oracle.com/en/database/oracle/oracle-database/19/ratug/creating-an-analysis-task.html) describe the workflow. The `[S29]` and `[S13]` markers are maintainer source IDs, not reader prerequisites; use the linked release documentation rather than inventing a release-specific API.

### 8. Compare the plan pair

Capture the plan for the exact `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, `instance_id`, `instance_scope_reason`, and `session_instance_id` used by the owner-approved runner immediately after the before trial and after the after trial; assemble `session_instance_id` from the separate `V$INSTANCE` artifact rather than treating it as a `V$SQL`/`GV$SQL` column. Each exact plan artifact must also carry `plan_hash_value`. Save the two files with matching trial names. If SPA does not leave an owner-visible cursor, use the release-supported SPA/advisor plan artifact instead of guessing a cursor identity.

Before each before/after plan display, repeat the section 4 `DISPLAY_CURSOR` instance check: connect to the exact instance recorded by the trial identity manifest, require a matching `instance_id` for a `GV$SQL` artifact, and verify `session_instance_id` with the scoped `V$INSTANCE` `SELECT`/read access described there. `STOP` if the instance scope is unknown or mismatched or that access is unavailable. The plan-pair artifact records `session_instance_id` alongside the identity fields.

**ILLUSTRATIVE — SQLcl or SQL\*Plus.** Requires a connected session, `EXECUTE` on the approved diagnostic package, and the least-privilege `SELECT` or release-approved read access to `V$INSTANCE`, `V$SQL`, `V$SQL_PLAN`, `V$SESSION`, and `V$SQL_PLAN_STATISTICS_ALL`. Expected output: an executed plan with runtime statistics when available. Replace both identity placeholders from the trial manifest.

```sql
SELECT *
FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR(
  sql_id => '<known-sql-id>',
  cursor_child_no => <known-child-number>,
  format => 'ALLSTATS LAST'
));
```

The plan artifact is not the bind manifest, but it must carry the same execution identity plus `plan_hash_value`. Redact sensitive SQL text, predicates, literals, and any bind values before sharing; keep protected values only in the owner-controlled handoff. A `plan_hash_value` change is a change, not a verdict.

**SYNTHETIC — plan-pair interpretation. These are invented plan values, not Oracle output.**

| Trial pair               | Before plan                                                                   | After plan                                                          | Synthetic interpretation                                                  | What it proves                                                  | What it does not prove                                                                         |
| ------------------------ | ----------------------------------------------------------------------------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| `before_01` / `after_01` | `TABLE ACCESS FULL`, E-Rows `1,000`, A-Rows `10,000`, `buffer_gets` `100,300` | `INDEX RANGE SCAN`, E-Rows `10`, A-Rows `4`, `buffer_gets` `60,000` | The candidate changed the access path and reduced synthetic logical work. | The plan pair explains the measured direction for this fixture. | It does not prove semantic equality, production speed, or a win for another bind or statement. |

For this fixture, the before plan read the whole table and the index examined only the four rows it needed, so the pair explains the measured direction and nothing wider.

Save `before_01.plan`, `after_01.plan`, and the report together. A `plan_hash_value` change is a change, not a verdict.

### 9. Keep raw samples and map artifacts to trials

**SYNTHETIC — owner-runner sample shape. These numbers were not observed from Oracle and are not SPA reports.** A real run must use the raw-sample extraction contract in section 5 and keep the SPA report as a separate artifact.

| Phase  | Trial       | Elapsed ms | `buffer_gets` | Plan hash  | Plan artifact    | Status    |
| ------ | ----------- | ---------: | ------------: | ---------- | ---------------- | --------- |
| A/A    | `aa_01`     |        400 |       100,000 | `P_BEFORE` | `aa_01.plan`     | completed |
| A/A    | `aa_02`     |        410 |       101,000 | `P_BEFORE` | `aa_02.plan`     | completed |
| A/A    | `aa_03`     |        395 |        99,000 | `P_BEFORE` | `aa_03.plan`     | completed |
| A/A    | `aa_04`     |        405 |       100,500 | `P_BEFORE` | `aa_04.plan`     | completed |
| A/A    | `aa_05`     |        400 |       100,200 | `P_BEFORE` | `aa_05.plan`     | completed |
| Before | `before_01` |        402 |       100,300 | `P_BEFORE` | `before_01.plan` | completed |
| Before | `before_02` |        408 |       100,800 | `P_BEFORE` | `before_02.plan` | completed |
| Before | `before_03` |        400 |       100,000 | `P_BEFORE` | `before_03.plan` | completed |
| Before | `before_04` |        412 |       101,000 | `P_BEFORE` | `before_04.plan` | completed |
| Before | `before_05` |        405 |       100,400 | `P_BEFORE` | `before_05.plan` | completed |
| After  | `after_01`  |        250 |        60,000 | `P_AFTER`  | `after_01.plan`  | completed |
| After  | `after_02`  |        255 |        61,000 | `P_AFTER`  | `after_02.plan`  | completed |
| After  | `after_03`  |        248 |        59,500 | `P_AFTER`  | `after_03.plan`  | completed |
| After  | `after_04`  |        252 |        60,500 | `P_AFTER`  | `after_04.plan`  | completed |
| After  | `after_05`  |        251 |        60,000 | `P_AFTER`  | `after_05.plan`  | completed |

**ILLUSTRATIVE — deterministic floor calculation for the synthetic table above.** This is a procedure for a real run, not a measured result.

```text
A/A elapsed range = 410 - 395 = 15 ms
Relative A/A floor = 15 / 400 = 3.75%
A/A median = 400 ms
Before median = 405 ms
After median = 251 ms
Median candidate delta = 154 ms
154 ms > 15 ms, so this invented candidate clears this invented floor
```

The samples show the shape of a repeatable direction for this synthetic fixture. They do not prove production behavior, semantics, or absence of regression. A real formal run uses its own values, an external median/bootstrap calculation, and the same trial-to-artifact map. If only SPA trial reports are available, the raw-sample and statistical gates remain `BLOCKED_PENDING_DECISION`.

### 10. Compare candidate semantic fixtures (incumbent baseline in 11A)

The incumbent semantic baseline is collected in section 11A before section 6. This section defines the shared fixture contract and runs the candidate comparison only after section 7. Do not silently create or refresh the incumbent baseline here. Save canonical text or a client-generated result hash; do not replace a result with a count alone.

#### 10A. Incumbent baseline (completed in 11A)

In section 11A, run F1–F6 on the incumbent and save `semantic-F1-incumbent.txt` through `semantic-F6-incumbent.txt` before the intervention. Those six artifacts are the semantic baseline for section 10B.

#### 10B. Candidate comparison (after section 7)

After the candidate and section 7, run the same six binds and queries, save `semantic-F1-candidate.txt` through `semantic-F6-candidate.txt`, and compare each candidate result with its incumbent artifact. A changed result is a candidate semantic failure; a missing baseline or candidate artifact is `BLOCKED_PENDING_DECISION`.

The six canonical fixtures are **F1** through **F6**, defined here and restated on the [rewrite page](/01-proven-techniques/04-let-oracle-rewrite/). This section owns them. One block below is one fixture: one statement, one bind, one expected result, and the owner boundary that says who owns the objects. Run all six on the incumbent, save the six results, then run the same six on the candidate and compare.

**SYNTHETIC — F1 null fixture.** Bind `:dept_id` to `NULL`. Expected result: exactly one row, employee `6`, with a null `dept_id` and a null `salary`. A candidate that collapses the two branches, or turns `= NULL` into `IS NULL` on the wrong side, changes which rows exist. **Owner boundary:** the object owner is `<object-owner-schema>`; this unqualified form requires that schema to be the current schema.

```sql
SELECT employee_id,
       dept_id,
       salary
FROM employees
WHERE (:dept_id IS NULL AND dept_id IS NULL)
   OR dept_id = :dept_id;
```

**SYNTHETIC — F2 duplicate fixture.** Bind `:dept_id` to `99`. Expected result: two rows, both `employee_id = 5`, `dept_id = 99`, `salary = 300`. Row order is not part of this contract; the row count and the repeated `employee_id` are. A candidate that adds `DISTINCT`, or that uses `UNION` where `UNION ALL` was intended, returns one row and fails. **Owner boundary:** the object owner is `<object-owner-schema>`; this unqualified form requires that schema to be the current schema.

```sql
SELECT employee_id,
       dept_id,
       salary
FROM employees
WHERE dept_id = :dept_id;
```

**SYNTHETIC — F3 outer-join fixture.** Bind `:employee_id` to `9`. Expected result: one row with employee `9`, department `77`, and a null `dept_name`. That row exists only because the join is a `LEFT JOIN`; moving the filter between `ON` and `WHERE` keeps or drops the null-extended row. **Owner boundary:** the object owner is `<object-owner-schema>`; this unqualified form requires that schema to be the current schema.

```sql
SELECT e.employee_id,
       e.dept_id,
       d.dept_name
FROM employees e
LEFT JOIN departments d
  ON d.dept_id = e.dept_id
WHERE e.employee_id = :employee_id
ORDER BY e.employee_id;
```

**SYNTHETIC — F4 ordering fixture.** Bind `:dept_id` to `42`. Expected result: employee IDs `3, 4, 7, 8` in exactly that order. The ordering clause is the contract, so a candidate that drops or weakens it fails even when the row set is unchanged. **Owner boundary:** the object owner is `<object-owner-schema>`; this unqualified form requires that schema to be the current schema.

```sql
SELECT employee_id,
       dept_id,
       salary
FROM employees
WHERE dept_id = :dept_id
ORDER BY employee_id;
```

**SYNTHETIC — F5 aggregate fixture with its declared tolerance.** Bind `:dept_id` to `42`. Expected result: one row with `avg_salary = 200.00`, and the comparison rule is a tolerance, not an equality: the candidate passes when the absolute difference from `200.00` is at most `0.01`. Substituting an approximate function here is a fail, not a pass. **Owner boundary:** the object owner is `<object-owner-schema>`; this unqualified form requires that schema to be the current schema.

```sql
SELECT ROUND(AVG(salary), 2) AS avg_salary
FROM employees
WHERE dept_id = :dept_id;
```

**SYNTHETIC — F6 error fixture.** Bind `:zero` to `0`. Expected result: the statement raises `ORA-01476`, divide by zero, and you record the error code and message. The bind must be the number `0`; a `NULL` bind returns `NULL` instead of raising, which is a different contract. A candidate that swallows the error into an empty result, or raises a different error, fails. **Owner boundary:** no lab object is read, so the object-owner boundary does not apply; the statement selects from `dual` only.

```sql
SELECT 1 / :zero AS must_raise_01476
FROM dual;
```

### 11. Complete V0 regression workload

**Run 11A before section 6, even though 6 prints first on this page.** The incumbent regression baseline and the write A/A floor are locked here, and section 6 is not a valid intervention boundary until they exist.

This section owns the V0 regression workload — the separate `V0_REGRESSION_WL` set, its three declared statement paths, the incumbent and candidate regression passes, and the write-cost probe they gate — so that the candidate is judged against the work the target does not cover. Record `42` as the representative aggregate case and include at least one no-match or null-equivalent case in the owner-approved `dept_id` bind family. Update the regression bind manifest and acceptance language together; do not silently substitute a literal.

Create `V0_REGRESSION_WL` with the same chosen capture mode and 19c `DBMS_SQLSET` contract, using the same owner-supplied schema/module/action filters and the three declared statement paths. The inspection gate must show `statement_count = 3` and all three statement bind contracts/cases: `REG-01` uses `dept_id`, `REG-02` uses `employee_id`, and `REG-03` uses the aggregate `dept_id` contract.

Those three paths are named here so the `PASS` gate at the end of this section is something you can actually execute rather than a name you have to take on trust. Each is a different shape on purpose: a single-row lookup by department, a single-row lookup by employee, and a per-department aggregate. A candidate that speeds up one and slows down another must be rejected, and you cannot know that without three statements.

**SKETCH — the three declared regression statement paths.** `SELECT`-only; no block here writes. These are the paths the target application issues, written against the toy fixture in section 2. If your application labels its statements differently, keep the three _shapes_ — department-keyed row lookup, employee-keyed row lookup, per-department aggregate — and record the real text in the bind manifest. Expected output shape: `REG-01` returns one department name; `REG-02` returns one employee row for most ids and **two** for `employee_id = 5`, because the fixture deliberately duplicates that row and `employees` has no primary key; `REG-03` returns one aggregate row per bind value, and no row at all for a department with no employees — so the no-match case is where it earns its place in the set.

```sql
-- REG-01: department-keyed single-row lookup. Bind: dept_id (:dept_id)
SELECT dept_name
FROM   departments
WHERE  dept_id = :dept_id;

-- REG-02: employee-keyed single-row lookup. Bind: employee_id (:employee_id)
-- Returns 2 rows for :employee_id = 5. That duplicate is a semantic fixture, not a bug.
SELECT employee_id,
       dept_id,
       salary
FROM   employees
WHERE  employee_id = :employee_id;

-- REG-03: per-department aggregate. Bind: dept_id (:dept_id)
SELECT dept_id,
       COUNT(*)        AS employee_count,
       SUM(salary)     AS salary_total,
       AVG(salary)     AS salary_mean
FROM   employees
WHERE  dept_id = :dept_id
GROUP  BY dept_id;
```

Include at least one no-match or null-equivalent case in the owner-approved bind family for each path, so a candidate cannot pass by never returning a row.

**SKETCH — regression STS collection handoff.** Inputs are `sts_owner_schema`, a `regression_cursor` of the release-documented `SQLSET_ROW` type for `REG-01`–`REG-03`, and the owner-approved bind manifest.

```sql
DEFINE sts_owner_schema = <sts-owner-schema>
SELECT COUNT(*) AS set_rows,
       COUNT(DISTINCT sql_id) AS statement_count
FROM TABLE(DBMS_SQLSET.SELECT_SQLSET(sqlset_name => 'V0_REGRESSION_WL', sqlset_owner => '&sts_owner_schema'));
```

If the application cannot label those paths, stop and ask the owner to supply a hand-curated set; do not quietly shrink the regression workload.

#### Collect a complete regression task and reports

The target `V0_EMP_WL` task is not the complete V0 regression workload. Create a separate SPA task from `V0_REGRESSION_WL`, run `CREATE_ANALYSIS_TASK`, `SET_ANALYSIS_TASK_PARAMETER`, `EXECUTE_ANALYSIS_TASK`, and `DROP_ANALYSIS_TASK` in the task-owner session, and save the task handle, owner, STS, bind manifest, and every named execution. `REPORT_ANALYSIS_TASK` may use the documented `task_owner` argument when the installed release supports it. The external per-bind runner remains the authority for bind mapping; the regression STS supplies the workload and report rows.

**MUTATING — the regression task handle, declared and assigned here.** The cleanup path in section 13 drops this task by the same bind, so the handle is created once, in the task-owner session, and never retyped by hand. Expected output: one task handle in `:reg_tname`, beside the target handle already bound as `:tname`.

```sql
DEFINE sts_owner_schema = <sts-owner-schema>
DEFINE task_owner_schema = <task-owner-schema>
VARIABLE reg_tname VARCHAR2(64)
EXEC :reg_tname := DBMS_SQLPA.CREATE_ANALYSIS_TASK(
  sqlset_name => 'V0_REGRESSION_WL',
  sqlset_owner => '&sts_owner_schema',
  description => 'V0 regression workload A/A and candidate'
)
```

**SKETCH — complete `V0_REGRESSION_WL` task/artifact path.** The two A/A and before/after calls below show the minimum named sequence. Repeat `reg_aa_01`–`reg_aa_05`, `reg_before_01`–`reg_before_05`, and `reg_after_01`–`reg_after_05` with the same owner, host, and metric. Every `reg-aa-samples.csv`, `regression-before.csv`, and `regression-after.csv` row carries `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, `instance_id`, `instance_scope_reason`, and `session_instance_id`; exact plan artifacts carry `plan_hash_value` too. Inputs are the owner-qualified regression STS, the bind manifest, the `ADVISOR` privilege, and owner-confirmed entitlement. Outputs are `reg-aa-reports/`, `regression-before.csv`, `regression-after.csv`, `regression-cmp_01.txt`, and the task handle. These three artifact names are canonical for the regression gate.

```text
side,metric,sample_count,median,a_a_noise_floor,threshold_policy,threshold_locked_at,source_artifact,calculated_at_utc,status
```

The threshold provenance is explicit: `write_elapsed_threshold` and `write_buffer_gets_threshold` are derived from the corresponding `side=incumbent` A/A floors in `write-aa-floor.csv` using the predeclared policy/materiality margin, and record the policy version, `threshold_locked_at`, and source A/A artifact. The floor artifact must either carry the same `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, `instance_id`, `instance_scope_reason`, and `session_instance_id` scope fields as its samples or point to a source artifact that resolves them; do not mix container or instance scopes. Candidate-side rows are never threshold-selection evidence.

Because this index candidate can affect writes, the write-cost probe is in scope by default. The owner must approve the transaction mode and the measurement source. If the owner excludes writes, record the exclusion and mark the performance regression gate `BLOCKED_PENDING_DECISION` rather than treating insert success as proof.
**ILLUSTRATIVE — owner-approved write-cost probe.** The incumbent write A/A samples, `write-aa-floor.csv`, and locked thresholds must already exist before the candidate. After appending the required candidate-side write A/A samples and confirming the locked thresholds remain unchanged, run the candidate write probe with at least five samples, using the same `statement_id`, `bind_case_id` set, session settings, transaction mode, and host.

```text
phase,sample,statement_id,bind_case_id,sql_id,child_number,parsing_schema_name,con_id,con_id_reason,instance_id,instance_scope_reason,session_instance_id,elapsed_ms,buffer_gets,transaction_mode,commit_outcome,rollback_outcome,postcondition_rows,started_at_utc,finished_at_utc,source_artifact,status
```

The write probe is a separate owner-approved DML runner, not an implicit substitute for SPA's DML mode. The incumbent-side A/A floor and threshold lock are already complete before the candidate. After the candidate, run the required candidate-side A/A samples, append them to `write-aa-samples.csv`, and then run the candidate write probe using the locked `write_elapsed_threshold` and `write_buffer_gets_threshold`.

Every write sample carries `con_id_reason` and `instance_scope_reason`; an unexplained N/A identity is a stop. A write-regression `PASS` requires the candidate median `elapsed_ms` and `buffer_gets` to stay within their respective thresholds, measured separately.

If a threshold, floor, required side sample, or scope reason is missing, the status is `BLOCKED_PENDING_DECISION`; a complete measurement that exceeds either threshold is `PRELIMINARY_GATE_FAILURE`.

A successful commit or rollback proves the transaction outcome, not the absence of write-cost regression.

Complete the two regression passes in this order:

#### 11A. Regression incumbent and semantic baseline (before section 6)

1. Capture/load `V0_REGRESSION_WL`, save `regression-bind-manifest.csv` with `con_id_reason`, `instance_scope_reason`, and `session_instance_id`, `regression-sts-inspection.txt`, and the owner-qualified task handle from the complete path above.
2. Run `reg_aa_01`–`reg_aa_05` on the incumbent and save the named SPA reports plus separately extracted samples keyed by `statement_id`, `bind_case_id`, `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, `instance_id`, `instance_scope_reason`, and `session_instance_id`.
3. Build `reg-aa-floor.csv` from those A/A samples; do not borrow the target STS floor.
4. Run at least five unchanged incumbent-side write A/A samples under the formal policy and save them in `write-aa-samples.csv`.
5. Calculate the incumbent rows in `write-aa-floor.csv`, lock `write_elapsed_threshold` and `write_buffer_gets_threshold` with their provenance, and do not revise them after candidate results.
6. Run `reg_before_01`–`reg_before_05`, save `regression-before.csv`, and run the baseline write probe with the same identity fields.
7. Run F1–F6 on the incumbent and save `semantic-F1-incumbent.txt` through `semantic-F6-incumbent.txt` before section 6.

#### 11B. Regression candidate comparison (after sections 7 and 10)

8. After the candidate and after-side checks, run the candidate F1–F6 comparison in section 10B and save `semantic-F1-candidate.txt` through `semantic-F6-candidate.txt`.
9. Run at least five candidate-side write A/A samples, append them to `write-aa-samples.csv`, calculate their validation floors without changing the locked thresholds, and then run the candidate write probe with the locked thresholds.
10. Run `reg_after_01`–`reg_after_05`, save `regression-after.csv` under the same task-owner schema, host, and database state.
11. Run the named candidate comparison, save `regression-cmp_01.txt` (and each repeated comparison report), and compare every `REG-01`, `REG-02`, and `REG-03` row with its own floor. A faster `REG-01` cannot cancel a slower or failing `REG-02` or `REG-03`.
12. Assemble `regression-gate.csv` from the read-regression, write-probe, semantic, and owner artifacts. If any task/report/manifest is missing, the gate is `BLOCKED_PENDING_DECISION`.

The pass artifact is `regression-gate.csv` with this header.

**ILLUSTRATIVE — artifact schema, not a captured result.**

```text
phase,task_name,task_owner,report_execution_name,trial,statement_id,sql_id,child_number,parsing_schema_name,con_id,con_id_reason,instance_id,instance_scope_reason,session_instance_id,bind_case_id,metric,value,unit,write_aa_samples_artifact,write_aa_floor_artifact,write_floor_provenance,write_materiality_margin,write_elapsed_noise_floor,write_buffer_gets_noise_floor,write_elapsed_threshold,write_buffer_gets_threshold,write_threshold_locked_at,aggregation_level,plan_hash_value,status_message,result_artifact,source_artifact,status
```

The read-regression artifact and `write-probe.csv` are separate. Every regression row carries `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, `instance_id`, `instance_scope_reason`, and `session_instance_id`; every exact plan artifact also carries `plan_hash_value`.

`PASS` requires the named owner-qualified regression task and report, a separate A/A floor for every `statement_id`/`bind_case_id` pair across `REG-01`, `REG-02`, and `REG-03`, no relevant read statement to regress beyond its floor, at least five unchanged write A/A samples per side under the formal policy, the `write-aa-floor.csv` provenance, the predeclared `write_elapsed_threshold` and `write_buffer_gets_threshold` each satisfied by separately measured candidate medians, the expected transaction outcome, no new error, and all semantic fixtures to pass.

If the candidate changes the workload, the task/report/manifest is missing, a write threshold or floor is not predeclared, the write probe is unsafe, an identity reason is missing, or either side has fewer than five samples, the status is `BLOCKED_PENDING_DECISION`.

A complete threshold failure is `PRELIMINARY_GATE_FAILURE`; neither status is a preliminary decision until the single gate.

### 12. Recovery rehearsal and candidate recovery

#### Preliminary decision gate

Do not run recovery or cleanup based on an implied final verdict. After the section 11B measurements, record exactly one preliminary decision and its evidence:

| Incoming gate status                            | Single preliminary decision | Required evidence                                                          | Next action                                                               |
| ----------------------------------------------- | --------------------------- | -------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| All semantic/read/write/measurement checks pass | `ACCEPT_CANDIDATE`          | Identity, semantics, regression/read gates, and both write thresholds pass | Preserve the candidate, rehearse recovery, then clean up before `ACCEPT`  |
| `PRELIMINARY_GATE_FAILURE`                      | `REJECT_CANDIDATE`          | A complete semantic, read, write, or measurement gate failed               | Run the rejected-candidate rollback, verify it, then clean up             |
| `BLOCKED_PENDING_DECISION`                      | `INCONCLUSIVE`              | Evidence, thresholds, samples, identity, or recovery capability is missing | Preserve the target; no rollback or destruction without an owner decision |

For `ACCEPT_CANDIDATE`, required evidence means all of: exact identity including `con_id_reason`, `instance_scope_reason`, `session_instance_id`, and `plan_hash_value`; the incumbent semantic baseline; the candidate semantic comparison; the regression and read gates; candidate-side write A/A validation completed before recovery; and separately measured write thresholds. Its next action keeps the candidate in place for the accepted-state recovery rehearsal, which runs with no post-recovery candidate A/A, and owner-approved cleanup still runs before final `ACCEPT`.

For `REJECT_CANDIDATE`, a complete failed gate includes a predeclared write threshold failure, and its next action runs the rejected-candidate rollback, verifies recovery, and then performs owner-approved cleanup before final `REJECT`.

For `INCONCLUSIVE`, do not run rejected rollback or accepted-state destruction without a separate owner decision.

The preliminary decision is not `ACCEPT`, `REJECT`, or the final `INCONCLUSIVE` verdict. It authorizes the next recovery path only.

#### Accepted-candidate clone rehearsal (required after `ACCEPT_CANDIDATE` and before final `ACCEPT`)

Run this rehearsal on a fresh owner-supplied **writable clone or explicitly write-enabled snapshot** after preliminary `ACCEPT_CANDIDATE` and before final `ACCEPT`. Candidate application, complete candidate-side validation, and the write-cost probe require write capability.

The rehearsal copies the target's predeclared write floors and locked thresholds, proves the same threshold/floor provenance was used, and validates candidate-side write A/A results against those copied thresholds before recovery. All candidate-side A/A is complete before the recovery step; step 5 does not request another candidate block.

A read-only snapshot can preserve baseline evidence, but it cannot satisfy this rehearsal gate. This rehearsal tests recovery of the accepted state; it does not turn the target run into a new result. The target remains unchanged while the clone is rehydrated and tested.

**PLACEHOLDER — owner/release-provided clone rehydration.** No safe generic restore command is assumed. The lab owner supplies the clone identity, source snapshot, connection, and release-specific rehydration procedure.

```text
CLONE_ID=<owner-supplied-clone-id>
SOURCE_SNAPSHOT_ID=<owner-supplied-source-snapshot-id>
CLONE_CONNECTION=<owner-approved-clone-connection>
WRITE_CAPABILITY=<writable-clone-or-write-enabled-snapshot>
REHYDRATE_COMMAND=<owner/release-provided command>
```

Use this sequence and save one rehearsal manifest:

1. Rehydrate the clone with the owner-provided command. Record `CLONE_ID`, source snapshot ID, source database identity when available, clone release, connection reference, `WRITE_CAPABILITY`, operator, and UTC rehydration start/end.
2. Verify the clone identity, schema owner, write capability, fixture row counts, and release banner before measuring. A read-only snapshot may preserve baseline evidence but cannot pass the candidate-application or write-cost rehearsal. Do not assume a restored clone has the same service, PDB, statistics, or task state as the target.
3. In the clone, copy the target predeclared write A/A floor artifact, floor provenance, `write_elapsed_threshold`, `write_buffer_gets_threshold`, and `write_threshold_locked_at` into the rehearsal record before applying the candidate. Verify the copied values and timestamp; do not recompute or revise the target thresholds in the clone. Capture the incumbent STS and exact plan, run the A/A noise baseline, run F1–F6 as the incumbent semantic baseline, run the complete V0 regression workload baseline with per-statement A/A floors, and run the incumbent write A/A and write-cost probe.
4. Apply the one candidate on the clone and complete the entire candidate-side validation before recovery. Capture the after-side samples and exact candidate plan, compare F1–F6 with the incumbent semantic baseline, run the complete candidate regression workload and per-statement comparison, run at least five candidate-side write A/A samples, calculate their validation floors without changing the copied target thresholds, and run the candidate write probe using the copied `write_elapsed_threshold` and `write_buffer_gets_threshold`.

   Record the candidate semantic, plan, regression, write A/A, validation-floor, write-probe, threshold, and floor-provenance artifacts and statuses.

   Set `candidate_side_aa_completed_before_recovery = YES`; the candidate-side A/A block is complete at the end of this step and is not requested again after recovery.

5. Run the candidate's recovery primitive once on the clone, then verify the post-recovery incumbent state; do not reapply the candidate. Confirm the recovery postcondition and that the incumbent object, plan, and behavior are restored.

   Rerun or verify F1–F6 semantic fixtures, capture and compare the post-recovery incumbent plan with the pre-recovery incumbent plan, rerun or verify the incumbent A/A noise baseline, rerun the complete V0 regression workload and its incumbent-side per-statement A/A floors, and run the incumbent-side write probe to verify elapsed/buffer-gets and transaction outcomes against the pre-recovery incumbent floor.

   Record the recovery command/status and separate post-recovery incumbent-state, semantic, plan, noise, regression, and write-outcome artifacts and statuses.

   Set `candidate_reapplied_after_recovery = NO`; do not reapply the candidate unless the owner separately requests a second transition, which must be recorded as a new rehearsal/run. Candidate-side A/A from step 4 is already complete and is not rerun after recovery.

   The clone rehearsal is a recovery test; it does not require an `ACCEPT` result and a rejected-only rollback cannot satisfy this gate.

6. Keep the clone, or destroy it only under the lab owner's retention decision. Save the complete manifest even when the clone is released.

**ILLUSTRATIVE — accepted-state rehearsal artifact schema, not a captured result.**

```text
rehearsal_id,clone_id,source_snapshot_id,source_db_id,clone_release,write_capability,rehydrated_at_utc,operator,connection_ref,sql_id,child_number,parsing_schema_name,con_id,con_id_reason,instance_id,instance_scope_reason,session_instance_id,pre_recovery_incumbent_state_artifact,pre_recovery_incumbent_plan_artifact,pre_recovery_noise_artifact,pre_recovery_regression_artifact,pre_recovery_write_artifact,baseline_artifact,candidate_artifact,after_regression_artifact,semantic_artifact,target_write_aa_floor_artifact,target_write_floor_provenance,target_write_materiality_margin,target_write_elapsed_noise_floor,target_write_buffer_gets_noise_floor,target_write_elapsed_threshold,target_write_buffer_gets_threshold,target_write_threshold_locked_at,candidate_write_aa_samples_artifact,candidate_write_aa_floor_artifact,candidate_write_floor_provenance,clone_write_elapsed_threshold_used,clone_write_buffer_gets_threshold_used,clone_write_threshold_locked_at,candidate_write_aa_status,candidate_side_aa_completed_before_recovery,write_threshold_match_status,write_floor_provenance_match_status,write_probe_artifact,write_probe_status,recovery_primitive_artifact,recovery_status,post_recovery_incumbent_state_artifact,post_recovery_plan_artifact,post_recovery_semantic_artifact,post_recovery_noise_artifact,post_recovery_regression_artifact,post_recovery_write_artifact,post_recovery_write_outcome_status,candidate_reapplied_after_recovery,post_recovery_status,status,notes
```

The rehearsal is complete only when clone identity and write capability are recorded, rehydration is evidenced, the baseline and candidate artifacts are separate, and step 4's candidate-side A/A, semantic, plan, regression, and write validation is complete using the copied target thresholds and floor provenance.

Step 5's recovery primitive and post-recovery incumbent-state, semantic, plan, noise, regression, and write-outcome artifacts and statuses must all be present and pass; `candidate_write_aa_status` and `post_recovery_status` must be `PASS`, `candidate_side_aa_completed_before_recovery` must be `YES`, `candidate_reapplied_after_recovery` must be `NO` unless a separately approved second transition is recorded, and `write_threshold_match_status` plus `write_floor_provenance_match_status` must be `PASS`.

A missing value, changed threshold or floor provenance, unexplained N/A scope, failed post-recovery incumbent check, or read-only target is `INCONCLUSIVE`, not a passing rehearsal. Candidate-side A/A is never requested after recovery.

#### Rejected-candidate rollback after `REJECT_CANDIDATE`

Run this subsection on the target only after preliminary `REJECT_CANDIDATE` is recorded. Do not run rollback DDL before that preliminary decision. If the preliminary decision is `ACCEPT_CANDIDATE` or `INCONCLUSIVE`, do not run rejected-candidate rollback; preserve the target unless the owner separately approves another state change.

A rejected-candidate rollback is not the accepted-state clone rehearsal and cannot by itself produce final `ACCEPT`. For this V0 index, the recovery primitive is the matching drop.

The object owner is `&object_owner_schema`; an authorized DDL role or DBA must have the owner-confirmed `DROP ANY INDEX` privilege, and the create and drop grants are not assumed to be identical.

Before dropping anything, check the explicit object owner and the owner-filtered index count. Run the `DROP INDEX` only when `candidate_index_count = 1`. If it is `0`, record `already_absent` and do not run the DDL again. If it is greater than one, the name is ambiguous, the owner predicate cannot be verified, or the owner cannot authorize the privilege, stop.

**ILLUSTRATIVE — SQL\*Plus rollback precondition.** Requires `SELECT` access to `ALL_INDEXES` and the exact `&object_owner_schema` value. Expected output: the session identity, expected object owner, and one candidate-index count.

```sql
DEFINE object_owner_schema = <object-owner-schema>

SELECT USER AS session_user,
       '&object_owner_schema' AS expected_object_owner
FROM dual;

SELECT COUNT(*) AS candidate_index_count
FROM ALL_INDEXES
WHERE OWNER = '&object_owner_schema'
  AND TABLE_OWNER = '&object_owner_schema'
  AND TABLE_NAME = 'EMPLOYEES'
  AND INDEX_NAME = 'IDX_EMP_DEPT_ID_CANDIDATE';
```

**MUTATING — SQL\*Plus conditional rollback DDL.** Requires the object owner or an authorized role with the owner-confirmed drop privilege and a prior owner-filtered count of exactly one. `SET SERVEROUTPUT ON` is required for the status line. Expected output: `candidate_index_dropped` after a successful drop, or `already_absent` when the owner-filtered count is zero. Execute only in the toy or approved non-production target.

```sql
DEFINE object_owner_schema = <object-owner-schema>
SET SERVEROUTPUT ON
DECLARE
  candidate_count NUMBER;
BEGIN
  SELECT COUNT(*)
    INTO candidate_count
  FROM ALL_INDEXES
  WHERE OWNER = '&object_owner_schema'
    AND TABLE_OWNER = '&object_owner_schema'
    AND TABLE_NAME = 'EMPLOYEES'
    AND INDEX_NAME = 'IDX_EMP_DEPT_ID_CANDIDATE';

  IF candidate_count = 0 THEN
    DBMS_OUTPUT.PUT_LINE('already_absent');
  ELSIF candidate_count = 1 THEN
    EXECUTE IMMEDIATE 'DROP INDEX &object_owner_schema.IDX_EMP_DEPT_ID_CANDIDATE';
    DBMS_OUTPUT.PUT_LINE('candidate_index_dropped');
  ELSE
    RAISE_APPLICATION_ERROR(-20001, 'Ambiguous candidate index count');
  END IF;
END;
/
```

Run the post-rollback dictionary check.

**ILLUSTRATIVE — SQLcl or SQL\*Plus.** Requires `SELECT` access to the owner-filtered `ALL_INDEXES` and `ALL_IND_COLUMNS` views and the exact `&object_owner_schema` value. Expected output: zero index rows and zero column rows for the candidate name. If the views or owner predicate are unavailable, stop.

```sql
DEFINE object_owner_schema = <object-owner-schema>

SELECT i.index_name,
       i.status,
       c.column_name,
       c.column_position
FROM ALL_INDEXES i
LEFT JOIN ALL_IND_COLUMNS c
  ON c.index_owner = i.owner
 AND c.index_name = i.index_name
WHERE i.owner = '&object_owner_schema'
  AND i.table_owner = '&object_owner_schema'
  AND i.table_name = 'EMPLOYEES'
  AND i.index_name = 'IDX_EMP_DEPT_ID_CANDIDATE'
ORDER BY c.column_position;
```

After a successful drop, record `candidate_index_dropped` and run the post-rollback workload, plan, semantic, and write checks. If the precondition was `already_absent`, record that result and run the same checks without repeating the DDL. Do not stop at a successful `DROP INDEX` alone.

**MUTATING — SQL\*Plus post-rollback procedure.** Requires the existing task handle, the same `&task_owner_schema` task-owner session, and the same approved package access. Run `CREATE_ANALYSIS_TASK`, `SET_ANALYSIS_TASK_PARAMETER`, `EXECUTE_ANALYSIS_TASK`, and `DROP_ANALYSIS_TASK` in that task-owner session. If the report is collected from another authorized session, only the documented `REPORT_ANALYSIS_TASK` call may use its `task_owner` argument; verify the installed release contract. Expected output: five `rollback_01`–`rollback_05` SPA trial reports on the same STS and bind manifest; keep any separately extracted raw samples in their own artifact.

```sql
DEFINE sts_owner_schema = <sts-owner-schema>
DEFINE task_owner_schema = <task-owner-schema>
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name => :tname,
  execution_type => 'test execute',
  execution_name => 'rollback_01'
)
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name => :tname,
  execution_type => 'test execute',
  execution_name => 'rollback_02'
)
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name => :tname,
  execution_type => 'test execute',
  execution_name => 'rollback_03'
)
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name => :tname,
  execution_type => 'test execute',
  execution_name => 'rollback_04'
)
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(
  task_name => :tname,
  execution_type => 'test execute',
  execution_name => 'rollback_05'
)
```

Use the `DISPLAY_CURSOR` block in section 8 immediately after `rollback_01`, after repeating the exact instance-session check with the scoped `V$INSTANCE` `SELECT`/read access needed to produce `session_instance_id`. If the rollback identity is from `GV$SQL`, connect to its recorded `instance_id`; if that instance scope is unknown or mismatched, or the required `V$INSTANCE` access is unavailable, `STOP`.

Capture `rollback_01.plan` with the exact `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, `instance_id`, `instance_scope_reason`, `session_instance_id`, and `plan_hash_value`; keep the rollback SPA reports separate, and save the separately extracted rollback samples with the same `statement_id`, `bind_case_id`, `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, `instance_id`, `instance_scope_reason`, and `session_instance_id` fields.

Run F1–F6 again and save `semantic-rollback.csv`. The rollback passes only when the candidate object is absent, the workload completes, the plan and behavior are recorded, the semantic fixtures pass, and the regression gate has no new failure. A different `plan_hash_value` after rollback is an observation, not an automatic failure; unexplained behavior is `INCONCLUSIVE`.

For another intervention, use its own recovery primitive: discard pending statistics, restore the saved SQL text, disable the plan control, or remove the profile. Do not copy the index rollback into another class. Record whether recovery restored the prior plan and behavior, and whether any side effect remains.

### 13. Final lab cleanup (default preserve accepted state)

Final cleanup is not candidate rollback. Run it only after the preliminary decision and the corresponding recovery/rehearsal path, while retaining evidence; the final verdict follows cleanup.

- After `REJECT_CANDIDATE`, section 12 owns the candidate-index rollback. Do not repeat that index drop during final cleanup.
- After `ACCEPT_CANDIDATE`, preserve the candidate index and the toy tables by default. Remove them only under a separate owner-approved decision to destroy the accepted state.
- After preliminary `INCONCLUSIVE`, preserve the target and disposable objects unless the owner separately approves cleanup.

**Canonical owner/session rule.** For ordinary cleanup, object-owner work uses the explicit `&object_owner_schema` session or an authorized DDL role/DBA with the owner-confirmed DDL privilege; task drops run in `&task_owner_schema`; STS drops run in `&sts_owner_schema` or use the documented `sqlset_owner` argument. For accepted-state destruction, the same `&object_owner_schema` boundary and owner-confirmed `DROP ANY INDEX`/`DROP ANY TABLE` privilege apply, but only under the separate destruction approval, read-only dependency preflight, and one-DDL-step-at-a-time contract. No role or DBA silently substitutes another schema.
**PLACEHOLDER — conditional final-cleanup preflight.** Run object checks against the explicit `&object_owner_schema` using owner-filtered `ALL_*` views, then run task-existence checks in the `&task_owner_schema` session. The object owner, STS owner, and task owner are separate boundaries.

```sql
DEFINE object_owner_schema = <object-owner-schema>
DEFINE sts_owner_schema = <sts-owner-schema>
DEFINE task_owner_schema = <task-owner-schema>

SELECT USER AS session_user,
       '&object_owner_schema' AS expected_object_owner
FROM dual;

SELECT COUNT(*) AS candidate_index_count
FROM ALL_INDEXES
WHERE OWNER = '&object_owner_schema'
  AND TABLE_OWNER = '&object_owner_schema'
  AND TABLE_NAME = 'EMPLOYEES'
  AND INDEX_NAME = 'IDX_EMP_DEPT_ID_CANDIDATE';

SELECT COUNT(*) AS employee_table_count
FROM ALL_TABLES
WHERE OWNER = '&object_owner_schema'
  AND TABLE_NAME = 'EMPLOYEES';

SELECT COUNT(*) AS department_table_count
FROM ALL_TABLES
WHERE OWNER = '&object_owner_schema'
  AND TABLE_NAME = 'DEPARTMENTS';
```

**ILLUSTRATIVE — task-owner existence check.** Run this second block in the `task_owner_schema` session, with the task handles already bound. A row is required for each task before its matching drop; an absent row is an ordinary-cleanup `already_absent` result, not a reason to skip the separate regression task record.

```sql
DEFINE task_owner_schema = <task-owner-schema>
SELECT TASK_NAME,
       STATUS,
       STATUS_MESSAGE
FROM USER_ADVISOR_TASKS
WHERE TASK_NAME = :tname;

SELECT TASK_NAME,
       STATUS,
       STATUS_MESSAGE
FROM USER_ADVISOR_TASKS
WHERE TASK_NAME = :reg_tname;
```

Use the owner/catalog check to decide whether the task and each STS still exist, then run each cleanup action once:

- In the `task_owner_schema` session, check `USER_ADVISOR_TASKS` for both `:tname` and `:reg_tname`. Drop each task only when its exact task row exists; record an ordinary-cleanup `already_absent` result when a task is already gone, and never leave the separate regression task behind. Do not pass `task_owner` to either drop operation.
- Run the owner-qualified `DBMS_SQLSET.DROP_SQLSET` calls for `V0_REGRESSION_WL` and `V0_EMP_WL` only in the `sts_owner` session or with the documented `sqlset_owner` argument, and only when no client reference remains.
- Leave the accepted candidate index and toy tables in place unless the separate accepted-state destruction decision below is approved.
- Do not repeat the candidate-index drop from section 12. The rejected-candidate rollback record owns that state transition.

**MUTATING — SQL\*Plus task-owner conditional cleanup.** Run this block only in the `task_owner_schema` session after the task-existence preflight. It checks each exact task row, drops only a proven existing task, and records `already_absent` for an ordinary cleanup that finds it gone. `SET SERVEROUTPUT ON` is required for the status lines.

```sql
SET SERVEROUTPUT ON
DECLARE
  target_task_count NUMBER;
  regression_task_count NUMBER;
BEGIN
  SELECT COUNT(*)
    INTO target_task_count
  FROM USER_ADVISOR_TASKS
  WHERE TASK_NAME = :tname;

  SELECT COUNT(*)
    INTO regression_task_count
  FROM USER_ADVISOR_TASKS
  WHERE TASK_NAME = :reg_tname;

  IF target_task_count = 0 THEN
    DBMS_OUTPUT.PUT_LINE('target_task_already_absent');
  ELSIF target_task_count = 1 THEN
    DBMS_SQLPA.DROP_ANALYSIS_TASK(:tname);
    DBMS_OUTPUT.PUT_LINE('target_task_dropped');
  ELSE
    RAISE_APPLICATION_ERROR(-20011, 'Ambiguous target task count');
  END IF;

  IF regression_task_count = 0 THEN
    DBMS_OUTPUT.PUT_LINE('regression_task_already_absent');
  ELSIF regression_task_count = 1 THEN
    DBMS_SQLPA.DROP_ANALYSIS_TASK(:reg_tname);
    DBMS_OUTPUT.PUT_LINE('regression_task_dropped');
  ELSE
    RAISE_APPLICATION_ERROR(-20012, 'Ambiguous regression task count');
  END IF;
END;
/
```

Run the STS-owner cleanup only in the `sts_owner_schema` session, after the object preflight and an owner-approved ordinary-cleanup record. `SET SERVEROUTPUT ON` is required for the status lines.
The [19c SQL Tuning Guide](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/managing-sql-tuning-sets.html) documents the owner view `USER_SQLSET` with `NAME` and `STATEMENT_COUNT`, so the block below checks existence and the expected statement count before any `DROP_SQLSET`; it does not call `SELECT_SQLSET` during cleanup.
Expected output: `regression_set_dropped` and `target_set_dropped`, one `*_already_absent` line per set that is already gone, or `ORA-20021`/`ORA-20022` when a set exists with an ambiguous name or an unexpected statement count.
An unexpected statement count stops the run rather than dropping a set you did not recognize.

**MUTATING — SQL\*Plus STS-owner existence-and-statement-count precheck and conditional drop.** It reads `USER_SQLSET` once, before the drop, and drops each named set only when it exists with the expected statement count. It does not re-read the view afterward; the `*_dropped` and `*_already_absent` lines are the cleanup record.

```sql
DEFINE sts_owner_schema = <sts-owner-schema>
SET SERVEROUTPUT ON
DECLARE
  regression_set_count NUMBER;
  regression_set_rows  NUMBER;
  target_set_count      NUMBER;
  target_set_rows       NUMBER;
BEGIN
  SELECT COUNT(*),
         NVL(SUM(STATEMENT_COUNT), 0)
    INTO regression_set_count,
         regression_set_rows
  FROM USER_SQLSET
  WHERE NAME = 'V0_REGRESSION_WL';

  SELECT COUNT(*),
         NVL(SUM(STATEMENT_COUNT), 0)
    INTO target_set_count,
         target_set_rows
  FROM USER_SQLSET
  WHERE NAME = 'V0_EMP_WL';

  IF regression_set_count = 0 THEN
    DBMS_OUTPUT.PUT_LINE('regression_set_already_absent');
  ELSIF regression_set_count = 1 AND regression_set_rows = 3 THEN
    DBMS_SQLSET.DROP_SQLSET(sqlset_name => 'V0_REGRESSION_WL');
    DBMS_OUTPUT.PUT_LINE('regression_set_dropped');
  ELSE
    RAISE_APPLICATION_ERROR(-20021, 'Regression set ambiguous or unexpected statement count');
  END IF;

  IF target_set_count = 0 THEN
    DBMS_OUTPUT.PUT_LINE('target_set_already_absent');
  ELSIF target_set_count = 1 AND target_set_rows = 1 THEN
    DBMS_SQLSET.DROP_SQLSET(sqlset_name => 'V0_EMP_WL');
    DBMS_OUTPUT.PUT_LINE('target_set_dropped');
  ELSE
    RAISE_APPLICATION_ERROR(-20022, 'Target set ambiguous or unexpected statement count');
  END IF;
END;
/
```

The expected statement counts are the ones section 3 sets: one for `V0_EMP_WL` and three for `V0_REGRESSION_WL`. Stop spooling before leaving the session, retain only approved redacted artifacts, and securely delete transient output according to lab policy. For the optional container path, stop the container and remove its volume only under the owner's retention and data-deletion decision. Real customer rows, production credentials, and unredacted bind values must never be copied into the evidence pack. Final cleanup is an owner-approved state change, not an automatic cleanup step.

#### Optional owner-approved destruction of accepted state

This is a separate state-destruction decision, not rejected-candidate rollback and not the default final cleanup. The default is to preserve the accepted candidate and toy tables.

Do not run any DDL below until the owner has recorded a separate destruction approval, the accepted-state clone rehearsal is complete, the read-only preflight below matches the exact expected objects, and the owner-provided `dependency-attestation` artifact is `PASS` for the exact owner and object scope.

`ALL_DEPENDENCIES` is one signal, not complete dependency proof. Idempotent zero-count handling is reserved for ordinary final cleanup and rejected-candidate rollback; it is not allowed in this approved accepted-state destruction path.
**PLACEHOLDER — read-only accepted-state destruction preflight.** Run against the explicit `&object_owner_schema`. It requires owner-confirmed `SELECT` access to `ALL_OBJECTS`, `ALL_INDEXES`, `ALL_IND_COLUMNS`, `ALL_TABLES`, `ALL_TAB_COLUMNS`, and `ALL_DEPENDENCIES`.

```sql
DEFINE object_owner_schema = <object-owner-schema>

SELECT USER AS session_user,
       '&object_owner_schema' AS expected_object_owner
FROM dual;

SELECT OBJECT_NAME,
       OBJECT_TYPE,
       STATUS
FROM ALL_OBJECTS
WHERE OWNER = '&object_owner_schema'
  AND OBJECT_NAME IN ('IDX_EMP_DEPT_ID_CANDIDATE', 'EMPLOYEES', 'DEPARTMENTS')
ORDER BY OBJECT_NAME, OBJECT_TYPE;

SELECT I.INDEX_NAME,
       I.TABLE_NAME,
       I.UNIQUENESS,
       I.STATUS,
       C.COLUMN_NAME,
       C.COLUMN_POSITION
FROM ALL_INDEXES I
LEFT JOIN ALL_IND_COLUMNS C
  ON C.INDEX_OWNER = I.OWNER
 AND C.INDEX_NAME = I.INDEX_NAME
WHERE I.OWNER = '&object_owner_schema'
  AND I.TABLE_OWNER = '&object_owner_schema'
  AND I.TABLE_NAME = 'EMPLOYEES'
  AND I.INDEX_NAME = 'IDX_EMP_DEPT_ID_CANDIDATE'
ORDER BY C.COLUMN_POSITION;

SELECT TABLE_NAME,
       COLUMN_NAME,
       COLUMN_ID,
       DATA_TYPE
FROM ALL_TAB_COLUMNS
WHERE OWNER = '&object_owner_schema'
  AND TABLE_NAME IN ('EMPLOYEES', 'DEPARTMENTS')
ORDER BY TABLE_NAME, COLUMN_ID;

SELECT COUNT(*) AS actual_dependency_count,
       COUNT(CASE
               WHEN REFERENCED_OWNER = '&object_owner_schema'
               THEN 1
             END) AS owner_visible_dependency_count,
       COUNT(CASE
               WHEN REFERENCED_OWNER <> '&object_owner_schema'
               THEN 1
             END) AS cross_schema_dependency_count
FROM ALL_DEPENDENCIES
WHERE (OWNER = '&object_owner_schema'
       AND NAME IN ('IDX_EMP_DEPT_ID_CANDIDATE', 'EMPLOYEES', 'DEPARTMENTS'))
   OR (REFERENCED_OWNER = '&object_owner_schema'
       AND REFERENCED_NAME IN ('IDX_EMP_DEPT_ID_CANDIDATE', 'EMPLOYEES', 'DEPARTMENTS'));

SELECT OWNER,
       NAME,
       TYPE,
       REFERENCED_OWNER,
       REFERENCED_NAME,
       REFERENCED_TYPE,
       DEPENDENCY_TYPE
FROM ALL_DEPENDENCIES
WHERE (OWNER = '&object_owner_schema'
       AND NAME IN ('IDX_EMP_DEPT_ID_CANDIDATE', 'EMPLOYEES', 'DEPARTMENTS'))
   OR (REFERENCED_OWNER = '&object_owner_schema'
       AND REFERENCED_NAME IN ('IDX_EMP_DEPT_ID_CANDIDATE', 'EMPLOYEES', 'DEPARTMENTS'))
ORDER BY OWNER, NAME, REFERENCED_OWNER, REFERENCED_NAME;
```

The expected identity is one `VALID`, `NONUNIQUE` index named `IDX_EMP_DEPT_ID_CANDIDATE` on `EMPLOYEES`, with exactly one indexed column `DEPT_ID` at position `1`, plus the declared toy columns for `EMPLOYEES` and `DEPARTMENTS`.

The toy accepted-state dependency contract declares `expected_dependency_set = []`, `expected_dependency_count = 0`, and `expected_cross_schema_dependency_count = 0` as expected signals, not complete proof.

The `ALL_DEPENDENCIES` count and detail queries remain required, especially rows whose `REFERENCED_OWNER` is a different schema; `USER_DEPENDENCIES` is not a substitute. A zero `ALL_DEPENDENCIES` count or zero rows alone is insufficient for accepted-destruction `PASS`.

The owner-provided `dependency-attestation` artifact must be `PASS`, cover constraints/foreign keys, triggers, views/materialized views, grants/synonyms, and external references, and identify the exact owner and `IDX_EMP_DEPT_ID_CANDIDATE`/`EMPLOYEES`/`DEPARTMENTS` scope; it must be attached to the exact connection and release.

Any missing or failed attestation, changed scope, nonzero dependency, external dependency, unexpected same-owner row, owner mismatch, unavailable view, or unavailable owner report is `STOP`/`INCONCLUSIVE`.

A valid accepted-destruction `PASS` is not `already_absent`; idempotent `already_absent` handling is reserved for ordinary cleanup only. Do not infer that a dependency is safe because the object name matches.

**ILLUSTRATIVE — accepted-state destruction preflight artifact schema, not a result.**

```text
destruction_approval_id,object_owner,connection_ref,release,object_name,object_type,object_status,definition,expected_dependency_set,expected_dependency_count,expected_cross_schema_dependency_count,actual_dependency_count,owner_visible_dependency_count,cross_schema_dependency_count,dependency_owner,dependency_name,dependency_type,referenced_owner,referenced_name,referenced_type,dependency_attestation_artifact,dependency_attestation_id,dependency_attestation_status,dependency_attestation_stop_reason,preflight_status,checked_at_utc
```

**ILLUSTRATIVE — owner-provided `dependency-attestation` artifact schema, not a result.**

```text
dependency_attestation_id,object_owner,owner_scope,connection_ref,release,checked_at_utc,target_object_scope,constraints_foreign_keys_checked,triggers_checked,views_checked,materialized_views_checked,grants_checked,synonyms_checked,external_references_checked,constraint_foreign_key_evidence,trigger_evidence,view_evidence,materialized_view_evidence,grant_evidence,synonym_evidence,external_reference_evidence,attestor,dependency_attestation_status,dependency_attestation_stop_reason,notes
```

The owner-provided `dependency-attestation` artifact must identify the exact owner and object scope and the evidence source for constraints/foreign keys, triggers, views/materialized views, grants/synonyms, and external references. Set `dependency_attestation_status` to `PASS` only when each check is evidenced; otherwise set it to `STOP` and record `dependency_attestation_stop_reason`. Do not synthesize it from `ALL_DEPENDENCIES`; a zero count is only one signal.

**PLACEHOLDER — separate destruction approval record.** This is a decision artifact, not a SQL or DDL block. Approval must identify the exact connection, objects, clone rehearsal, approver, and UTC timestamp.

```text
DESTRUCTION_APPROVAL_ID=<owner-supplied-approval-id>
DESTRUCTION_APPROVER=<owner-supplied-approver>
DESTRUCTION_APPROVED_AT_UTC=<owner-supplied-UTC>
DESTRUCTION_TARGET_CONNECTION=<owner-approved-connection>
DESTRUCTION_TARGET_INDEX=IDX_EMP_DEPT_ID_CANDIDATE
DESTRUCTION_TARGET_TABLES=EMPLOYEES,DEPARTMENTS
CLONE_REHEARSAL_ID=<completed-rehearsal-id>
DEPENDENCY_ATTESTATION_ARTIFACT=dependency-attestation.csv
DEPENDENCY_ATTESTATION_ID=<owner-supplied-attestation-id>
DEPENDENCY_ATTESTATION_OWNER_SCOPE=&object_owner_schema:IDX_EMP_DEPT_ID_CANDIDATE,EMPLOYEES,DEPARTMENTS
DEPENDENCY_ATTESTATION_STATUS=PASS
DEPENDENCY_ATTESTATION_STOP_REASON=NONE
EXPECTED_DEPENDENCY_SET=[]
EXPECTED_DEPENDENCY_COUNT=0
EXPECTED_CROSS_SCHEMA_DEPENDENCY_COUNT=0
PREFLIGHT_STATUS=PASS
```

#### Step 1: destroy the accepted index, then verify

**ILLUSTRATIVE — SQL\*Plus accepted-state destruction step 1.** `SET SERVEROUTPUT ON` is required for the `DBMS_OUTPUT` status line. Re-run the relevant owner-filtered identity/dependency preflight immediately before this one DDL step, and verify that the attached `dependency-attestation` artifact is still `PASS` for the exact target scope; any mismatch stops. The object owner is `&object_owner_schema`; an authorized role or DBA must have the owner-confirmed drop privilege. Run it only after the approval, preflight, and `PASS` attestation are recorded. Oracle DDL implicitly commits; this step is not atomic with steps 2 or 3.

```sql
DEFINE object_owner_schema = <object-owner-schema>

SELECT COUNT(*) AS candidate_index_count
FROM ALL_INDEXES
WHERE OWNER = '&object_owner_schema'
  AND TABLE_OWNER = '&object_owner_schema'
  AND TABLE_NAME = 'EMPLOYEES'
  AND INDEX_NAME = 'IDX_EMP_DEPT_ID_CANDIDATE';

SELECT COLUMN_NAME,
       COLUMN_POSITION
FROM ALL_IND_COLUMNS
WHERE INDEX_OWNER = '&object_owner_schema'
  AND TABLE_OWNER = '&object_owner_schema'
  AND TABLE_NAME = 'EMPLOYEES'
  AND INDEX_NAME = 'IDX_EMP_DEPT_ID_CANDIDATE'
ORDER BY COLUMN_POSITION;

SELECT COUNT(*) AS actual_dependency_count
FROM ALL_DEPENDENCIES
WHERE (OWNER = '&object_owner_schema'
       AND NAME IN ('IDX_EMP_DEPT_ID_CANDIDATE', 'EMPLOYEES', 'DEPARTMENTS'))
   OR (REFERENCED_OWNER = '&object_owner_schema'
       AND REFERENCED_NAME IN ('IDX_EMP_DEPT_ID_CANDIDATE', 'EMPLOYEES', 'DEPARTMENTS'));
```

#### Step 2: destroy `EMPLOYEES`, then verify

**ILLUSTRATIVE — SQL\*Plus accepted-state destruction step 2.** Re-run the relevant owner-filtered `EMPLOYEES` identity/dependency preflight immediately before this one DDL step, and verify that the attached `dependency-attestation` artifact remains `PASS` for the exact target scope; any mismatch stops. The object owner is `&object_owner_schema`; an authorized role or DBA must have the owner-confirmed table-drop privilege. Run only after step 1 passed and its postcondition is saved. This is a separate implicit-commit DDL step.

```sql
DEFINE object_owner_schema = <object-owner-schema>

SELECT COUNT(*) AS employee_table_count
FROM ALL_TABLES
WHERE OWNER = '&object_owner_schema'
  AND TABLE_NAME = 'EMPLOYEES';

SELECT COUNT(*) AS employee_object_count
FROM ALL_OBJECTS
WHERE OWNER = '&object_owner_schema'
  AND OBJECT_NAME = 'EMPLOYEES';

SELECT COUNT(*) AS employee_dependency_count
FROM ALL_DEPENDENCIES
WHERE (OWNER = '&object_owner_schema'
       AND NAME = 'EMPLOYEES')
   OR (REFERENCED_OWNER = '&object_owner_schema'
       AND REFERENCED_NAME = 'EMPLOYEES');
```

#### Step 3: destroy `DEPARTMENTS`, then verify

**ILLUSTRATIVE — SQL\*Plus accepted-state destruction step 3.** Re-run the relevant owner-filtered `DEPARTMENTS` identity/dependency preflight immediately before this one DDL step, and verify that the attached `dependency-attestation` artifact remains `PASS` for the exact target scope; any mismatch stops. The object owner is `&object_owner_schema`; an authorized role or DBA must have the owner-confirmed table-drop privilege. Run only after step 2 passed and its postcondition is saved. This is a separate implicit-commit DDL step.

```sql
DEFINE object_owner_schema = <object-owner-schema>

SELECT COUNT(*) AS department_table_count
FROM ALL_TABLES
WHERE OWNER = '&object_owner_schema'
  AND TABLE_NAME = 'DEPARTMENTS';

SELECT COUNT(*) AS target_object_count
FROM ALL_OBJECTS
WHERE OWNER = '&object_owner_schema'
  AND OBJECT_NAME IN ('IDX_EMP_DEPT_ID_CANDIDATE', 'EMPLOYEES', 'DEPARTMENTS');

SELECT COUNT(*) AS target_dependency_count
FROM ALL_DEPENDENCIES
WHERE (OWNER = '&object_owner_schema'
       AND NAME IN ('IDX_EMP_DEPT_ID_CANDIDATE', 'EMPLOYEES', 'DEPARTMENTS'))
   OR (REFERENCED_OWNER = '&object_owner_schema'
       AND REFERENCED_NAME IN ('IDX_EMP_DEPT_ID_CANDIDATE', 'EMPLOYEES', 'DEPARTMENTS'));

SELECT COUNT(*) AS actual_dependency_count,
       COUNT(CASE
               WHEN REFERENCED_OWNER = '&object_owner_schema'
               THEN 1
             END) AS owner_visible_dependency_count,
       COUNT(CASE
               WHEN REFERENCED_OWNER <> '&object_owner_schema'
               THEN 1
             END) AS cross_schema_dependency_count
FROM ALL_DEPENDENCIES
WHERE (OWNER = '&object_owner_schema'
       AND NAME IN ('IDX_EMP_DEPT_ID_CANDIDATE', 'EMPLOYEES', 'DEPARTMENTS'))
   OR (REFERENCED_OWNER = '&object_owner_schema'
       AND REFERENCED_NAME IN ('IDX_EMP_DEPT_ID_CANDIDATE', 'EMPLOYEES', 'DEPARTMENTS'));

SELECT OWNER,
       NAME,
       TYPE,
       REFERENCED_OWNER,
       REFERENCED_NAME,
       REFERENCED_TYPE,
       DEPENDENCY_TYPE
FROM ALL_DEPENDENCIES
WHERE (OWNER = '&object_owner_schema'
       AND NAME IN ('IDX_EMP_DEPT_ID_CANDIDATE', 'EMPLOYEES', 'DEPARTMENTS'))
   OR (REFERENCED_OWNER = '&object_owner_schema'
       AND REFERENCED_NAME IN ('IDX_EMP_DEPT_ID_CANDIDATE', 'EMPLOYEES', 'DEPARTMENTS'))
ORDER BY OWNER, NAME, REFERENCED_OWNER, REFERENCED_NAME;
```

If the approval record is missing, `PREFLIGHT_STATUS` is not `PASS`, `dependency_attestation_status` is not `PASS` for the exact scope, its `dependency_attestation_stop_reason` is missing when the status is `STOP`, any DDL step fails, its postcondition differs, or a dependency appears, stop immediately. Mark the destruction `INCONCLUSIVE` with the completed-step list, do not run a later step, and do not describe the sequence as atomic or rolled back. Each successful DDL step implicitly commits; recover through the owner-approved clone/rehearsal procedure.

After preliminary `REJECT_CANDIDATE`, use the conditional rollback in section 12 and a separate owner-approved disposable-table cleanup decision. Never use the accepted-state destruction steps to repair a rejected run.

### 14. Make the final verdict

Do not write a final `ACCEPT` or `REJECT` before recovery and cleanup. Section 11B records the preliminary decision; section 12 performs the corresponding recovery/rehearsal; section 13 records owner-approved cleanup; only then record one final label.

| Verdict          | Use when                                                                                |
| ---------------- | --------------------------------------------------------------------------------------- |
| **ACCEPT**       | Preliminary `ACCEPT_CANDIDATE`, and every write, recovery, and cleanup check passes.    |
| **REJECT**       | Preliminary `REJECT_CANDIDATE`, a verified rollback, and complete cleanup.              |
| **INCONCLUSIVE** | Preliminary `INCONCLUSIVE`, or recovery, rehearsal, or cleanup failed or is incomplete. |

`ACCEPT` requires all of: exact identity including `con_id_reason`, `instance_scope_reason`, `session_instance_id`, and `plan_hash_value`; the semantic candidate comparison; read regression; both predeclared write thresholds; candidate-side write A/A validation completed before recovery using copied-threshold/floor evidence; the recovery primitive plus post-recovery incumbent semantic, plan, noise, regression, and write-outcome checks; no candidate reapplication; and owner-approved cleanup or preservation.

`REJECT` also requires the rejected-candidate rollback and its post-rollback workload, plan, semantic, and write checks to pass. A gate failure alone is not a final verdict.

`INCONCLUSIVE` also covers missing thresholds, samples, or identity. Preserve the target unless the owner separately approves another state change.

A `plan_hash_value` change alone is not `ACCEPT`. A faster target alone is not `ACCEPT`. The V0 range and five-name sequence are teaching aids; the formal verdict follows the linked K>=5/bootstrap policy and belongs to the evidence pack, not to the first screenshot.

### Evidence-pack manifest

Keep one manifest for the experiment. Blank values are a reason to stop, not a reason to guess.

- **Environment:** Database target, release, update, edition, options/entitlement, service, Pluggable Database (PDB), client, and timestamp.
- **Statement identity:** SQL text or stable statement name, `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, applicable `instance_id`, `instance_scope_reason`, `session_instance_id`, and `plan_hash_value`; include the exact plan source or advisor artifact.
- **Capture mode:** Owner/application-driven loader or DBA cursor-cache capture, loader/source version, owner, filter, and bind-coverage status.
- **Bind manifest:** Protected value references, order, data distribution, representative reason, `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, `instance_id`, `instance_scope_reason`, `session_instance_id`, UTC start/end/capture timestamps, and redaction status.
- **STS artifact:** Name, owner, exact `SELECT *` output, collection row count, distinct SQL ID count, separate `V$SQL`/`GV$SQL` plan artifact, and scope caveat; exact plan artifacts carry `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, applicable `instance_id`, `instance_scope_reason`, `session_instance_id`, and `plan_hash_value`.
- **Trial map:** Target and regression A/A, before, after, rollback, and report execution names mapped to separately extracted per-execution samples and plan files; every row carries `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, `instance_id`, `instance_scope_reason`, and `session_instance_id`, and every plan file carries `plan_hash_value` plus the applicable scope reason.
- **Samples:** At least K>=5 raw values per side for a formal claim, `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, `instance_id`, `instance_scope_reason`, `session_instance_id`, metric, units, estimator, bootstrap settings, timestamps, and status.
- **Candidate:** Exactly one intervention, its privilege owner, state boundary, and pre/post dictionary checks.
- **Semantic result:** Incumbent F1–F6 baseline from 11A, candidate F1–F6 comparison from 10B, expected status, actual status, result artifact, and pass/fail.
- **Regression result:** Owner-qualified task/report, `regression-bind-manifest.csv`, the `REG-03` `:dept_id` bind family, `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, `instance_id`, `instance_scope_reason`, `session_instance_id`, exact plan artifacts with `plan_hash_value`, per-statement A/A floors, read baseline/candidate, statement-level deltas, `write-aa-samples.csv`, `write-aa-floor.csv`, `write_floor_provenance`, `write_threshold_locked_at`, five-sample write-cost probe with separately measured `elapsed_ms` and `buffer_gets`, `write_materiality_margin`, `write_elapsed_noise_floor`, `write_buffer_gets_noise_floor`, `write_elapsed_threshold`, `write_buffer_gets_threshold`, transaction outcome, report CLOB paths, task status/error/timeout evidence, `premeasurement_status`, the single `preliminary_decision`, and `regression-gate.csv`.
- **Rollback result:** For a rejected candidate, the conditional drop precondition, `candidate_index_dropped`/`already_absent` status, dictionary proof, workload, plan, semantic check, and remaining side effects. For an accepted candidate, the owner-supplied writable clone or write-enabled snapshot identity, rehydration proof, write-capability record, complete baseline/candidate/regression/semantic/write artifacts, candidate-side write A/A validation completed before recovery, copied target write floors/thresholds, `write_threshold_match_status`, `write_floor_provenance_match_status`, `candidate_side_aa_completed_before_recovery`, `recovery_primitive_artifact`, `recovery_status`, post-recovery incumbent-state/plan/semantic/noise/regression/write-outcome artifacts and statuses, `candidate_reapplied_after_recovery = NO`, and the rehearsal manifest.
- **Final cleanup:** Default-preserve accepted index/tables; separate destruction approval, read-only exact identity/dependency preflight with `expected_dependency_set = []`, `ALL_DEPENDENCIES` as one signal, a `PASS` owner-provided `dependency-attestation` covering constraints/foreign keys, triggers, views/materialized views, grants/synonyms, and external references with exact owner/scope fields, zero rows alone explicitly insufficient, missing/changed/nonzero dependencies or failed attestation as `STOP`/`INCONCLUSIVE`, stepwise DDL postconditions, partial-state stop, target and regression task existence/drop records, task/STS/output cleanup, operator, timestamp, and retained-artifact decision; never repeat the rejected-candidate index drop.
- **Verdict:** `premeasurement_status` (`PRELIMINARY_GATE_FAILURE` or `BLOCKED_PENDING_DECISION`), one `preliminary_decision` (`ACCEPT_CANDIDATE`, `REJECT_CANDIDATE`, or `INCONCLUSIVE`), then final `ACCEPT`, `REJECT`, or `INCONCLUSIVE` after recovery and cleanup, with the reason.
- **Sources:** Documentation, package references, release notes, and tool records.
- **Unknowns:** Missing access, entitlement, data, privileges, tests, raw extraction, or release verification.

### The evidence handoff

Start with the [evidence grades page](/00-preface/01-why-evidence-grades/) if the claim is not yet scoped. Use the [STS and measurement pages](/03-toolbox/) to deepen capture. Use [before-and-after with SPA](/04-recipes/02-before-after-with-spa/) and [noise-floor guidance](/05-feedback-loop/02-noise-floor-and-repetition/) for the comparison. Return to the [proven-technique groups](/01-proven-techniques/) only after the target and evidence identify a class.

The no-live evidence boundary at the top of this page applies to every advanced appendix block. The repository has no executed benchmark; use the owner/release-provided procedures and artifacts when a local result is required.

The primary references for this page are [S18](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/managing-sql-tuning-sets.html), [S58](https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf), [S25](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/generating-and-displaying-execution-plans.html), [S05](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html), and [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html).

## Artifact

A V0 evidence pack with the ten decision-map steps answered in order and these named entries: target, fixture, capture, statement identity, incumbent baseline, candidate, semantic result, regression result, rollback or rehearsal result, final cleanup, verdict, sources, and unknowns. The evidence-pack manifest in section 14 is the field list; a pack missing one of those entries is not ready for review.

**Decision:** Before the single preliminary decision gate, use only `PRELIMINARY_GATE_FAILURE` for a complete failed check and `BLOCKED_PENDING_DECISION` for missing evidence, thresholds, samples, or scope reasons, and map those statuses at that gate to exactly one `preliminary_decision`. Section 14 owns what each final verdict then requires.
