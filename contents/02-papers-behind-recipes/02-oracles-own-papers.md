---
title: Oracle's Own Papers
description: The primary evidence in this chapter set for how Oracle behaves, and exactly what each source licenses you to claim.
order: 22
draft: false
---

Three peer-reviewed papers written by Oracle engineers, plus the vendor brief lineage that sits alongside them, are the only primary evidence in this chapter set for how Oracle actually behaves. One of those papers is the design ancestor of the accept/reject gate this guide teaches everywhere else.

Everything else in the research literature is design or method evidence. That is not a criticism of those papers. It is a statement about which question each one can answer.

> **Track:** Core, then Practice, then Advanced / gated
>
> **Prerequisites:** Read [How to Read a DB Paper](/02-papers-behind-recipes/01-how-to-read-a-db-paper/) first, or at least its six-question pass.
>
> **Evidence status:** [S11](https://arxiv.org/html/2608.27758v1) is **read firsthand**, the only source used in this chapter set with that status, as the [branch index](/02-papers-behind-recipes/) records. [S16](https://doi.org/10.14778/3750601.3750616) and [S70](https://www.vldb.org/pvldb/vol16/p3835-pasupuleti.pdf) are **snippet-verified**. The five briefs [S08](https://www.oracle.com/docs/tech/database/technical-brief-bp-for-stats-gather-19c.pdf), [S09](https://www.oracle.com/docs/tech/database/technical-brief-stats-concepts-19c.pdf), [S10](https://www.oracle.com/a/tech/docs/database/technical-brief-optimizer-oracle-db-0218.pdf), [S12](https://www.oracle.com/technetwork/database/bi-datawarehousing/twp-sql-plan-mgmt-19c-5324207.pdf), and [S14](https://www.oracle.com/technetwork/database/performance/spa-white-paper-ow07-132047.pdf) are vendor-authored documents whose content notes, and for S12 one verbatim quotation, are carried in the ledger record. Their rows below are **snippet-verified against that record**, not metadata-only.
>
> **Class codes used below:** **A1** Oracle versioned documentation · **A2** Oracle-authored brief or whitepaper · **B1** paper or preprint · **B2** reproducibility report or artifact · **C1** deterministic tool with documented output · **C2** maintained open-source project. The [evidence chapter](/00-preface/01-why-evidence-grades/) owns these labels.
>
> **No live Oracle database was available**, so this page is a reading of sources, not a test.
>
> **Next required page:** [What Doesn't Transfer to Oracle](/02-papers-behind-recipes/03-what-doesnt-transfer-to-oracle/).

## How this page is banded

| Band                 | Sections   |
| -------------------- | ---------- |
| **Core**             | 1, 2, 3, 4 |
| **Practice**         | 6          |
| **Recovery**         | none       |
| **Advanced / gated** | 5          |

- **Core (1 to 4):** read and act on the record. What primary evidence means here, then the three papers in the order they matter for a plan decision: plans, then indexes, then compile-time failure.
- **Advanced / gated (5):** the vendor brief lineage. Every row needs a release check before you use it. One is historical, one is release-scoped, and one is 2007-era.
- **Practice (6):** the claim table. Use it before you quote a number or a capability in writing.
- **Recovery (none):** nothing here rolls anything back. Recovery for a plan decision lives in [Stabilize and Ship Safely](/01-proven-techniques/05-stabilize-and-ship-safely/).

## 1. The strongest evidence in this chapter set

Oracle-authored evidence earns its place for one reason: the authors are the people who built the feature being described. [S11](https://arxiv.org/html/2608.27758v1) is the clearest case, since the ledger records it as deployed in Oracle production. A third-party paper studying a feature on PostgreSQL cannot tell you what the Oracle optimizer does, no matter how carefully it was measured.

Two limits stay attached to that strength, and they are what most readers get wrong.

- **Vendor-authored is not vendor-independent.** A vendor benchmark is measured by the party that benefits from the result. Treat it as an existence proof that the feature moves real workloads, and nothing stronger.
- **Oracle-authored is not Oracle-specific to your instance.** S11's record says its work was deployed in Oracle production, and S16's says the feature is available since 19c and in Autonomous Database (Oracle's managed database service); S70's record carries no deployment claim at all. None of them can tell you what it will do on your release, your edition, or your entitlement.

## 2. Plan management: verify before you commit

One record carries two identifiers for the same paper, and this page keeps both because each licenses something different. [S11](https://arxiv.org/html/2608.27758v1) is Chakkappen, Ziauddin, Su, Kunjibettu, and Bayliss, "Real-time SQL Plan Management in Oracle": the **arXiv posting** is the text that was read firsthand, and the **published version** is _PVLDB_ 19(12):4169–4181, 2026, [DOI 10.14778/3827998.3828024](https://doi.org/10.14778/3827998.3828024). The `read firsthand` status attaches to the arXiv text, and the venue, volume, and page range describe the published record; neither licenses anything about your release.
The ledger records both identifiers in a single row, which is why this page names them together instead of picking one and leaving the other to look like a second paper.

That record also carries the read-firsthand status that the [branch index](/02-papers-behind-recipes/) records for this chapter set, so this page may describe its architecture.

The paper's timeline is a design history, not one feature with one label:

- **11g:** manual plan capture.
- **12c:** the Auto SPM Evolve Advisor moves plan verification into the background.
- **19c:** Auto SPM uses Auto STS (the automatic SQL Tuning Set) with a regression threshold on plan metrics. The [working terms section](/00-preface/01-why-evidence-grades/) defines a SQL Tuning Set as a named workload container.
- **26ai:** Real-Time SPM verifies a new plan in the foreground, during the user execution that would use it, and immediately reinstates a previously accepted plan on regression.

**Release gate, stated the way the techniques pages state it.** Automatic SPM is documented from 19c. Real-Time SPM is a feature of Oracle AI Database 26ai. The behavior is carried by **B1** (paper or preprint) read-firsthand evidence [S11](https://arxiv.org/html/2608.27758v1) alone; the 26ai guide [S02](https://docs.oracle.com/en/database/oracle/oracle-database/26/tgsql/index.html) is **A1** (Oracle versioned documentation) and **TOC-verified**, and it confirms only that the feature exists on that release. Confirm it on the installed release before you design a gate around it.

The paper also records two things that matter for how you build. Background verification is documented as too slow for cloud and constrained resources, which is the vendor's own argument for foreground checks. And the work is reported as deployed in Oracle production. Both are findings of the paper. Neither is a measurement of your instance.

The design rule is the one this guide borrows: **a new plan is used only after it is verified better, and the previously accepted plan stays available to reinstate.** The mechanism, the accepted-plan handling, and the regression cases are not re-taught here. [Stabilize and Ship Safely](/01-proven-techniques/05-stabilize-and-ship-safely/) owns the gate; [Let Oracle Rewrite](/01-proven-techniques/04-let-oracle-rewrite/) owns what a candidate must clear before it is allowed near a plan.

The vendor states the same rule in plain words in the 19c brief: "only known or verified plans are used; a new plan will not be used until it has been verified to perform better." [S12](https://www.oracle.com/technetwork/database/bi-datawarehousing/twp-sql-plan-mgmt-19c-5324207.pdf)

## 3. Indexes: propose, verify, then deploy or drop

[S16](https://doi.org/10.14778/3750601.3750616) — Chakkappen, Kunjibettu, and colleagues, "Automatic Indexing in Oracle," _PVLDB_ 18(12):4924, 2025, DOI 10.14778/3750601.3750616 — is **snippet-verified**, and the figures below are abstract-level.

The feature is documented as available since 19c and in Autonomous Database, the two availability locations the ledger names, and the lifecycle the paper describes is the part worth keeping: it creates a candidate, validates it, deploys a winner, and removes an index that does not earn its place, including expression indexes.

Why the removal step is the interesting one: an index is not free. It can cut reads and tax writes, so a feature that only proposes indexes has stopped before the decision. The propose-verify-deploy-or-drop shape is the same shape this guide uses for every change, and [Indexes and Layout](/01-proven-techniques/03-indexes-and-layout/) is where you apply it, including the write cost and the entitlement check.

On the figures, keep the scoping clause in the same sentence as the number. The abstract reports about 15% performance improvement and up to 60% space-reclamation potential on customer workloads, in a vendor-authored benchmark. That is an existence proof that automatic indexing moves real workloads. It is not a general expectation, not a target, and not a prediction for a database you have not measured.

## 4. Compile-time failure: a different boundary

[S70](https://www.vldb.org/pvldb/vol16/p3835-pasupuleti.pdf) — Pasupuleti and colleagues, "Automatic SQL Error Mitigation in Oracle," _PVLDB_ 16:3835, 2023 — is **snippet-verified**.

The paper describes mitigation during query compilation, with strategies that include failover to alternative plans. The ledger records that this work underpins the 26ai `SQL_ERROR_MITIGATION` feature, whose release-scoped documentation record is [S46](https://docs.oracle.com/en/database/oracle/oracle-database/26/nfcoa/oracle-ai-database-26ai-new-features-guide.pdf) (**snippet-verified against the ledger record**; the parameter name is the ledger's, and its eligibility scope still has to be verified on the installed release).

This is a different boundary from plan performance, and the two are routinely confused. A statement can compile into a plan that runs badly, or it can fail while a plan is being selected. A defensible change loop needs both a measured acceptance gate and a documented fallback, and they are not substitutes for each other.

**The snippet is the limit of what is known here.** This page can tell you the paper exists, what boundary it addresses, and that 26ai documents a corresponding feature. It cannot tell you which errors are mitigated, what the strategies are in detail, or what eligibility applies to your release. If a decision depends on those, the paper's text is required and the snippet is not enough.

## 5. Advanced / gated: the vendor brief lineage

Five vendor-authored briefs belong in the same evidence set, and they are where version drift does its damage. Each is good for one thing, and none is current by default. **The gate on this section is a release check:** every row describes a version, and a version is exactly what goes stale silently.

| Brief                              | Good for                                                                 | Superseded by                                                       | Release scope                                   |
| ---------------------------------- | ------------------------------------------------------------------------ | ------------------------------------------------------------------- | ----------------------------------------------- |
| S10 Optimizer with 18c, Feb 2018   | The adaptive query optimization definition and the 18c feature inventory | Later releases add features it does not describe                    | 18c, February 2018                              |
| S08 Statistics best practices, 19c | Current vendor policy for gathering statistics                           | None recorded; it supersedes the 2012 edition, whose URL it records | 19c                                             |
| S09 Statistics concepts, 19c       | Statistics concepts, including NDV (number of distinct values) synopses  | None recorded. Pair with S08 for policy, not for concepts           | 19c                                             |
| S12 SQL Plan Management, 19c       | The verify-before-commit policy in the vendor's words                    | None recorded                                                       | 19c; foreground verification is 26ai (S11, S02) |
| S14 SQL Performance Analyzer, 2007 | The original definition of the SPA concept                               | None recorded; the concept persists                                 | 2007; it cannot describe current 19c behavior   |

Three habits come out of that table, and they are the transferable part.

- **Prefer the current edition and keep the old one as a warning.** The 2012 statistics edition is superseded by S08. Retain its link only to recognize a stale script, exactly as the [version drift page](/07-appendix-sources/02-version-drift-survival/) prescribes.
- **A vendor document is scoped to its release.** S10 is an 18c document. Reading it as 19c or 26ai guidance is a category error, not a shortcut.
- **A concept can outlive its document.** S14 defines what SPA is for. It is not evidence of what SPA does on your release; that belongs to the versioned package and guide records.

## 6. Practice: what each source licenses you to claim

Use this table before you write the sentence. The last column is the one people skip and the one that saves the review.

| Source | Status           | What it licenses you to claim                          | What it does not license                                      |
| ------ | ---------------- | ------------------------------------------------------ | ------------------------------------------------------------- |
| S11    | read firsthand   | Verify-before-commit is the vendor's own design        | Any number for your workload, or availability on your release |
| S11    | read firsthand   | 19c Auto SPM and 26ai Real-Time SPM are different      | That your regression will actually be caught                  |
| S16    | snippet-verified | Automatic indexing proposes, verifies, deploys, drops  | That it will help your access path, or by how much            |
| S16    | snippet-verified | ~15% and ~60% are abstract-level vendor figures        | Any expected outcome, target, or forecast for a database      |
| S70    | snippet-verified | Error mitigation during compilation is a real boundary | Which errors are covered, and under what eligibility          |
| S12    | snippet-verified | The vendor's verify-before-commit policy, in its words | Behavior on a release later than 19c                          |
| S08    | snippet-verified | The current vendor statistics policy for 19c           | That following the policy fixes a specific wrong estimate     |
| S09    | snippet-verified | Why statistics choices change cost estimates           | A measurement on your tables                                  |
| S10    | snippet-verified | What adaptive query optimization meant in 18c          | Current release behavior, or a universal win                  |
| S14    | snippet-verified | What SQL Performance Analyzer was introduced to do     | Current SPA behavior, which needs versioned sources           |

## Artifact

An evidence ladder for any claim you are about to publish. Fill the second column from the class legend plus read status above, and the third from the Source column of the claim table, except for the two records that table does not list: S02, defined in section 2, and S46, defined in section 4. The last column is where the claim stops being yours.

| Claim you want to publish                          | Strongest class available                            | Backed by                                  | Still missing                                    |
| -------------------------------------------------- | ---------------------------------------------------- | ------------------------------------------ | ------------------------------------------------ |
| Plan management verifies before it commits         | A2 brief, snippet-verified, plus B1 read firsthand   | S12, S11                                   | A measurement on your workload                   |
| Foreground plan verification exists in 26ai        | B1 read firsthand; A1 TOC-verified for release scope | S11 for behavior, S02 for release          | Confirmation on your installed release           |
| Automatic indexing has a propose/verify/drop cycle | B1 snippet-verified                                  | S16                                        | The benchmark detail behind the abstract figures |
| Automatic indexing improves a given workload       | Nothing for your database                            | S16 abstract only                          | Your own measurement                             |
| Automatic error mitigation exists in 26ai          | A1 snippet-verified                                  | S46, with S70 as paper context             | Eligibility scope on your release                |
| Background verification is too slow for me         | Nothing                                              | S11 argues it for constrained environments | A timing measurement on your instance            |

Every status on this page describes how a source was read, not what a database did.

Source IDs and technique IDs resolve in [Appendix Sources](/07-appendix-sources/).

**Decision:** cite the Oracle source that owns the mechanism, keep its status label, and let the measurement on your instance be the only thing that claims a result.

**Next required page:** [What Doesn't Transfer to Oracle](/02-papers-behind-recipes/03-what-doesnt-transfer-to-oracle/).
