---
title: Why Evidence Grades Decide What You Trust
description: A1 to D grades, the research PROVEN bar, and the line between a procedure and a result.
order: 2
draft: false
---

Five tuning tips can point in five directions. The loudest tip is not automatically the right one.

Grades give a junior developer a calm way to ask two separate questions: **What supports this claim?** and **How will we test it?** The second question matters because a documentation claim and a local performance result are different artifacts.

## Read the grade before the advice

| Grade  | Source type                                     | Decision                                                                      |
| ------ | ----------------------------------------------- | ----------------------------------------------------------------------------- |
| **A1** | Oracle versioned product documentation          | Use for documented behavior and release scope                                 |
| **A2** | Oracle-authored technical brief or whitepaper   | Use for vendor guidance                                                       |
| **B1** | Paper or preprint                               | Use for the system or mechanism studied; state whether the venue is confirmed |
| **B2** | Reproducibility report or artifact              | Use as independent support, not automatic Oracle proof                        |
| **C1** | Deterministic tool with readable output         | Use to produce evidence about the test system                                 |
| **C2** | Maintained project with a verifiable repository | Use as supporting implementation evidence                                     |
| **D**  | Blog, forum, or secondary commentary            | Use only as a lead or version clue                                            |

A blog claim about bind variables is a D until a stronger source explains the behavior. The Oracle SQL Tuning Guide is an A1 source. An Oracle statistics brief is A2. A paper that studied a different database is B1 evidence for that paper's system, not an Oracle result.

## The PROVEN bar is a research label

The research definition is precise:

> **PROVEN** means documented authoritative evidence, or at least two independent verified sources, plus a deterministic and reproducible verification procedure.

The procedure is the part junior developers often skip. It should name the input, the change, the measurement, the comparison, and the rollback. It should be possible for another engineer to run it.

The procedure is not an executed result. This research pass had no live Oracle database, so the catalog contains no claim that its techniques were benchmarked here. The reader supplies the result by running the procedure on a representative database.

The catalog has 68 entries: 67 PROVEN and one CONDITIONAL entry, T-08. T-08 is a community diagnostic collector, so it is useful evidence packaging, not a peer of an Oracle versioned package reference. [S67](https://github.com/mauropagano/sqld360) [S74](https://aws.amazon.com/blogs/database/transform-your-oracle-database-journey-with-accenture-and-aws/) [S75](https://dincosman.com/2025/02/23/oracle-database-health/)

## Grade a claim in four moves

1. **Write the claim precisely.** Replace “indexes make queries fast” with “this index should reduce the measured work for this predicate and this workload.”
2. **Tag the immediate source.** A forum answer is D. An Oracle guide is A1. An Oracle brief is A2.
3. **Check the scope.** Record the Oracle version, feature availability, edition or service entitlement, and any unverified assumption.
4. **Name the test.** State the before workload, one change, metric, repetition budget, plan artifact, and rollback path.

That sequence turns “a tip helped once” into an auditable engineering task. It also gives you permission to reject a weak claim without turning the discussion into a popularity contest.

## What the grade does not promise

A source can document a feature without proving that it will help your data. A tool can produce a report without proving that its recommendation is correct. A paper can show a large result on one workload without transferring to your workload.

That is why every technique in the catalog carries a verification procedure and risks. The same boundary applies to tools: deterministic instrumentation tells you what happened in the tested system. It does not remove the need to check result correctness, concurrency, licensing, or rollback.

Oracle's own statistics and plan-management guidance is a good example. It gives you documented mechanisms and a way to test them. It does not hand you a universal speedup number. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/) [S08](https://www.oracle.com/docs/tech/database/technical-brief-bp-for-stats-gather-19c.pdf) [S58](https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf)

## Keep candidates outside the proven count

The research keeps learned optimizers, automated parameter tuners, LLM rewrites, and SQL-equivalence tools in a candidate area when their Oracle coverage is not verified in this pass. That is not a rejection of the ideas. It is scope control.

A candidate can still be useful. It just cannot borrow the PROVEN label until its Oracle-specific support and verification path are documented.

<details><summary>What a citation ID tells you</summary>

`[S01]` is the Oracle SQL Tuning Guide, 19c. `[S06]` is the `DBMS_SQLPA` package reference. `[S58]` is the benchmarking methodology used for repetition and variability. `[T-##]` points to a catalog technique, not a new benchmark result. The complete source map lives in `.agents/research/07-sources-bibliography.md`; the technique map lives in `.agents/research/01-proven-techniques-catalog.md`.
</details>

No live Oracle database was available for the research pass. `sqlcl` and `sqlplus` were not on `PATH`. Nothing on this page reports a local execution.

**Decision: grade the claim, record the scope, and write the test. If you cannot write the test, keep the result labeled unverified.**
