---
title: Papers Behind the Recipes
description: Which papers matter for Oracle and which do not.
order: 20
draft: false
---

A paper is not Oracle evidence because it is peer reviewed. It becomes Oracle-specific evidence when the paper is Oracle-authored/specific or its methods and results name Oracle as the tested system. This catalog contains 19 papers: P1–P18 plus P20. P19 was never assigned.

That is the boundary of this research pass. It read and catalogued papers; it executed no Oracle workload. The Oracle-authored/specific papers describe Oracle behavior and design history. They do not become an Oracle benchmark just because they sit beside the recipes.

## 1. Start with Oracle-authored/specific evidence

Three papers get the close treatment here because they describe Oracle’s own systems:

- P1, [Real-time SQL Plan Management in Oracle](/02-papers-behind-recipes/02-oracles-own-papers/), is [P1] PVLDB 19(12):4169–4181, 2026, DOI 10.14778/3827998.3828024, https://arxiv.org/html/2608.27758v1, [read firsthand]. It traces plan capture, automatic plan management, Auto STS, and Real-Time SPM.
- P2, Automatic Indexing, is [P2] PVLDB 18(12):4924, 2025, DOI 10.14778/3750601.3750616, [snippet-verified]. The paper’s lifecycle is the useful part: propose, validate, deploy, and remove.
- P3, Automatic SQL Error Mitigation in Oracle, is [P3] PVLDB 16:3835, 2023, https://www.vldb.org/pvldb/vol16/p3835-pasupuleti.pdf, [snippet-verified]. It describes mitigation during query compilation, including failover to alternative plans.

P1 was read firsthand. P2 and P3 were snippet-verified. That distinction matters. P1’s paper reports Oracle production deployment, but this research pass did not reproduce that workload. The correct label is Oracle-authored/specific evidence, not Oracle-tested proof from this pass.

## 2. Sort the rest by the Oracle gap

Learned and adaptive systems show how to steer an optimizer. They do not show that Oracle will accept the same controls.

- Bao [P9] is a PostgreSQL prototype that uses per-query hints, tree models, and Thompson sampling. DOI 10.1145/3448016.3452838, arXiv:2004.03814. Oracle hint mapping remains unverified in this pass.
- AutoSteer [P8] is [snippet-verified] and names five non-Oracle systems: PostgreSQL, Presto, Spark, MySQL, and DuckDB. DOI 10.14778/3611540.3611544.
- OtterTune [P10] names PostgreSQL and MySQL. Its repository is archived, with 1,233 stars and a last push on 2020-11-13. https://github.com/cmu-db/ottertune
- QueryBooster [P20] [S80] discusses an Oracle connector, but its experiments do not validate Oracle dialect or performance. Keep it CANDIDATE for Oracle. DOI 10.14778/3611479.3611497.

P11 has a different boundary. It is an arXiv preprint, while an ICDE 2026 venue is listed but unconfirmed. Preserve the preprint/listing caveat; do not turn an index entry into a confirmed proceedings claim.

The bibliography also catalogues W1 and W3. The six Oracle briefs W1–W6 are not all discussed here; this chapter uses selected entries, including W2, W4, W5, and W6.

## 3. Read depth changes the sentence you can publish

P2 reports about 15% performance improvement and up to 60% space-reclamation potential on customer workloads. Those are abstract-level, vendor-reported figures, not measurements from this project.

P5, SQLSolver, proves 346 of 359 equivalent query pairs derived from Calcite and Spark SQL rewrite rules. P4, WeTune, includes a third-party reproducibility report and evaluates rules on queries from 20 open-source projects. Both are useful design evidence. Neither establishes Oracle dialect support in this pass.

These are selected examples, not a complete inventory. Keep the read-depth label attached to the claim: P1 is [read firsthand]; selected snippet-verified examples include P2, P3, P5, P8, P11, and P20. P14 is metadata-verified in the paper ledger; its substantive CHESS claim is snippet-verified in S55. A snippet is not a test you ran.

In this chapter:

- [How to Read a DB Paper](/02-papers-behind-recipes/01-how-to-read-a-db-paper/)
- [Oracle's Own Papers](/02-papers-behind-recipes/02-oracles-own-papers/)
- [What Doesn't Transfer to Oracle](/02-papers-behind-recipes/03-what-doesnt-transfer-to-oracle/)

**Keep this: Oracle-authored/specific is a source classification. Oracle-tested is a workload claim. This catalog makes the first claim, not the second.**
