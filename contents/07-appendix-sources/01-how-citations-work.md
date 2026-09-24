---
title: How Citations Work in This Book
description: Read S-numbers, classes, and links without getting lost.
order: 71
draft: false
---

An S-number is an index into evidence. It is not evidence by itself. The useful citation tells you what was checked, which class it belongs to, when it was accessed, and what boundary still remains.

## Inline ID, dated ledger

Write `[S##]` in the body when a claim needs a source. Resolve the full record in `.agents/research/07-sources-bibliography.md`. The published appendix does not reproduce every full row; it explains how to read the compact citations and points to direct source URLs where the published page needs them.

That distinction prevents a common failure: a short S-number gets mistaken for a complete bibliography. It is a lookup key. The research ledger is the record.

A useful citation has four parts:

1. **ID:** the stable pointer, such as `[S60]`.
2. **Class:** the evidence class, such as A1, B1, or C2.
3. **Scope:** release, repository, or experiment boundary.
4. **Date:** the access or snapshot date, not a claim that the source is eternally current.

For example, the sqlglot repository snapshot in this pass is MIT, 9,628 stars, last pushed 2026-09-21, and active under the six-month label. The live repository can change. [S60](https://github.com/tobymao/sqlglot)

## Classes are weights, not badges

| Class  | Record                                        | Editorial rule                                                        |
| ------ | --------------------------------------------- | --------------------------------------------------------------------- |
| **A1** | Oracle official versioned documentation       | Use for release-specific behavior and package boundaries.             |
| **A2** | Oracle-authored whitepaper or technical brief | Use with its version and scope.                                       |
| **B1** | Peer-reviewed paper or preprint               | State whether the venue is confirmed, metadata-only, or unconfirmed.  |
| **B2** | Third-party reproducibility report            | Use to test reproduction, not as a substitute for the original paper. |
| **C1** | Deterministic tool documentation              | Use for documented commands and interfaces.                           |
| **C2** | Maintained OSS repository                     | Use for dated license and maintenance evidence.                       |
| **D**  | Blog, forum, or secondary material            | Corroborate; do not use as sole proof for behavior.                   |

This is why the wording is “peer-reviewed paper/preprint,” not “every B1 record is confirmed peer-reviewed.” SLER [S68] and the survey [S69] are especially easy to overstate: their venue status is not treated as confirmed in this pass. QueryBooster [S80] has paper metadata and a DOI, but Oracle support is unverified. QED [S51] has a paper and no repository check here. The WeTune record pairs its paper with the third-party reproducibility report, not with a claim of confirmed Oracle coverage. [S48](https://doi.org/10.1145/3514221.3526125)

## The T-number map

The map below points to the published chapter that explains each technique. T-42 remains a mechanism note for T-41, not a standalone intervention.

| IDs                  | Published chapter                                                                                                                                                                    |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| T-01–T-08            | [Measure First](/01-proven-techniques/01-measure-first/)                                                                                                                             |
| T-09–T-23            | [Stats Run the Show](/01-proven-techniques/02-stats-run-the-show/) and the scriptable stats recipe at [Stats Pipeline You Can Script](/04-recipes/03-stats-pipeline-you-can-script/) |
| T-24–T-33, T-67–T-68 | [Indexes and Layout](/01-proven-techniques/03-indexes-and-layout/)                                                                                                                   |
| T-34–T-44            | [Let Oracle Rewrite](/01-proven-techniques/04-let-oracle-rewrite/)                                                                                                                   |
| T-45–T-53            | [Stabilize and Ship Safely](/01-proven-techniques/05-stabilize-and-ship-safely/)                                                                                                     |
| T-54–T-57            | [Stabilize and Ship Safely](/01-proven-techniques/05-stabilize-and-ship-safely/) and [One Change at a Time](/05-feedback-loop/01-one-change-at-a-time/)                              |
| T-58                 | [How to Prove a Win](/00-preface/02-how-to-prove-a-win/) and [Measure First](/01-proven-techniques/01-measure-first/)                                                                |
| T-59                 | [Stabilize and Ship Safely](/01-proven-techniques/05-stabilize-and-ship-safely/)                                                                                                     |
| T-60                 | [Safe DDL and CI Gates](/04-recipes/04-safe-ddl-and-ci-gates/) and [Accept or Rollback Gate](/05-feedback-loop/03-accept-or-rollback-gate/)                                          |
| T-61                 | [Let Oracle Rewrite](/01-proven-techniques/04-let-oracle-rewrite/) and [Stabilize and Ship Safely](/01-proven-techniques/05-stabilize-and-ship-safely/)                              |
| T-62–T-66            | [Safe DDL and CI Gates](/04-recipes/04-safe-ddl-and-ci-gates/) and [Accept or Rollback Gate](/05-feedback-loop/03-accept-or-rollback-gate/)                                          |

The compact map is published here. Full technique descriptions remain in `.agents/research/01-proven-techniques-catalog.md`; full source rows remain in research file 07, `.agents/research/07-sources-bibliography.md`. Do not invent a full row in a published page that does not contain one.

## Source boundaries that change the claim

**S76 — index compression.** The 19c Administrator's Guide documents prefix and advanced index compression, including compatibility and index-type restrictions. Cite it for T-67. Do not turn a space-saving feature into a universal query-speed claim. [S76](https://docs.oracle.com/en/database/oracle/oracle-database/19/admin/managing-indexes.html)

**S77 — parallel execution.** The 19c VLDB and Partitioning Guide describes when parallel execution can help and when resource pressure can make it worse. It supports T-68's concurrency-realistic load gate. [S77](https://docs.oracle.com/en/database/oracle/oracle-database/19/vldbg/parallel-exec-intro.html)

**S78 — support policy.** The official Lifetime Support Policy PDF was located but not text-extracted in this pass. No support date is asserted. If a future pass reads it, record the exact release window then—not now. [S78](https://www.oracle.com/assets/lifetime-support-technology-069183.pdf)

**S79 — SQL\*Plus.** Oracle's *SQL*Plus User's Guide and Reference, 19c, E96459-09, June 2025, is a client boundary. Cite it when SQL*Plus is actually part of the procedure; do not use it as a generic citation for SQL behavior. [S79](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqpug/)

**S80 — QueryBooster.** The _PVLDB_ 16:2911 (2023) paper is candidate evidence for middleware-assisted rewriting. Oracle support is not verified, so the correct label is **CANDIDATE**, not proven replacement. [S80](https://doi.org/10.14778/3611479.3611497)

## Release-sensitive names stay marked

A citation does not make a package signature portable. `DBMS_XPLAN.COMPARE_PLANS` is release-checked as a 23ai+ name; 19c users should use the documented side-by-side display facilities. [S05](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html) SQL Quarantine names are release-sensitive and should be marked as sketches until checked against the installed release. [S40](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLQ.html)

The same applies to a new client assumption or a feature in a 26ai guide. Name the release, link the reference, and label what was not verified.

## The citation check

Before reuse, ask:

- Does the S-number resolve to the research ledger?
- Is the source class accurate?
- Is the release or repository version stated?
- Is a GitHub number a dated snapshot or being presented as live?
- Is a preprint, metadata-only paper, or venue-unconfirmed work labeled honestly?
- Does the cited source actually support the sentence, or only the surrounding example?

If any answer is no, fix the citation before publishing the claim.

**Match the claim to the source class, the release, and the date.**
