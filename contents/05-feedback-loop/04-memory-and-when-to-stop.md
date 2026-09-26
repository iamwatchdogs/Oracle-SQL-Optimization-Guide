---
title: Memory and When to Stop
description: Write the condition with the verdict, retrieve it before the next proposal, and stop on a stated signal.
order: 54
draft: false
---

A rejected candidate is worth something only if the next loop can retrieve the conditions that killed it. Write the condition beside the verdict, retrieve before proposing, and stop on evidence, not on hope.

This page owns the lesson record and the convergence rules. Promotion sequences live in the [recipes chapter](/04-recipes/), and the verdict that feeds this record lives on the [gate page](/05-feedback-loop/03-accept-or-rollback-gate/).

> **Track:** Core (1) · Practice (2, 3) · Recovery (none) · Advanced / gated (4)
>
> **Prerequisites:** [Accept or Rollback Gate](/05-feedback-loop/03-accept-or-rollback-gate/) behind you, so a verdict and its artifacts already exist.
>
> **Evidence status:** The lesson pattern is B1 from Reflexion [S56](https://github.com/noahshinn/reflexion); measured deltas come from A1 comparison and plan documentation [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html) [S05](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html); regression handling is B1 read firsthand [S11](https://arxiv.org/html/2608.27758v1).
> Containment is [S40](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLQ.html), whose ledger record is the A1 19c `DBMS_SQLQ` package reference — the primary for that record — with the oracle-base walkthrough carried as class-D corroboration; the package reference itself was not retrieved firsthand.
> Every stop value below is labeled a design parameter or an engineering choice. **No live Oracle database was available**, so no lesson, promotion, or stop rule on this page was executed.
>
> **Next required page:** This branch ends here. Return to [the route](/) and take the next step from the root page.

## How this page is banded

| Band                 | Sections |
| -------------------- | -------- |
| **Core**             | 1        |
| **Practice**         | 2, 3     |
| **Recovery**         | none     |
| **Advanced / gated** | 4        |

- **Core (1):** write the record while the evidence is in front of you. A lesson composed later is a memory, not evidence, and this section defines the fields that make it retrievable.
- **Practice (2, 3):** on a real ticket, retrieve the matching lessons before you propose, and watch the four stop signals while the loop runs.
- **Recovery (none):** this page records and stops. The undo for a late regression, and its proof, belong to [Accept or Rollback Gate](/05-feedback-loop/03-accept-or-rollback-gate/).
- **Advanced / gated (4):** read before any promotion, because the promotion paths are class-specific, human-approved, and observed after the fact rather than at the moment of accept.

## 1. Store the condition, not just the conclusion

"The hint was bad" is too small to reuse. It will be applied again under different statistics, different binds, and a different release, and the sentence gives the next reader nothing to check.

**PLACEHOLDER — the lesson record. One per verdict. Fill every field; a lesson without `measured_delta` and its artifact hashes is invalid and must be discarded.**

```text
change_class:            ____________________
precondition_signature:  ____________________   -- sql_id / object, stats generation, bind band
action:                  ____________________
outcome:                 ____________________   -- ACCEPT | REJECT | INCONCLUSIVE (final verdict)
measured_delta:          ____________________   -- from the comparison report metric columns
delta_artifact_hash:     ____________________
plan_hash_before:        ____________________
plan_hash_after:         ____________________
reason_rejected:         ____________________
banned_until:            ____________________   -- a condition or a review date, never "forever"
discovered_version:      ____________________   -- exact banner and capability probe from the run
lesson_text:             ____________________
```

`measured_delta` is never hand-typed from memory. It comes from the metric columns of the comparison report for that change's before and after runs [S06], with the plan hash recorded from the plan display of the affected statement [S05]. Each verdict also writes the run, the change, the before and after samples, the verdict itself, and an evidence row holding the artifact hashes.

`discovered_version` records the release and capability probe under which the lesson was learned, not a vague "current" label. A lesson from one release can be stale on another.

**The store, defined once.** One location: the `lesson` table in the run's evidence store — the same store that holds the verdict and the evidence rows — exported as `lessons.csv` beside the run records when the loop is run by hand. One key: `change_class | precondition_signature | discovered_version`. Those three fields plus `banned_until` are the whole retrieval index, and `precondition_signature` is built from the change record's `target` plus the statistics generation and bind band, so every search key named here is a column of the record above.

### The illustrative lesson

**ILLUSTRATIVE — synthetic values for teaching, not a measured outcome.**

- `change_class`: `patch`
- `precondition_signature`: same SQL ID, same statistics generation, same bind band
- `outcome`: `REJECT`
- `measured_delta`: aggregate logical work lower, one statement higher past its own floor
- `reason_rejected`: a statement past its own per-statement A/A floor, or past the declared margin where no floor exists
- `banned_until`: the statistics generation changes, or a version-specific retest is approved
- `discovered_version`: the exact banner and capability probe recorded from the run

The values are invented; the linkage is the point. Reflexion is the research basis for using written failure feedback to improve later proposals without retraining [S56], and this loop adds one stricter requirement: the lesson carries the hashed artifacts or it does not count.

## 2. Retrieve before proposing

At proposal time, search `lessons.csv` — or the `lesson` table behind it — by the three key fields: `change_class`, `precondition_signature`, and `discovered_version`. Three outcomes, and only three:

- **Skip** the action because the same precondition still holds.
- **Amend** the action because the failure points at a different hypothesis.
- **Retest** when something factual changed: a new release capability, a different statistics generation, a different bind band, or a corrected fixture.

A ban without an expiry becomes folklore, so `banned_until` holds a condition or a review date rather than a verdict. The artifact of this step is the retrieval itself: which lessons matched, which action was taken, and why the precondition did or did not change.

## 3. Stop on evidence, not on hope

Four signals end the loop, and each one is written into the run record before the first proposal:

| Signal                | Stop when                                                                                       | Attribution                                                                                                 |
| --------------------- | ----------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Consecutive rejects   | `N` proposals rejected under the same conditions                                                | `N = 3` is a design parameter, not an Oracle rule                                                           |
| Plateau               | the marginal accepted gain of each of the last `M` accepted changes sits below the composed bar | Your own A/A spread, per the [repetition policy](/05-feedback-loop/02-noise-floor-and-repetition/); `M` = 3 |
| Budget exhausted      | iterations, total runtime, or modified objects hit their caps                                   | Defaults `10` iterations, `4` hours, `3` objects; engineering choice, bounded-task pattern [S17]            |
| Regression risk rises | a quarantine event, or the same object rolled back a second time                                | Containment signal [S40]; oscillation guard on regression handling [S11]                                    |

Two of those signals need definitions to be operable. **Marginal accepted gain** is the aggregate improvement of the most recent accepted change, measured on the frozen set against the composed bar the [noise floor policy](/05-feedback-loop/02-noise-floor-and-repetition/) states once. **The window** is the last `M` accepted changes, with `M` defaulting to 3. Both are run settings: record `M` and the gain measured for each accepted change before the loop starts.

The requirement behind both is to report measured variability rather than a point estimate [S58]. The floor itself is your own unchanged-control spread, measured on the [repetition policy](/05-feedback-loop/02-noise-floor-and-repetition/), not a number any source supplies.

**Attribution, stated once.** `N = 3`, the plateau window `M = 3`, and the three budget caps — maximum iterations (`10`), maximum total runtime (`4` hours), maximum modified objects (`3` per run) — are engineering choices with defaults, and every run records the values it actually used. None of them is a source claim, and none is a number this guide measured. A budget belongs to the experiment; it is not an excuse to guess faster.

Oracle's own loops converge the same way: capture stops when the measured difference falls below the configured threshold, and a previously accepted plan is kept when the new plan is not better. That is the B1 description read firsthand [S11]; the 19c and 26ai split lives in the chapter's single release gate on the [index](/05-feedback-loop/).

## 4. Promote, observe, and close with proof

An accepted change still crosses a boundary. The loop never mutates production first: promotion runs the class-specific path, with the approval recorded on the [gate page](/05-feedback-loop/03-accept-or-rollback-gate/), and the executable sequences owned by the [recipes chapter](/04-recipes/).

After promotion, watch the isolated target for the agreed observation window: plan activity, workload deltas, and the quarantine state. Both halves of that watch are owned by [Stabilize and Ship Safely](/01-proven-techniques/05-stabilize-and-ship-safely/) — the observation window and expiry its ship packet defines, and the quarantine reading of what the condition actually is and why it is coupled to a Resource Manager threshold. This page links both instead of restating them. A quarantine event is a containment signal, not proof that a rollback has happened.

If a late regression appears, execute the class rollback from the [gate page](/05-feedback-loop/03-accept-or-rollback-gate/), and record the operator, the timestamp, and the plan and workload proof. Call it automatic only when the installed feature and the written procedure actually provide it.

When a step could not run — no licence, no privilege, no isolated target — record `BLOCKED_PENDING_DECISION` for that step, which surfaces as `INCONCLUSIVE` at the gate. A blocked experiment is an outcome, and it cannot be reported as an improvement.

## Artifact

The convergence record closes the chapter:

- [ ] Run and change IDs, release, capability probe, and the goal the run was started for
- [ ] Set identity, bind manifest, metric, and the repetition counts and margin as written before the run
- [ ] Unchanged-control floor, raw samples, medians, estimator, resample count, and interval bounds
- [ ] Before and after plan hashes with the comparison, plan, and monitoring artifacts hashed
- [ ] Verdict, five gate results, rollback proof, and the named approver
- [ ] Lesson rows with condition, measured delta, expiry condition, and discovered version
- [ ] Stop signal recorded: consecutive rejects, plateau, budget, or risk, with `M`, `N`, and the three cap values it used
- [ ] Every blocked step marked `BLOCKED_PENDING_DECISION`, and the final verdict written in the preface's vocabulary

Source IDs and technique IDs resolve in [Appendix Sources](/07-appendix-sources/).

**Decision:** preserve the evidence, record the version it was learned under, and stop when the next experiment cannot add information.

**Next required page:** This branch ends here. Return to [the route](/) and take the next step from the root page.
