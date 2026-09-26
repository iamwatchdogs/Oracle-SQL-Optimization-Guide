---
title: What Doesn't Transfer to Oracle
description: The method transfers, the mechanism never does, and the procedure that turns a foreign result into a hypothesis you can test.
order: 23
draft: false
---

For most of this literature, the method transfers and the mechanism never does. Learned optimization (steering a database's optimizer with a learned controller), rewrite verification (proving two queries return the same rows), and agentic loops (propose, measure, try again) are portable ideas attached to non-portable parts.

The mistake is not reading these papers. The mistake is importing a **result** and presenting it as a claim about your database. Import the hypothesis instead, and you keep everything worth having.

> **Track:** Core, then Practice, then Advanced / gated
>
> **Prerequisites:** Read [How to Read a DB Paper](/02-papers-behind-recipes/01-how-to-read-a-db-paper/) first. Its six questions produce the written fields, and its status labels are the ones you carry into the inventory below.
>
> **Evidence status:** Every source on this page is a non-Oracle source, catalogued in the ledger with its engine and its verification status. Several are snippet-verified or metadata-verified; two are preprints, one of which has an unconfirmed venue listing. **No live Oracle database was available**, so nothing here is a measurement of Oracle behavior.
>
> **Next required page:** [Toolbox](/03-toolbox/).

## How this page is banded

| Band                 | Sections |
| -------------------- | -------- |
| **Core**             | 1, 2, 3  |
| **Practice**         | 4, 5     |
| **Recovery**         | none     |
| **Advanced / gated** | 6        |

- **Core (1 to 3):** the rule, the two lists, and the engine each source actually ran on. Read these before you quote any of them.
- **Practice (4, 5):** the conversion procedure and the one-line rule. This is the part you reuse on every foreign result that reaches a design document.
- **Advanced / gated (6):** filling the verdict column. Gated because a verdict other than `NOT-TESTED` is only writable with a measurement attached to it.
- **Recovery (none):** a rejected hypothesis needs no rollback, because nothing was ever applied.

## 1. The rule

Split every source into two halves, and only one half is portable.

The **portable half** is the shape of the work: verify a candidate before committing it, refuse unmeasured changes, run long enough to tell an effect from noise, and write down what a rejected attempt taught you. None of that depends on an engine.

The **non-portable half** is everything the engine names: its knobs, its dialect, its plan shapes, its feature entitlement, and the workload whose shape produced the number. That half does not travel by citation, and no amount of reading fixes it.

The consequence is the rule you can quote: **no non-Oracle paper in this guide is evidence of how the Oracle optimizer behaves.** Not hedged, not softened by "suggests" or "likely generalizes". The claim is either supported by an Oracle source or it is a hypothesis. Section 5 states the rule in the form you can paste into a review.

## 2. What transfers, and what does not

**Transfers — the design pattern, and the verification step that must come with it.** Each bullet names a pattern, and where it cites, it cites a row in the inventory in section 3 or a page of this guide.

- **Verify before you apply.** Any loop that refuses to commit an unverified change works on any engine, including one you have never measured.
- **An equivalence guard.** Check a rewrite for equivalence before you accept it. The recorded work sits in the S49, S50, and S51 rows, and only S49's row carries a stated result.
- **Benchmarking discipline.** Repeat the measurement, report the variability, and run long enough to separate noise from effect. The S58 row states it for high-performance computing, and its method is system-agnostic.
- **Loop shape.** Propose, measure, accept or roll back: that is this guide's own loop, taught on [Accept or Rollback Gate](/05-feedback-loop/03-accept-or-rollback-gate/). What the S57 and S56 rows carry is narrower — interleaved reason-and-act control, and the lesson written from a failed attempt with no weight updates.
- **A test gate on generated SQL.** Validate a candidate against a real database before returning it. The S55 row; the harness is yours to build.

**Does not transfer — the mechanism, and it stays on the engine it was measured on:**

- **Engine knobs and hint names.** A knob is a database-specific control, not a portable abstraction.
- **SQL dialect details.** Types, null handling, and function semantics differ, and a proof about one dialect is not a proof about another.
- **Plan shapes and the reasons for them.** Cost models, baselines, and cardinality estimation are the engine's own.
- **Entitlement.** Whether the equivalent Oracle feature exists on your release, edition, and license is a separate check with a separate answer.
- **Workload shape.** The mix, scale, and data distribution that produced the number are part of the result, not a footnote to it.

## 3. Where the non-Oracle work actually ran

One inventory, ordered by the engine the record names: rows with a named engine first, rows where none is named next, and the Calcite exception last. In the last column, a **snippet-verified** row carries a stated result, a **metadata-verified** row carries a topic only because no finding of that source is relied on here, and a **preprint** row carries what its record states with the venue unconfirmed.

| Source                                                                                                               | Engine it ran on                                     | Status                      | Carries                                                    |
| -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------- | --------------------------- | ---------------------------------------------------------- |
| [S49](https://github.com/SJTU-IPADS/SQLSolver) SQLSolver, SIGMOD 2024, DOI 10.1145/3626768                           | Calcite and Spark SQL rewrite rules                  | snippet-verified            | Proves 346 of 359 equivalent query pairs                   |
| [S52](https://www.vldb.org/pvldb/vol16/p3515-anneser.pdf) AutoSteer, _PVLDB_ 16:3515, 2023                           | PostgreSQL, Presto, Spark, MySQL, DuckDB             | snippet-verified            | Steering an optimizer through its own tunable knobs        |
| [S53](https://github.com/learnedsystems/baoforpostgresql) Bao, SIGMOD 2021, DOI 10.1145/3448016.3452838              | PostgreSQL                                           | metadata-verified           | Topic only: steering the optimizer with per-query hints    |
| [S54](https://github.com/cmu-db/ottertune) OtterTune, SIGMOD 2017, DOI 10.1145/3035918.3064029                       | PostgreSQL and MySQL                                 | metadata-verified           | Topic only: reuse of prior tuning data for configuration   |
| [S48](https://ipads.se.sjtu.edu.cn/_media/publications/wetune_final.pdf) WeTune, SIGMOD 2022, pp. 94–107             | None named; 20 open-source projects                  | metadata-verified           | Topic only: rewrite rules discovered and formally verified |
| [S50](https://github.com/VeriEQL/VeriEQL) VeriEQL, OOPSLA 2024, DOI 10.1145/3649849                                  | None named                                           | metadata-verified           | Topic only: bounded equivalence with integrity constraints |
| [S51](https://www.vldb.org/pvldb/vol17/p3602-wang.pdf) QED, _PVLDB_ 17:3602, 2024                                    | None named                                           | metadata-verified           | Topic only: a query equivalence decider                    |
| [S55](https://arxiv.org/abs/2405.16755) CHESS, ICML 2025                                                             | None named; validates against a test database        | snippet-verified            | A unit-test agent checks candidate SQL before returning it |
| [S56](https://github.com/noahshinn/reflexion) Reflexion, NeurIPS 2023                                                | None named                                           | metadata-verified           | Topic only: lessons written from failed attempts           |
| [S57](https://github.com/ysymyth/ReAct) ReAct, ICLR 2023                                                             | None named                                           | metadata-verified           | Topic only: interleaved reason-and-act traces              |
| [S58](https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf) Scientific benchmarking | None named; method system-agnostic                   | metadata-verified           | Topic only: repetition, variability, measurement duration  |
| [S59](https://arxiv.org/abs/2502.12918) LLM rewriting, arXiv:2502.12918                                              | None named                                           | preprint                    | A candidate for the propose step, and nothing more         |
| [S68](https://arxiv.org/abs/2603.04169) SLER, arXiv:2603.04169                                                       | None named                                           | preprint; venue unconfirmed | Rule enumeration, deduplication, and ranking               |
| [S69](https://ieeexplore.ieee.org/iel8/11629178/11629165/11629242.pdf) Survey, IEEE 2026                             | None named                                           | metadata-verified           | Topic only: orientation across rule, ML, and LLM methods   |
| S80 QueryBooster, _PVLDB_ 16:2911, 2023, DOI 10.14778/3611479.3611497                                                | None named; Oracle support not verified              | snippet-verified            | Middleware rewrite and validate, with a human in the loop  |
| [S62](https://calcite.apache.org/javadocAggregate/org/apache/calcite/sql/dialect/OracleSqlDialect.html) Calcite      | Ships an Oracle dialect; is not the Oracle optimizer | metadata-verified           | Topic only: an OracleSqlDialect implementation exists      |

S48's third-party reproducibility report is part of its record and is not a separate row. S54's repository is archived and read-only in the ledger's snapshot; the [version drift page](/07-appendix-sources/02-version-drift-survival/) owns that dated figure, so it is not repeated here. The S58 row is the SC15 state-of-the-practice paper, and its method is system-agnostic even though its domain is high-performance computing.

### The one honest partial exception

The S62 row is the only row whose Engine column names Oracle, and it names it at the dialect layer; S80's Engine cell names no engine and notes only that Oracle support is unverified. Apache Calcite (Begoli and colleagues, arXiv:1802.10233, 2018) ships an **OracleSqlDialect** implementation, which makes **dialect-level transfer plausible**: parsing and normalizing Oracle-dialect text is the kind of work that implementation exists to support.

**Plan-level transfer stays absent.** Calcite is not the Oracle optimizer, so nothing about Oracle cost, cardinality estimation, plan choice, or plan baselines follows from it. Parsing an Oracle statement successfully is not evidence of anything about the plan Oracle will choose.

That boundary is drawn at a specific place — the surface language on one side, the optimizer's decisions on the other — and section 4 turns it into a test you can run.

## 4. Practice: converting a result into a hypothesis

Four moves, in order. The last one is the only one that produces a claim you own.

1. **Strip the engine from the result.** Write the mechanism with no database name in it. If the sentence cannot survive that, it was never a mechanism; it was a result.
2. **Restate it as a hypothesis about your database,** in one sentence, with a number and a population attached. "Replacing a full scan with an index on this column will cut the rows examined on this statement by at least an order of magnitude" is a hypothesis. "Indexes help" is not.
3. **Name the one measurement that would falsify it,** and where that measurement lives. The [target worksheet](/01-proven-techniques/01-measure-first/) gives you the statement identity, the window, and the plan artifact; the [noise floor policy](/05-feedback-loop/02-noise-floor-and-repetition/) gives you the bar the result must clear.
4. **Run it on your instance, then record the verdict.** The procedure, the thresholds, and the accept/reject rules are in the [V0 lab](/00-preface/02-how-to-prove-a-win/). This page does not repeat them, because a lab you read twice is a lab you stop reading.

If step 3 produces no measurement, you do not have a hypothesis. You have a preference.

**The dialect-level case follows the same four moves, with a different question at step 2.** For a source like [S62](https://calcite.apache.org/javadocAggregate/org/apache/calcite/sql/dialect/OracleSqlDialect.html), the hypothesis you may write is about **text**: that parsing and normalizing your own statements round-trips cleanly. Its falsifying measurement is **a round-trip parse of your own statement set** — parse, render, re-parse, compare. Never a plan comparison, never a cost claim, never a cardinality claim. If your hypothesis is about the plan, this source cannot test it and you need a plan-level source from the inventory above.

## 5. Practice: the one line to keep

> **No non-Oracle paper in this guide is evidence of how the Oracle optimizer behaves.** A source that ships an Oracle dialect, such as the S62 row, may support work on Oracle _text_; it still says nothing about plan choice, cost, or baselines.

That line is the whole boundary. It is what stops an engine's result from arriving in a design document as a property of your database, and it costs one sentence to enforce in review.

Its practical form: when a non-Oracle source enters a document, it may appear as a **reason to test**, never as a **reason to believe**. If the sentence has no measurement behind it, the sentence is a hypothesis with a citation attached.

## 6. Advanced / gated: filling the verdict column

The transfer table in the artifact below is only worth keeping if the verdict column cannot be filled casually. The gate:

- **`NOT-TESTED`** is the default and is always allowed.
- **`ACCEPT`** and **`REJECT`** require a named measurement, a UTC window, and a metric. A measurement you did not take cannot support any other value.
- **`INCONCLUSIVE`** is for a result that did not clear the noise floor. It is a real verdict, not a polite `NOT-TESTED`, and it is the one most often written when it should be `REJECT`.

The gate is a rule, not a privilege, which is why it is banded separately: nothing here needs a release or an entitlement, but the verdict column is where an unearned claim would enter the guide.

## Artifact

A transfer table with a fillable verdict column. One row per foreign source you are about to cite, and no row without a hypothesis.

**PLACEHOLDER — the transfer table. Fill it in; the verdict column stays empty until a measurement exists.**

```text
Source ID:            ____________________  (status: ______________)
Foreign result:       ____________________  (engine it ran on: ______)
Stripped mechanism:   ____________________  (no database name allowed)
Hypothesis here:      ____________________  (number + population)
Falsifying measure:   ____________________  (target, window, metric)
Verdict:              NOT-TESTED  /  ACCEPT  /  REJECT  /  INCONCLUSIVE
If not NOT-TESTED, the measurement lives at: ____________________
```

Two worked rows, so the shape is unambiguous.

**Optimizer row.** Source [S52](https://www.vldb.org/pvldb/vol16/p3515-anneser.pdf), snippet-verified, evaluated on PostgreSQL, Presto, Spark, MySQL, and DuckDB. Its mechanism, stripped of the engine, is steering an existing optimizer through the tunable knobs that engine already exposes. The hypothesis names one control, one statement, and one expected direction. The falsifying measurement is a named before-and-after on that statement with a UTC window and a metric, cleared against the noise floor. The verdict stays `NOT-TESTED` until that measurement exists.

**Dialect row.** Source [S62](https://calcite.apache.org/javadocAggregate/org/apache/calcite/sql/dialect/OracleSqlDialect.html), the Calcite row above. The hypothesis is about text, not behavior: that parsing and re-rendering your own statements round-trips cleanly. The falsifying measurement is a round-trip parse of your statement set. A plan comparison is not an available verdict here, because this source cannot produce one.

No verdict on this page is backed by an Oracle measurement, and every source listed here is non-Oracle by construction.

Source IDs and technique IDs resolve in [Appendix Sources](/07-appendix-sources/).

**Decision:** import the hypothesis, run the measurement, and let your own database produce the only number you are allowed to quote.

**Next required page:** [Toolbox](/03-toolbox/).
