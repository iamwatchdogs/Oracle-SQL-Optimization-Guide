---
title: Why Evidence Grades Decide What You Trust
description: A decision sequence that separates source support, documented procedure, local result, and synthetic example.
order: 2
draft: false
---

Five tuning tips can point in five directions. The loudest tip is not automatically the right one.

Start with one narrow claim: **adding an index on `employees(dept_id)` may reduce the measured work for this report workload**. That is a testable claim. “Indexes make queries fast” is not.

A source grade is a map legend, not the territory. The exception is simple: a map can tell you where a documented feature is described, but only a scoped procedure and a named local result can support a workload-specific performance conclusion.

> **Track:** Core (Working terms before the claim, One claim one evidence sequence, When evidence is missing) · Practice (A compact worked example, Practical evidence handoff) · Recovery (none) · Advanced / gated (The source labels after the decision, `PROVEN` is a catalog label)
>
> **Prerequisites:** Basic SQL and the [environment and setup page](/00-preface/).
>
> **Evidence status:** The decision process and source classes are documented. Worked Oracle data and performance numbers are SYNTHETIC; catalog counts are research metadata. **No live Oracle database was available**, so no example on this page is a measurement.
>
> **Next required page:** [How to prove a win](/00-preface/02-how-to-prove-a-win/).

## How this page is banded

| Band                 | Sections                                                            |
| -------------------- | ------------------------------------------------------------------- |
| **Core**             | Working terms · One claim, one evidence sequence · Missing evidence |
| **Practice**         | Compact worked example · Practical evidence handoff                 |
| **Recovery**         | none                                                                |
| **Advanced / gated** | The source labels, after the decision · `PROVEN` is a catalog label |

- **Core:** the four working terms, the seven-step sequence from claim to wording, and what to do when the result is missing. Read these in order; the sequence is the policy and the grade is one label inside it.
- **Practice:** the worked example and the handoff list. Use them on a real ticket, because a claim does not leave your desk until the handoff is complete.
- **Recovery (none):** this page changes nothing and therefore undoes nothing. The rollback and rehearsal rules live on the [V0 lab](/00-preface/02-how-to-prove-a-win/).
- **Advanced / gated:** the A1–D label legend and the `PROVEN` definition. Read them when you need to sort a source or cite the catalog, not before you can state a claim.

## Working terms before the claim

- **`buffer_gets`:** Oracle's logical count of block requests served through the buffer cache. It is a work indicator, not elapsed time and not necessarily physical disk I/O.
- **Plan hash:** A value that identifies a plan shape. It is not a performance score and does not prove result equality.
- **SQL Tuning Set (STS):** A named database object that may include SQL, binds, execution context, execution statistics, and plans for repeatable comparison.
- **SQL Performance Analyzer (SPA):** An Oracle package workflow that runs named before and after trials and reports comparison metrics.

## One claim, one evidence sequence

Use the same sequence every time. The sequence is the policy; the grade is only one label inside it.

**SYNTHETIC — toy query and toy schema.** This is a teaching fixture, not a result. The client would be SQLcl or SQL*Plus with a bind-aware session, and the account would need `SELECT` on the lab-owned `employees` table.

```sql
SELECT employee_id, dept_id, salary
FROM employees
WHERE dept_id = :dept_id;
```

### 1. Claim

Write the smallest falsifiable sentence:

> For the frozen report workload, an index on `employees(dept_id)` may reduce elapsed time or `buffer_gets` for the selected department binds, while preserving the result set.

Name the metric and the scope. “Faster” without a workload is a slogan.

### 2. Source class

First ask what kind of source supports the mechanism. At this stage, call it a source class, not a final grade. For an Oracle index or optimizer mechanism, start with versioned Oracle documentation. Keep papers, tools, and community reports as separate support rather than blending them into one sentence.

