---
title: Oracle SQL Optimization for Junior Devs
description: A plain starting point for reading, testing, and handing off Oracle SQL changes.
order: 0
draft: false
---

Basic SQL is enough to start reading this book. It is not enough to operate Oracle safely.

A fast query is a claim until you can reproduce it. This book turns an Oracle SQL performance guess into a decision another engineer can inspect: name the target, freeze the input, change one thing, measure the noise, check that the result still means the same thing, and keep the rollback.

> **Track:** Core (Before you start, Two workload terms, The route, Read the evidence labels, The catalog is not a prerequisite) · Practice (The main measurement spine, What this book does not claim) · Recovery (none) · Advanced / gated (Advanced and reference branches, The core path in one table)
>
> **Prerequisites:** Two rungs. **Entry:** Basic SQL: `SELECT`, `JOIN`, `WHERE`, and reading a small result set. **Second:** Oracle's cursor and plan vocabulary, plus a container and instance scoping notion. This page teaches the vocabulary half of that below and says plainly where the scoping half lives, so you are not sent out to find it.
>
> **Evidence status:** The route and definitions are documented. Oracle execution and performance outputs are illustrative or synthetic; research and catalog counts are repository metadata. **No live Oracle database was available**, so no output reported here is a measurement.
>
> **Next required page:** [Set up a safe Oracle practice environment](/00-preface/).

## How this page is banded

| Band                 | Sections                                                                                                         |
| -------------------- | ---------------------------------------------------------------------------------------------------------------- |
| **Core**             | Before you start · Two workload terms · The route · Read the evidence labels · The catalog is not a prerequisite |
| **Practice**         | The main measurement spine · What this book does not claim                                                       |
| **Recovery**         | none                                                                                                             |
| **Advanced / gated** | Advanced and reference branches · The core path in one table                                                     |

- **Core:** the prerequisites, the terms, the reading order, and the evidence labels. Read these before any lab page; nothing here touches a database.
- **Practice (The main measurement spine, What this book does not claim):** the comparison, owner boundaries, evidence handling, identity, write and recovery, and the rule that turns a measurement into an accept, a reject, or a block. This is the part a reader carries into a real ticket. The second section is the short list of things this book declines to claim.
- **Recovery (none):** the root page changes nothing, so it undoes nothing. The rollback and cleanup rules live on the [V0 lab](/00-preface/02-how-to-prove-a-win/).
- **Advanced / gated (Advanced and reference branches, The core path in one table):** read these when you need to choose a branch or see the whole handoff sequence at once.

## Before you start

### What you should know

You do not need Oracle administrator experience to begin. You do need to recognize a query, a join, a filter, and a result row. If one of those words is new, use a SQL tutorial before the lab.

### What the primary path needs

The primary path targets a generic Oracle Database 19c-compatible enterprise environment. It needs a non-production database, an approved service connection, a dedicated lab user or schema, a SQL client, and permission to capture output. The exact release, edition, options, and patches still belong in the evidence record.

Read the [environment and setup hub](/00-preface/) before running a lab command.

### What is optional

The [optional Oracle Database Free 26ai Docker sandbox](/00-preface/) is for setup, basic SQL, and basic plan practice when no enterprise lab is available. It is not required for the core method and does not promise SPA, RAT, diagnostics, or enterprise entitlements. A reading-only route is also valid: inspect the synthetic V0 procedure in [How to prove a win](/00-preface/02-how-to-prove-a-win/), but do not run it as a local result.

### What a junior may meet at work

A database change often arrives as a ticket: reproduce it safely, request access, write a change note, get approval, observe the result, hand off the evidence, and know the rollback. A database administrator (DBA), site reliability engineer (SRE), or release owner may own the privileged steps. Do not turn a missing approval into an improvised production command.

## Two workload terms, and the vocabulary behind them

A **SQL Tuning Set (STS)** is a named, repeatable set that may include SQL, binds, context, execution statistics, and plans. **SQL Performance Analyzer (SPA)** is the Oracle workflow that runs named before and after trials and reports comparison metrics. The [setup page](/00-preface/) explains the access and entitlement boundaries before the [V0 lab](/00-preface/02-how-to-prove-a-win/) uses them.

