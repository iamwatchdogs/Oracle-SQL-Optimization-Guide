---
title: Version Drift Survival for Oracle Docs and OSS
description: 'The release map, why 19c advice does not borrow a later feature, what a superseded brief is good for, and why a repository fact belongs to a date.'
order: 72
draft: false
---

Version drift starts when a live link outlives the behavior it describes. A URL is not a release contract. A README is not a support window. A star count is not maintenance.

Every one of those is a page on the internet that will still be there next year, describing a system that has moved. The fix is small and mechanical: pin the release, date the fact, and state the boundary you could not verify.

This page owns that rule for the whole book. Every other page links here rather than repeating it, and the dated per-tool inventory it owns lives on the [OSS gate page](/06-oss-guide/01-how-to-vet-oss/).

> **Track:** Core (1–4) · Practice (5, 6) · Recovery (none) · Advanced / gated (none)
>
> **Prerequisites:** None, though the [class legend](/00-preface/01-why-evidence-grades/) explains what a record in the map below is allowed to support.
>
> **Evidence status:** The release map is A1 versioned Oracle documentation, with 26ai records marked as such and A2 Oracle-authored papers behind the plan-management rows. The repository facts are C2 records read at a single dated snapshot on **2026-09-22 UTC**. The two supplementary records in section 5 are D-class corroboration. **No live Oracle database was available**, so no feature on this page was observed running, and no row is a result.
>
> **Next required page:** This branch ends here. Return to [the route](/) and take the next step from the root page.

## How this page is banded

| Band                 | Sections   |
| -------------------- | ---------- |
| **Core**             | 1, 2, 3, 4 |
| **Practice**         | 5, 6       |
| **Recovery**         | none       |
| **Advanced / gated** | none       |

- **Core (1, 2, 3, 4):** the release map, the rule for 19c advice, what a superseded document is still good for, and the dating rule for repository facts. Read once; the two later sections apply it.
- **Practice (5, 6):** two things you do with a claim in hand. Section 5 shows what a corroborating source settles and what it cannot; section 6 is the checklist to run before reusing any recommendation.
- **Recovery (none):** nothing here undoes a change. Version drift is not fixed by rolling back; it is fixed by a boundary you can test.
- **Advanced / gated (none):** nothing on this page is gated, because deciding what a release supports never needs a privilege. The feature gates in this book live with the features themselves.

## 1. The release map

This book's primary release is **19c**. Everything else is either a later release you may cite with a version note, or a mention whose introduction release was not verified.

| Feature                                        | Release boundary used here          | Evidence boundary                                                |
| ---------------------------------------------- | ----------------------------------- | ---------------------------------------------------------------- |
| Real-Time Statistics                           | **19c**                             | Documented in the 19c tuning guide [S01]                         |
| Plan comparison (`COMPARE_PLANS`, `DIFF_PLAN`) | **19c**                             | The 19c package reference documents both [S05]                   |
| Automatic SQL Plan Management                  | **19c**                             | Paper and 19c guidance: background verification [S11]            |
| SQL Quarantine                                 | **19c**                             | Documented; names and signatures confirmed locally [S40]         |
| Real-Time SPM                                  | **26ai**                            | Foreground verification, and it does not undo a regression [S21] |
| Automatic SQL Transpiler                       | **23ai and later**                  | Eligibility and configuration are release-specific [S46]         |
| Automatic SQL error mitigation                 | **26ai**                            | Confirm the parameter and its eligibility scope [S46]            |
| Regression models for Real-Time Statistics     | **Later guide, release unverified** | In the 26ai contents; introducing release unverified [S02]       |
| PL/SQL dynamic statistics                      | **Later guide, release unverified** | Mentioned in the 26ai guide; do not backport [S02]               |

