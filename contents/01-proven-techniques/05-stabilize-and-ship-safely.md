---
title: Stabilize and Ship Safely
description: Advanced and gated. Hints, profiles, patches, SPM, advisors, and guardrails are not junior copy-paste fixes.
order: 9
draft: false
---

A speedup that disappears after a statistics job, a patch, or an upgrade is not finished. It is an observation.

This page is **Advanced and gated**. Read it to recognize which family someone is proposing, what evidence it needs, and who has to sign.

A few ideas here are readable on purpose: knowing what a hint, a profile, or a baseline _is_ makes you a better judge of a proposal someone else writes. What this page will not give you is a copy-paste fix.

Each mechanism below needs a prerequisite, an owner, and a tested rollback, and most need a privilege a junior does not have. Where a block appears, it is a shape for the owner to review, not a step for you to run.

> **Track:** Advanced / gated
>
> **Prerequisites:** [Measure First](/01-proven-techniques/01-measure-first/) plus a completed candidate comparison from the [V0 lab](/00-preface/02-how-to-prove-a-win/) with a passed semantic gate, a passed workload gate, and a tested rollback.
>
> **Evidence status:** Mechanisms and release boundaries are documented and cited. Its blocks are labeled `ILLUSTRATIVE`, `SYNTHETIC`, `SKETCH`, or `PLACEHOLDER`; every ship packet, plan, and timing is `SYNTHETIC`. **No live Oracle database was available**, so no production rollout and no incident on this page happened either.
>
> **Next required page:** [Open the toolbox map](/03-toolbox/), which is where the route goes next. The [Accept or Rollback Gate](/05-feedback-loop/03-accept-or-rollback-gate/) and [Safe DDL and CI Gates](/04-recipes/04-safe-ddl-and-ci-gates/) are both worth having behind you before you ship, and the route reaches them at steps 8 and 9.

## How this page is banded

**This page is Advanced / gated end to end. There is no Core band and no Practice band here, and that is deliberate.**

| Band                 | Sections |
| -------------------- | -------- |
| **Core**             | none     |
| **Practice**         | none     |
| **Recovery**         | none     |
| **Advanced / gated** | 1 to 10  |

- **Core (none):** nothing on this page is Core. Do not treat any section as beginner-actionable.
- **Practice (none):** nothing here is Practice in the "do this on a ticket yourself" sense. Sections 8, 9, and 10 describe artifacts you assemble, but every action they name is owned by a DBA, SRE, or release owner.
- **Recovery (none):** this page governs decisions but owns no undo. Each control it names carries its own recovery primitive, and the class-specific rollback and its proof live on [Accept or Rollback Gate](/05-feedback-loop/03-accept-or-rollback-gate/).
- **Advanced / gated (1 to 10):** every section requires a prerequisite, a named owner, and a tested rollback, and most require a privilege a junior does not have. Several also need a release, edition, or entitlement check.

Why there is no Core band: the mechanisms here attach governed objects, mutate optimizer behavior, or change what runs in production. None of them is a first move, and none of them is safe to paste from a web page. If you arrived looking for a first speedup, go back to [Measure First](/01-proven-techniques/01-measure-first/) and work the Core bands there.

## 1. Four words people confuse

Say these correctly or the rest of the page is noise.

**Speed is not durability.** Speed is one measurement on one workload at one time. Durability is the property that the same good outcome happens tomorrow, after the next statistics job, the next data load, the next patch, and the next release. A change can be fast and not durable, durable and not fast, both, or neither. You have to test for each separately.

**A plan change is not a win.** A different `plan_hash_value` means the plan's shape changed. It is possible, and common, for a plan change to make things worse. The change is a fact; the win requires the [workload comparison and the noise floor](/05-feedback-loop/02-noise-floor-and-repetition/).

**A ship packet is not a rollout.** A ship packet is a document: the change, the evidence, the rollback, the owner, the observation window. A rollout is what happens after a human approves the packet and someone executes it and someone else watches. Producing a good packet does not ship anything, and shipping something without a good packet is how an incident gets explained.

