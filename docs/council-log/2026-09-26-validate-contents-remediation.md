---
id: council-2026-09-26-validate-contents-remediation
type: council
date: 2026-09-26
mode: validate
flags: --deep --debate --explorers=3 --tier=quality --commit-ready
rounds: 2 (initial review + remediation), then 10 closure rounds
---

## Council Consensus: **PASS**

**Target:** `contents/` — 37 Markdown files, titled _Oracle SQL Optimization for Junior Devs_
**Questions:** (1) Can a developer who knows only basic SQL understand this book? (2) Is it written in Theo Browne's style? (3) implied — is the Oracle content factually true?
**Starting verdict:** FAIL · **Final verdict:** PASS · **All three judges PASS/HIGH**
**Coverage:** 37/37 files · 9 explorers · 3 named-perspective judges · 2 debate rounds · 10 closure rounds
**Fidelity:** full (R2 judges resumed on their own sessions)

| Judge        | Perspective     | Initial |           Final | Shift       |
| ------------ | --------------- | ------: | --------------: | ----------- |
| **NewHire**  | junior-reader   |    FAIL | **PASS** / HIGH | FAIL → PASS |
| **Voice**    | theo-voice      |    WARN | **PASS** / HIGH | WARN → PASS |
| **Accuracy** | oracle-accuracy |    FAIL | **PASS** / HIGH | FAIL → PASS |

Consensus rule: all PASS → **PASS**. 3/3 quorum in the final round.

---

## What was actually wrong, and what fixed it

The council ran eleven times. The first round returned FAIL on two criticals; the rest were closure rounds in which each judge verified only what it had itself flagged, and refused to ratify a fix it could not open the referent for.

That refusal was the most valuable thing in the process. **Four of the ten remediation passes introduced a defect, and every one was caught by a judge opening the referent rather than reading the changelog:**

