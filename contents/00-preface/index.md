---
title: Preface - Environment, Access, and Trust
description: Set up a safe Oracle practice path, understand the terms, and hand work off responsibly.
order: 1
draft: false
---

A fast query is a claim until you can reproduce it. A reproducible claim still needs a safe place to run.

> **Track:** Core (The minimum vocabulary, Choose your path, Choose a client, Request least privilege, Safe setup checklist) · Practice (The primary 19c-compatible baseline, Connect through a service then work in a schema, Owner handoff, Capture output without leaking secrets, A realistic junior workflow) · Recovery (Clean up the practice target, If a package or view is unavailable, No production by default) · Advanced / gated (Optional Oracle Database Free 26ai Docker sandbox)
>
> **Prerequisites:** Basic SQL and the ability to read a terminal, a result set, and an error message.
>
> **Evidence status:** This page contains documented setup procedures and illustrative commands. **No live Oracle database was available**, so nothing here is a measurement; every command, output shape, and privilege name is a procedure to confirm on the installed release.
>
> **Next required page:** [Why evidence grades decide what you trust](/00-preface/01-why-evidence-grades/).

## How this page is banded

| Band                 | Sections                                                                      |
| -------------------- | ----------------------------------------------------------------------------- |
| **Core**             | Vocabulary · Path · Client · Least privilege · Checklist                      |
| **Practice**         | 19c baseline · Service and schema · Owner handoff · Capture · Ticket sequence |
| **Recovery**         | Cleanup · Unavailable object · No production                                  |
| **Advanced / gated** | Optional 26ai Docker sandbox                                                  |

- **Core (The minimum vocabulary, Choose your path, Choose a client, Request least privilege, Safe setup checklist):** read these first. They define the words, the path, the client, the smallest useful access request, and the checklist that proves you have them.
- **Practice (The primary 19c-compatible baseline, Connect through a service then work in a schema, Owner handoff, Capture output without leaking secrets, A realistic junior workflow):** use these on a real request, with a named owner in the loop. Each one records something you would otherwise have to ask twice.
- **Recovery (Clean up the practice target, If a package or view is unavailable, No production by default):** these **undo** and **stop**. They do not make a query faster, and cleanup is not candidate rollback.
- **Advanced / gated (Optional Oracle Database Free 26ai Docker sandbox):** read before you use it, because the image name, tag, secret mechanism, and licensing terms are release-specific and change.

## The minimum vocabulary

Learn these words before running a command. The Oracle term comes first in the lab pages; the plain meaning comes first here.

- **Instance:** The running Oracle Database process set and memory that serves a database. An instance is not the same thing as the files on disk.
- **Pluggable Database (PDB):** A database container that can be attached to a container database. In a multitenant enterprise setup, a service often points to a particular PDB. The exception is a non-container-database installation; verify the architecture your environment actually uses.
- **Schema/user:** A user is an account with a login. A schema is the namespace of objects owned by that user. A schema name and user name are often the same, but do not assume they are.
- **Service:** A named route that tells a client which database or PDB to reach. The service is a connection name, not a performance setting.
- **Bind:** A named input value supplied separately from SQL text, such as `:dept_id`. A bind is a variable input, not a literal pasted into every statement.
- **SQL ID:** Oracle's identifier for normalized SQL text, used to find a statement in workload history and related records. A child number distinguishes cursor variants. It identifies the statement family; it does not prove the statement caused a problem.
- **Plan:** The sequence of operations Oracle chose for a statement. The plan can show estimated rows and, with runtime statistics, actual rows. A plan is evidence about execution, not a verdict about the whole application.
- **Workload:** The statements, binds, execution context, data conditions, and time window that matter to the question. A workload is not one query when users experience a system-wide slowdown.
- **`buffer_gets`:** Oracle's logical count of block requests served through the buffer cache. It is a work indicator, not elapsed time and not necessarily physical disk I/O. Cumulative workload-view counters are not per-trial samples.
- **View:** A stored database query that reads like a table. A normal view is not automatically a materialized copy of data.
- **Package:** A named collection of database procedures or functions, such as `DBMS_XPLAN` or `DBMS_SQLPA`. Availability and use can depend on release, privileges, and licensing.
- **SQL Tuning Set (STS):** A named database object that may include SQL, binds, execution context, execution statistics, and plans for repeatable comparison.
- **SQL Performance Analyzer (SPA):** An Oracle package workflow that runs named before and after trials and reports comparison metrics. Availability, privilege, and entitlement still need checking.
- **Release/edition:** The release is the database version, such as Oracle Database 19c. The edition is the licensed product level. Updates, patches, and options can still change what is available.
- **Privilege:** A technical permission, such as `SELECT` on an owned table or permission to execute a package. A role can bundle privileges.
- **Entitlement:** A licensing or contractual right to use a feature or option. An entitlement is not the same as a database privilege, and a privilege is not a license.