Those two are the only terms the core lab needs. Six more names appear in the measurement spine, and a reader who meets them cold will not know what class of tool they are holding:

- **SQL Plan Management (SPM)** keeps a verified plan as a baseline and restricts the optimizer to accepted plans. It is a deployment control rather than a report or a monitor, which is why it stays reachable when the licensed diagnostics do not.
- **AWR, ASH, and ADDM** are the licensed history lane. AWR aggregates snapshots, ASH samples active sessions, ADDM turns those samples into findings.
- **The advisors** — SQL Tuning Advisor, SQL Access Advisor, Optimizer Statistics Advisor — return proposals. None of them decides anything.
- **`GATHER_PLAN_STATISTICS` and `ALLSTATS`** are how a plan acquires actual row counts instead of estimates.

And for anyone without a pack licence, the pack-free substitutes matter more than the licensed names: **Snapper** for live session deltas, **Statspack** for interval history, and the core dynamic views for current state. The [setup page](/00-preface/) defines all of these, and [Measure First](/01-proven-techniques/01-measure-first/) says which one answers which question.

### Page-one vocabulary

The names below are the ones you meet on this page and in the first lab without a definition attached. This is a lookup table, not a tutorial: one sentence per term. The last column says where the name lives, so you know what is safe to search for in the Oracle reference — an **Oracle column** is a real field in the real view named there, and a **book term** is this book's own vocabulary rather than a dictionary field.

| Term                     | One sentence                                                                                                                                                                  | Where it lives                                                                |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| **`sql_id`**             | The identifier Oracle gives a statement's normalized text, so you can find that same statement again later.                                                                   | Oracle column: `V$SQL`                                                        |
| **`cursor`**             | The server-side handle for one parsed statement; running that statement again makes child cursors under the same `sql_id`, and `sql_id` names the parent family.              | Oracle concept                                                                |
| **`child_number`**       | The number that tells one child cursor apart from its siblings under the same `sql_id`, because one statement can have several plans.                                         | Oracle column: `V$SQL`                                                        |
| **`bind`**               | A value supplied separately from the SQL text and written as `:dept_id` in the statement, so one piece of text can run against many values.                                   | Oracle concept                                                                |
| **plan**                 | The ordered list of steps Oracle chose to execute your statement.                                                                                                             | Oracle concept                                                                |
| **execution plan**       | The plan as it actually ran, carrying the real row counts and work counters instead of the optimizer's estimates.                                                             | Oracle concept                                                                |
| **execution statistics** | The counts and timings a run produced — rows, blocks, starts, elapsed time — which exist only if you asked Oracle to gather them.                                             | Oracle concept                                                                |
| **`E-Rows`**             | Estimated rows: what the optimizer predicted this step would handle, before anything ran.                                                                                     | Oracle column: `V$SQL_PLAN`, labelled `E-Rows` by `DBMS_XPLAN`                |
| **`A-Rows`**             | Actual rows: what the step really handled during the run, and the number that exposes a wrong estimate.                                                                       | Oracle column: `V$SQL_PLAN_STATISTICS_ALL`, labelled `A-Rows` by `DBMS_XPLAN` |
| **`plan_hash_value`**    | A fingerprint of a plan's shape, so one comparison tells you whether a change altered the plan or left it alone.                                                              | Oracle column: `V$SQL_PLAN`                                                   |
| **`buffer_gets`**        | Logical block requests a run made through the buffer cache, which counts work requested and is not the same thing as disk reads.                                              | Oracle column: `V$SQL`                                                        |
| **instance**             | One running Oracle database — its background processes, memory, and data files — where a RAC installation runs several and instance-local views show only the one you are on. | Oracle object: `V$INSTANCE`                                                   |
| **session**              | One connection to an instance, with its own identity, parameters, and current work, and the unit you connect, bind, and measure through.                                      | Oracle concept                                                                |
| **schema**               | A named namespace of objects belonging to one user, and also the account an unqualified statement's objects resolve against.                                                  | Oracle concept                                                                |
| **STS**                  | A SQL Tuning Set: a named, repeatable bundle of SQL, binds, context, and plans that you can replay and compare.                                                               | Oracle object                                                                 |
| **SPA**                  | SQL Performance Analyzer: the Oracle workflow that runs a before trial and an after trial over a set and reports the difference between them.                                 | Oracle feature                                                                |
| **bind manifest**        | This book's name for the recorded list of bind values, deliberately kept outside the database so a run can be repeated exactly.                                               | Book term                                                                     |
| **A/A control**          | A trial that changes nothing on purpose, run to measure how far the numbers drift on their own before you believe any change.                                                 | Book term                                                                     |
| **noise floor**          | The distance a measurement moves when nothing about the work changed, and the size of difference a real win has to clear to be worth anything.                                | Book term                                                                     |

