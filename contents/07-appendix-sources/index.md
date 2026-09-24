---
title: Appendix Sources - How We Track Every Claim
description: The 80-source system behind stars, licenses, and Oracle behavior claims.
order: 70
draft: false
---

A citation is a dated receipt, not a magic link. The question is not “does this URL open?” The question is: which source, which class, which version, and which snapshot back this exact sentence?

## The ledger has a boundary

The corpus currently contains **S01–S80**. Inline `[S##]` markers resolve to full source records in `.agents/research/07-sources-bibliography.md`. The published appendix explains the system; it does not duplicate every full row. When a published page links directly to a source, that link is the scoped evidence for that page, not a promise that the whole ledger is embedded in the site.

All online sources in the research pass carry an access date of **2026-09-22 UTC**. GitHub API fields—stars, last push, license metadata, and `archived`—are snapshots from that date. They are not live guarantees.

The grading summary is approximate because a record can carry more than one class: 30+ A1 entries, 6 A2 entries, 19 B1 papers/preprints, 1 B2 reproducibility record, 16 C1/C2 tool or repository entries, and 8 D entries across 80 distinct IDs.

## Source classes keep weight honest

| Class  | Meaning                                       | Use it for                                                                         |
| ------ | --------------------------------------------- | ---------------------------------------------------------------------------------- |
| **A1** | Oracle official, versioned documentation      | Release-specific Oracle behavior and package boundaries                            |
| **A2** | Oracle-authored whitepaper or technical brief | Vendor context and documented design, with the version attached                    |
| **B1** | Peer-reviewed paper or preprint               | Research design and evidence; venue status must be stated when it is not confirmed |
| **B2** | Third-party reproducibility material          | Checking whether a research artifact reproduces, not replacing the original claim  |
| **C1** | Deterministic tool documentation              | Commands, dialects, and documented interfaces                                      |
| **C2** | Maintained OSS repository                     | License and dated maintenance evidence for code                                    |
| **D**  | Blog, forum, or secondary source              | Corroboration or practical context only                                            |

`B1` does not mean every record in this corpus has a confirmed peer-reviewed venue. A preprint, metadata-only record, or venue-unconfirmed paper stays labeled that way. Do not upgrade a source because it has a DOI or an S-number.

A mirror, YouTube video, or consultant tutorial cannot outrank a versioned A1 guide for an Oracle behavior claim. A repository can prove what its code claims, but it cannot prove that the code is correct for your Oracle release. A paper can motivate a method, but it cannot replace your plan, workload, and rollback evidence.

## The 55-query search trail

The research log records **55 grouped searches and verification checks**, all run on 2026-09-22. The trail is discovery plus checking, not 55 independent claims.

|      Queries | What the group covered                                                     |
| -----------: | -------------------------------------------------------------------------- |
|    1–12 (12) | Core Oracle tuning documentation, statistics, SPM, and rewrite research    |
|    13–21 (9) | OSS frameworks, drivers, benchmark tools, and research repositories        |
|   22–35 (14) | Package references, controls, clients, and Oracle feature boundaries       |
|   36–49 (14) | Maintenance checks, candidate papers, tool verification, and corroboration |
|    50–55 (6) | Dated GitHub API snapshots plus the support-policy and S76–S80 checks      |
| **55 total** | **Search trail, not an evidence count**                                    |

The last group matters. It includes the dated repository reads, the official Lifetime Support Policy PDF search, index-compression documentation, parallel-execution documentation, the WeTune reproducibility trail, SQL*Plus documentation, and QueryBooster discovery. [S78](https://www.oracle.com/assets/lifetime-support-technology-069183.pdf) [S76](https://docs.oracle.com/en/database/oracle/oracle-database/19/admin/managing-indexes.html) [S77](https://docs.oracle.com/en/database/oracle/oracle-database/19/vldbg/parallel-exec-intro.html) [S79](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqpug/) [S80](https://doi.org/10.14778/3611479.3611497)

## Five source boundaries to keep visible

- **S76** is the 19c Administrator's Guide section on index compression. It supports T-67 and its compatibility restrictions, not a blanket performance promise. [S76](https://docs.oracle.com/en/database/oracle/oracle-database/19/admin/managing-indexes.html)
- **S77** is the 19c VLDB and Partitioning Guide section on parallel execution. It supports the load/resource gate for T-68, not a promise that parallel execution wins everywhere. [S77](https://docs.oracle.com/en/database/oracle/oracle-database/19/vldbg/parallel-exec-intro.html)
- **S78** is the official Lifetime Support Policy PDF. It was located, but its text was not extracted in this pass. No support date is asserted from it here. [S78](https://www.oracle.com/assets/lifetime-support-technology-069183.pdf)
- **S79** is Oracle's *SQL*Plus User's Guide and Reference, 19c, E96459-09, June 2025. Use it when SQL*Plus is the client assumption; do not generalize it to every client or release. [S79](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqpug/)
- **S80** is QueryBooster paper evidence from _PVLDB_ 16:2911 (2023). Oracle support was not verified, so it remains a candidate rather than a proven OSS replacement. [S80](https://doi.org/10.14778/3611479.3611497)

## The citation pattern

For a repo claim, record the source ID, license, snapshot date, last push, and archive state. For an Oracle claim, record the release and the package or guide section. For a research claim, record whether the venue is confirmed, the paper is a preprint, or the evidence is only metadata.

The compact ID keeps the prose readable. The dated record keeps the claim inspectable. If the record is not in the published page, use the research ledger rather than pretending this appendix contains a full row.

In this chapter:

- [How Citations Work in This Book](/07-appendix-sources/01-how-citations-work/)
- [Version Drift Survival for Oracle Docs and OSS](/07-appendix-sources/02-version-drift-survival/)

**No source ID, no version boundary, no snapshot date: the claim is not ready to ship.**