A grade can help you sort a source. It cannot replace these definitions.

This page is the environment and setup hub for the book. The primary path is a generic Oracle Database 19c-compatible enterprise environment: a non-production database supplied by an organization, a dedicated lab account, a supported client, and an approved way to capture output. The optional Docker sandbox is for learning. It is not a substitute for release, entitlement, and access checks.

## Choose your path

| Path                                              | Use it when                                                                | What you must bring                                                                                                   | What you cannot claim                                                                         |
| ------------------------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| Generic Oracle Database 19c-compatible            | Your organization already has a safe non-production database and an owner. | Service details, a dedicated lab user, a client, least-privilege grants, and an output location.                      | Do not assume an update, edition, option, or package exists. Verify on the installed release. |
| Optional Oracle Database Free 26ai Docker sandbox | You need a local learning target and have Docker plus an approved image.   | A locally managed credential, enough resources, and the image's documented arguments.                                 | A sandbox result is not a production result, and this path is optional.                       |
| Reading-only or no database                       | You cannot get access yet, or you only want to understand the method.      | This page, the evidence page, and the synthetic V0 procedure. Inspect the procedure; do not run it as a local result. | You cannot produce a local result or an Oracle plan. Keep the result status `NOT-VERIFIED`.   |

The sandbox path is limited to setup, basic SQL, and basic plan practice, and its image behavior is release-specific.

The generic 19c-compatible path is the core route. The other two paths are valid, but they change what evidence you can collect.

## The primary 19c-compatible baseline

Ask the database owner for these items before connecting:

- Oracle Database release, update level, edition, and relevant options or packs.
- Host, port, service name, and the PDB or connection context when the service does not make it obvious.
- A dedicated lab user and schema. Do not borrow a production application account.
- A SQL client already approved for the environment.
- The least privileges needed for the toy lab, including any owner action that must be performed by a database administrator (DBA).
- A writable, non-sensitive output directory for plans, reports, and separately extracted per-execution samples.
- The name of the person or team that can answer entitlement, package, and rollback questions.

A 19c base release is a compatibility target, not a promise that every documented feature is present. Check the installed release and the organization's entitlement. If the service, PDB, or client details are ambiguous, stop and ask rather than guessing.

## Optional Oracle Database Free 26ai Docker sandbox

This path is for local experimentation only. It is **not required** for the core method. The image name, tag, startup command, environment variables, secret mechanism, and licensing terms can change. Use an image supplied or approved by the lab owner and record the immutable tag or digest.

**SKETCH — PLACEHOLDER — version-sensitive Oracle Database Free 26ai Docker path.** Oracle's current [26ai Free quick start](https://www.oracle.com/database/free/get-started/) lists `container-registry.oracle.com/database/free:latest` as an example registry path only. `latest` is not a reproducibility contract and must not be used as the recorded run image. The owner chooses one immutable reference before the run:

```text
IMAGE=container-registry.oracle.com/database/free:<approved-tag>
IMAGE=container-registry.oracle.com/database/free@sha256:<approved-digest>
```

The two lines are alternative placeholders, not an instruction to set both. The selected image's own documentation determines the supported password variable and volume/startup arguments. Load the secret through one approved mechanism: a Docker secret, a protected env-file, or the lab's secret manager. Do not put a raw password in a command, repository, ticket, or shell history. If the selected image requires a different secret adapter, the owner supplies the release-specific command.

**ILLUSTRATIVE — PLACEHOLDER — owner-provided env-file shape.** This block is not executable until the owner replaces the image and secret-file placeholders and verifies the selected image's variables.