Six of these — `sql_id`, `child_number`, `E-Rows`, `A-Rows`, `plan_hash_value`, and `buffer_gets` — are dictionary columns, so a reader who greps the Oracle reference for the name in the last column lands on the field itself. The identity fields that scope a statement beyond its text (`con_id`, `instance_id`, `session_instance_id`, and their reason fields) are documented with the worksheet that collects them, on the [Measure First worksheet](/01-proven-techniques/01-measure-first/), and the full set is spelled out in the `LOCAL RESULT` label under **Read the evidence labels** further down this page.

## The route

Read these pages in order. Each handoff has a job, and each page's prerequisites are already behind you when you reach it. This list is exhaustive for the core spine: every page in `/00-preface/`, `/01-proven-techniques/`, `/03-toolbox/`, `/04-recipes/`, and `/05-feedback-loop/` is named below. The four reference branches are in [Advanced and reference branches](#advanced-and-reference-branches) instead, because they are skippable.

1. **Start here.** You now have the promise, the evidence boundary, and the route.
2. **[Set up the environment](/00-preface/).** Learn the terms, choose a safe database path, and request least privilege.
3. **[Why evidence grades decide what you trust](/00-preface/01-why-evidence-grades/).** Turn a broad tip into a scoped, testable claim.
4. **[How to prove a win](/00-preface/02-how-to-prove-a-win/).** Database readers run the first controlled before-and-after lab; reading-only readers inspect its synthetic procedure.
5. **[Work through the proven-technique groups](/01-proven-techniques/).** Choose the group that explains the observed work, not the group with the cleverest feature. This page set comes first because the measurement pages below declare its plan vocabulary and target worksheet as their own prerequisites. The index is a decision map; the five pages it routes to are, in order, **[Measure First](/01-proven-techniques/01-measure-first/)**, **[Stats Run the Show](/01-proven-techniques/02-stats-run-the-show/)**, **[Indexes and Layout](/01-proven-techniques/03-indexes-and-layout/)**, **[Let Oracle Rewrite](/01-proven-techniques/04-let-oracle-rewrite/)**, and **[Stabilize and Ship Safely](/01-proven-techniques/05-stabilize-and-ship-safely/)**.
6. **[Open the toolbox map](/03-toolbox/)**, then read the plan that actually ran in **[Measure executed plans and Monitor](/03-toolbox/01-measure-with-xplan-and-monitor/)** and the cheap checks first in **[Static Checks Before DB Time](/03-toolbox/04-static-checks-before-db-time/)**. Static checks sit here because the recipes chapter declares them a prerequisite.
7. **[Freeze work with a SQL Tuning Set](/03-toolbox/02-freeze-work-with-sts/)**, then open the [recipe chapter](/04-recipes/) at **[Freeze With STS](/04-recipes/01-freeze-with-sts/)**. Two pages then need that frozen set behind them. **[Load Test Without Prod](/03-toolbox/03-load-test-without-prod/)** needs nothing but the frozen set, and is required whenever the candidate affects contention or resource use — buffer cache, locks, CPU, or I/O — optional otherwise, which is a test of the candidate rather than a position in this list. That is a trigger rather than the whole rule, and the [load gate page](/03-toolbox/03-load-test-without-prod/) owns the rest of it, including the entitlement fallback. The comparison in the next step is required on every candidate.
8. **[Compare with SQL Performance Analyzer](/04-recipes/02-before-after-with-spa/)** — which declares **[Freeze With STS](/04-recipes/01-freeze-with-sts/)** as its prerequisite, so step 7 is not optional — and **[measure the noise floor](/05-feedback-loop/02-noise-floor-and-repetition/)**. Separate a signal from ordinary movement. This comparison is required on every candidate, and it is the last step that is. Then **[Stats Pipeline You Can Script](/04-recipes/03-stats-pipeline-you-can-script/)** and **[Safe DDL and CI Gates](/04-recipes/04-safe-ddl-and-ci-gates/)**.
9. **[Close the loop](/05-feedback-loop/).** **[One Change at a Time](/05-feedback-loop/01-one-change-at-a-time/)** fixes the scope, then **[the accept / reject / roll-back gate](/05-feedback-loop/03-accept-or-rollback-gate/)** is the page that records the verdict and the rollback, and **[Memory and When to Stop](/05-feedback-loop/04-memory-and-when-to-stop/)** says when the investigation is finished. Accept, reject, or block the change on stated evidence — then roll it back or keep it, and know which you did. Nothing before this step is a decision.

