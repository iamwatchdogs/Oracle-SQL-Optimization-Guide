---
title: Feedback Loop That Proves It
description: One change, a measured noise floor, an accept or rollback gate, and memory the next loop can read.
order: 50
draft: false
---

A change is accepted by evidence, and the evidence has to survive a measurement you did not manipulate. One fast run is an anecdote. A different plan hash is a fact about a plan, not about performance. What decides is a repeated comparison on a frozen workload, measured against a noise floor taken before the candidate touched anything.

This chapter owns the noise floor and its A/A discipline, the repetition policy, the acceptance and rejection rule, and the rollback matrix by change class. It also owns the safety gates, the convergence criteria, and the lesson record.

Everything executable belongs elsewhere. The [recipes chapter](/04-recipes/) owns the block sequences and links here for the numbers those sequences must clear. The [toolbox chapter](/03-toolbox/) owns the claim-to-tool map. [Techniques](/01-proven-techniques/) owns the plan pair, the semantic fixtures, and the statement identity. [Papers](/02-papers-behind-recipes/) owns the verification status of the plan-management sources.

> **Track:** Core (Decision table, Child pages) · Practice (Execution boundary) · Recovery (none) · Advanced / gated (Where the loop is gated)
>
> **Prerequisites:** [How to Prove a Win](/00-preface/02-how-to-prove-a-win/) for the block labels and the A/A discipline, plus a frozen set from [Freeze With STS](/04-recipes/01-freeze-with-sts/).
>
> **Evidence status:** The mechanics are A1-sourced from the package references they name — `DBMS_SQLPA` [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html) for the comparison, `DBMS_XPLAN` [S05](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html) for plan evidence, `DBMS_SPM` [S07](https://docs.oracle.com/en/database/oracle/oracle-database/18/arpls/DBMS_SPM.html) (18c reference, 19c companion) for plan control — with B1 methodology behind the repetition rule [S58](https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf) and B1 read firsthand behind Real-Time SPM [S11](https://arxiv.org/html/2608.27758v1). The margin rule, the change budget, the evidence-before-claim gate, and the stop counts are engineering choices, declared as such on the child pages. **No live Oracle database was available for this guide**, so nothing in this chapter is a measurement.
>
> **Next required page:** [One Change at a Time](/05-feedback-loop/01-one-change-at-a-time/).

## How this page is banded

| Band                 | Sections                     |
| -------------------- | ---------------------------- |
| **Core**             | Decision table · Child pages |
| **Practice**         | Execution boundary           |
| **Recovery**         | none                         |
| **Advanced / gated** | Where the loop is gated      |

- **Core (Decision table, Child pages):** read once before you run anything. Both sections are navigation, and neither touches a database.
- **Practice (Execution boundary):** apply it the moment you set a margin, a repetition count, or a budget for your own run, because those values are written before the candidate runs or they are not evidence.
- **Recovery (none):** this index changes nothing. The class-specific undo and its proof live on [Accept or Rollback Gate](/05-feedback-loop/03-accept-or-rollback-gate/).
- **Advanced / gated (Where the loop is gated):** read before you schedule a loop against a shared target, because three of the stages need a privilege, an entitlement, or a person.

## Decision table

> **"Is the change isolated enough to read at all?"**

| Page                                                                           | The question it decides                                | The rule it owns                                            |
| ------------------------------------------------------------------------------ | ------------------------------------------------------ | ----------------------------------------------------------- |
| [One Change at a Time](/05-feedback-loop/01-one-change-at-a-time/)             | Is the change isolated enough to read at all?          | One candidate, one change record, one re-baselined workload |
| [Noise Floor and Repetition](/05-feedback-loop/02-noise-floor-and-repetition/) | Is the signal larger than ordinary movement?           | The A/A control, the repetition policy, and the interval    |
| [Accept or Rollback Gate](/05-feedback-loop/03-accept-or-rollback-gate/)       | Can it ship, and what happens if it cannot?            | Five checks, the canonical verdict mapping, and the matrix  |
| [Memory and When to Stop](/05-feedback-loop/04-memory-and-when-to-stop/)       | What does the next loop inherit, and when does it end? | The lesson record, the convergence criteria, the close-out  |

Read the row for the question you are stuck on. Each page decides one of the four, and no page decides two of them.

## Child pages

- [One Change at a Time](/05-feedback-loop/01-one-change-at-a-time/) decides **what may be tested**: one candidate, the change record it is tested under, the semantic gate it must clear first, and the re-baseline that follows the verdict.
- [Noise Floor and Repetition](/05-feedback-loop/02-noise-floor-and-repetition/) decides **what counts as signal**: the unchanged control, how many times the workload repeats, which metric leads, and how the interval is computed outside the report.
- [Accept or Rollback Gate](/05-feedback-loop/03-accept-or-rollback-gate/) decides **whether the change is kept**: five numbered checks, the map from each failing check to the canonical verdict vocabulary, the rollback primitive for each change class, and the approval a person must give.
- [Memory and When to Stop](/05-feedback-loop/04-memory-and-when-to-stop/) decides **what the next loop inherits and when the loop ends**: the condition-keyed lesson, the retrieval step, the convergence signals, and the close-out record.

## Execution boundary

Every number printed in this chapter carries its attribution on the page that prints it: a source recommendation with its S-ID, or an engineering choice declared as one. The composed bar, the repetition counts, the margin, the convergence values, and the budget caps are each labeled where they appear.

Treat a number without an attribution as a defect in the page, not as an invitation to trust it.

## Where the loop is gated

Three stages do not run on a bare read session, and one more needs a person:

- **Measurement** needs the `ADVISOR` privilege and the Real Application Testing entitlement that SQL Performance Analyzer depends on, both recorded in the [claim-to-tool map](/03-toolbox/).
- **Apply** runs on the **isolated target** — this chapter's one term for the three shapes that qualify: a writable clone, an activated snapshot standby, or an interim schema with an abort path. A plain physical standby is read-only and is none of them.
- **Promotion** is class-specific and gated: statistics publish, plan evolution, redefinition finish, and edition switch each have their own path on the [gate page](/05-feedback-loop/03-accept-or-rollback-gate/).
- **Irreversibility** requires a person. Production parameters, production DDL, and production index drops are approved by a human, not by a loop.

This chapter's release gate, stated once: Real-Time SPM is 26ai material carried by a paper read firsthand [S11](https://arxiv.org/html/2608.27758v1), whose verification status the [papers chapter](/02-papers-behind-recipes/) records, while on 19c plan verification runs in the background. Every other page that mentions 26ai links back here instead of repeating the caveat, and a 26ai-only behavior stays gated on the installed release before you design around it.

## Artifact

A verdict another engineer can recompute:

- [ ] One candidate, one change record, and one frozen set named before anything ran
- [ ] The unchanged control, the raw samples, and the floor calculation kept with the run
- [ ] The interval computed outside the report, with its estimator and seed beside it
- [ ] The five checks recorded with the artifact that satisfied each one
- [ ] The class rollback executed, proven, and logged, or the reason it was never needed
- [ ] The lesson keyed to the condition that produced it, and the stop signal that ended the loop

**PLACEHOLDER — the verdict line this chapter hands to the next reader. The three fields are the preface's canonical sequence: status, then one preliminary decision, then the final verdict.**

```text
change_id:              ____________________
premeasurement_status:  ____________________   -- none (all five pass) | PRELIMINARY_GATE_FAILURE | BLOCKED_PENDING_DECISION
preliminary_decision:   ____________________   -- ACCEPT_CANDIDATE | REJECT_CANDIDATE | INCONCLUSIVE
final_verdict:          ____________________   -- ACCEPT | REJECT | INCONCLUSIVE
noise floor:            ____________________
margin:                 ____________________
interval:               ____________________
rollback proof:         ____________________
lesson ref:             ____________________
```

**Decision:** accept nothing you cannot re-measure, roll back nothing you cannot prove, and keep what the next loop can retrieve.