**Speed and correctness are not a trade.** There is no version of this work where you accept a wrong result for a faster one. The fixtures pass or the candidate is rejected. That is not negotiable, and it is not a judgement call you get to make under release pressure.

## 2. What failed, and the smallest control that addresses it

Read these two tables before you read any mechanism below. Each row is keyed by a short failure ID; the first table names the failure and the smallest control that addresses it, the second gives the prerequisite, the test, and the rollback. Anything larger than the smallest control is a choice you must justify.

| ID   | What failed                                                                                        | Smallest control that addresses it                                                  | Owner                         |
| ---- | -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ----------------------------- |
| F-1  | The optimizer's estimate for a skewed predicate is wrong, and you cannot change the data           | Fix the statistics. A control is the wrong tool.                                    | DBA                           |
| F-2  | The estimate is right and the plan is still bad, but the SQL is owned by a team you do not control | A SQL profile on the SQL ID, adding optimizer information without changing the text | DBA                           |
| F-3  | A specific statement hits a known optimizer defect or error that cannot be fixed now               | A SQL patch on the SQL ID, as a documented workaround                               | DBA, incident owner           |
| F-4  | A critical statement's plan drifts on every data change and you need the good plan to win          | A SQL plan baseline captured from the cursor cache                                  | DBA, service owner            |
| F-5  | You need the plan for a critical statement and you cannot wait for a maintenance window            | Automatic SQL Plan Management on the DBA's schedule                                 | DBA                           |
| F-6  | An execution is slow enough that users notice, and a real-time decision is worth the release       | Real-Time SPM, if the installed release has it                                      | Release owner                 |
| F-7  | A bind value needs a different plan than the common one, and the same plan is forced on both       | Review cursor sharing and adaptive cursor sharing first                             | DBA, application owner        |
| F-8  | A runaway query is consuming resources right now                                                   | Resource Manager, to cap or switch the runaway work                                 | DBA, SRE                      |
| F-9  | A specific plan keeps being chosen and is a known problem                                          | SQL Quarantine, a per-statement execution-plan threshold configuration              | DBA, release owner            |
| F-10 | A report's aggregation is recomputed on every request and it is the same every time                | A materialized view with query rewrite, or the result cache                         | Service owner, business owner |
| F-11 | A table must be restructured without downtime                                                      | Online redefinition with a real abort path                                          | DBA, change manager           |
| F-12 | Application code must switch between a fixed version and a candidate version                       | Edition-Based Redefinition                                                          | Application owner, DBA        |

| ID   | Prerequisite                                                                           | Test                                                                                           | Rollback                                                                                      |
| ---- | -------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| F-1  | Readable, gatherable statistics                                                        | V0 with the statistics change alone                                                            | Discard pending, or restore retained statistics                                               |
| F-2  | DBA privilege, `ENABLE` on the profile, and an owner who can change the SQL eventually | V0 with the profile applied, plus a plan report showing it was used                            | `DROP_SQL_PROFILE`, then rerun the affected workload                                          |
| F-3  | `ENABLE` on the patch, DBA privilege, an incident ID, an expiry                        | V0 with the patch, plus verification that the error path is fixed                              | Remove or disable the patch through the release-supported `DBMS_SQLDIAG` workflow             |
| F-4  | The DBA, the plan, and evidence the captured plan is the good one                      | Capture, then confirm the accepted plan is used; candidates go through the documented workflow | Disable or drop the candidate baseline; the prior accepted plan remains                       |
| F-5  | Automatic SPM enabled and a critical-statement list                                    | Observe capture and evaluation; confirm the accepted plan is used                              | Disable automatic SPM for the statement; the baseline policy remains                          |
| F-6  | 26ai and entitlement                                                                   | Compare against the accepted plan; confirm regression is contained for later runs              | The accepted plan is already what returns; no rollback for a single execution                 |
| F-7  | `V$SQL` and `V$SQL_SHARED_CURSOR` access, a bind-aware set                             | Run V0 with common and skewed binds; compare plans and metrics                                 | End the session or revert the session setting; never make a system-parameter change to "test" |
| F-8  | Resource Manager configured with an approved plan                                      | Observe the switch; verify the runaway is bounded                                              | Restore the Resource Manager plan                                                             |
| F-9  | A Resource Manager threshold in place, plus entitlement                                | Confirm the statement no longer runs on the named plan under the threshold                     | `DROP_QUARANTINE` on the named configuration; re-verify normal planning                       |
| F-10 | A business agreement on how stale is acceptable                                        | Compare the rewritten query against the original on the same workload                          | Drop the view or disable the rewrite; the cache clears itself                                 |
| F-11 | The table qualifies and the redefinition is rehearsed                                  | Rehearse on a non-production copy; verify sync and cutover                                     | `ABORT_REDEF_TABLE` before `FINISH_REDEF_TABLE`                                               |
| F-12 | Editions enabled; the application switches editions                                    | Verify the application is on the intended edition before declaring success                     | Switch the session back to the prior edition and verify                                       |