The [Oracle SQL Tuning Guide](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/) and the [Oracle statistics technical brief](https://www.oracle.com/docs/tech/database/technical-brief-bp-for-stats-gather-19c.pdf) can support documented mechanisms. They cannot supply a local speedup number for your data.

### 3. Scope

Record the boundaries before reading the result:

- Oracle release, update level, architecture, edition, options, and entitlement.
- Service, Pluggable Database (PDB) or connection context, schema, and data owner.
- Statement identity, `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, applicable `instance_id`, `instance_scope_reason`, `session_instance_id`, and `plan_hash_value` if available.
- Representative bind values, data distribution, and time window.
- The metric, repetition budget, semantic fixture, and rollback owner.

A source about 19c does not automatically describe 23ai, 26ai, or a different edition. A documented procedure is scoped too.

### 4. Procedure

An **A/A control** means running the same statement and binds before any candidate changes the database. **CANDIDATE/NOT-VERIFIED** means the test has not supplied a result that supports the claim yet. A named SPA `test execute` record is a trial report, not automatically one raw per-execution sample; SPA may repeat and aggregate executions.

**Identity scope:** The 19c `V$SQL` view does not expose `INSTANCE_NUMBER`. A single-instance `V$SQL` lookup records `instance_id = N/A` with a reason; RAC or multi-instance capture uses `GV$SQL.INST_ID AS instance_id`.

Record `con_id` from the documented `CON_ID` field or the explicitly documented session/container fallback. If it cannot be supplied, record `con_id = N/A` with `con_id_reason`; do not call the tuple global without container scope. Qualify a lookup by `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, and `instance_id` when applicable.

Neither `V$SQL` nor `GV$SQL` returns `session_instance_id`; obtain it from the separate `V$INSTANCE` artifact and join it during evidence-pack assembly.

`DBMS_XPLAN.DISPLAY_CURSOR` is instance-local: connect to the exact manifest instance before the call, record `session_instance_id`, and `STOP` if the instance scope is unknown or mismatched.

Write the steps that another engineer can repeat. For this claim, the minimum procedure is:

1. Choose the capture mode: owner/application-driven load with a bind manifest, or DBA cursor-cache capture. Record `sts_owner`/`sqlset_owner`, `object_owner_schema`, and `task_owner` separately. Run STS operations in the STS-owner session or with the documented `sqlset_owner` argument; run `CREATE_ANALYSIS_TASK`, `SET_ANALYSIS_TASK_PARAMETER`, `EXECUTE_ANALYSIS_TASK`, and `DROP_ANALYSIS_TASK` in the task-owner session. `REPORT_ANALYSIS_TASK` may use the documented `task_owner` argument when the installed release supports it; do not pass that argument to lifecycle operations. Do not call a cache sample representative without an external per-bind runner match.
2. Freeze the statement, `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, applicable `instance_id`, `instance_scope_reason`, `session_instance_id`, and `plan_hash_value` when available, plus representative binds, module/action, and UTC start/end timestamps. `session_instance_id` comes from the separate `V$INSTANCE` artifact, not from `V$SQL` or `GV$SQL`. Keep protected values out of the shared evidence pack and map each `bind_case_id` to an external-runner `execution_id`.
3. Inspect the STS collection row count and distinct SQL ID count, save the exact output, and save a separate `V$SQL`/`GV$SQL`-derived plan identity artifact carrying `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, applicable `instance_id`, `plan_hash_value`, and `con_id_reason`/`instance_scope_reason`; join in `session_instance_id` from the separate `V$INSTANCE` artifact during evidence-pack assembly. Bind coverage and plan coverage remain separate questions.
4. Run the unchanged target A/A trials and calculate the declared teaching noise floor. For a formal claim, use the canonical K>=5 raw-sample and external bootstrap policy.
5. Run the regression incumbent baseline before any candidate: create/load `V0_REGRESSION_WL`, run its A/A and before trials, build per-statement floors, run F1–F6 on the incumbent to save the semantic baseline, and run at least five unchanged incumbent-side write A/A samples. Save `write-aa-samples.csv` and `write-aa-floor.csv`, derive and lock `write_elapsed_threshold` and `write_buffer_gets_threshold` from the incumbent A/A floors with their provenance before applying the candidate. Do not run candidate semantics, candidate-side A/A, `reg_after`, or the candidate comparison yet.
6. Capture the incumbent plan with the exact `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, `instance_id`, `instance_scope_reason`, and `plan_hash_value` identity, or save the release-supported SPA/advisor plan artifact with those fields. Join `session_instance_id` from the separate `V$INSTANCE` artifact during evidence-pack assembly. Before `DBMS_XPLAN.DISPLAY_CURSOR`, verify the exact RAC instance; stop if the instance scope is unknown or mismatched.
7. Apply one named candidate: the index, or a pending-statistics test chosen by the owner.
8. Verify the database state and intended candidate object.
9. Run the same STS, bind manifest, metric, and named after SPA trial reports. Every raw-sample row carries `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, `instance_id`, `instance_scope_reason`, and `session_instance_id`; exact plan artifacts also carry `plan_hash_value`. An unexplained N/A identity is a stop. Extract raw per-execution samples separately when the report is aggregated, bind every report to its named comparison, write the complete CLOB/report to the approved path, and check `USER_ADVISOR_TASKS.STATUS`/`STATUS_MESSAGE` in the task-owner session. Require `COMPLETED`, no error/timeout/incomplete marker, and verify the report's named execution separately before interpreting it.
10. After the candidate, run the candidate F1–F6 comparison against the incumbent semantic baseline. Before interpreting candidate write results, run at least five candidate-side write A/A samples under the formal policy, append them to `write-aa-samples.csv`, calculate validation floors without changing the locked `write_elapsed_threshold` or `write_buffer_gets_threshold`, and then run the candidate write probe. Measure `elapsed_ms` and `buffer_gets` independently. A complete failed check records `PRELIMINARY_GATE_FAILURE`; missing thresholds or samples records `BLOCKED_PENDING_DECISION`.
11. Run the regression candidate comparison after the candidate, after-side capture, semantic comparison, and write probe: run `reg_after`, save `regression-after.csv` and `regression-cmp_01.txt`, compare every `REG-01`, `REG-02`, and `REG-03` row with its own floor, and record only `PRELIMINARY_GATE_FAILURE` or `BLOCKED_PENDING_DECISION` when a gate cannot pass. At the single preliminary decision gate, map passing evidence to `ACCEPT_CANDIDATE`, `PRELIMINARY_GATE_FAILURE` to `REJECT_CANDIDATE`, or `BLOCKED_PENDING_DECISION` to `INCONCLUSIVE`.
12. Follow the single preliminary decision only: after `REJECT_CANDIDATE`, run the separate conditional rollback; after `ACCEPT_CANDIDATE`, preserve the target and complete the writable-clone/write-enabled-snapshot recovery rehearsal, including candidate-side write A/A validation against copied target thresholds and proof that the same floors/thresholds were used; after `INCONCLUSIVE`, preserve the target. Do not record final `ACCEPT` or `REJECT` yet.
13. Perform owner-approved cleanup, then record final `ACCEPT`, `REJECT`, or `INCONCLUSIVE` based on recovery and cleanup completion. Use the canonical V0 rule: ordinary object-owner work uses `object_owner_schema` or an authorized DDL role/DBA with owner-confirmed privilege, task drops use `task_owner_schema`, and STS drops use `sts_owner_schema` or the documented `sqlset_owner`.

    Accepted-state destruction uses the same object-owner boundary only under separate approval, an empty expected dependency set, `ALL_DEPENDENCIES` as one signal, and a `PASS` owner-provided `dependency-attestation` artifact covering constraints/foreign keys, triggers, views/materialized views, grants/synonyms, and external references with exact owner/scope fields.

    Zero `ALL_DEPENDENCIES` rows alone is insufficient; a missing or changed dependency attestation or dependency is `INCONCLUSIVE`. Preserve accepted state by default and retain approved redacted evidence.

The only preliminary decision point is the gate after candidate measurements. Earlier failures use `PRELIMINARY_GATE_FAILURE` or `BLOCKED_PENDING_DECISION`; that gate maps them to one `preliminary_decision`, and only recovery and cleanup can produce the final `ACCEPT`, `REJECT`, or `INCONCLUSIVE` label.

The V0 page is a minimal range-based teaching lab. A formal performance claim uses at least K>=5 comparable raw samples per side, 10–15 preferred, a complete V0 regression workload SPA pass per side, and an external median-difference bootstrap 95% confidence interval. The procedure is not the result. It is the promise to collect one.

### 5. Local result

A local result must name the database target, release, timestamp or window, client, statement identity, `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, applicable `instance_id`, `instance_scope_reason`, `session_instance_id`, bind manifest, samples, and an exact plan artifact with `plan_hash_value`. If nobody ran it, write:

**ILLUSTRATIVE — result-status template, not a result.**

```text
Local result: NOT RUN
```

Keep three artifacts separate: a **documented procedure** says how to test; a **verified result** says the procedure ran in a named environment and returned samples; a **synthetic illustration** invents teaching data or output. They are not interchangeable.

Do not turn a command, an expected plan, or a copied report into a local result. The repository has no live Oracle run, so every example output in this page is `ILLUSTRATIVE` or `SYNTHETIC`.

### 6. Grade

The grade describes the source class. The result status is a separate field. A versioned Oracle manual can be `A1` while the local performance claim is still `NOT-VERIFIED`.

Do not use a source grade to imply a measurement. Do not use a measurement to imply a license or a production result.

### 7. Wording

Write the conclusion with its boundary:

> A1 sources document an index-based access path and the test procedure. On this lab, the candidate remains `CANDIDATE/NOT-VERIFIED` until exact statement identity (`sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, `instance_id`, `instance_scope_reason`, `session_instance_id`, and `plan_hash_value` for exact plan artifacts), a representative application workload, bind and semantic evidence, the formal noise/statistical gate, no-regression including candidate-side write A/A validation, and a complete owner-supplied writable-clone or write-enabled-snapshot recovery rehearsal with copied locked-threshold/floor proof are complete. A rejected-only rollback is a separate recovery record and cannot produce `ACCEPT`.

