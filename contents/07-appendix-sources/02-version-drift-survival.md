---
title: Version Drift Survival for Oracle Docs and OSS
description: 19c to 26ai changes, superseded briefs, and archived repos without pain.
order: 72
draft: false
---

Version drift starts when a live link outlives the behavior it describes. A URL is not a release contract. A README is not a support window. A star count is not maintenance.

The fix is small: pin the release, record the date, and state the boundary you could not verify.

## The release map

| Feature                                    | Release boundary used here                       | Evidence boundary                                                                                                                                                                                                                                                         |
| ------------------------------------------ | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Real-Time Statistics                       | **19c**                                          | Documented in the 19c tuning guide. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/)                                                                                                                                                           |
| Regression models for Real-Time Statistics | **26ai guide mention; exact release unverified** | The 26ai guide's TOC exposed the topic, but this pass did not verify the introduction release. Treat the detail as **TOC-only/unverified here**. [S02](https://docs.oracle.com/en/database/oracle/oracle-database/26/tgsql/index.html)                                    |
| PL/SQL dynamic statistics                  | **26ai guide mention; exact release unverified** | The 26ai guide mentions the feature, but this pass did not verify its introduction release. Do not backport it into a 19c claim. [S02](https://docs.oracle.com/en/database/oracle/oracle-database/26/tgsql/index.html)                                                    |
| Automatic SPM                              | **19c**                                          | The research paper and 19c guidance describe background verification. [S11](https://arxiv.org/html/2608.27758v1) [S21](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/overview-of-sql-plan-management.html)                                          |
| Real-Time SPM                              | **26ai**                                         | Foreground verification is a 26ai feature. It does not retroactively repair the execution that regressed. [S11](https://arxiv.org/html/2608.27758v1) [S21](https://docs.oracle.com/en/database/oracle/oracle-database/26/tgsql/overview-of-sql-plan-management.html)      |
| Automatic SQL Transpiler                   | **23ai/26ai**                                    | Eligibility and configuration are release-specific. [S46](https://docs.oracle.com/en/database/oracle/oracle-database/26/nfcoa/oracle-ai-database-26ai-new-features-guide.pdf)                                                                                             |
| Automatic SQL error mitigation             | **26ai**                                         | Keep it separate from the transpiler; verify the parameter and eligibility scope on the installed release. [S46](https://docs.oracle.com/en/database/oracle/oracle-database/26/nfcoa/oracle-ai-database-26ai-new-features-guide.pdf)                                      |
| SQL Quarantine                             | **19c+ in this pass**                            | The mechanism is documented, but API names and signatures must be checked on the installed release. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/) [S40](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLQ.html) |

The 26ai guide documents features introduced across releases. A feature appearing in that guide is not automatically a 26ai introduction. The release label belongs next to the behavior.

## 19c advice should not borrow 26ai features

A 19c environment can use 19c guidance without pretending that Real-Time SPM, the PL/SQL dynamic-statistics behavior mentioned in the 26ai guide, or the 23ai+ named plan-comparison API is available. A 26ai environment can use the newer guide while still citing 19c sources for behavior that the 19c guide covers.

Use this pattern:

- **19c claim:** cite S01, S03, S05, S07, or the relevant 19c package reference.
- **26ai claim:** cite S02, S21, S46, or the 26ai paper/reference for that feature.
- **Boundary claim:** say what the pass did not read or verify firsthand.

That pattern is less exciting than a universal feature claim. It is also the version that survives an upgrade review.

## Superseded guidance stays as a warning

The 19c statistics brief S08 replaces the older 2012 edition. Keep the older link only as a warning against stale scripts. Pair current statistics decisions with S09 for concepts and the release-specific guide for behavior. [S08](https://www.oracle.com/docs/tech/database/technical-brief-bp-for-stats-gather-19c.pdf) [S09](https://www.oracle.com/docs/tech/database/technical-brief-stats-concepts-19c.pdf)

The same rule applies to optimizer advice. Adaptive plans are workload-dependent in the evidence set. A vendor blog claiming a universal win or loss is not a release contract. Measure the feature enabled and disabled on the workload, then record the result. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/) [S19](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/influencing-the-optimizer.html)

## Repository drift is a dated fact

The GitHub API snapshot is dated **2026-09-22 UTC**. It can tell you what the API returned that day. It cannot tell you what the repository looks like later.

- **OtterTune:** 1,233 stars, last push 2020-11-13, and archived/read-only in the snapshot. Treat it as design evidence. The research pass did not establish an install history, so do not invent one. [S54](https://github.com/cmu-db/ottertune)
- **SQLd360:** 65 stars, last push 2018-01-14, dormant under the pass's label. **SQLdb360:** 123 stars, last push 2024-12-03, low activity. Both returned `NOASSERTION` for license metadata. [S67](https://github.com/sqldb360/sqldb360)
- **HammerDB:** GPL-3.0, 786 stars, last push 2026-09-18, active in the snapshot. It is a load tool, not a promise that a regression will appear within a fixed time. [S65](https://github.com/TPC-Council/HammerDB)
- **Swingbench:** 80 stars, last push 2026-05-26, no declared license in the snapshot. Check rights before treating it as a project dependency. [S66](https://github.com/domgiles/swingbench-public)

A repository can be archived and still useful. It can be popular and still wrong for your release. The labels describe the snapshot; the decision describes your workload.

## S78 is a source boundary, not a support date

S78 is the official Oracle Lifetime Support Policy PDF. The PDF was located through search, but its text was not extracted in this pass. Therefore, **no specific support date is asserted here**. Cite S78 when a future pass needs the exact window, and record the extraction date when that happens. [S78](https://www.oracle.com/assets/lifetime-support-technology-069183.pdf)

Do not fill that gap with a blog's support date. An unverified date is worse than an explicit blank.

## S79 and S80 narrow the claim

S79 is Oracle's *SQL*Plus User's Guide and Reference, 19c, E96459-09, June 2025. Use it when SQL*Plus is the client assumed by the procedure. It does not establish behavior for another client or another release. [S79](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqpug/)

S80 is QueryBooster paper evidence from _PVLDB_ 16:2911 (2023). Oracle support is not verified in this pass, so it remains a candidate for middleware-assisted rewriting, not a proven Oracle replacement. [S80](https://doi.org/10.14778/3611479.3611497)

The research trail that produced these boundaries is summarized in the appendix index: 55 grouped searches and verification checks, not 55 live guarantees.

## The survival checklist

Before reusing a recommendation, write down:

- Oracle release and feature introduction release;
- source ID, class, and access date;
- repository snapshot date, license, last push, and archive state;
- what was verified firsthand and what was not;
- the exact client or API name you will use.

Then run the procedure on a disposable environment. Version drift is not fixed by confidence. It is fixed by a boundary you can test.

**Pin the release. Date the snapshot. State the gap.**