A note on `CURSOR_SHARING`: do not make `CURSOR_SHARING=FORCE` a permanent fix. It reduces parse work and can make plans worse by destroying bind awareness. If someone proposes it, ask what problem it is solving and whether the answer is a plan or a session. [S20], _Improving Real-World Performance Through Cursor Sharing_, a chapter of the 19c SQL Tuning Guide. That bibliography record is TOC-verified and carries no separate chapter URL, so the guide index is linked.

## 3. Hints: the tool that most often hides the problem

A hint is an instruction in the SQL text or an `ALTER SESSION` that tells the optimizer what to do. It is a blunt instrument with three failure modes worth knowing.

**It can be ignored.** Oracle records hint usage, and a hint that was not used is invisible unless you go looking. Use the hint-usage report in `DBMS_XPLAN` and confirm the hint did something before you claim it did. [S19](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/influencing-the-optimizer.html)

**It goes stale.** A hint that fixes today's plan can lock in a plan that is wrong after the data changes, because the optimizer is no longer free to choose.

**It hides the estimate.** If you hint your way past a bad estimate, the bad estimate is still there. The next schema change, release, or statistics refresh can make the hinted plan the wrong plan, and now the problem is invisible.

A hint is a temporary control with an expiry. If you cannot name the root cause it is working around, or the date it expires, you are not ready to ship it.

## 4. Profiles and patches: buy time, do not fix

A SQL profile attaches auxiliary optimizer information to a SQL ID without changing the application text. A SQL patch attaches a controlled workaround to a SQL ID when a known error or optimizer problem needs a short-term mitigation. Both are keyed to the SQL ID, both need an enable/disable or drop path, and both are controls rather than root-cause repairs by default. [S34], _Managing SQL Profiles_, a chapter of the 19c SQL Tuning Guide. That bibliography record is TOC-verified; the chapter itself is [verified here](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/managing-sql-profiles.html). [S43](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLDIAG.html)

For a profile, keep the incident ID, the owner, the expiry, the test result, and the drop command. For a patch, keep the same plus the exact `DBMS_SQLDIAG` workflow you used, because the names and signatures are release-dependent and you should not copy a call shape from another release. If the root cause can be fixed, fix it. If it cannot, make the control visible so somebody remembers it exists.

### F-2 and F-4 are not the same control

The table puts a profile at F-2 and a baseline at F-4, and the difference between them decides which one you pick, so it is worth one sentence of semantics rather than one sentence of syntax. The 19c plan-management guide states the distinction in a subsection of its own, and Oracle's optimizer team writes up the same point as corroboration [S21](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/overview-of-sql-plan-management.html) [S88].

**A SQL profile adds information to the optimizer. It does not force a plan.** A profile carries auxiliary statistics, bind information, and sometimes hints, and the optimizer is free to accept or ignore all of it. That is exactly why it is the right control for F-2: your estimate is wrong, you cannot change the data or the SQL text, and you want to hand the optimizer better numbers rather than a decision.

**A SQL plan baseline restricts selection to accepted plans.** The optimizer may use an accepted plan and may not use an unaccepted one without going through evolution. That restriction is the whole point, and it is why a baseline is the right control for F-4: you do not trust the optimizer to keep choosing the good plan on its own after every data change.

