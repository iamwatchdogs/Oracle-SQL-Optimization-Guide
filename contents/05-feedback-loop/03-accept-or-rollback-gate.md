---
title: Accept or Rollback Gate
description: Five checks decide, one failure rolls back by change class, and rollback is proven with the same instrumentation.
order: 53
draft: false
---

One failed check is enough to reject. An average that improved does not cancel a statement that lost, and a different plan hash does not cancel a failed semantic test. The gate exists to stop optimistic arithmetic.

Five checks decide. A failing check records a status, section 5 maps that status to one preliminary decision, and a rejection is rolled back by its class with the prior state proven by the same instrumentation. Nothing here is reversible without a person once production is the destination.

> **Track:** Core (1) · Practice (5) · Recovery (2, 3) · Advanced / gated (4)
>
> **Prerequisites:** [Noise Floor and Repetition](/05-feedback-loop/02-noise-floor-and-repetition/) behind you, so the floor, the counts, and the interval already exist, plus a candidate record from [One Change at a Time](/05-feedback-loop/01-one-change-at-a-time/).
>
> **Evidence status:** The five checks follow B1 benchmarking methodology [S58](https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf) and A1 comparison documentation [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html); the regression-threshold shape is B1 read firsthand [S11](https://arxiv.org/html/2608.27758v1); the rollback primitives are A1 package references: plan control cites the 18c `DBMS_SPM` [S07](https://docs.oracle.com/en/database/oracle/oracle-database/18/arpls/DBMS_SPM.html), redefinition cites the 19c `DBMS_REDEFINITION` [S41](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_REDEFINITION.html), and SQL diagnosis cites the 19c `DBMS_SQLDIAG` [S43](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLDIAG.html). **No live Oracle database was available**, so no check, rollback, or approval on this page was executed.
>
> **Next required page:** [Memory and When to Stop](/05-feedback-loop/04-memory-and-when-to-stop/).

## How this page is banded

| Band                 | Sections |
| -------------------- | -------- |
| **Core**             | 1        |
| **Practice**         | 5        |
| **Recovery**         | 2, 3     |
| **Advanced / gated** | 4        |

- **Core (1):** the five checks are the rule every later page assumes. Read them before you propose anything, because check five has to be satisfied before the apply, not after the verdict.
- **Practice (5):** on a real ticket, write the verdict with the artifact that satisfied each check, hash what you keep, and record the approval.
- **Recovery (2, 3):** the undo path by change class, and the proof that the prior state is actually back. Nothing else on this page is a rollback.
- **Advanced / gated (4):** read before promotion, because irreversibility is where a loop has to hand the decision to a person.

## 1. Five checks decide

Every candidate faces the same five checks on the same frozen workload. Each check names the artifact that satisfies it; a check without its artifact has not been run.

1. **Effect size.** The aggregate logical-work metric clears the composed bar the [noise floor policy](/05-feedback-loop/02-noise-floor-and-repetition/) states once, with the floor and margin recorded in the run. Artifact: the workload-summary row of the comparison report, with the floor and margin recorded beside it [S06] [S58].
2. **Uncertainty.** The 95% confidence interval for the median difference — the preface's canonical level for a formal claim, from [How to Prove a Win](/00-preface/02-how-to-prove-a-win/) — excludes zero, computed outside the report over the per-side aggregate samples the repetition policy counts. Artifact: the harness calculation with its estimator, branch, resample count, and seed [S58].
3. **No regression.** Each statement is judged against its own A/A floor where the regression workload built one, and against the declared margin where no per-statement floor exists. The per-statement floors belong to the [preface](/00-preface/02-how-to-prove-a-win/), not to this chapter. Artifact: the per-statement rows of the comparison report, kept beside their floors [S06].
4. **Semantics.** Results are equivalent and the regression fixtures are green. Artifact: test output or an equivalence result tied to the candidate hash [S63] [S50].
5. **Recovery.** The rollback primitive for this change class is recorded, and it has been executed once on the isolated target. Artifact: the rehearsal log with the restore proof [S29] [S41].

**Write-affecting candidates run the preface's write gates on top of these five.** A candidate that touches writes runs the unchanged write A/A controls, locks `write_elapsed_threshold` and `write_buffer_gets_threshold` before the candidate is applied, and must satisfy both measured medians separately. Those results attach to checks 1 and 3 as extra ways to fail, and the lock itself is owned by the [preface](/00-preface/02-how-to-prove-a-win/).

The no-regression check borrows its shape from Oracle's own threshold: a plan is captured or verified only when a measured difference clears a configured regression threshold [S11]. That is a B1 architecture description read firsthand, and it supplies no number — the threshold used here is the floor and margin, an engineering choice declared before the run. The counts, the estimator, and the bar come from the [noise floor policy](/05-feedback-loop/02-noise-floor-and-repetition/), and the chapter's single 26ai release gate is on the [index](/05-feedback-loop/).

A complete failed check records `PRELIMINARY_GATE_FAILURE`; missing evidence records `BLOCKED_PENDING_DECISION`. Section 5 maps those statuses to one preliminary decision, and rollback DDL runs after `REJECT_CANDIDATE`, never before. Whichever way it goes, log the reason and write the lesson against the condition that produced it [S56]. An inconclusive interval is not a pass; it is a repeat under better power.

## 2. Roll back by change class

"Run the undo command" is not a plan. The undo matches the change class, preserves the workload boundary, and leaves evidence that the incumbent state returned. The matrix below is that mapping, one row per `change_class` value.

**This paragraph is the `MUTATING` tag for every row of both tables below.** Each rollback primitive and each containment primitive changes database, session, or plan state; the tag is applied once here rather than repeated in a column, and no row in either table is read-only.

The first column is the `change_class` enum of the [change record](/05-feedback-loop/01-one-change-at-a-time/): every value in that enum reaches a row below, and every row below is reachable from a record. Incidents — things that happen to the loop rather than changes the loop proposed — sit in a separate table afterward and carry no `change_class`.

The **standard proof pair** is stated once here and used by every row unless the row says otherwise: (1) the plan display for the affected statement returns to the incumbent plan hash [S05], and (2) a repeat of the comparison on the frozen set shows no residual delta [S06]. Section 3 explains why both are required.

| `change_class` | Rollback primitive                                                        | Where the call lives in this book                                                                               | Proof of restoration                                                                                                   | Source      |
| -------------- | ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------- | ----------- |
| `statistics`   | `DBMS_STATS.RESTORE_*_STATS`, from historical statistics retention        | Printed: [Stats Pipeline You Can Script](/04-recipes/03-stats-pipeline-you-can-script/)                         | Standard pair                                                                                                          | [S29]       |
| `statistics`   | Discard pending statistics before publishing; publish is the commit point | Printed: [Stats Pipeline You Can Script](/04-recipes/03-stats-pipeline-you-can-script/)                         | Pending set empty and the `PUBLISH` preference restored; standard pair only if a plan already used the pending values  | [S29]       |
| `profile`      | Drop the profile                                                          | Named only: [Stabilize and Ship Safely](/01-proven-techniques/05-stabilize-and-ship-safely/); no block here     | Standard pair                                                                                                          | [S34]       |
| `patch`        | Drop or disable the patch through `DBMS_SQLDIAG`                          | Named only: [Stabilize and Ship Safely](/01-proven-techniques/05-stabilize-and-ship-safely/); release-dependent | Standard pair                                                                                                          | [S43]       |
| `baseline`     | `ALTER_SQL_PLAN_BASELINE` disable or drop; an unaccepted plan never runs  | Named only: [Load Test Without Prod](/03-toolbox/03-load-test-without-prod/); no block printed                  | Standard pair                                                                                                          | [S07] [S21] |
| `index`        | `DROP INDEX` with owner-confirmed privilege                               | Printed: [V0 lab](/00-preface/02-how-to-prove-a-win/) rejected-candidate rollback                               | Dictionary readback: object gone or recorded `already_absent`, plus the standard pair                                  | [S76]       |
| `index`        | Drop the index; auto indexing removes unused ones on its own schedule     | Named only: [Load Test Without Prod](/03-toolbox/03-load-test-without-prod/) rollback list; no block printed    | Standard pair                                                                                                          | [S15] [S16] |
| `DDL`          | `ABORT_REDEF_TABLE` before `FINISH_REDEF_TABLE`, the commit point         | Printed: [Safe DDL and CI Gates](/04-recipes/04-safe-ddl-and-ci-gates/)                                         | Readback (interim table gone, original intact) plus repeat comparison; standard pair's plan leg only if a plan changed | [S41]       |
| `edition`      | Switch the session or application back to the previous edition            | Named only: [Safe DDL and CI Gates](/04-recipes/04-safe-ddl-and-ci-gates/); no block printed                    | Application confirmed on the prior edition plus repeat comparison; plan leg only if a plan changed                     | [S42]       |
| `session`      | End the session or revert with `ALTER SESSION`; never system-wide         | Named only: [Stabilize and Ship Safely](/01-proven-techniques/05-stabilize-and-ship-safely/); no block printed  | Setting read back, or the session ended, plus a repeat comparison in a fresh session                                   | [S19] [S20] |

Where the owner column says **printed**, that page owns the callable and its privilege. Where it says **named only**, this book gives you the command's name and the package reference, and you write the call against your installed release.

**One hedge on a source column.** The `index` row's [S76] is the 19c Administrator's Guide chapter on managing indexes, and the record covers index maintenance — creating, compressing, rebuilding, coalesing. It does **not** document the drop grant, so treat [S76] there as the index-maintenance reference and read the drop privilege as the object owner's or an authorized role's, recorded on the [V0 lab page](/00-preface/02-how-to-prove-a-win/) that owns the printed `DROP INDEX`. An unconfirmed privilege on that row is `BLOCKED_PENDING_DECISION`, not a default assumption.

### Incidents, not change classes

Two rows describe containment during a run. They join the incident record, not the change record, so no `change_class` reaches them.

| Incident                      | Containment primitive                                                    | Where the call lives in this book                                                                               | Proof of restoration                                                                                                  | Source            |
| ----------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | ----------------- |
| Runaway execution             | Resource Manager kill, plus a `DBMS_SQLQ` quarantine block for the plan  | `SKETCH` names only: [Load Test Without Prod](/03-toolbox/03-load-test-without-prod/) prints the creation names | Standard pair does not apply: session gone, kill recorded, quarantine row in `DBA_SQL_QUARANTINE`                     | [S39] [S40]       |
| Hard parse or optimizer error | Automatic error mitigation on 26ai, plus a SQL Repair Advisor workaround | Not printed in this book; named by the package references                                                       | Standard pair does not apply: no incumbent hash exists — prove the error does not recur and the mitigation is present | [S46] [S70] [S43] |

The incident row's automatic error mitigation is a 26ai feature [S46]; the chapter's release gate is on the [index](/05-feedback-loop/), and on 19c you record the error and repair the statement instead. The plan-control row cites the 18c `DBMS_SPM` package reference [S07], whose ledger row carries the 19c _Managing SQL Plan Baselines_ chapter; [S21] is the 19c _Overview of SQL Plan Management_.

### The current-state discipline: publish, restore, or discard

Before any statistics undo, the current-state discipline records the state you are undoing from: whether values are published or pending, the object's `PUBLISH` preference, the retention anchor timestamp, and the incumbent plan hash. The undo then has a named target instead of a guess, and section 3's proof compares against something that was written down.

The publish, restore, and discard decision follows from that record:

- The gate fails before anything was published: discard the pending values, and the published statistics never changed.
- The gate fails after publication: restore the recorded anchor through the documented restore path.
- The gate passes: publish, then restore the recorded `PUBLISH` preference and verify it.

Each verb's callable is printed in [Stats Pipeline You Can Script](/04-recipes/03-stats-pipeline-you-can-script/). This page owns which verb applies and what makes it verified.

## 3. Prove the state

Rollback is not done when the command returns. It is done when the same instrumentation that accepted the change shows the prior state restored.

Two proofs, taken after the primitive runs:

- **Plan evidence.** The plan display for the affected statement returns to the incumbent plan hash [S05].
- **Workload evidence.** A re-run of the comparison on the frozen set reports no residual delta against the pre-change baseline [S06].

Rows whose proof column says the standard pair does not apply are proven by that column instead: a runaway kill has no plan to return to, and a statement that failed to parse never had an incumbent hash. Those rows prove containment or non-recurrence, and they say so.

Only then is the rollback proven. A command that ran without its proof is a note. The artifact is the plan capture, the repeat comparison, the readback, and the timestamp of the restore, all hashed with the rest of the run — while the verdict itself is written in the vocabulary of section 5.

## 4. Human gates and evidence

**Irreversibility requires a person, not a loop.** The loop may collect every artifact listed above; it may not approve the decision that consumes them.

A named human approves:

- A production parameter change, at system or service scope
- Production DDL, including index creation and index drops
- Publishing statistics on a critical object
- Adopting a SQL profile or a SQL plan baseline from an advisor recommendation, including evolving a baseline to accept a candidate plan
- A redefinition finish or an edition switch that changes production behavior
- Any rollback whose execution itself carries workload or availability risk

Approval is recorded beside the verdict, with the approver's name and the time. Promotion itself stays class-specific: statistics publish, plan evolution, redefinition finish, edition switch, and index rollout each follow the path named in the [recipes chapter](/04-recipes/).

## 5. Write the verdict

For a formal run, the preface's vocabulary is canonical and it unfolds in three steps: a status per failed or blocked check, one preliminary decision at the single gate, and a final verdict only after recovery and cleanup. This page never invents a fourth outcome, and a status is never itself a verdict.

**Mapping: which token becomes which outcome.**

| What the checks produced                                                                          | Status recorded            | Preliminary decision | Final, after recovery and cleanup |
| ------------------------------------------------------------------------------------------------- | -------------------------- | -------------------- | --------------------------------- |
| All five checks pass, including both write thresholds for a write candidate                       | —                          | `ACCEPT_CANDIDATE`   | `ACCEPT`                          |
| Check 1, 2, or 3 measured and failed: bar missed, interval spans zero, a statement past its floor | `PRELIMINARY_GATE_FAILURE` | `REJECT_CANDIDATE`   | `REJECT`                          |
| Check 4 measured: a fixture returned a different result                                           | `PRELIMINARY_GATE_FAILURE` | `REJECT_CANDIDATE`   | `REJECT`                          |
| Check 5 unsatisfiable: the class rollback cannot be rehearsed or proven                           | `BLOCKED_PENDING_DECISION` | `INCONCLUSIVE`       | `INCONCLUSIVE`                    |
| Evidence missing: samples, floors, thresholds, identity, or a blocked privilege or entitlement    | `BLOCKED_PENDING_DECISION` | `INCONCLUSIVE`       | `INCONCLUSIVE`                    |

Two rules make the table operable. First, nothing is accepted or rejected until the single gate writes exactly one preliminary decision; second, the final verdict is written only after its precondition is recorded — the class rollback verified for `REJECT_CANDIDATE`, the accepted-state rehearsal and cleanup for `ACCEPT_CANDIDATE`. A blocked privilege, entitlement, or target is `BLOCKED_PENDING_DECISION`, never a rejection.

**PLACEHOLDER — the gate result. One row per candidate; every check names the artifact that satisfied it, and the three verdict fields follow the preface's order.**

```text
change_id:              ____________________
1 effect:               pass | fail   artifact: ____________________
2 uncertainty:          pass | fail   artifact: ____________________
3 no regression:        pass | fail   artifact: ____________________
4 semantics:            pass | fail   artifact: ____________________
5 recovery:             pass | fail   artifact: ____________________
premeasurement_status:  ____________________   -- none (all five pass) | PRELIMINARY_GATE_FAILURE | BLOCKED_PENDING_DECISION
preliminary_decision:   ____________________   -- ACCEPT_CANDIDATE | REJECT_CANDIDATE | INCONCLUSIVE
final_verdict:          ____________________   -- ACCEPT | REJECT | INCONCLUSIVE
rollback proof:         ____________________
approver:               ____________________
```

Hash the comparison report, the plan output, the monitoring extract, and the rollback proof. A path without a hash is a location, not evidence: the file can change after the verdict.

## Artifact

A signed or hashed gate record:

- [ ] All five checks recorded, each with the artifact that satisfied it
- [ ] Floor, margin, estimator, and interval referenced rather than retyped
- [ ] Change class named, and its rollback primitive executed once on the isolated target
- [ ] Prior state proven with plan evidence and a repeat comparison after any rollback
- [ ] Approver named for every irreversible action, with the time of approval
- [ ] Status, one preliminary decision, and the final verdict written in the preface's order, with recovery or rehearsal recorded before the final line

The gate result block above is `PLACEHOLDER`. No check on this page has been executed.

Source IDs and technique IDs resolve in [Appendix Sources](/07-appendix-sources/).

**Decision:** all five checks pass or the class rollback runs and gets proven. The gate is what turns a measured difference into a decision someone else can audit.

**Next required page:** [Memory and When to Stop](/05-feedback-loop/04-memory-and-when-to-stop/).