That sentence survives review. “This index will be faster” does not.

## The source labels, after the decision

Now that the claim has a scope and a test, use the A1–D labels to sort the source material.

| Label  | Source class                                                | What it can support                                                   |
| ------ | ----------------------------------------------------------- | --------------------------------------------------------------------- |
| **A1** | Oracle versioned product documentation                      | Behavior, package boundaries, and release scope                       |
| **A2** | Oracle-authored technical brief or whitepaper               | Vendor explanation and guidance, with the version attached            |
| **B1** | Paper or preprint                                           | The mechanism or system studied; state whether the venue is confirmed |
| **B2** | Reproducibility report or artifact                          | Independent support, not automatic Oracle proof                       |
| **C1** | Deterministic tool with documented output                   | What the tool reports about the tested system                         |
| **C2** | Maintained open-source project with a verifiable repository | Supporting implementation or test-harness evidence                    |
| **D**  | Blog, forum, or secondary commentary                        | A lead, context, or version clue only                                 |

A D source can point you toward an A1 source. It cannot carry an Oracle behavior claim by itself. A paper about another database can support its own mechanism without proving Oracle's behavior. A tool can produce a readable report without proving that the recommendation is correct or fast.

## `PROVEN` is a catalog label

The research uses this narrow definition:

> **PROVEN** means either at least two independent verified sources, or one authoritative A1/A2/B1 source **plus** a deterministic, reproducible verification procedure.