So the failure modes differ too, and this is the part that gets people. A profile that the optimizer half-ignores still runs; the statement keeps working, possibly no better. A baseline that cannot be satisfied does not silently degrade — the plan you need stops being available, and you find out at the worst time. **The profile is a soft control that may not take. The baseline is a hard control that can break the statement if its conditions stop holding.** [S34](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/managing-sql-profiles.html) [S07] [S21]

## 5. SQL Plan Management: the plan as a governed artifact

SQL Plan Management gives a critical statement a plan history. You capture the known plan, use the baseline as the stability boundary, and let candidates be evaluated through the plan-management workflow rather than run silently in production.
**PLACEHOLDER — advanced owner/release action, not a junior step.** SQLcl or SQL\*Plus, plan-capture shape for the DBA. Requires the `DBMS_SPM` privileges and a release that supports baseline capture.

Two facts about the 19c interface shape this block. First, every documented `DBMS_SPM.LOAD_PLANS_FROM_CURSOR_CACHE` overload is a **function** whose return value is the **number of plans loaded**.
Nothing returns a SQL handle, so `:n_plans` is a count and must never be passed to a baseline display as a handle.
Second, the SQL handle is a separate dictionary value, so this block reads it back from `DBA_SQL_PLAN_BASELINES` and passes that.
If a zero-plan count comes back, the handle lookup returns no row and the display is skipped; that is a stop, not an empty result to interpret.

**ILLUSTRATIVE — capture the plan, then read the handle back, then display the baseline.** Confirm the overloads, the required `ADMINISTER SQL MANAGEMENT OBJECT` privilege, and the dictionary access on the installed release before you run it.

```sql
DEFINE sql_id = <known-sql-id>
DEFINE baseline_owner = <baseline-owner>
VARIABLE n_plans NUMBER
VARIABLE sql_handle VARCHAR2(30)
EXEC :n_plans := DBMS_SPM.LOAD_PLANS_FROM_CURSOR_CACHE(sql_id => '&sql_id')
SELECT MIN(sql_handle) INTO :sql_handle
FROM   dba_sql_plan_baselines
WHERE  sql_id = '&sql_id'
AND    owner = '&baseline_owner'
SELECT *
FROM TABLE(DBMS_XPLAN.DISPLAY_SQL_PLAN_BASELINE(sql_handle => :sql_handle));
```

