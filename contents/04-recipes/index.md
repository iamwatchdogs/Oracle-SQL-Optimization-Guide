---
title: Recipes You Can Script
description: Frozen input, one measured change, named trials, and a rehearsed rollback.
order: 40
draft: false
---

A recipe is a sequence you can run twice and get the same answer, not a list of settings. Settings drift between releases, hosts, and habits; a sequence either reproduces its input or it does not. Each page below is a block sequence you can put in a runbook, run again, and compare with what the first run produced.

This chapter owns the executable sequences: the tuning-set create and capture calls, the analysis-task trials, the statistics pipeline, the online DDL path, and the CI gate stages. The [toolbox chapter](/03-toolbox/) owns the claim-to-tool map and the reading of a plan line, and links here for those blocks rather than carrying a second copy.

> **Track:** Core (Operating contract, What each recipe proves, Child pages) · Practice (Execution boundary and CI) · Recovery (none) · Advanced / gated (Where the recipes are gated)
>
> **Prerequisites:** [Static Checks Before DB Time](/03-toolbox/04-static-checks-before-db-time/) behind you, a test target where you may create objects, and the [V0 lab](/00-preface/02-how-to-prove-a-win/) for what a verdict requires.
>
> **Evidence status:** Each page names its own sources: A1 Oracle versioned documentation behind the set, task, and redefinition sequences — the 19c `DBMS_SQLPA` reference [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html), _Managing SQL Tuning Sets_ [S18](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/managing-sql-tuning-sets.html), and the 19c `DBMS_REDEFINITION` reference [S41](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_REDEFINITION.html) — and an A2 statistics brief behind the gather preferences [S08](https://www.oracle.com/docs/tech/database/technical-brief-bp-for-stats-gather-19c.pdf). The statistics and DDL calls carry their own confirm-on-release hedges on the page that prints them. Blocks are labeled `ILLUSTRATIVE`, `SKETCH`, `PLACEHOLDER`, `COPYABLE`, or `MUTATING`. **No live Oracle database was available**, so nothing in this chapter is a measurement.
>
> **Next required page:** [Freeze With STS](/04-recipes/01-freeze-with-sts/).

## How this page is banded

| Band                 | Sections                                                   |
| -------------------- | ---------------------------------------------------------- |
| **Core**             | Operating contract · What each recipe proves · Child pages |
| **Practice**         | Execution boundary and CI                                  |
| **Recovery**         | none                                                       |
| **Advanced / gated** | Where the recipes are gated                                |

- **Core:** read once before you run anything. These sections define the contract and the map, and none of them touches a database.
- **Practice:** apply on a real ticket, when you must decide which stage runs where.
- **Recovery (none):** this chapter performs changes but owns no recovery policy. The rollback rules live with the change class, on the [accept or rollback gate](/05-feedback-loop/03-accept-or-rollback-gate/).
- **Advanced / gated:** read before you schedule any of this against a shared target, because each of the three stages carries its own privilege or entitlement.

## Operating contract

Four rules, in this order:

1. **One change at a time.** [One Change at a Time](/05-feedback-loop/01-one-change-at-a-time/) owns proposal isolation. Two candidates in one run produce one unreadable result.
2. **The same workload on both sides.** [Freeze With STS](/04-recipes/01-freeze-with-sts/) owns the set, the capture window, and the inspection both trials are handed.
3. **A named trial on each side.** [Before and After With SPA](/04-recipes/02-before-after-with-spa/) owns the task, the trial names, and the comparison you save.
4. **A rollback you have already rehearsed.** The [accept or rollback gate](/05-feedback-loop/03-accept-or-rollback-gate/) owns what recovery means and what makes it verified.

Repeat enough to separate signal from noise is not a number this chapter invents. The [noise floor and repetition policy](/05-feedback-loop/02-noise-floor-and-repetition/) sets the trial count, the estimator, and the interval; SQLPA supplies the trials those calculations run on. No recipe here declares a win. Each one produces the evidence a win is judged against.

## What each recipe proves

| Recipe                                                                         | What it proves                                                                                        | What it cannot prove                                          |
| ------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------- |
| [Freeze With STS](/04-recipes/01-freeze-with-sts/)                             | Both sides were handed the same statements, binds, and context                                        | Anything about statements the capture window never saw        |
| [Before and After With SPA](/04-recipes/02-before-after-with-spa/)             | The named trials moved on the frozen set under one candidate change                                   | Whether that movement is larger than the measured noise floor |
| [Stats Pipeline You Can Script](/04-recipes/03-stats-pipeline-you-can-script/) | What a pending candidate does before anything is published                                            | That the published result holds for every statement tomorrow  |
| [Safe DDL and CI Gates](/04-recipes/04-safe-ddl-and-ci-gates/)                 | Correctness on the interim object before finish; measurement where the name resolves to the candidate | Production capacity, or that the change is a performance win  |

Each table row scopes one claim. Each recipe reports its own boundary next to its result, and the gate that turns those reports into a decision lives in the [feedback loop chapter](/05-feedback-loop/).

## Child pages

Each page decides one question, so go to the row you are stuck on.

- [Freeze With STS](/04-recipes/01-freeze-with-sts/) decides **what the workload is**: one named set, one capture window, and the honest boundary of what that set may be used to prove.
- [Before and After With SPA](/04-recipes/02-before-after-with-spa/) decides **whether the candidate moved the workload**: the analysis task, the named trials, the comparison, and the plan that actually ran.
- [Stats Pipeline You Can Script](/04-recipes/03-stats-pipeline-you-can-script/) decides **what a gather does before anything is published**: pending statistics, the test that sees them, and one of three endings.
- [Safe DDL and CI Gates](/04-recipes/04-safe-ddl-and-ci-gates/) decides **how a schema change reaches production without a hostage window**: the online path, the interim test, the gate jobs, and the rollback artifact.

## Execution boundary and CI

Static checks run with no database. Behavior tests and the SPA trials need a controlled target, the privileges named on each page, and a workload frozen before anything was applied. Load testing is required before promotion when the change affects contention or resource use — buffer cache, locks, CPU, or I/O, and optional when it cannot. That condition is a trigger rather than the whole rule, and the [load gate page](/03-toolbox/03-load-test-without-prod/) owns the rest of it, including the entitlement fallback.

CI runs the stages in a fixed order owned by [Static Checks Before DB Time](/03-toolbox/04-static-checks-before-db-time/); this chapter supplies the workload and DDL stages that follow, and the job table with what each gate can and cannot catch lives on [Safe DDL and CI Gates](/04-recipes/04-safe-ddl-and-ci-gates/). What counts as a win is the [noise floor](/05-feedback-loop/02-noise-floor-and-repetition/) test, and the sentence about a green badge belongs to that static-checks page.

## Where the recipes are gated

Three stages do not run on a bare read session:

- **Set capture** needs the SQL tuning-set administration privilege — `ADMINISTER SQL TUNING SET` on 19c — with the exact grant confirmed on the installed release.
- **Analysis task** creation and runs need the `ADVISOR` privilege plus the Real Application Testing entitlement that SQL Performance Analyzer depends on, which [the toolbox map records](/03-toolbox/); confirm that entitlement against Oracle's licensing documentation before production use.
- **DDL** needs the redefinition privileges of its mode — `CREATE TABLE` and `CREATE MVIEW` for your own schema, the `ANY`-mode table grants for anyone else's [S41] — and every DDL block runs on a test target first, with a human-approved finish window.

## Artifact

A run record another engineer can repeat:

- [ ] Set name, owner, capture window, and the inspection output saved with it
- [ ] Named before and after trials, with the comparison metric recorded once
- [ ] Plan evidence for both sides, kept beside the trial names
- [ ] Raw samples and the harness calculation kept apart from the SPA report
- [ ] The class-specific rollback command, executed once and verified

`PLACEHOLDER` means a fill-in template: fill it in, then use it; the [block taxonomy in the V0 lab](/00-preface/02-how-to-prove-a-win/) owns the full label contract.

**PLACEHOLDER — the run manifest shell. One per change. Fill it in before the first trial.**

```text
change_id:       ____________________
target release:  ____________________
sts name/owner:  ____________________
candidate:       ____________________
metric:          ____________________
rollback cmd:    ____________________
```

**Decision:** run a sequence you can run twice, keep the evidence both runs produced, and let the gate judge it. Reproducibility is the whole difference between a setting and a recipe.