The catalog has 68 entries: 67 `PROVEN` and one `CONDITIONAL` entry, T-08. T-08, the SQLd360/SQLdb360 community diagnostic collector, remains conditional because it is not a peer of an Oracle versioned package reference.

That is catalog scope, not a beginner prerequisite and not an executed benchmark. The count does not upgrade a local claim for your database.

The evidence map is also a boundary for candidates. Learned optimizers, automated parameter tuners, AI-generated rewrites, and SQL-equivalence tools remain `CANDIDATE` when Oracle coverage was not verified in this pass. A candidate can be useful. It cannot borrow `PROVEN` until its Oracle-specific support and verification path exist. [S67](https://github.com/mauropagano/sqld360) [S74](https://aws.amazon.com/blogs/database/transform-your-oracle-database-journey-with-accenture-and-aws/) [S75](https://dincosman.com/2025/02/23/oracle-database-health/)

## A compact worked example

The query and numbers below are fictional. They teach the wording; they do not describe a run.

**SYNTHETIC — invented values for teaching, not Oracle output.**

| Field           | Illustrative entry                                                                            |
| --------------- | --------------------------------------------------------------------------------------------- |
| Claim           | An index on `employees(dept_id)` may reduce work for the frozen department report.            |
| Source class    | A1 Oracle documentation supports the mechanism; no local result is present.                   |
| Scope           | 19c-compatible non-production lab, toy `employees` table, binds `10`, `42`, `99`, and `9999`. |
| A/A control     | Five unchanged trials; synthetic spread of 6–10% around the median.                           |
| Before          | Synthetic median: 100,000 `buffer_gets` and 420 ms.                                           |
| Candidate       | One index on `employees(dept_id)`, then the same workload.                                    |
| No-regression   | Synthetic `REG-01`–`REG-03` paths remain within the declared floor; not run.                  |
| Rollback        | Synthetic rollback record is `candidate_index_dropped` or `already_absent`; not run.          |
| After           | Hypothetical synthetic median: 40,000 `buffer_gets` and 180 ms.                               |
| Current wording | `CANDIDATE/NOT-VERIFIED`; no reader has supplied the local result.                            |

The numbers are not evidence. Database readers should next run the procedure, extract raw per-execution samples separately from SPA trial reports, compare them with the measured noise floor and formal statistical rule, and keep the result only if exact identity, semantics, no-regression including write cost, and the required recovery evidence pass.

For an accepted candidate, that recovery evidence is the owner-supplied clone/snapshot rehearsal; for a rejected candidate, it is the separate conditional rollback.

Reading-only or no-database readers should inspect the V0 procedure and its pass/fail contracts, leave the result `NOT-VERIFIED`, and not run it as a local result.

## When evidence is missing

Do not fill the gap with confidence. Do this instead:

1. Mark the claim `CANDIDATE` or `NOT-VERIFIED`.
2. Write the missing test, including the target, binds, metric, repetitions, plan artifact, semantic fixture, and the required rejected rollback or accepted clone/snapshot rehearsal.
3. Record the missing privilege, release, package, entitlement, or data as an unknown.
4. Ask the database administrator (DBA), release owner, or licensing owner when the gap is not yours to close.
5. Do not ship the claim as fact while the result is absent.

A missing local result is a status, not a defect in the method. The absence of a live run in this repository is expected; pretending otherwise would be worse.

## Practical evidence handoff

Before asking another engineer to review a candidate, hand over:

- The exact claim and the proposed wording.
- Source classes and links, with release and date boundaries.
- Environment, exact statement identity, `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, `instance_id`, `instance_scope_reason`, `session_instance_id`, capture mode, `sts_owner`/`sqlset_owner`, `task_owner`, and the task-owner session path.
- Bind manifest with protected value references, `bind_case_id`, external-runner `execution_id`, `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, `instance_id`, `instance_scope_reason`, `session_instance_id`, representative reason, UTC timestamps, and redaction status.
- Procedure, metric, K policy, estimator/bootstrap settings, and noise-floor rule.
- STS collection row count, distinct SQL ID count, separate `V$SQL`/`GV$SQL` plan artifact carrying `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, applicable `instance_id`, `session_instance_id`, `plan_hash_value`, `con_id_reason`/`instance_scope_reason`, bind inspection, scope caveat, and workload name.
- SPA trial reports and separately extracted per-execution raw samples, with `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, `instance_id`, `instance_scope_reason`, and `session_instance_id` on every row, complete-CLOB output path, named report execution, `USER_ADVISOR_TASKS` `STATUS`/`STATUS_MESSAGE`, timeout/error evidence, aggregation level, and source artifact.
- Separate regression task/report, the `REG-03` `:dept_id` bind family, `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, `instance_id`, `instance_scope_reason`, `session_instance_id`, exact plan artifacts with `plan_hash_value`, per-statement A/A floors, semantic baseline/candidate result, write A/A samples/floors, and the five-sample write-cost result with `write_elapsed_threshold` and `write_buffer_gets_threshold`.

  The same entry carries the rejected-candidate rollback (`candidate_index_dropped` or `already_absent`) or the accepted-candidate writable-clone rehearsal with candidate-side write A/A validation, copied locked-threshold/floor provenance and match statuses, `premeasurement_status` (`PRELIMINARY_GATE_FAILURE` or `BLOCKED_PENDING_DECISION`), and one `preliminary_decision`.

  It also carries default-preserving final cleanup with fail-closed destruction approval/preflight, `expected_dependency_set = []`, `ALL_DEPENDENCIES` as one signal, a `PASS` owner-provided `dependency-attestation` covering constraints/foreign keys, triggers, views/materialized views, grants/synonyms, and external references with exact owner/scope fields, zero rows explicitly insufficient, stepwise postconditions, the final verdict, and remaining unknowns.

The next page turns that handoff into a V0 lab.

The [SQL Tuning Guide](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/) and the [benchmarking methodology](https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf) provide the documented mechanism and the repetition context; neither replaces a local result.

## Artifact

A claim record with: the falsifiable claim sentence, its source class with release and date boundaries, the scope list from step 3, the written procedure, the result status, and the wording you would actually ship. Fill it in while the claim is being tested, because a claim assembled after the result is a conclusion, not evidence.

A missing local result is a status, not a defect in the method. The absence of a live run in this repository is expected; pretending otherwise would be worse.

Source IDs and technique IDs resolve in [Appendix Sources](/07-appendix-sources/).

**Decision:** Evidence earns the right to test a claim, not the right to ship it. If the procedure or local result is missing, keep the claim `CANDIDATE/NOT-VERIFIED`.

**Next required page:** [How to prove a win](/00-preface/02-how-to-prove-a-win/).
