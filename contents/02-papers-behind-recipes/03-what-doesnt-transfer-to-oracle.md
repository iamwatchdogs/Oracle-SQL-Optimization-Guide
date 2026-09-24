---
title: What Doesn't Transfer to Oracle
description: Why non-Oracle results stay candidates until Oracle tests them.
order: 23
draft: false
---

Non-Oracle results are not failures. They are design evidence with an Oracle gap. This research pass executed no Oracle workload, so no paper in this chapter earns an Oracle performance claim by proximity.

The catalog contains 19 papers: P1–P18 plus P20. P19 was never assigned. The rule for the rest of the shelf is simple: reuse the mechanism only after you test the mechanism on Oracle.

## 1. Learned optimizers stay CANDIDATE without an Oracle run

AutoSteer, Bao, and OtterTune show how a system can steer an optimizer. Their experiments do not establish Oracle support for the same knobs, hints, or loop.

An optimizer knob is a setting or hint that steers plan choice. The engine comes first: map the control second, test the Oracle mapping last. A loop shape can transfer; a database-specific control cannot be copied by name and called an Oracle result.

- AutoSteer P8 is [snippet-verified] and names PostgreSQL, Presto, Spark, MySQL, and DuckDB. PVLDB 16:3515, 2023, DOI 10.14778/3611540.3611544.
- Bao P9 is a PostgreSQL prototype using per-query hints, tree models, and Thompson sampling. SIGMOD 2021, DOI 10.1145/3448016.3452838, arXiv:2004.03814.
- OtterTune P10 uses PostgreSQL and MySQL. SIGMOD 2017, DOI 10.1145/3035918.3064029, https://github.com/cmu-db/ottertune. The repository is archived, with 1,233 stars and a last push on 2020-11-13.
- SLER P11 is an arXiv preprint. IEEE ICDE 2026 is listed, but the proceedings status is unconfirmed. Preserve the preprint/listing caveat.
- The survey P12 maps rule-based, machine-learning, and LLM-driven optimization. The LLM rewrite paper P13 is also a preprint. Both are orientation and proposal evidence, not Oracle results.

These papers stay CANDIDATE for Oracle in this pass. The relevant non-Oracle experiments do not establish Oracle support. A knob name is not a portable abstraction; it is a database-specific control until the Oracle version and workload confirm otherwise.

## 2. Rewrite provers stop at the dialect boundary

A proof on Calcite or Spark SQL does not automatically prove an Oracle rewrite safe. SQL dialects differ in types, null handling, functions, and optimizer behavior.

- SQLSolver P5 proves 346 of 359 equivalent query pairs derived from Calcite and Spark SQL rewrite rules. SIGMOD 2024, DOI 10.1145/3626768, https://github.com/SJTU-IPADS/SQLSolver, [snippet-verified].
- WeTune P4 discovers and verifies rules on queries from 20 popular open-source projects. SIGMOD 2022, pp. 94–107, DOI 10.1145/3514221.3526125, with a third-party reproducibility report B2.
- VeriEQL P6 targets bounded equivalence for complex SQL with integrity constraints. OOPSLA 2024, DOI 10.1145/3649849, arXiv:2403.03193.
- QED P7 provides another equivalence-decider path. PVLDB 17:3602, 2024, https://www.vldb.org/pvldb/vol17/p3602-wang.pdf.
- QueryBooster P20 (S80) is a middleware rewrite system with a human-in-the-loop path. PVLDB 16:2911, 2023, DOI 10.14778/3611479.3611497, [snippet-verified]. The paper discusses an Oracle connector, but its experiments do not validate Oracle dialect or performance. Keep QueryBooster CANDIDATE.

That QueryBooster distinction matters. “The paper does not mention Oracle” would be false. “The relevant non-Oracle experiments do not establish Oracle support” is the accurate boundary.

The missing gate is not another paper citation. It is a controlled Oracle run: check the result contract, explain the plan, and compare the measured before/after behavior on the release and workload you actually operate.

## 3. Calcite and agentic loops are design evidence

The last group changes how you build and test a loop. It does not prove that the loop will win on Oracle.

- P18 gives Apache Calcite and an OracleSqlDialect implementation. arXiv:1802.10233, 2018, https://calcite.apache.org/javadocAggregate/org/apache/calcite/sql/dialect/OracleSqlDialect.html. Use it to parse and normalize SQL before database time. Parsing Oracle text is not proof of Oracle plan quality.
- CHESS P14 adds a unit-test agent that checks candidate SQL against a test database. arXiv:2405.16755, ICML 2025, https://arxiv.org/abs/2405.16755. The paper record is metadata-verified; the substantive unit-test claim is snippet-verified in S55.
- Reflexion P15 turns failed attempts into language feedback. NeurIPS 2023, arXiv:2303.11366.
- ReAct P16 interleaves reasoning and tool actions. ICLR 2023, arXiv:2210.03629.
- Hoefler and Belli P17 provide a benchmarking method built around repeated measurements, variation, and enough runtime to separate noise from an effect. SC15, https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf.

These are design evidence. Oracle use is unverified. Mark each CANDIDATE for Oracle until you run the relevant check on Oracle. P17’s method can port; its results cannot.

<details><summary>What is bounded verification?</summary>Bounded verification proves that two queries agree for inputs up to a chosen bound, or returns a counterexample. VeriEQL targets complex SQL with integrity constraints. SQLSolver’s 346-of-359 result is a concrete number from Calcite and Spark SQL rewrite rules, not an Oracle dialect proof. A bounded result reduces risk inside its bound. It does not cover every input, release, or Oracle behavior.</details>

**Keep this: treat non-Oracle work as CANDIDATE until an Oracle dialect, semantic, and timed-workload test earns a stronger label.**
