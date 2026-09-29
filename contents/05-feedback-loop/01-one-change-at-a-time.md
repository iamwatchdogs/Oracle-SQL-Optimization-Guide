---
title: One Change at a Time
description: One candidate, one change record, one semantic gate, and a re-baselined workload after the verdict.
order: 51
draft: false
---

Two candidates in one run produce one unreadable result. Propose exactly one change, write it down before you apply it, gate it before it spends database time, then measure the same workload and re-baseline. If the change cannot be named in one sentence, it is not ready to test.

This page owns the one-change rule and the change record it is tested under. How many times to repeat, how large an effect must be, and what the interval must show are the [noise floor policy](/05-feedback-loop/02-noise-floor-and-repetition/) and the [accept or rollback gate](/05-feedback-loop/03-accept-or-rollback-gate/); this page links both instead of restating them.

> **Track:** Core (1, 2) · Practice (3, 4, 5) · Recovery (none) · Advanced / gated (6)
>
> **Prerequisites:** A frozen set from [Freeze With STS](/04-recipes/01-freeze-with-sts/) and the label taxonomy from [How to Prove a Win](/00-preface/02-how-to-prove-a-win/).
>
> **Evidence status:** Proposal isolation follows A1 advisor and plan-control documentation — SQL Tuning Advisor [S17](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/sql-tuning-advisor.html) and automatic indexing [S15](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_AUTO_INDEX.html) — with the A2 SQL plan management brief [S12](https://www.oracle.com/technetwork/database/bi-datawarehousing/twp-sql-plan-mgmt-19c-5324207.pdf), C2 static tooling [S60](https://github.com/tobymao/sqlglot) [S61](https://docs.sqlfluff.com/) [S63](https://github.com/utplsql/utplsql), and B1 equivalence candidates [S50](https://github.com/VeriEQL/VeriEQL). **No live Oracle database was available**, so no change record on this page has been filled in by a run.
>
> **Next required page:** [Noise Floor and Repetition](/05-feedback-loop/02-noise-floor-and-repetition/).

## How this page is banded

| Band                 | Sections |
| -------------------- | -------- |
| **Core**             | 1, 2     |
| **Practice**         | 3, 4, 5  |
| **Recovery**         | none     |
| **Advanced / gated** | 6        |

- **Core (1, 2):** name one candidate and write the record it will be judged by. Both sections are paper work, and neither needs a database.
- **Practice (3, 4, 5):** on a real ticket, clear the semantic gate, run both sides on the same workload, and read the verdict against the whole set rather than the statement that motivated it.
- **Recovery (none):** this page applies a change in an isolated target and stops. The undo, and the proof that the undo worked, belong to [Accept or Rollback Gate](/05-feedback-loop/03-accept-or-rollback-gate/).
- **Advanced / gated (6):** read before the first apply, because the target, the forbidden moves, and the human approval each rule out a candidate the loop would otherwise run.

## 1. Propose exactly one candidate

A commit that moves a rename and fixes a bug in one diff is unreadable, and reviewing it produces no opinion about either change. Three advisor proposals applied in the same run are that commit.

A candidate is one hypothesis with one target. It is not a pile of advice from an advisor report.

Advisors return menus. On a set such as `OPT_LOOP_WL`, SQL Tuning Advisor may suggest a profile, SQL Access Advisor an index [S35], and Optimizer Statistics Advisor a gather [S27]. Record all three as proposals, pick one for this run, and leave the other two queued. Oracle's own plan management accepts a new plan only after verification, so a recommendation is a proposal and nothing more [S12] [S17].

The same rule binds an authored rewrite. If the hypothesis is that a `DISTINCT` is unnecessary, the candidate is the rewrite. Do not refresh statistics, add a hint, and create an index in the same iteration; when the result comes back, nothing in the record will say which of the three did it.

## 2. Write the change record first

The record is the contract between the proposal and the measurement. Fill it before the apply, not after the verdict, so the gate reads what you intended rather than what you remember.

**PLACEHOLDER — the change record. One per candidate. Copy it, fill every line, and attach it to the run; a blank line is an unfinished proposal.**

```text
change_id:            ____________________
change_class:         ____________________   -- statistics | profile | patch | baseline | index | DDL | edition | session
target:               ____________________   -- sql_id or object, with owner
hypothesis:           ____________________
expected effect:      ____________________
primary metric:       ____________________
frozen workload:      ____________________
semantic fixtures:    ____________________
rollback primitive:   ____________________
human gate:           ____________________
discovered_version:   ____________________   -- same field name as the lesson record
```

Two fields do the most work. The `change_class` selects the rollback row on the [gate page](/05-feedback-loop/03-accept-or-rollback-gate/) before anything is applied. The `rollback_primitive` is unusable until someone has executed it once on the isolated target, which is check five of that gate.

Every later iteration gets a new `change_id`. It does not inherit the first candidate's record, its samples, or its verdict.

One aside: a record filled in after the verdict describes what happened rather than deciding what to do. Back to the form.

## 3. Gate semantics before spending database time

A query that returns the wrong answer is not an optimization, so the cheap checks run before any execution budget does.

- Parse and normalize the candidate with an Oracle dialect.
- Lint the text against the project's ruleset.
- Run behavior tests for results, nulls, ordering, and error contracts.
- Use an equivalence checker where the query shape and release support it, and treat it as a candidate until it is verified for this workload.

The static tools are evidence, not approval: a passing parse proves the parser accepted the text [S60] [S61]. Test output is the artifact, tied to the candidate hash. Ordering across these checks belongs to [Static Checks Before DB Time](/03-toolbox/04-static-checks-before-db-time/), and the fixtures themselves are owned by [Techniques](/01-proven-techniques/); this page only requires that they pass before the apply.

## 4. Measure the same workload, then re-baseline

A before and after pair means something only when both sides replay the same set, the same binds, and comparable conditions. `DBMS_SQLPA` creates the task, runs the trials, and reports the comparison [S06]; the recipes chapter owns those calls.

1. Run the before side on the frozen workload.
2. Apply only the named candidate, in the isolated target.
3. Run the after side on the same workload and conditions.
4. Save the comparison report and the plan that actually executed [S05].
5. Apply the [repetition policy](/05-feedback-loop/02-noise-floor-and-repetition/) outside the report.
6. Take the verdict from the [accept or rollback gate](/05-feedback-loop/03-accept-or-rollback-gate/).

If the verdict is accept, promote through the class-specific path, then re-baseline: the accepted state becomes the next run's before side. The next proposal starts from an accepted state, not from a stack of unverified changes. If the verdict is reject, the prior state is restored and proven first, then the record closes.

## 5. An aggregate win does not excuse a lost statement

**ILLUSTRATIVE — a synthetic outcome, not a result from this guide.** One index lowers the aggregate logical work of the set while a single unrelated statement rises past its own per-statement A/A floor.

The candidate is rejected. The aggregate cannot rescue a statement that lost, and the statement that motivated the change cannot carry the set either. What survives is the per-statement rows of the comparison, the reason for the rejection, and a lesson keyed to the condition that produced it.

This is why a single-statement win is never the verdict: a candidate can help the reported query and damage a neighbor in the same set. The full set, each statement judged against its own floor, and the no-regression check decide. Reading a plan explains what changed; it never decides whether the change was kept.

## 6. Where the change is gated

Four boundaries rule out candidates before the measurement, not after it:

- **Target.** Apply on the isolated target defined on the [chapter index](/05-feedback-loop/). A plain physical standby is a read-only replica rather than a writable execution target, and Oracle documents tuning an Active Data Guard standby workload from the primary as its own scope [S17](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/sql-tuning-advisor.html).
- **Forbidden moves.** No `CURSOR_SHARING=FORCE` presented as a fix, no uninstrumented session optimizer change, no hint without a stabilization and rollback path [S20] [S19] [S12].
- **Human gate.** Production parameters, production DDL, production index drops, and schema redesign are approved by a person before the loop touches them.
- **Release gate.** The chapter's single 26ai caveat lives on the [index](/05-feedback-loop/); this page only designs for the release it has.

## Artifact

A single candidate record:

- [ ] One hypothesis, one target, one `change_class`, and a new `change_id`
- [ ] Semantic gate cleared, with test output tied to the candidate hash
- [ ] Both sides run on the same frozen set, with the report and plan saved
- [ ] Repetition and interval taken from the [noise floor policy](/05-feedback-loop/02-noise-floor-and-repetition/)
- [ ] Verdict taken from the [accept or rollback gate](/05-feedback-loop/03-accept-or-rollback-gate/), never from the aggregate alone
- [ ] Re-baseline recorded, or the rollback proof recorded, before the next proposal

The change record above is `PLACEHOLDER`, and no block on this page has been executed.

**Decision:** one candidate, one record, one re-baselined workload. If you cannot name the change in a sentence, you are not ready to measure it.