```bash
IMAGE="container-registry.oracle.com/database/free:<approved-tag>"
SECRET_ENV_FILE="<owner-approved-protected-env-file>"
docker pull "$IMAGE"
docker volume create oracle26ai-data
docker run --name oracle26ai-lab \
  --env-file "$SECRET_ENV_FILE" \
  -p 127.0.0.1:1521:1521 \
  -v oracle26ai-data:/opt/oracle/oradata \
  "$IMAGE"
```

For a Docker secret or secret manager, use the owner-provided equivalent instead of this env-file shape; do not invent an `_FILE` variable. Expected output shape: `docker pull` reports the approved image digest, `docker run` reports a container identifier, and the image emits its database-startup messages. Record the approved image reference, resolved digest, secret mechanism, container name, port mapping, and startup timestamp in the evidence pack.

This sandbox is for setup, basic SQL, and basic plan practice. SPA, RAT, diagnostics, or enterprise options may require a separate approved target with its own release, entitlement, and credentials; do not assume they are present in the sandbox.

After startup, verify the installed release before trusting a feature or a plan. The query below is a release check, not a performance result.

**ILLUSTRATIVE — SQLcl or SQL\*Plus. Requires a connected session and permission to read the relevant dictionary view. Expected output: one or more release-banner rows; no live output is supplied here.**

```sql
SELECT banner
FROM v$version;
```

If the image does not start, the service is not reachable, or the release is not what the lab owner supplied, record the exact error. Do not turn a failed sandbox into a failed claim about Oracle SQL.

## Choose a client

Pick one client for the first pass and record its version. SQL syntax is shared; client commands and output are not always interchangeable.

### SQLcl

SQLcl is Oracle's scriptable command-line client. It can connect to a service, run SQL and PL/SQL, set client variables, and capture output. It can make a repeatable script easier to read.

It cannot grant itself privileges, prove a plan, decide that a result is correct, or replace a workload comparison. SQLcl behavior and output can vary by installed version, so verify the commands and formatting on the client you actually use.

### SQL*Plus

SQL*Plus is the traditional command-line SQL client. It can connect, run SQL and SQL*Plus commands, use bind-like variables, and spool output to a file.

It does not provide monitoring, optimizer decisions, or licensing rights. Do not paste SQL*Plus `EXEC` syntax into a different client and assume it means the same thing.

Both clients need a reachable service and a valid account. Neither can see an object you are not permitted to query. If a package, view, or plan feature is unavailable, check the client, the release, the grants, and the entitlement before changing SQL.

## Connect through a service, then work in a schema

Ask which service reaches the lab database and which PDB it opens. A service name is the stable handoff between the client and the database. Do not assume a host name is a service name.

**ILLUSTRATIVE — PLACEHOLDER — SQLcl or SQL\*Plus.** The client must already be installed, the route must be approved, and `lab_user` must be a dedicated account. Replace the host, port, and service with owner-supplied values. Use your approved credential prompt or secret manager. The expected output is one connected session and a client prompt. Do not put a password in the command or in a saved file.

```text
CONNECT lab_user@//db.example:1521/ORCLPDB1
```

Replace the host, port, and service with the owner-supplied values. If the organization uses a wallet, a TNS alias, or a different Easy Connect form, use that documented form instead.

After connecting, check the account rather than assuming the schema.

**ILLUSTRATIVE — SQLcl or SQL\*Plus.** Requires a connected session. Expected output: one row containing the current account name.

```sql
SELECT USER FROM dual;
```

A schema is not a second login. If the lab owner wants you to use a separate schema, ask for the approved grant or connection. Do not run `ALTER SESSION SET CURRENT_SCHEMA` until you know which objects you may access and who owns them.

## Request least privilege

A useful first request is small and named:

