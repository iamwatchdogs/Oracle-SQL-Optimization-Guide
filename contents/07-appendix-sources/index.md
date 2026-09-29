---
title: Appendix Sources - How Every Claim Is Checked
description: 'The citation system behind this book: what an S-ID promises, what a source class may support, what the ledger cannot tell you, and where the boundaries are.'
order: 70
draft: false
---

A citation is a promise about how well something was checked. The promise is only worth something if a reader can audit it, and that is what the ledger is for: one dated record per source, with its class, its release, and what it does not establish.

So the question behind every `[S##]` in this book is not "does this link open?" It is: **which source, which class, which version, and which snapshot support this exact sentence?** If any of the four is missing and you cannot supply it elsewhere, the sentence is a lead, not a finding.

> **Track:** Core (1–6) · Practice (7) · Recovery (none) · Advanced / gated (none)
>
> **Prerequisites:** None. You need no database and no privileges to read this chapter set.
>
> **Evidence status:** This chapter set is documentation about evidence, so its own content is the evidence classes it describes: A1 versioned Oracle documentation, A2 Oracle briefs, B1 papers, B2 reproducibility reports, C1 tool documentation, C2 repositories, and D secondary sources. All online records in the ledger carry a single access date of **2026-09-22 UTC**. **No live Oracle database was available**, and no source was re-read while writing these pages, so every class named here is a description of the ledger rather than a fresh verification of it.
>
> **Next required page:** [How Citations Work](/07-appendix-sources/01-how-citations-work/).

## How this page is banded

| Band                 | Sections         |
| -------------------- | ---------------- |
| **Core**             | 1, 2, 3, 4, 5, 6 |
| **Practice**         | 7                |
| **Recovery**         | none             |
| **Advanced / gated** | none             |

- **Core (1, 2, 3, 4, 5, 6):** the promise, the three pages, the ledger's boundary, the class weights, searching for yourself, and the narrowing records. Read them in order once.
- **Practice (7):** the citation pattern. Apply it to a claim you are about to publish, which is the only situation in which a citation system is actually exercised.
- **Recovery (none):** nothing in this chapter set changes a database, so nothing here has an undo. A retracted claim is corrected by publishing the correction, not by rolling anything back.
- **Advanced / gated (none):** nothing here is gated, because deciding what a source licenses you to say never needs a database. The gates in this book live where a privilege, a release, or an entitlement does.

## 1. A citation is a promise

Three promises ride on a single `[S##]`, and a reader is entitled to all three.

**That someone looked.** Not skimmed, not heard about. The papers chapter set owns the status vocabulary for exactly this, including the label that means the source was retrieved and used directly and the label that means only a snippet was confirmed. The [status label table](/02-papers-behind-recipes/) is the vocabulary; this chapter does not restate it.

**That the source supports this sentence and not the neighbouring one.** A source that establishes a mechanism does not establish a number, and a number from one workload does not establish a number from yours. A citation that is technically present but attached to the wrong clause transfers borrowed confidence without establishing anything, which is worse than leaving the sentence uncited.

**That the boundary is stated.** Release, dialect, edition, entitlement, archive state, or whatever the claim actually depends on. A citation without a boundary reads like a conclusion and behaves like a search result.

## 2. The child pages

Three pages, each with one job.

1. **[How Citations Work](/07-appendix-sources/01-how-citations-work/)** is the mechanics: reading an inline ID, weighting a class, resolving a T-number, and marking a release-sensitive name.
2. **[Version Drift Survival](/07-appendix-sources/02-version-drift-survival/)** is the dated half: the release map, superseded documents, and the rule that a repository fact belongs to a date.

If you only need to know whether one citation is sound, take [How Citations Work](/07-appendix-sources/01-how-citations-work/). If the sentence is about a later release, or about a repository's current state, you need [Version Drift Survival](/07-appendix-sources/02-version-drift-survival/) as well.

## 3. The ledger and its boundary

The corpus behind this book is numbered **S01 to S93**, and it is a numbered range rather than a contiguous one. **Eighty-two** of those identifiers are cited by a claim somewhere in these pages, and each cited record carries a class, a release where one applies, a link where one applies, and the access date. The remaining eleven numbers are named in section 3 rather than left for a reader to discover by counting, because a declared range that silently implies 93 live records is the kind of thing a citation system should not do.

The ledger is maintained alongside the book as a working record. It is not published as a page here, and this chapter set does not pretend to reproduce it. What a page does instead is carry the S-ID **next to a direct link to the source** whenever the claim needs the evidence in front of the reader.

Resolve an ID by reading the link on the page, or the link in the prose under the table it appears in. Where a page cites an ID with no link at all, the page's own **Evidence status** block names the class and the date, and the table below is the resolution path for the rest.

