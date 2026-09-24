---
title: Papers Behind the Recipes
description: Which papers matter for Oracle and which do not.
order: 20
draft: false
---

Most juniors make the same error in week one. They cite a Postgres blog to justify an Oracle change. The blog looks solid. The chart goes up. Then the change flops on Oracle. The optimizer differs. The hints differ. The storage layer differs. That gap is the whole point of this chapter.

A paper stack is like a parts shelf, except half the parts were built for a different engine.

Start with Oracle-built proof. Then sort the rest as candidates. Finally ship only what Oracle tests confirm. First you learn a 4-step read method. Next you meet the 3 Oracle papers from 2023 to 2026. Then you learn what stays candidate.

## 1. Start with Oracle-built proof

Claim: only 3 papers in this set were written by Oracle engineers about Oracle itself. Example: P1 Real-Time SQL Plan Management [P1] PVLDB 19(12):4169–4181, 2026, DOI 10.14778/3827998.3828024, https://arxiv.org/html/2608.27758v1, [read firsthand]. It traces manual capture to background checks to foreground checks. P2 Automatic Indexing [P2] PVLDB 18(12):4924, 2025, DOI 10.14778/3750601.3750616, [snippet-verified]. P3 error mitigation [P3] PVLDB 16:3835, 2023, https://www.vldb.org/pvldb/vol16/p3835-pasupuleti.pdf, [snippet-verified]. Why it matters: these 3 describe code that runs on Oracle. The rest describe ideas that ran elsewhere. Number: 3 Oracle-engineer papers out of 19 papers in the shelf. All sources checked 2026-09-22.

## 2. Sort the rest as candidates

Claim: learned, rewrite, and agentic results stay CANDIDATE for Oracle until tested on Oracle. Example: Bao [P9] SIGMOD 2021, DOI 10.1145/3448016.3452838, arXiv:2004.03814, is a PostgreSQL prototype with per-query hints. AutoSteer [P8] PVLDB 16:3515, 2023, DOI 10.14778/3611540.3611544, [snippet-verified], names PostgreSQL, Presto, Spark, MySQL, DuckDB. OtterTune [P10] SIGMOD 2017, DOI 10.1145/3035918.3064029, https://github.com/cmu-db/ottertune, names PostgreSQL and MySQL. None map Oracle hints in our pass. Mark all three CANDIDATE. Why it matters: a steering trick that wins on Postgres can still lose on Oracle. Hints differ. Cost models differ. Number: OtterTune repo archived 2020-11-13 with 1233 stars. Old code. No Oracle run. Candidate only.

## 3. Read honestly: full read versus snippet

Claim: a snippet is not a test you ran. Example: P2 reports about 15% speed gain and up to 60% space-reclamation potential, but our source marks those figures [snippet-verified, abstract-level figures]. Quote them as vendor-reported. Do not present them as your own test. P1 is the opposite. It was [read firsthand]. You can cite its foreground verify step with care. Why it matters: juniors lose trust when they oversell an abstract. Name the read depth each time. Number: P4 WeTune [P4] SIGMOD 2022, pp. 94–107, DOI 10.1145/3514221.3526125, ships with a third-party repro report. That is stronger than a lone abstract. SQLSolver [P5] proves 346 of 359 pairs from Calcite and Spark SQL rules, [snippet-verified]. Still CANDIDATE for Oracle. No Oracle dialect proof in our pass.

<details><summary>In case you don't know about peer review, it's independent checks by other researchers before a paper is published.</summary>Venue names such as PVLDB, SIGMOD, and OOPSLA tell you that check happened. Dates and test systems tell you the rest. Evidence classes help too. B1 means peer-reviewed paper. A2 means Oracle-authored brief. B2 means third-party repro artifact.</details>

In this chapter:

- [How to Read a DB Paper](/02-papers-behind-recipes/01-how-to-read-a-db-paper/)
- [Oracle's Own Papers](/02-papers-behind-recipes/02-oracles-own-papers/)
- [What Doesn't Transfer to Oracle](/02-papers-behind-recipes/03-what-doesnt-transfer-to-oracle/)

**Keep this: Trust Oracle-tested proof first, and mark everything else as candidate.**