- `CREATE SESSION` for a dedicated account.
- `SELECT` on the toy tables or views in the lab schema.
- `ADMINISTER SQL TUNING SET` for an STS owned by the lab account. `ADMINISTER ANY SQL TUNING SET` is an owner/DBA support path, not a default request.
- `ADVISOR` for SPA analysis-task interfaces, plus owner-confirmed entitlement and licensing for the chosen database and options.
- `SELECT`/view access to `USER_ADVISOR_TASKS` in the task-owner session, including documented `TASK_NAME`, `STATUS`, and `STATUS_MESSAGE` columns. If a DBA uses a broader advisor view, the owner must confirm its `SELECT` access; the `ADVISOR` privilege alone does not prove view access.
- `SELECT` or `READ` on the fixed views required for cursor plans: `V$SQL`, `V$SQL_PLAN`, `V$SESSION`, and `V$SQL_PLAN_STATISTICS_ALL`; add `GV$SQL` when the capture spans RAC instances. The exact plan-display session also needs `SELECT` on `V$INSTANCE` (or the installed release's documented read-only equivalent) to verify `session_instance_id`; request only that scoped fixed-view access, not a broad `DBA` or `SELECT ANY DICTIONARY` grant. The owner may use direct grants or confirm an appropriate catalog role.
- Access to the shared SQL area views required by the selected capture mode, verified on the installed release.
- Permission to perform the specific DDL action required by the chosen intervention class. The owner confirms create and rollback authority separately; do not assume the grants are interchangeable.
- `EXECUTE` on a diagnostic package only when the package is approved for the lab and available on the installed release.

Do not ask for `DBA`, broad application roles, production credentials, or blanket grants because a page contains an example. A DBA, site reliability engineer (SRE), release owner, or entitlement owner may need to perform the privileged action even when you own the ticket.

### Privileges, options, and entitlements

A package reference proves that an interface is documented. It does not prove that your account may execute it, that the feature is present on your release, or that your organization is licensed to use the relevant option. Ask the owner to confirm all three:

- The object or package exists in this database.
- Your account has the least privilege needed to use it safely.
- The release, edition, and contract entitle the feature and workload.

Record the answer in the evidence pack. If the answer is unknown, use `NOT-VERIFIED` or stop the lab.

## Owner handoff

Before an STS or SPA procedure, record `sts_owner`, `object_owner_schema`, `task_owner`, the client session owner, and the person who can approve rollback and cleanup.

Query the documented `CON_ID` field from `V$SQL`/`GV$SQL` or use the explicitly documented session/container fallback. For any `DBMS_XPLAN.DISPLAY_CURSOR` call, connect to the exact RAC instance recorded as `instance_id`/`INST_ID`. Record `session_instance_id` using the scoped `V$INSTANCE` `SELECT`/read access above, and stop if that access is unavailable or the instance scope is unknown or mismatched.

Run STS create/load/capture/select operations in the `sts_owner` session or with the documented `sqlset_owner` argument. Run `CREATE_ANALYSIS_TASK`, `SET_ANALYSIS_TASK_PARAMETER`, `EXECUTE_ANALYSIS_TASK`, and `DROP_ANALYSIS_TASK` in the `task_owner_schema` session. `REPORT_ANALYSIS_TASK` may use the documented `task_owner` argument when the installed release supports it; a DBA promise is not an owner handoff.

Carry `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, `instance_id`, `instance_scope_reason`, `session_instance_id`, the bind manifest, external per-bind runner identity, timestamps, and redaction status with the task.

The 19c `V$SQL` view does not expose `INSTANCE_NUMBER`: a single-instance lookup records `instance_id = N/A`, while RAC/multi-instance capture uses `GV$SQL.INST_ID AS instance_id`.

The V0 order is 11A regression incumbent baseline before section 6, then 11B regression candidate comparison after sections 7 and 10.

Stop if either owner is unknown, an STS operation cannot run or bind its documented owner, a task operation cannot run in the task-owner session, the documented `REPORT_ANALYSIS_TASK` `task_owner` argument is unsupported by the installed release, or the runner cannot map a bind case. The result is `BLOCKED_PENDING_DECISION` until the handoff is complete.

After preliminary `ACCEPT_CANDIDATE`, the owner supplies a disposable writable clone or explicitly write-enabled snapshot, a release-specific rehydration procedure, and a rehearsal identity record.

The clone must run the complete baseline, candidate, semantic, noise, regression, write, and recovery checks. That includes candidate-side write A/A validation against the copied target `write_elapsed_threshold` and `write_buffer_gets_threshold`, and the rehearsal manifest must prove the same floor provenance and locked thresholds were used.

A read-only snapshot can preserve baseline evidence but cannot satisfy the rehearsal gate, and a rejected-only rollback is not an accepted-state rehearsal. Record final `ACCEPT`, `REJECT`, or `INCONCLUSIVE` only after recovery and cleanup.

## Capture output without leaking secrets

Spooling preserves a client transcript for inspection; it does not guarantee that a CLOB report is complete. Use an approved complete-CLOB writer for report evidence and keep SQLcl/SQL*Plus spool output as a transcript. Store it in the approved lab directory. Redact connection strings, passwords, tokens, customer data, and sensitive bind values before sharing it.

**ILLUSTRATIVE — PLACEHOLDER — SQLcl.** Requires a writable path supplied by the lab owner. Expected output: a text file containing the session transcript, plan, and report while spool is on. The path below is a placeholder.

```text
spool /approved/lab/output/v0-session.log
```

**ILLUSTRATIVE — PLACEHOLDER — SQL\*Plus.** Requires the same approved writable path. Expected output: the same kind of text transcript. Stop spooling before leaving the session.

```text
spool /approved/lab/output/v0-session.log
```

**ILLUSTRATIVE — SQLcl or SQL\*Plus.** This completes the capture described above. Expected result: spooling stops and the approved text file remains unchanged.

```text
spool off
```

The file should identify the database target, client, release, user, task, timestamp or window, and command labels. It should not contain a password or a production payload.

## Clean up the practice target

This is final, conditional cleanup, not candidate rollback. It is an owner-approved state change. Before removing anything, retain the approved redacted evidence, record the preliminary decision, close clients that may hold an STS or task reference, and name the operator and timestamp. Record the final verdict only after cleanup.

1. After `REJECT_CANDIDATE`, use the V0 conditional rejected-candidate rollback and record `candidate_index_dropped` or `already_absent`; do not repeat an index drop during final cleanup.
2. After `ACCEPT_CANDIDATE`, preserve the candidate index and toy tables by default. Drop them only in a separate owner-approved destruction decision using the same `object_owner_schema` boundary as V0: use the object-owner session or an authorized DDL role/DBA with owner-confirmed `DROP ANY INDEX`/`DROP ANY TABLE`, and require `expected_dependency_set = []`.

   Keep `ALL_DEPENDENCIES` as one signal, and require a `PASS` owner-provided `dependency-attestation` artifact covering constraints/foreign keys, triggers, views/materialized views, grants/synonyms, and external references with exact owner/scope fields. Run the read-only exact-identity/dependency preflight, execute one DDL step at a time, save a postcondition after every step, and stop immediately on any partial state.

   Zero `ALL_DEPENDENCIES` rows alone is insufficient and is not `already_absent`; a missing, changed, or nonzero dependency count or attestation is `INCONCLUSIVE`. A zero or ambiguous target object count in this approved destruction path is `INCONCLUSIVE`, not `already_absent`. This is not rollback and is not an implicit-commit batch.

3. After preliminary `INCONCLUSIVE`, preserve the target and disposable objects unless the owner separately approves cleanup.
4. For ordinary cleanup, run task drops only in the `task_owner_schema` session, using the exact `:tname` and separate `:reg_tname` rows; record an ordinary-cleanup `already_absent` result when a task is already gone. Run object-owner checks/drops in the `object_owner_schema` session or with the owner-confirmed DDL privilege, and run STS drops in the `sts_owner_schema` session or with the documented `sqlset_owner` argument after references are removed. Do not pass `task_owner` to `CREATE_ANALYSIS_TASK`, `SET_ANALYSIS_TASK_PARAMETER`, `EXECUTE_ANALYSIS_TASK`, or `DROP_ANALYSIS_TASK`; only the documented `REPORT_ANALYSIS_TASK` call may use it.
5. For the optional container, stop and remove the container; remove its volume only when the owner confirms the data is disposable and retention requirements are met.
6. Securely delete transient output that contains credentials, customer data, or unredacted bind values.

Never copy real customer rows, production credentials, or raw bind values into the evidence pack. A bind handoff uses protected references and redacted tokens; the teardown record says what was retained, removed, or left with the owner.

## If a package or view is unavailable

Do not install a package, edit a data dictionary view, or borrow a stronger account to make the page work. Use this sequence:

1. Save the exact error and the statement that produced it.
2. Check the installed release, update level, and architecture.
3. Ask the DBA whether the object, synonym, role, or grant is missing.
4. Ask the release or licensing owner whether the feature is present and entitled.
5. Use a documented alternative if the owner provides one.
6. Mark the result `NOT-VERIFIED` when the comparison cannot run.

An unavailable object is an environment fact, not evidence that the SQL idea is wrong.

## No production by default

The lab is non-production or explicitly approved staging. Do not connect with production credentials, copy production data without authorization, or run a candidate on production because a page says `CREATE INDEX`, `ALTER SESSION`, or `DBMS_STATS`. A change plan and approval come before a production change. If you cannot identify the rollback owner, stop.

## A realistic junior workflow

Use this sequence when a ticket arrives:

1. **Receive the ticket.** Record the user-visible symptom, target statement or service, time window, and business owner.
2. **Reproduce safely.** Use a non-production target, fixed toy data, or a DBA-provided sanitized snapshot. Do not invent production binds.
3. **Request access.** Ask for the service, schema, client, least-privilege grants, output directory, and the name of the privileged owner.
4. **Write the change note.** State the hypothesis, one candidate, before procedure, after procedure, semantic checks, no-regression checks, and rollback.
5. **Get approval.** The DBA, SRE, release owner, or change manager may own the approval and the privileged execution.
6. **Observe and capture.** Save separately extracted per-execution samples, SPA reports, plans, errors, and timestamps. Do not report one lucky run.
7. **Hand off.** Give the next engineer the environment, `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, `instance_id`, `instance_scope_reason`, `session_instance_id`, bind manifest, exact plan artifacts with `plan_hash_value`, result status, `premeasurement_status`, the single `preliminary_decision`, final verdict, rollback result, sources, unknowns, and the accepted-clone rehearsal threshold/floor match evidence.

If the ticket needs production data, a service restart, a license confirmation, or a privileged package, stop at the boundary and route it to the owner.

## Safe setup checklist

- [ ] I chose the generic 19c-compatible, optional 26ai Docker, or reading-only path.
- [ ] I know the release, update level, edition, options, and entitlement questions.
- [ ] I have a non-production target and a named owner.
- [ ] I use a dedicated lab user and the least required privileges, including the named STS, SPA, `V$INSTANCE`/other V$ view, and DDL boundaries.
- [ ] I have recorded `sts_owner`, `task_owner`, the STS session/`sqlset_owner` path, the task-owner session, and the external per-bind runner.
- [ ] I know the service and PDB context; I did not guess them.
- [ ] I use SQLcl or SQL*Plus deliberately and record the client version.
- [ ] I can spool output to a protected, non-sensitive location.
- [ ] I know how to request a package, view, or grant that is unavailable.
- [ ] I have a rollback path and an owner-approved teardown path before the candidate change.
- [ ] I will mark a result `NOT-VERIFIED` when the run did not happen.
- [ ] I will not use production credentials or production data for the toy lab.
- [ ] I will keep bind values protected and share only redacted evidence.

## Next handoff

Read [Why evidence grades decide what you trust](/00-preface/01-why-evidence-grades/) next. Database readers can then run [How to prove a win](/00-preface/02-how-to-prove-a-win/) with a toy workload; reading-only readers should inspect its synthetic procedure and pass/fail contracts without running it as a local result.

The setup references that matter to this page are the [SQL Tuning Set guidance](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/managing-sql-tuning-sets.html), the [execution-plan guidance](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/generating-and-displaying-execution-plans.html), the [DBMS_SQLPA reference](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html), the [SQL Tuning Guide](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/), the [Database Performance Tuning Guide](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgdba/), and the [benchmarking methodology](https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf). Verify package signatures, privileges, licensing, and data on a test or staging database before running a procedure.

## Artifact

A setup record with the path you chose and why, the release, update level, edition, and option questions you raised, the service and PDB context you did not guess, the named `sts_owner`/`task_owner`/rollback approver, the least-privilege request you sent, the client and version you recorded, and the output location you can write to. A reader who cannot reconstruct that record has an access problem, not a performance problem.

The research pass had no Oracle instance available to connect to, and `sqlcl` and `sqlplus` were not on `PATH`. The commands and output shapes on this page are procedures and illustrations, not executed results.

Source IDs and technique IDs resolve in [Appendix Sources](/07-appendix-sources/).

**Decision:** Do not run what you cannot identify, reproduce, observe, and roll back.

**Next required page:** [Why evidence grades decide what you trust](/00-preface/01-why-evidence-grades/).
