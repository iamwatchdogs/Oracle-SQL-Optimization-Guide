---
title: How to Read a DB Paper
description: A 4-step check to judge if a paper applies to Oracle.
order: 21
draft: false
---

Start with the tested system. Venue, year, read depth, and evidence class come after it. A paper’s methods and results must name the system before you let its headline travel to Oracle.

This research pass executed no Oracle workload. That fact belongs in the citation, not in a footnote you hope nobody reads.

## 1. Name the tested system

The first question is concrete: what database did the paper actually exercise?

- P1 is Oracle-authored/specific. PVLDB 19(12):4169–4181, 2026, DOI 10.14778/3827998.3828024, https://arxiv.org/html/2608.27758v1, [read firsthand]. The paper describes Oracle releases from 11g through 26ai.
- Bao P9 is a PostgreSQL prototype. SIGMOD 2021, DOI 10.1145/3448016.3452838, arXiv:2004.03814. Its per-query hints, tree models, and Thompson sampling do not establish an Oracle mapping.
- AutoSteer P8 is [snippet-verified] and names five systems: PostgreSQL, Presto, Spark, MySQL, and DuckDB. PVLDB 16:3515, 2023, DOI 10.14778/3611540.3611544.
- OtterTune P10 names PostgreSQL and MySQL. SIGMOD 2017, DOI 10.1145/3035918.3064029, https://github.com/cmu-db/ottertune.

If Oracle is absent from the methods/results, keep the result CANDIDATE for Oracle. The loop shape may travel. The measured win does not travel by citation.

## 2. Check year, venue, and evidence class

A venue tells you how the work entered the record. It does not replace reading the system under test.

- P1 is PVLDB 2026. P2 is PVLDB 2025. P4 is SIGMOD 2022, pp. 94–107, with a third-party reproducibility report B2.
- P11 is an arXiv preprint. IEEE ICDE 2026 is listed, but the proceedings status is unconfirmed. Keep the preprint/listing caveat attached.
- W5 is an Oracle whitepaper from 2007, https://www.oracle.com/technetwork/database/performance/spa-white-paper-ow07-132047.pdf. It can define the historical SQL Performance Analyzer concept; it cannot describe current 19c behavior. Use the current package and guide sources S06 and S13.
- W1 and W3 are catalogued Oracle briefs. The six briefs W1–W6 are not all discussed in this walkthrough; W2, W4, W5, and W6 are the selected examples here.

Read the evidence class too. B1 is a paper. B2 is a reproducibility artifact. A2 is an Oracle-authored brief, such as W4, SQL Plan Management in Oracle Database 19c, https://www.oracle.com/technetwork/database/bi-datawarehousing/twp-sql-plan-mgmt-19c-5324207.pdf. A class is not an Oracle test result.

## 3. Keep read depth attached to the claim

Read depth limits what you can say. P1 is the one paper marked [read firsthand] in this chapter. P2 and P3 are [snippet-verified]. The selected snippet-verified examples below are not a complete inventory of the research catalog.

- P2 reports about 15% performance improvement and up to 60% space-reclamation potential on customer workloads. Write “the abstract reports” and “vendor-reported,” not “we measured.”
- P3, Automatic SQL Error Mitigation in Oracle, is [snippet-verified]. PVLDB 16:3835, 2023, https://www.vldb.org/pvldb/vol16/p3835-pasupuleti.pdf.
- P5, SQLSolver, proves 346 of 359 equivalent query pairs derived from Calcite and Spark SQL rewrite rules. SIGMOD 2024, DOI 10.1145/3626768, https://github.com/SJTU-IPADS/SQLSolver, [snippet-verified]. It remains CANDIDATE for Oracle.
- P8 is [snippet-verified] and its five named systems are non-Oracle systems. P20 (S80) discusses an Oracle connector, but its experiments do not validate Oracle dialect or performance. Keep P20 CANDIDATE.

A snippet can support a sentence about what the paper claims. It cannot support a sentence about what your Oracle database did. This pass executed no Oracle workload, so the second sentence does not exist here.

## 4. Translate the evidence, do not inflate it

After the first three checks, write one of two labels:

- **Oracle-authored/specific:** the paper or brief is about Oracle, even if the result is not a claim about your workload.
- **CANDIDATE for Oracle:** the idea is relevant, but Oracle dialect, optimizer, or performance evidence is unverified.

P1, P2, and P3 belong in the first group as Oracle-authored/specific evidence. P1 is [read firsthand]; P2 and P3 are [snippet-verified]. P8, P9, P10, P11, P13, P14, P15, P16, P17, P18, and P20 remain candidates unless an Oracle test supplies the missing evidence.

PVLDB is a peer-reviewed database systems venue. It gives the paper a venue, volume, pages, year, and DOI. It does not by itself tell you which database or release was measured. The paper’s methods/results name the tested system. For P1, those methods and results name Oracle and trace 11g manual capture through 19c Auto SPM to 26ai Real-Time SPM. See P1 at https://arxiv.org/html/2608.27758v1.

<details><summary>What does snippet-verified mean?</summary>Snippet-verified means the claim came from an abstract, snippet, or metadata rather than a full paper read and a reproduced experiment. P1 is the exception recorded here: it is [read firsthand]. Selected examples of snippet-verified claims include P2, P3, P5, P8, P11, and P20. Keep the label beside the number, especially when the number is a performance figure. P2’s roughly 15% improvement and 60% space-reclamation potential are abstract-level vendor-reported figures, not results from this research pass. See P2.</details>

**Keep this: name the tested system, keep the read-depth label, and never turn a candidate into an Oracle claim without a new Oracle run.**
