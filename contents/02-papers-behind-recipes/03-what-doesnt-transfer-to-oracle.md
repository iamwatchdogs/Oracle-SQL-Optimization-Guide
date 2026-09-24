---
title: What Doesn't Transfer to Oracle
description: Why non-Oracle results stay candidates until Oracle tests them.
order: 23
draft: false
---

A junior asks a fair question. If it worked on Postgres, will it work on Oracle. The short answer is no, not without an Oracle test. Engines differ in cost models, hints, and storage. A win elsewhere is a lead. It is not proof.

A tuning trick is like a power plug, except the socket shape changes with each database.

Start with learned optimizers. Then check rewrite provers. Finally use Calcite only for prep work. First you sort each paper into proven or candidate. Next you name the exact gap. Then you plan the Oracle test.

## 1. Learned optimizers stay candidate without an Oracle run

Claim: AutoSteer, Bao, and OtterTune give design ideas, not Oracle proof.

Example: run the sorting demo. Pile A holds Oracle-proven work: P1, P2, P3. Pile B holds CANDIDATE work.

- AutoSteer [P8] PVLDB 16:3515, 2023, DOI 10.14778/3611540.3611544, [snippet-verified], steers knobs on PostgreSQL, Presto, Spark, MySQL, DuckDB.
- Bao [P9] SIGMOD 2021, DOI 10.1145/3448016.3452838, arXiv:2004.03814, steers Postgres with per-query hints, tree models, and Thompson sampling.
- OtterTune [P10] SIGMOD 2017, DOI 10.1145/3035918.3064029, https://github.com/cmu-db/ottertune, tunes Postgres and MySQL from past sessions.
- SLER [P11] arXiv:2603.04169, 2026, [snippet-verified], ranks rewrite rules. Survey [P12] IEEE 2026 maps rules to ML to LLM methods. LLM rewrite [P13] arXiv:2502.12918 follows WeTune ideas.

All lack Oracle runs in our pass. Mark each CANDIDATE. Oracle knob mapping unverified.

Why it matters: knob names do not port. A Postgres setting can have no Oracle twin. Copy-paste tuning can hurt. Use these papers for the loop shape, then test on Oracle.

Number: OtterTune repo archived 2020-11-13 with 1233 stars. Five systems for AutoSteer. Two for OtterTune. One for Bao. Zero list Oracle.

## 2. Rewrite provers stay candidate without Oracle dialect proof

Claim: proof on Calcite or Spark SQL rules does not prove Oracle SQL safe.

Example: continue the sorting demo with rewrite work.

- SQLSolver [P5] SIGMOD 2024, DOI 10.1145/3626768, https://github.com/SJTU-IPADS/SQLSolver, proves 346 of 359 pairs from Calcite and Spark SQL rules, [snippet-verified].
- WeTune [P4] SIGMOD 2022, pp. 94–107, finds and checks rules on queries from the 20 most popular open-source projects, plus a repro report.
- VeriEQL [P6] OOPSLA 2024, DOI 10.1145/3649849, arXiv:2403.03193, targets complex SQL with integrity constraints.
- QED [P7] PVLDB 17:3602, 2024, https://www.vldb.org/pvldb/vol17/p3602-wang.pdf, offers a new prover path.
- QueryBooster [P19] PVLDB 16:2911, 2023, DOI 10.14778/3611479.3611497, [snippet-verified], adds middleware rewrite with human review.

None list Oracle dialect support in our pass. Mark each CANDIDATE.

Why it matters: SQL dialects differ in nulls, types, and functions. A proof that ignores Oracle semantics can bless a wrong rewrite. Gate every rewrite on an Oracle run plus a bound check.

Number: 346 of 359 proved. 20 projects sampled. Both numbers are non-Oracle. Keep the CANDIDATE tag attached.

## 3. Use Calcite to prep, and agentic loops for shape only

Claim: Calcite parses Oracle text, but only an Oracle run proves speed.

Example: finish the sorting demo.

- P18 [P18] arXiv:1802.10233, 2018, gives Calcite plus OracleSqlDialect code. Use it to parse and normalize SQL before you touch the DB. Do not claim it proves plan quality.
- CHESS [P14] arXiv:2405.16755, ICML 2025, adds a unit-test agent that checks SQL on a real test DB.
- Reflexion [P15] NeurIPS 2023, arXiv:2303.11366, turns failed tries into text lessons.
- ReAct [P16] ICLR 2023, arXiv:2210.03629, interleaves reason and act for tool calls.
- P17 Hoefler SC15 benchmarking rigor asks for repeats and spread.

All four are design evidence. Oracle use unverified. Mark each CANDIDATE for Oracle until you test.

Why it matters: prep without proof is still useful. Clean parses cut bad tests. A test agent catches bad SQL before users see it. Reflection logs stop repeat fails. None of that replaces EXPLAIN and timed runs on Oracle.

Number: P18 is arXiv:1802.10233. P17 source is https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf. Method ports. Results do not port without a fresh Oracle run.

<details><summary>In case you don't know about optimizer knobs, it's settings and hints that steer which plan the database picks.</summary>AutoSteer and Bao work by tuning those controls from outside the core engine. Oracle has its own hint set. Mapping is unverified in our pass.</details>

<details><summary>In case you don't know about bounded verification, it's a proof that 2 queries match for inputs up to a set size.</summary>VeriEQL uses SMT solvers to build that proof or show a counterexample. Oracle dialect support is unverified in our pass.</details>

**Keep this: Mark every non-Oracle result as candidate until Oracle runs show a win.**