## Advanced and reference branches

After the core method, take only the branch you need:

| Branch                                                  | Read it when                                                                                        | Skip it when                                                                                                      |
| ------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [Papers Behind the Recipes](/02-papers-behind-recipes/) | You need the source behind a mechanism or a claim about what transfers to Oracle.                   | **Skip if you only need the core method:** the evidence page and the lab already define the decision process.     |
| [OSS Guide](/06-oss-guide/)                             | You are evaluating open-source software (OSS) for parsing, testing, collection, or load generation. | **Skip if you only need the core method:** OSS prepares a test; it does not decide an Oracle plan or ship safety. |
| [Appendix Sources](/07-appendix-sources/)               | You need citation classes, source IDs, version drift, or dated snapshots.                           | **Skip if you only need the core method:** use the source links on the page that makes the claim.                 |
| [Bonus Batch API](/08-bonus-batch-api/)                 | You call the Anthropic Message Batches API and can wait for asynchronous work.                      | **Skip if you only need the core method:** this branch is explicitly non-Oracle.                                  |

## The core path in one table

The stops are ordered so that each page's declared prerequisites are already behind you: the technique page set comes before the measurement pages that name it as a prerequisite. One step is a requirement rather than a position — the load gate at stop 5 needs only the frozen set behind it, and is required whenever the candidate affects contention or resource use — buffer cache, locks, CPU, or I/O, optional otherwise. That is a trigger rather than the whole rule, and the [load gate page](/03-toolbox/03-load-test-without-prod/) owns the rest of it, including the entitlement fallback. It does not wait on the comparison at stop 6, and the comparison is required on every candidate regardless. Stop 7 is not optional and it is not a reference branch — it owns the accept/reject/roll-back decision, so a route that ended at stop 6 would have handed a reader a method with no way to conclude anything.

Each stop names its chapter hub first and then that chapter's child pages in reading order, so **every page on the core spine appears in exactly one stop**. The four reference branches appear in [Advanced and reference branches](#advanced-and-reference-branches) and in no stop, because the book bands them as skippable.