**Do not turn baseline protection into an absolute rule.** With a governed baseline, Oracle normally protects the known plan while candidates go through the evolution or verification workflow. Plan evolution and, on releases that have it, Real-Time SPM, have their own candidate-evaluation behavior. The [plan-management overview](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/overview-of-sql-plan-management.html) describes the workflow; a plan hash is an identifier, not a performance verdict. [S12](https://www.oracle.com/technetwork/database/bi-datawarehousing/twp-sql-plan-mgmt-19c-5324207.pdf) [S21](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/overview-of-sql-plan-management.html)

### The dependency that breaks a baseline quietly

A baseline stores a _plan_, and a plan is only reproducible while the objects it depends on exist. Drop the index the plan used, alter the column it reads, or remove the materialized view it joins, and the baseline is still there, still enabled, still listed in `DBA_SQL_PLAN_BASELINES` — and it can no longer produce the plan it was captured for [S07] [S21].

This is the failure mode that looks like protection working. Someone checks the baseline exists after a schema change, sees a row, and concludes the statement is covered. It is not. The baseline is a promise about a plan that no longer has the objects to run.

Two habits prevent it. Before you drop or alter an object, list what depends on it _and_ check the baselines captured against it, not just the database dependencies. And after any change to a table an SPM-governed statement reads, re-verify that the statement is actually running the plan you think it is — by reading the executed plan, not by reading the baseline row.

This is also why the deployment order on the [load-test page](/03-toolbox/03-load-test-without-prod/) puts baseline capture _after_ the object is proven and the canary is scoped. Capture the plan for a candidate you are about to roll back and you have built a trap for the next person.

### Licensing, and why this one is different

SPM is not one of the features this book refuses to price, and the reason is worth a sentence. A plan baseline is a database object created and read with `DBMS_SPM`. It is not a report, not a sampled history, not a monitor — and every licensed diagnostic in this chapter is one of those three. So the deployment-control layer is reachable without a diagnostic entitlement, which is why a team that cannot justify AWR can still ship a governed plan [S07] [S21].

That is a statement about what the feature _is_, not a licensing claim, and the difference matters because this book prints no pack tables. Whether your release, edition, and deployment model require an option for SPM is settled by the Oracle licensing guide for your exact configuration — not by a package reference, and not by this page. Check it before you rely on the paragraph above, because that paragraph is about mechanism and the licensing guide is about contract.

The boundary that survives either answer: the _diagnostics_ you use to prove the plan — AWR, ASH, ADDM, the monitor reports — are separate features with their own entitlement, and the release and edition restrictions are real.

### Use it after you have proven something

SPM is the last step, not the first. The order is: prove a plan across representative bind values _and_ under load, then capture it. Capturing a baseline for a plan you measured once, on one bind, on a warm cache, converts a guess into a policy that will fight every future change to that statement. [S07] [S21]

### Real-Time SPM: the execution boundary matters

Automatic SPM is documented from 19c. Real-Time SPM is a 26ai feature. In Real-Time SPM, a candidate is evaluated during a user execution. If that execution regresses, the candidate is rejected at the end of the execution and a previously accepted plan is used for subsequent executions. It does **not** retroactively rewrite the statement that was already running.

Real-Time SPM behavior below is carried by an A1 26ai guide record (TOC-verified) with B1 firsthand corroboration; the guide index is linked because no chapter URL was verified. No A1 chapter text was read for the rejection-at-execution-end behavior. [S11](https://arxiv.org/html/2608.27758v1)

**26ai release-scoped reference:** the 26ai SQL Tuning Guide, [S02](https://docs.oracle.com/en/database/oracle/oracle-database/26/tgsql/index.html), the 26ai guide's primary index URL. The bibliography also records the older `/23/tgsql/` path for the same guide, which redirects to `/26/tgsql/`; the `/26/` URL is the one printed here.

S21 is the **19c** plan-management overview, [Overview of SQL Plan Management](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/overview-of-sql-plan-management.html), and covers Automatic SPM, not Real-Time SPM. Do not use S21 for the 26ai behavior.

That boundary matters for how you read evidence. A regressing execution still finishes badly. Real-Time SPM limits the blast radius for later executions; it does not promise the first regressing execution was harmless. Do not describe it as an instant repair.

### Adaptive plans

Adaptive plans defer or adjust runtime decisions when the workload and statistics justify it. The benefit is workload-dependent. Do not keep them on or off from a slogan. Run the candidate with the feature in each state, compare elapsed time and `buffer_gets`, inspect the final branch the optimizer chose, and record the result. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/) carries the claim; [S73](https://blogs.oracle.com/optimizer/optimizer-adaptive-features-in-oracle-database-12c-release-2) is an **Oracle Optimizer blog post on 12c Release 2** and is class D, so it corroborates the mechanism and settles nothing about your release.

## 6. Advisors propose; the gate decides

SQL Tuning Advisor can analyze SQL text you paste in, a SQL ID from the shared pool, or a Tuning Set. It runs five analyses — statistics, SQL profiling, access paths, SQL structure, and alternative plans — and returns recommendations for statistics, indexes, rewrites, profiles, or plan baselines, each with a rationale and an expected benefit [S17](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/sql-tuning-advisor.html). Optimizer Statistics Advisor reviews statistics practices. SQL Access Advisor proposes access structures at the _workload_ level — indexes, materialized views and their logs, and partitioning — which makes it the better tool than single-statement index advice when writes and many queries share the same tables. Automatic Indexing can create and test candidates. The output is a proposal, not a deployment. [S27] (Optimizer Statistics Advisor) and [S35] (SQL Access Advisor), both chapters of the 19c SQL Tuning Guide; both bibliography records are TOC-verified, and the SQL Access Advisor chapter is [verified here](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/sql-access-advisor.html).

One boundary on Optimizer Statistics Advisor that is easy to miss and expensive to get wrong: it issues findings and recommendations **without gathering a new statistics set**. Reading its output does not change the statistics on your tables. That is the opposite of what a tool named "statistics advisor" sounds like, and it is worth knowing before you run it against a shared object.

Confirm the entitlement for the advisor you intend to use against the licensing guide for your release. Advisor features are licensed separately from the diagnostic ones, and this book deliberately prints no pack table — the sources that state one are feature documentation and a decade-old datasheet, and neither is license text [S90](https://docs.oracle.com/en/database/oracle/oracle-database/19/dblic/Licensing-Information.html).

Apply one recommendation at a time. A single advisor run that recommends an index, a materialized view, a profile, and a statistics change is four candidates, and applying them together tells you nothing about which one worked. Run [SPA](/04-recipes/02-before-after-with-spa/) before and after each, keep the result only if the workload beats its noise floor and no relevant statement regresses, and keep the plan pair and the rollback command beside the report. [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html)

A schema-level fix needs its own deployment path. `DBMS_REDEFINITION` supports an online redefinition workflow with an abort operation. Edition-Based Redefinition switches application code between editions and switches back. Neither makes an unverified performance change safe by itself, and both are covered in detail on the [safe DDL page](/04-recipes/04-safe-ddl-and-ci-gates/). [S41](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_REDEFINITION.html) [S42](https://docs.oracle.com/en/database/oracle/oracle-database/18/adfns/editions.html)

**Reference and version note:** S41 is the **19c** package reference and is on the primary path. S42 is the **18c** Advanced Application Developer's Guide; Edition-Based Redefinition predates 18c and is available on 19c and later, so the 18c link is a mechanism reference rather than a 19c boundary. Confirm both against the installed release.

## 7. Guardrails for the bad day

**Resource Manager** can cap or switch runaway work. **SQL Quarantine** is a separate mechanism for execution plans. Do not mix them: **Resource Manager manages resources; SQL Quarantine configures thresholds for a statement's execution plan.** [S39](https://docs.oracle.com/en/database/oracle/oracle-database/19/admin/managing-resources-with-oracle-database-resource-manager.html)

The documented SQL Quarantine behavior is narrower than the phrase "blocks the plan shape," and the exact condition matters. Per the 19c `DBMS_SQLQ` package reference, `DBMS_SQLQ` configures **quarantine thresholds for execution plans**, and it documents that a SQL statement is not allowed to run when it uses the execution plan named in its quarantine configuration and any Resource Manager threshold is equal to or less than the quarantine threshold specified for that resource.

The reference documents the resources `CPU_TIME`, `ELAPSED_TIME`, `IO_MEGABYTES`, `IO_REQUESTS`, and `IO_LOGICAL`. It documents creating a configuration by SQL ID or by SQL text, optionally with a `plan_hash_value`; when that value is left null, the configuration applies to all plans of the statement.

It documents `ENABLED` defaulting to `YES` and `AUTOPURGE` defaulting to `YES`, purging an unused configuration after 53 weeks. [DBMS_SQLQ, 19c](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLQ.html)

Two consequences follow from the **documented** condition. First, quarantine is conditional and Resource-Manager-coupled: the reference's condition does not fire without a Resource Manager threshold in play, so "quarantine" alone is not a runaway-work control. Second, the interface and its subprogram names are documented; the Resource Manager configuration and the entitlement are separate prerequisites that documentation alone does not settle.

**Evidence grade: A1 with D corroboration only; entitlement unverified.** Grades are defined in [Why Evidence Grades](/00-preface/01-why-evidence-grades/).

- **No live instance.** This page reports what the 19c `DBMS_SQLQ` package reference **documents**. No quarantine was configured, enabled, triggered, or observed, so nothing here is a verified package behavior; the blocking condition is the reference's stated condition, not one anyone watched fire.
- **Entitlement unverified.** Whether your release carries the option, and whether your organization is entitled to use it, must be confirmed by the release or entitlement owner. A Resource Manager plan and threshold must actually exist for the condition to apply.

The owner must confirm release, edition, entitlement, and the Resource Manager configuration before this control goes anywhere near a production system.

The 26ai automatic SQL error mitigation feature and the PL/SQL-to-SQL transpiler are safety and execution aids, not substitutes for root-cause work. Transpilation applies only to eligible PL/SQL constructs; it does not cover every PL/SQL construct, and its eligibility rules are release-specific. [S46](https://docs.oracle.com/en/database/oracle/oracle-database/26/nfcoa/oracle-ai-database-26ai-new-features-guide.pdf)

## 8. The ship packet

This is the artifact a change hands to whoever has to approve it, execute it, and watch it. It is synthetic. It shows the shape, not a result.

The statement identity fields named in the packet are defined in the [Measure First worksheet](/01-proven-techniques/01-measure-first/). Fill them from the target system, never from a ticket.

**SYNTHETIC — ship packet, not a shipped change.**

```text
change: one SQL profile on <sql_id>, ENABLE, no text change
root_cause: skewed estimate on the :dept_id predicate; statistics fix deferred to the owning team
prerequisites: DBA approval, root cause documented, expiry date set
statement_identity: full identity tuple per the Measure First worksheet
plan: before plan hash P_BEFORE, after plan hash P_AFTER, both saved with the identity fields
semantics: F1-F6 pass, incumbent and candidate artifacts saved
metric: median full-STS elapsed_time and buffer_gets vs the A/A floor, K>=5 raw samples per side
write_cost: write A/A floor, write_elapsed_threshold, write_buffer_gets_threshold, result
uncertainty: external median-difference bootstrap 95% CI, excludes zero
regression: every REG row inside its own floor
rollback: DROP_SQL_PROFILE <profile>, then rerun the incumbent workload to confirm
expiry: <date>, owned by <incident owner>
observation_window: <UTC window>, watched by <named SRE>
status: NOT RUN
```

A ship packet is complete when a reader who did not do the work can execute the rollback from it. If the rollback line says "restore the old version" without saying how, the packet is not complete.

A packet also closes the loop rather than ending it. Recording what the next iteration inherits from this change, and the signal that says to stop, belongs on [Memory and When to Stop](/05-feedback-loop/04-memory-and-when-to-stop/).

## 9. The handoff

**To the DBA or SRE:** the statement identity fields, as defined in the [Measure First worksheet](/01-proven-techniques/01-measure-first/), the plan pair, the semantic results, the metric and the noise floor, the write-cost result, the exact DDL or package call, the rollback, the approval you need, and the observation window. Do not ask them to choose the candidate; you have already chosen it and measured it. Do not ask them to skip a gate; if a gate is failing, the answer is `REJECT_CANDIDATE`, not a workaround.

**To the release owner:** the exact release, update level, edition, options, and entitlement questions, and the specific features the packet depends on with their release boundary stated. A documented feature is not an installed feature and not a licensed one.

**To the change manager:** the risk, the window, the rollback, the approver, and the abort criteria. If the change cannot be aborted inside the window, say so before approval, not during.

**To the application owner:** any rewrite to SQL text, any profile or patch that is a stopgap for a code fix, and the expiry date on that stopgap.

## 10. When to stop

Stop and hand to the owner, not improvise, when:

- The fix requires a system parameter, a service restart, or a production DDL. That is a change-manager conversation.
- The fix is a feature the installed release or the license does not cover. That is an entitlement conversation.
- The root cause is still unknown and you are proposing a control. Say "temporary control with an expiry" or do not ship it.
- The rollback needs a privilege you do not have and no one has confirmed. An unrollbackable production change is not shippable.
- The observation window you were given is shorter than the time the failure takes to appear. Then the change has not been observed, and "not observed yet" is not "no problem."

## Artifact

A ship packet with the accepted plan, the metric distribution, the semantic test results, the guardrail state, the observation window, the expiry, and a tested rollback command, plus a named approver and a named observer. A candidate without those is a proposal, and a proposal that has not been through the [accept-or-rollback gate](/05-feedback-loop/03-accept-or-rollback-gate/) is still a proposal.

Every ship packet, plan, and timing on this page is `SYNTHETIC` or `ILLUSTRATIVE`.

**Decision:** a change is done when it is still good tomorrow, still correct, and reversible by someone who was not there when you shipped it.