The records are [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/) the 19c tuning guide, [S05](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html) the 19c `DBMS_XPLAN` reference, [S40](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLQ.html) the 19c `DBMS_SQLQ` reference, and [S02](https://docs.oracle.com/en/database/oracle/oracle-database/26/tgsql/index.html) the 26ai guide. The plan-management rows are [S11](https://arxiv.org/html/2608.27758v1) and the 19c and 26ai chapters of [S21](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/overview-of-sql-plan-management.html), and the two later-release feature rows are both [S46](https://docs.oracle.com/en/database/oracle/oracle-database/26/nfcoa/oracle-ai-database-26ai-new-features-guide.pdf).

Three rows carry a version note because they point past 19c, and each of them is a place where a 19c runbook can go wrong silently. The general rule is short: **a feature appearing in a later guide is not automatically new in that release.** The guide collects features introduced across releases, so presence in a table of contents is a pointer, not a version.

One absence is deliberate. The official Lifetime Support Policy is published and located, but its text was not extracted in this pass, so **no support date is asserted anywhere in this book**. Cite the document itself when a recency claim is needed, and record the extraction date when someone finally reads it. [S78](https://www.oracle.com/assets/lifetime-support-technology-069183.pdf)

## 2. 19c advice does not borrow later features

A 19c environment can use 19c guidance without pretending that Real-Time SPM, the automatic SQL Transpiler, or the PL/SQL dynamic-statistics behavior belongs to its release. A later-release environment can use the newer guide while still citing 19c sources for behavior the 19c guide covers.

The pattern to use, and it is three lines long:

- **A 19c claim** cites the 19c guide or the 19c package reference.
- **A later-release claim** cites the later guide or the paper that introduced it, and says which release.
- **A boundary claim** states what was not read or not verified firsthand, instead of guessing.

This is less satisfying than a universal feature claim, and it is the version that survives an upgrade review. The failure it prevents is specific: a 19c team reads a later guide, believes a feature is available, designs around it, and discovers the gap during a release window rather than in a design document.

The same rule runs in the other direction, and it is the one most often got wrong: extending an API's options in a later release is not the same as introducing the API. [How Citations Work](/07-appendix-sources/01-how-citations-work/) owns the rule and the worked plan-comparison example.

## 3. Superseded guidance stays as a warning

The 19c statistics best-practices brief supersedes the 2012 edition of the same document. Keep the old link for exactly one reason: to warn someone whose script or runbook still points at it. A superseded document is not evidence and not a fallback, and citing it as either would be a quiet error that survives for years. [S08](https://www.oracle.com/docs/tech/database/technical-brief-bp-for-stats-gather-19c.pdf) [S09](https://www.oracle.com/docs/tech/database/technical-brief-stats-concepts-19c.pdf)

The same applies to optimizer advice, and it is harder because no document is superseded. Vendor commentary on adaptive plans disagrees with itself across releases, and both sides are written by people who have run the feature. Treat adaptive behavior as **workload-dependent**, measure it enabled and disabled on your own workload, and record the result rather than adopting a position. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/) [S19](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/influencing-the-optimizer.html)

So there are two different kinds of drift, and they need different handling. A **superseded document** is retired and stays only as a warning. A **contested behavior** is alive, and the way to settle it is measurement rather than citation.

## 4. Repository drift is a dated fact

**This is the book's rule for repositories, and it is the reason the OSS chapter dates its facts against this page.** A repository's licence, star count, last-push date, and archive flag are properties of a moment, not of a project. Print them with the date they were read, and treat them as expired the moment a newer read is possible.

The snapshot behind the ledger is **2026-09-22 UTC**, and the only complete dated inventory in this book is on the [OSS gate page](/06-oss-guide/01-how-to-vet-oss/). This page keeps one row as the worked example of how to record it:

| Repository | Facts recorded at the 2026-09-22 UTC snapshot | What the record licenses                          |
| ---------- | --------------------------------------------- | ------------------------------------------------- |
| SQLdb360   | 123 stars; last push 2024-12-03; no licence   | A collector that needs a fresh rights check [S67] |

That record covers both diagnostic collectors, so it resolves to two repositories: [S67](https://github.com/mauropagano/sqld360) SQLd360 and [SQLdb360](https://github.com/sqldb360/sqldb360).

Two habits make this rule hold under pressure. **Re-read before you depend**, and **carry the date in the sentence** rather than in a footnote, because the sentence is what gets copied into somebody's runbook. A repository can be archived and still useful, and it can be popular and still wrong for your release; the labels describe the snapshot, and the decision describes your workload.

## 5. Corroboration settles purpose, not rights

Two independent write-ups describe the community diagnostic collectors, and they are the cleanest example in this book of what corroboration can and cannot do. This is a different record set from the five narrowing records on [How Citations Work](/07-appendix-sources/01-how-citations-work/), which this section does not repeat.

One independent database blog describes the SQL-level diagnostic tool as a tool for deep analysis of individual SQL statements, and another independent write-up describes the successor as the database-wide tool that grew out of the SQL-level one. [S74](https://aws.amazon.com/blogs/database/transform-your-oracle-database-journey-with-accenture-and-aws/) [S75](https://dincosman.com/2025/02/23/oracle-database-health/)

Those two sentences are useful and they are both class D. What they settle is **what the tools are for**: collecting a diagnostic bundle, per statement and per database, that a human reads later. What they do not settle is the licence, the maintenance state, or whether the output agrees with what Oracle reports, and the dated inventory on the [gate page](/06-oss-guide/01-how-to-vet-oss/) is the only place in this book that speaks to the second of those.

The general lesson is worth more than the two rows. A corroborating source is the right tool for **existence and purpose**, and the wrong tool for **rights, versions, and behavior**. When a secondary description and a versioned reference disagree, the reference wins and the disagreement gets recorded rather than smoothed over.

## 6. The survival checklist

Before reusing any recommendation from this book or from a source it cites, write down five things.

- The Oracle release, and the release that introduced the feature if they differ.
- The source ID, its class, and the access or snapshot date.
- For a repository: the snapshot date, the licence as read from the file, the last push, and the archive flag.
- What was read directly, and what was not extracted.
- The exact package, client, or API name you will call.

Then run the procedure on a disposable environment. Version drift is not fixed by confidence and it is not fixed by a longer note; it is fixed by a boundary you can test and a name you have actually called.

## Artifact

A drift record with five fields: the release and the feature's introducing release, the source ID with its class and date, the repository snapshot fields where a repository is involved, the read-firsthand versus not-extracted split, and the exact name you called. Keep it with the run it authorizes, because that is where a future reader will look when the release moves.

**PLACEHOLDER — the drift record. One block per recommendation you reuse. Fill it in before the run, not after.**

```text
claim and release:                 ____________________
feature introduced in:             ____________________
source ID, class, access date:     ____________________
repository snapshot (if any):      ____________________
read firsthand / not extracted:    ____________________
exact name called on your release: ____________________
```

Behind it, the [citations page](/07-appendix-sources/01-how-citations-work/) owns how a record is read and how a release-sensitive name is marked, and the [OSS gate page](/06-oss-guide/01-how-to-vet-oss/) supplies the dated per-tool inventory that section 4's rule governs. Nothing on this page is Oracle execution output.

Source IDs and technique IDs resolve in [Appendix Sources](/07-appendix-sources/).

**Decision:** pin the release, date the fact, and state the gap. A link that outlives the behavior it describes is not a citation.

**Next required page:** This branch ends here. Return to [the route](/) and take the next step from the root page.