| Stop | Page                                                                                                                                                                                                                                                                                                                                                                                                      | The handoff                                                                                                                     |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| 1    | [Environment](/00-preface/)                                                                                                                                                                                                                                                                                                                                                                               | You have a safe target, a client choice, and a least-privilege request.                                                         |
| 2    | [Evidence grades](/00-preface/01-why-evidence-grades/)                                                                                                                                                                                                                                                                                                                                                    | You have a claim, a source class, a scope, and a test.                                                                          |
| 3    | [V0 lab](/00-preface/02-how-to-prove-a-win/)                                                                                                                                                                                                                                                                                                                                                              | Database readers have built the fixture, captured the workload, and locked the incumbent baseline. The verdict lands at stop 9. |
| 4    | [Technique branches](/01-proven-techniques/) · [Measure First](/01-proven-techniques/01-measure-first/) · [Stats Run the Show](/01-proven-techniques/02-stats-run-the-show/) · [Indexes and Layout](/01-proven-techniques/03-indexes-and-layout/) · [Let Oracle Rewrite](/01-proven-techniques/04-let-oracle-rewrite/) · [Stabilize and Ship Safely](/01-proven-techniques/05-stabilize-and-ship-safely/) | You can test a candidate in the class that matches the cause.                                                                   |
| 5    | [Measurement](/03-toolbox/) · [Measure With XPLAN and Monitor](/03-toolbox/01-measure-with-xplan-and-monitor/) · [Static Checks Before DB Time](/03-toolbox/04-static-checks-before-db-time/) · [Freeze Work With STS](/03-toolbox/02-freeze-work-with-sts/) · [Load Test Without Prod](/03-toolbox/03-load-test-without-prod/)                                                                           | You can explain what the plan and workload did.                                                                                 |
| 6    | [Workload and comparison](/04-recipes/) · [Freeze With STS](/04-recipes/01-freeze-with-sts/) · [Before and After With SPA](/04-recipes/02-before-after-with-spa/) · [Stats Pipeline You Can Script](/04-recipes/03-stats-pipeline-you-can-script/) · [Safe DDL and CI Gates](/04-recipes/04-safe-ddl-and-ci-gates/)                                                                                       | You can compare the same input and inspect the uncertainty.                                                                     |
| 7    | [Feedback loop](/05-feedback-loop/) · [One Change at a Time](/05-feedback-loop/01-one-change-at-a-time/) · [Noise Floor and Repetition](/05-feedback-loop/02-noise-floor-and-repetition/) · [Accept or Rollback Gate](/05-feedback-loop/03-accept-or-rollback-gate/) · [Memory and When to Stop](/05-feedback-loop/04-memory-and-when-to-stop/)                                                           | You can accept, reject, or block a change on stated evidence and roll it back.                                                  |

Stop 6 carries the dependency that the numbered route makes explicit at step 8: **[Before and After With SPA](/04-recipes/02-before-after-with-spa/)** declares **[Freeze With STS](/04-recipes/01-freeze-with-sts/)** as its prerequisite, so the freeze recipe is on the core path rather than optional reading. Stop 7 ends on **[the accept / reject / roll-back gate](/05-feedback-loop/03-accept-or-rollback-gate/)** — the page that records `ACCEPT`, `REJECT`, or `INCONCLUSIVE` and owns the rollback — and **[Memory and When to Stop](/05-feedback-loop/04-memory-and-when-to-stop/)** closes the investigation behind it.

Stop 3 is the one that takes real work. The V0 page owns the full list: an owner-qualified capture mode, exact statement identity, an external per-bind manifest, an unchanged control, one candidate, a separate complete V0 regression workload task/report with per-statement A/A floors, raw/SPA artifact separation, no-regression including write cost, rejected-candidate rollback, accepted-state rehearsal on a writable clone or write-enabled snapshot, default-preserving final cleanup, and a verdict.

## Read the evidence labels

The labels describe the kind of artifact you have. They are not interchangeable.