| Introduced by         | Defect                                                                                                                       | Caught by                             |
| --------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| My first fix pass     | A prose paragraph inserted **inside a ` ```sql ` fence** in two files                                                        | Explorer, then a judge                |
| My first fix pass     | `Core boundary` claiming the fixture "inserts seventeen rows" — there are 14                                                 | NewHire _and_ Accuracy, independently |
| My first fix pass     | An **invented source ID** `S36b`, outside the declared S01–S93 range, breaking the ledger arithmetic                         | Accuracy                              |
| My rule-widening pass | A paragraph **missing its verb**: "whenever the candidate contention or resource use"                                        | NewHire _and_ Accuracy, independently |
| My rule-widening pass | A citation row asserting the feature was **absent** from a document that names it — my premise was a faulty capital-M search | Accuracy, against its own prior round |

The accuracy judge's standing instruction after the fourth was the one that ended the run: _"the next pass should diff each new sentence against its eight siblings character by character, because a string-level check is exactly what let the exclusivity survive four rewordings."_ That is what the final pass did, and it introduced nothing.

### The two criticals

**C-1 — the book's central release claim was false, and it cited the page that refuted it.** The book asserted `DBMS_XPLAN.COMPARE_PLANS` was documented only from 23ai and absent from 19c, in a section headed _What this book does not claim_, citing the 19c `DBMS_XPLAN` reference as proof. It is documented there at **§224.5.1** with the full five-parameter signature, `PLAN_OBJECT_LIST` at §224.3.1 exists expressly to feed it, and both are **absent from 12.2** — so 19c introduced it. Corrected at all six sites. Worse than the error: the citation chapter had promoted it to _method_, building its release-labelling lesson on a falsehood. That lesson now runs on a true example (`DIFF_PLAN`, same name in 12.2 and 19c, different signature), plus an honest account of how the book got it wrong — a skim of a package Overview that lists only table functions.

**C-2 — a release ladder between two names for one release.** 26ai replaced 23ai; `/23/` redirects to `/26/`. The book already recorded that redirect on another page while drawing a feature boundary between them. The map is now two rows.

### The comprehension wall

`index.md` defined `LOCAL RESULT` — the label telling a reader whether a number is real — using 13 undefined Oracle dictionary fields, while `cursor` appeared 125 times with no definition. The book already contained the fix, on the wrong page: a four-word pre-jargon table four route stops in. It is now on page 1, `LOCAL RESULT` is tiered (minimum viable identity, then the full set), and the three role names the corpus uses everywhere are defined where `index.md` says they are.

The V0 lab's Core band said **"Do not execute the numbered items in this section"**, so 100% of the runnable lab sat outside the beginner path. Core now holds the executable sections, states plainly that section 2 is `MUTATING` and why that is correct in a disposable schema, and names the four things Core needs that it does not hand you.

### The load-gate rule, which took nine rounds

One logical defect consumed more rounds than anything else, and the reason is instructive. A site asserted an **ordering** relationship ("the comparison comes before the load gate") that the shipped `order` field contradicted, and every attempt to phrase it consistently produced a contradiction somewhere else. The resolution was to stop expressing an ordering at all: the comparison is required on **every** candidate; the load gate is required **whenever** the candidate affects contention or resource use, and the condition is a _trigger_, not the whole rule — the load page owns the rest, including the Real Application Testing entitlement fallback. Stated once, pointed to from four sites, byte-identical at all nine renderings.

### The voice axis

Credit where due, and the judge was precise about it: 35/37 pages open on a verdict, 28.2 numeric tokens per 1,000 prose words, named villains with zero instances of "the industry", and **one** real banned-phrase hit in 116,000 words. The `**Decision:**` line is the best writing in the book, 37 times.

The voice judge made a call worth recording. It held WARN for three rounds on **B7 — the war-story behavior — then ruled it not reachable and withdrew it from the verdict basis**: §7 makes B7 RARELY-tier, but §8 and `SKILL.md:12` forbid inventing anecdotes, and this corpus has no lived incidents because it is honest about having no Oracle instance. Zero is compliant when RARELY is a ceiling. It also **withdrew its own B1 finding against its own interest**, ruling that counting analogies per Core _section_ was a metric pointing the wrong way, since a rising count would reward padding.

What it did hold, and what was fixed: a 378-token self-invented evidence-label overlay (now 309, with 3-deep stacking eliminated and the convention stated once), a closer templated 37/37 (the `Next required page` line went 47 → 37, one per page), and a 190-word label-precedence rule that read as self-defending (now four sentences).

---

## What did _not_ change, deliberately

The book's honesty about having no Oracle instance is its strongest asset and was protected throughout. No fix weakened an evidence label on a block that marks synthetic data as synthetic, and no invented anecdote was added to satisfy B7.

Verbatim-verified material that must not be broken: the index-compression compatibility floors (12.1.0 / 12.2.0) and the single-column-unique `LOW` restriction; the parallel-execution ~30% figure and its four warnings; `V$SQL` lacking `INSTANCE_NUMBER` in 19c; the SPA raw-sample distinction; `ALLSTATS` / `GATHER_PLAN_STATISTICS`; the `DIFF_PLAN` signatures, now verified character-for-character against both releases.

Two things the council did **not** fix, and said so:

- **B1's analogy coverage stayed where it was.** Judged not a defect by the judge who raised it.
- **The print-order inversion grew, from ~410 to ~445 lines.** Section 11A must run before section 6 but prints after it. Fixed with cross-references at both ends rather than a reorder. The judge ruled it non-blocking and the first minor it would fix on merit.

---

## Verification

| Gate                    | Result                         |
| ----------------------- | ------------------------------ |
| `bun run lint`          | pass                           |
| `bun run format:check`  | pass                           |
| `bun run check` (astro) | 0 errors, 0 warnings, 0 hints  |
| `bun run check:tsgo`    | pass                           |
| `bun run test`          | **229 passed / 229**, 24 files |
| `bun run build`         | 38 pages                       |

Structural invariants the council re-derived clean at the end: 93 source IDs, all inside the declared S01–S93 range, every stated count true · every core-spine page in exactly one band and named by a route table · zero forward dependencies · zero broken internal links · 14 fixture INSERTs (3 departments + 11 employees) stated consistently · nine byte-identical renderings of the load-gate condition.

**Diff:** 37 files, +455 / −406.

---

## Note on concurrent work

`src/` contained uncommitted changes from another process throughout this session, actively rewritten mid-run. Two of my verification runs failed on `src/lib/reading-toc-controller.mjs` (a lint error) and `src/layouts/BaseLayout.astro` (a type error) — **not mine**; I never edited `src/`. Both cleared when that process finished its own refactor, and the final gate run above is against their completed state. Flagging it because the intermediate red gates in this session's history are not attributable to the content work.

---

## Report

`docs/council-log/2026-09-26-validate-contents-remediation.md` (this file, per `--commit-ready`).
Judge reports: `.agents/council/2026-09-26-contents-judge-*.md` (3 initial + 10 closure rounds).
Explorer reports: `.agents/council/explorers/` (9 initial + 3 re-validation).
Prior round, same corpus, 2026-09-25: `.agents/council/2026-09-25-validate-contents.md` (FAIL, 7 pedagogical blockers). The book was rebuilt in two commits on 2026-09-26; the critical factual finding in this round was new because that round explicitly scoped release-existence checks out.