Eleven numbers inside the declared range support no claim in these pages, and they appear nowhere else in the book. Eight of them — **S22, S26, S31, S47, S71, S72, S89, S91** — are reserved by the ledger and used by no page at all. The other three, **S23, S30, and S32**, are named in the last row of the table below and are the only place they appear. The range is not narrowed to hide this, because the highest identifier in use, S93, is cited repeatedly, so no narrower range would be true; and renumbering is not an option, because it would break every citation that already points at a number. Naming the gap is the honest form of the declaration.

One record deliberately carries more than one project. **S67** covers both diagnostic collectors, SQLd360 and its successor SQLdb360, and the ledger holds a single row for them: [S67](https://github.com/mauropagano/sqld360) and [SQLdb360](https://github.com/sqldb360/sqldb360). Wherever a page names either project it prints both repositories, because the record resolves to two URLs rather than one.

Three things the ledger can tell you, and three it cannot.

**It can tell you** what class a record is, which release it documents, when it was read, whether it was read directly or only at snippet level, and for a repository what the licence and maintenance fields returned on the access date.

**It cannot tell you** whether a source is still reachable, whether a repository has changed since, whether a claim is true on your database, or whether your release behaves the way the source describes. It is a record of checking, not a guarantee that the world has not moved.

The composition is approximate, and it is approximate on purpose. A record can carry more than one class, and the same source can be the mechanism and the corroboration in two different sentences. The count is metadata, not evidence, and it should never be quoted as a measure of anything.

### The records that carry no URL

Seventeen records carry no link, so an ID from that group is cited bare. Fourteen of them are cited by a claim somewhere in these pages; the three in the last row are not cited by anything, and are listed so the count reconciles. This table is what makes a bare ID resolvable. It is grouped by the reason there is no link, because the reasons are not the same and a reader debugging a bare ID needs the reason, not the count.

| Why there is no link                                             | Records                      | What the record is                                                                                                                                                                                                                                                                                                     |
| ---------------------------------------------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guide chapter, TOC-verified, chapter anchor not recorded         | S13, S20, S27, S28, S29, S33 | Real Application Testing guide for Database Replay; four SQL Tuning Guide chapters — _Improving Real-World Performance Through Cursor Sharing_, _Analyzing Statistics Using Optimizer Statistics Advisor_, _Gathering Optimizer Statistics_, _Controlling the Use of Optimizer Statistics_ — and the SQL Trace chapter |
| Oracle technical brief, A2                                       | S83                          | The brief documenting that an `EXPLAIN PLAN` output can differ from the executed plan                                                                                                                                                                                                                                  |
| Pre-12c product page, retained as a flagged mechanism reference  | S93                          | A Statspack page from before 12c. Statspack is the pack-free historical lane and no versioned public reference was located, so the record is kept and explicitly settles nothing about your release                                                                                                                    |
| Commercial tool documentation, C1                                | S84, S85, S86                | Quest SQL Optimizer, Method R `mrprof`, and SonarQube. Vendor documentation records what a product claims to do, which is why each page marks these catalogued rather than endorsed                                                                                                                                    |
| Published paper identified by venue and DOI rather than by a URL | S80                          | QueryBooster, _PVLDB_ 16:2911 (2023), DOI `10.14778/3611479.3611497`. Oracle support was not verified, so it is a candidate                                                                                                                                                                                            |
| Practitioner reports, class D                                    | S92                          | Parallel-execution `ALLSTATS LAST` cautions, carried as a rule to verify on your own release and not as a documented guarantee                                                                                                                                                                                         |
| Oracle Optimizer blog post, corroboration only                   | S88                          | The optimizer team's write-up of SQL profiles versus SQL plan baselines. The claim it corroborates is carried by the A1 plan-management guide, not by this record                                                                                                                                                      |
| In the ledger, cited by no claim in these pages                  | S23, S30, S32                | Named from the ledger's blog and guide-contents lists — S23 is an Oracle Optimizer blog post on automatic SQL plan management. Nothing in this book rests on any of the three                                                                                                                                          |

Three things to hold about this table. S27, S29, and S33 are rows here and not somewhere else: none of the three carries a URL anywhere in the corpus, so a bare S27 or S29 or S33 resolves through this table and through the page's own Evidence status block, and through nothing else. S93 is a row here too, for the same reason — it carries no URL at all, which is why its pre-12c origin is recorded in the row instead of being something a reader has to discover by following a stale link. And the release that supplied any anchor is not always the release you run, which is why a page citing a TOC-verified chapter still tells you to check that chapter against your own release's guide.

## 4. Source classes keep weight honest

The class is a weight, not a medal. The full legend, with what each class may support, is the [preface's evidence chapter](/00-preface/01-why-evidence-grades/), and this page does not restate it.

The short version is one rule: **a class tells you what kind of claim the source can carry, and nothing else.** An A1 record can carry a release-specific behavior statement and cannot carry a local speedup. A B1 paper can carry a mechanism and cannot carry a result on your instance. A C2 repository can carry a licence and a maintenance snapshot and cannot carry correctness. A D source can point at an A1 record and cannot carry a behavior claim alone.

Three failure modes this rule prevents.

**Upgrading by association.** A preprint is not a proceedings paper, a metadata record is not a read paper, and an S-number is not peer review. The [papers chapter set](/02-papers-behind-recipes/) keeps those statuses attached to the sentences they support.

**Refreshing a class.** Two useful sources are not automatically a stronger claim if the second one repeats the first. Independence is what a class list cannot tell you.

**Bolding a boundary.** A class badge at the end of a sentence can make an unverified boundary disappear from a reader's memory. Write the boundary in the sentence.

## 5. Searching Oracle's documentation yourself

You do not need this book's ledger to check a claim, and you should not have to. Oracle publishes its documentation under one host with the release in the path, and the path is the version.

**Search by feature plus release, and restrict to the documentation host.** A query that names 19c and lands on `docs.oracle.com` gets you the 19c page. The same query without a release will often return a newer guide, and that guide will describe behavior your database does not have.

**Read the release from the path, not from the prose.** A URL containing `/19/` is the 19c reference for that document; `/26/` is Oracle AI Database 26ai. When a page's own title bar or copyright block names a different edition, trust the path for the release and the block for the edition.

**Tell a versioned page from a current one.** Versioned guides carry a document number and a month, such as a letter-numbered guide with a date. A current page that merely says "latest" is not a release contract, and neither is a blog post about the feature, however authoritative it reads.

**A search hit is not a read.** The result title and snippet confirm that a page exists and roughly what it covers. Only the page's text licenses a claim about what it says, which is why the [papers chapter set](/02-papers-behind-recipes/) keeps a separate status label for a snippet. Everything in this book's ledger was retrieved on **2026-09-22 UTC**, and that date is the boundary of every fact it records.

## 6. The records that narrow a claim

Five records in this ledger do not merely support a sentence; they **narrow** it, and a citation that drops the narrowing is wrong even though the source is right. [How Citations Work](/07-appendix-sources/01-how-citations-work/) lists all five with what each settles and what it does not.

The one point that belongs here is what to do when the narrowing is an absence. **S78** is an official published document whose text was not extracted in this pass, so it licenses the pointer and **no date at all**. The correct sentence is "the policy is published here and this pass did not extract it". Supplying a date from a secondary source instead is among the worst moves a citation system can make, because the number then looks sourced and nobody re-checks it.

## 7. The citation pattern

The pattern is short enough to apply without thinking, which is the point.

**For a repository claim**, record the source ID, the licence as read from the file, the snapshot date, the last-push date, and the archive state. Five fields, and three of them are dated facts.

**For an Oracle claim**, record the source ID, the release, and the specific package reference or guide section. If the sentence needs a feature that is not in that release, either change the release or mark the claim.

**For a research claim**, record whether the venue is confirmed, whether the paper is a preprint, whether the text was read directly, and whether the finding is a measured number or a stated design.

**For a dated fact of any kind**, put the date next to it. This book's rule is that a repository's state, a support window, and a price are all facts about a moment.

**PLACEHOLDER — the citation record. One block per claim you are about to publish. Fill it in, then publish.**

```text
claim:                 ____________________
source ID:             ____________________
class:                 ____________________
release or version:    ____________________
access or snapshot:    ____________________
what it does not settle: ____________________
```

If the last line is empty, you have collected a source rather than cited one. The [citations page](/07-appendix-sources/01-how-citations-work/) owns the check to run before you ship the sentence.

## Artifact

A citation record per published claim, carrying the claim, the source ID, the class, the release or version, the access or snapshot date, and the boundary the source does not cross. Keep it beside the sentence it supports, so a later reader can audit the claim without asking you.

Behind it, this chapter set produces its own artifacts: the resolved-ID and class-reading habit from [How Citations Work](/07-appendix-sources/01-how-citations-work/), and the release and snapshot record from [Version Drift Survival](/07-appendix-sources/02-version-drift-survival/). The records above describe evidence; none of them is Oracle execution output.

Source IDs and technique IDs resolve in [Appendix Sources](/07-appendix-sources/).

**Decision:** a citation is a promise with a boundary attached. Write the ID, the class, the release, the date, and what the source does not settle, or do not publish the sentence.