- **DOCUMENTED BEHAVIOR:** Oracle documentation or another identified source describes a feature or mechanism for a stated release and scope.
- **PROCEDURE:** A repeatable set of steps says what to run, what to capture, how to compare, and how to recover. A procedure is not a result.
- **ILLUSTRATIVE or SYNTHETIC EXAMPLE:** An illustrative block shows the shape of a procedure or output without claiming execution; a synthetic example invents data or numbers for teaching. Neither is evidence that this repository ran Oracle.
- **LOCAL RESULT:** A measurement tied to a named database, release, workload, bind set, timestamp or window, and client procedure. It arrives in two tiers, and you only need the first one to start. **Minimum viable identity — enough to find the statement you are about to run in the first lab:** `sql_id`, `child_number`, and `parsing_schema_name`, all three defined in the page-one vocabulary table above or in the [Measure First worksheet](/01-proven-techniques/01-measure-first/). **Complete identity set, and what the V0 lab actually records:** `sts_owner`, `object_owner_schema`, `task_owner`, `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, `instance_id`, `instance_scope_reason`, `session_instance_id`, and exact plan artifacts with `plan_hash_value`; the owner and task fields (`sts_owner_schema`, `object_owner_schema`, `task_owner_schema`) are the three role names this book uses, and they are defined in the V0 lab's own terms section rather than here; the rest are defined in the page-one vocabulary table or the Measure First worksheet. The full tuple is carried for one reason — so a result is never called "global" when it is in fact scoped to a container or an instance. The label also requires a complete report CLOB path, `USER_ADVISOR_TASKS` status/message evidence, named execution verification, separately extracted per-execution samples, and accepted-clone write-threshold/floor match evidence. Keep named SPA reports, the complete V0 regression workload artifacts, and recovery evidence with it.
- **CANDIDATE or NOT-VERIFIED:** A plausible change or a source lead without the result needed to support the claim. It may be tested; it may not be shipped as fact.

The labels apply to artifacts. A catalog count or research tally is repository metadata, not an Oracle execution output.

The [evidence chapter](/00-preface/01-why-evidence-grades/) owns the detailed A1–D source classes and the research `PROVEN` label. The [V0 lab](/00-preface/02-how-to-prove-a-win/) owns the result, semantic, no-regression, rejected-candidate rollback, accepted-state writable-clone rehearsal, and default-preserving final-cleanup gates.

## The catalog is not a prerequisite

The research catalog has 68 entries: 67 marked `PROVEN` and one `CONDITIONAL` entry, T-08. The [evidence chapter](/00-preface/01-why-evidence-grades/) defines the `PROVEN` bar and keeps those counts separate from local results. They do **not** mean this repository executed the technique on a live Oracle database.

You do not need to memorize 68 entries, count a catalog, or learn a feature before you can run the first lab. Learn the method first. Return to the catalog when your evidence names a cause.

## The main measurement spine

- **Comparison:** The canonical comparison is a frozen representative application workload plus the complete V0 regression workload and [SQL Performance Analyzer](/04-recipes/02-before-after-with-spa/). The [DBMS_SQLPA reference](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html) describes the package, but a named SPA `test execute` report is not automatically a raw per-execution sample. SPA answers _did this set of statements get better or worse_; Database Replay answers _what happens when the real application runs concurrently_, and the [SPA recipe](/04-recipes/02-before-after-with-spa/) states which one a given change needs.
- **Owner boundaries:** Run STS operations in the `sts_owner` session or with the documented `sqlset_owner` argument. Run `CREATE_ANALYSIS_TASK`, `SET_ANALYSIS_TASK_PARAMETER`, `EXECUTE_ANALYSIS_TASK`, and `DROP_ANALYSIS_TASK` in the `task_owner_schema` session; `REPORT_ANALYSIS_TASK` may use the documented `task_owner` argument when the installed release supports it. Do not pass that argument to lifecycle operations.
- **Evidence handling:** Map representative binds with an external per-bind runner, keep the target and regression workloads separate, include the `REG-03` `:dept_id` bind family, write complete report CLOBs with an approved writer, check `USER_ADVISOR_TASKS` `STATUS`/`STATUS_MESSAGE` and verify the named execution separately, extract raw samples separately when a report is aggregated, and use the canonical [K>=5 and bootstrap policy](/05-feedback-loop/02-noise-floor-and-repetition/) for a formal claim. Record cache state, first-execution warm-up, and adaptive-plan behavior as declared conditions: they change within a trial, and no number of repetitions averages them away.
- **Identity:** Every bind-manifest, raw-sample, regression-gate, and evidence-pack row carries `sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, `instance_id`, `instance_scope_reason`, and `session_instance_id`; exact plan artifacts also carry `plan_hash_value`. `DBMS_XPLAN.DISPLAY_CURSOR` requires the exact manifest instance; an unknown or mismatched instance is a stop. The 19c `V$SQL` view does not expose `INSTANCE_NUMBER`: single-instance capture records `instance_id = N/A` with a reason, while RAC/multi-instance capture uses `GV$SQL.INST_ID AS instance_id`. Record `con_id = N/A` with a reason and a scoped container identity when the release/session cannot supply it; never call an unscoped tuple global. The [target worksheet](/01-proven-techniques/01-measure-first/) also carries release and patch level, session parameters, service and client identifier, fetch shape, bind names and types, statistics timestamps, and concurrency level — because without those, two executions are not comparable.
- **Write and recovery:** The write A/A floor and both write thresholds are locked from incumbent evidence before any candidate write probe. The accepted clone rehearsal copies the predeclared write floors/thresholds, completes candidate-side validation before recovery, and proves the same candidate-side write A/A validation used them.
- **Accepted-state destruction:** It uses the same `object_owner_schema` boundary, `expected_dependency_set = []`, and a `PASS` owner-provided `dependency-attestation` artifact covering constraints/foreign keys, triggers, views/materialized views, grants/synonyms, and external references with exact owner/scope fields. `ALL_DEPENDENCIES` is one signal; zero rows alone is not proof. Missing or changed dependencies are `INCONCLUSIVE`.
- **Decision:** The V0 order is 11A regression incumbent baseline before section 6, then 11B regression candidate comparison after sections 7 and 10. The [Feedback Loop](/05-feedback-loop/) page holds the branch-level decision rules, and the [benchmarking methodology](https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf) supports the repetition context. The V0 decision model records `premeasurement_status` (`PRELIMINARY_GATE_FAILURE` or `BLOCKED_PENDING_DECISION`), then one `preliminary_decision` (`ACCEPT_CANDIDATE`, `REJECT_CANDIDATE`, or `INCONCLUSIVE`) at the single gate, and records final `ACCEPT`, `REJECT`, or `INCONCLUSIVE` only after recovery and cleanup; write acceptance uses separate `write_elapsed_threshold` and `write_buffer_gets_threshold` checks.

## What this book does not claim

Three refusals, stated up front because each one is a question a reader will otherwise assume has an answer.

**No pack table.** Oracle's feature documentation tells you what a feature does; it does not tell you what you must license, and neither does a datasheet written a decade ago for a product line that has been repackaged since. Every entitlement here resolves to "confirm against the licensing guide for your exact release and deployment" [S90](https://docs.oracle.com/en/database/oracle/oracle-database/19/dblic/Licensing-Information.html). If the answer is no, [Measure First](/01-proven-techniques/01-measure-first/) names the ungated tools that run the same method: Snapper, Statspack, the core dynamic views, session trace, and SPM.

**No report instead of reading.** `DBMS_XPLAN` ships two plan-comparison functions and **both are on the 19c primary path.** `COMPARE_PLANS` is documented in the 19c package reference at §224.5.1, and it is absent from the 12.2 reference, so 19c is the release that introduced it. What a comparison report will not do is tell you _why_ the plan changed. The [plan comparison section](/01-proven-techniques/01-measure-first/) says which function you would want, what each returns, and which part of it drifts between releases.

**No vendor claim as a result.** A commercial tool's documentation records what the product claims to do. The [toolbox map](/03-toolbox/) catalogues those tools and the gap each one fills; none of them is a measurement on your database until the [gate](/05-feedback-loop/03-accept-or-rollback-gate/) says so.

For plan terms, use the [Oracle SQL Tuning Guide](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/generating-and-displaying-execution-plans.html) and the [DBMS_XPLAN reference](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html). The broader [Database Performance Tuning Guide](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgdba/) groups the surrounding Oracle material.

## Artifact

A route record with: the page you stopped on, the symptom you are carrying, the evidence class that would prove it, the one candidate class you chose, and the verdict you are allowed to claim so far. If the verdict field is empty, you have a lead, not a result, and the next page tells you which artifact would fill it.

The research pass had no Oracle instance available to connect to, and `sqlcl` and `sqlplus` were not on `PATH`, so this book contains procedures, illustrations, and synthetic examples rather than an executed benchmark.

**Decision:** Keep the incumbent unless a frozen, repeatable comparison shows a real win and the result still means the same thing.
