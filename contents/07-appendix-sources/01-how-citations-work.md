---
title: How Citations Work in This Book
description: 'Reading an S-ID, weighting a source class, resolving a T-number, and marking a release-sensitive name before the claim ships.'
order: 71
draft: false
---

An S-number is an index into evidence. It is not evidence by itself, and the distance between those two statements is where most citation systems fail.

A citation that does real work tells you four things: what was checked, what class it belongs to, when it was read, and what boundary remains. Miss any one of them and a reader is trusting the sentence on your authority rather than on the source.

> **Track:** Core (1–4) · Practice (5) · Recovery (none) · Advanced / gated (6)
>
> **Prerequisites:** None. The [status label vocabulary](/02-papers-behind-recipes/) and the [class legend](/00-preface/01-why-evidence-grades/) are the two pages this one defers to.
>
> **Evidence status:** This page describes the citation system, so its own content is the evidence classes it names: A1 versioned Oracle documentation, A2 Oracle briefs, B1 papers, B2 reproducibility reports, C1 tool documentation, C2 repositories, and D secondary sources. Ledger records carry one access date, **2026-09-22 UTC**. **No live Oracle database was available**, and no source was re-read here, so the worked citation is `ILLUSTRATIVE` and every claim about a record describes it rather than re-reading it.
>
> **Next required page:** [Version Drift Survival](/07-appendix-sources/02-version-drift-survival/).

## How this page is banded

| Band                 | Sections   |
| -------------------- | ---------- |
| **Core**             | 1, 2, 3, 4 |
| **Practice**         | 5          |
| **Recovery**         | none       |
| **Advanced / gated** | 6          |

- **Core (1, 2, 3, 4):** how to read an ID, why a class is a weight, where a T-ID is explained, and which boundaries change a sentence. Read once.
- **Practice (5):** the check to run on a citation you are about to publish. It takes a sentence and six questions.
- **Recovery (none):** nothing here undoes a claim. A wrong citation is corrected by fixing the sentence and saying so, not by rolling anything back.
- **Advanced / gated (6):** read before you put a package name in a runbook. The mechanism is documented for a named release, and the release is part of the claim.

## 1. Inline ID, dated ledger

Write `[S##]` in the body when a sentence needs a source, and put a direct link to that source next to the ID whenever the reader needs the evidence in front of them. The full record lives in the maintained ledger; the published page carries the ID, the link, and the date. Where the ledger record carries no URL, the ID is cited bare rather than given an invented link.

That split is deliberate. A short ID keeps prose readable, and the link keeps the claim inspectable. What a citation must always carry is a class, a date, and a pointer to the record; a link is the most direct pointer, and the [appendix index](/07-appendix-sources/) lists the records that have none.

**ILLUSTRATIVE — a citation with its four parts labelled. The shape, not a source claim.**

```text
[S60](https://github.com/tobymao/sqlglot)
 ^ ID    ^ direct link to the record's primary source

class:               C2, a maintained repository record
scope:               the repository, not an Oracle release
date:                snapshot read 2026-09-22 UTC
settles:             the licence and maintenance fields on that date
does not settle:     whether the tool is correct for your release
```

The fourth line is the one people skip. A source has a **ceiling** as well as a floor, and the ceiling is what stops a citation from quietly widening as it travels. Write it when you first cite the record, because nobody remembers it three chapters later.

Two blanks, and they are not the same. **`not recorded in the source`** is a property of the source and you are finished. **`not extracted`** is a debt you owe the reader, discharged by going back to the record. A blank filled with a guess is worse than either, because the guess will be quoted later without the blank.

## 2. Classes are weights, not badges

The full legend is the [preface's evidence chapter](/00-preface/01-why-evidence-grades/). What belongs here is the reason a class is a **weight**: it tells you what kind of sentence the source can carry.

A class does not upgrade over time, does not stack, and does not transfer. Two A1 records about the same feature are not stronger than one, because independence is a property of the sources and not of the class. A D source that points at an A1 record may still be cited, for what it is: a lead to the record. Citing it for the behavior claim itself is the bad citation, because the A1 record is what carries that, and the D source cannot.

This is why the class list has separate entries for deterministic tool documentation and maintained repositories, and separate entries for a paper and a reproducibility report. The difference is not prestige. It is **what each one is a record of**: a documented interface, a codebase, a claim, or an independent attempt at the claim.

Two records in this book are easy to overstate, and they are labeled here for that reason. A preprint whose venue was not confirmed as proceedings must not be cited in a way that implies peer review: that is [S68](https://arxiv.org/abs/2603.04169), whose ledger row records the posting and an unconfirmed venue listing. A published survey is a different case and is not a metadata-only record: [S69](https://ieeexplore.ieee.org/iel8/11629178/11629165/11629242.pdf) is a real IEEE publication.
This book cites it for orientation only, because its ledger row carries no extracted finding, so no sentence here rests on a claim about its content.
The [papers chapter set](/02-papers-behind-recipes/) carries the full status vocabulary, including the label that means the text was read directly.

## 3. The T-number map

T-IDs come from the technique catalog, and the [catalog index](/01-proven-techniques/) owns the group boundaries and the two splits. This table is a **lookup table**: it says where a mechanism is explained, and whether that page prints its own T-ID in its text.

The last column matters more than it looks. Most technique pages teach the mechanism without printing the identifier, so a reader who searches the page text for `T-24` will not find it. Where the answer is no, this table is the resolution path.

| T-IDs                    | The page that explains the mechanism                                             | Prints T-IDs in its own text                                        |
| ------------------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| T-01 to T-07             | [Measure First](/01-proven-techniques/01-measure-first/)                         | No                                                                  |
| T-08                     | Measure First, and Why Evidence Grades                                           | Yes, on the evidence page                                           |
| T-09 to T-23             | [Stats Run the Show](/01-proven-techniques/02-stats-run-the-show/)               | No                                                                  |
| T-24 to T-33, T-67, T-68 | [Indexes and Layout](/01-proven-techniques/03-indexes-and-layout/)               | No                                                                  |
| T-34 to T-44             | [Let Oracle Rewrite](/01-proven-techniques/04-let-oracle-rewrite/)               | Yes, in each transformation section                                 |
| T-45 to T-53             | [Stabilize and Ship Safely](/01-proven-techniques/05-stabilize-and-ship-safely/) | No                                                                  |
| T-54                     | [Stabilize and Ship Safely](/01-proven-techniques/05-stabilize-and-ship-safely/) | No                                                                  |
| T-55                     | Not covered in the technique chapter set                                         | No                                                                  |
| T-56                     | [Before/After With SPA](/04-recipes/02-before-after-with-spa/)                   | No                                                                  |
| T-57                     | Stabilize and Ship Safely, and the ADDM reference in Measure First               | No                                                                  |
| T-58 to T-61             | Split; the catalog index names the page for each                                 | Yes, on the [OSS trio page](/06-oss-guide/02-parse-lint-test-trio/) |
| T-62 to T-66             | Safe DDL and CI Gates, and Accept or Rollback Gate                               | No                                                                  |

The cut at T-54 is deliberate, and it is the cut point the [gap list](/06-oss-guide/03-what-has-no-oss-replacement/) prints: that page lists `T-45 to T-53` and then `T-54 to T-57` as two rows, and this map resolves the second row into the four entries it actually covers. Where the two disagree, this table wins.

Four more pages print T-IDs without explaining a mechanism, so they are listed here as resolution paths rather than as mechanism homes:

| T-IDs it prints                                                      | The page                                                                     | What it prints them for                             |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------- | --------------------------------------------------- |
| Group boundaries across T-01 to T-68                                 | [Catalog index](/01-proven-techniques/)                                      | The catalog group ranges, and the two splits        |
| T-01 to T-08, T-09 to T-23, T-24 to T-33, T-45 to T-57, T-62 to T-68 | [What Has No OSS Replacement](/06-oss-guide/03-what-has-no-oss-replacement/) | Which mechanisms are built in and which need a tool |
| T-08                                                                 | [Why Evidence Grades](/00-preface/01-why-evidence-grades/)                   | The one `CONDITIONAL` entry, as the `PROVEN` count  |
| T-08                                                                 | [The root page](/)                                                           | The same catalog count, in one sentence             |

The split rows name their second page in the table and link it here: T-57's ADDM reference is on [Measure First](/01-proven-techniques/01-measure-first/), and T-62 to T-66 are shared by [Safe DDL and CI Gates](/04-recipes/04-safe-ddl-and-ci-gates/) and the [accept-or-rollback gate](/05-feedback-loop/03-accept-or-rollback-gate/).

**T-08 is the one identifier explained on two pages.** The collector mechanism is on [Measure First](/01-proven-techniques/01-measure-first/), and the `CONDITIONAL` catalog label that keeps it out of the proven set is on [Why Evidence Grades](/00-preface/01-why-evidence-grades/). That is why the measurement row above stops at T-07.

Three rows are not a single page: T-55 has no page in the technique chapter set, T-57 is split across two, and T-58 to T-61 are split by the catalog index, which names the page for each. Two more catalog facts belong with them. T-42 is a mechanism note inside the transformation group rather than a standalone intervention, and T-61 is release-gated, so its page carries a release boundary a T-ID cannot express.

The pages that print T-IDs in their own text today are: the [catalog index](/01-proven-techniques/), which carries the whole range; the book's [opening page](/), which names T-08 as the conditional entry; the [evidence page](/00-preface/01-why-evidence-grades/); the [rewrite page](/01-proven-techniques/04-let-oracle-rewrite/); the [OSS trio page](/06-oss-guide/02-parse-lint-test-trio/); and the [OSS gap list](/06-oss-guide/03-what-has-no-oss-replacement/), which names a range to say a technique has no verified implementation. On every other page, this table is the resolution path.

## 4. Boundaries that change the claim

Five records in this ledger do not merely support a sentence; they **narrow** it, and a citation that drops the narrowing is wrong even though the source is right.

- **Index compression** is documented for 19c together with its syntax and its restrictions, which is a space-and-write-cost feature and not a general query-speed promise. [S76](https://docs.oracle.com/en/database/oracle/oracle-database/19/admin/managing-indexes.html)
- **Parallel execution** is documented with both the conditions that help and the conditions under which resource pressure reverses the result, which is why a concurrency-realistic run belongs in the evidence. [S77](https://docs.oracle.com/en/database/oracle/oracle-database/19/vldbg/parallel-exec-intro.html)
- **The support policy** is an official published document whose text was not extracted in this pass, so it licenses the pointer and **no date at all**. [S78](https://www.oracle.com/assets/lifetime-support-technology-069183.pdf)
- **The SQL\*Plus guide** is a client boundary for 19c, so it may be cited when SQL\*Plus is part of the procedure and not as a general citation for SQL behavior. [S79](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqpug/)
- **QueryBooster** is published research about middleware-assisted rewriting, and its Oracle support was not verified, so the correct label is a candidate rather than a proven replacement. [S80], whose record carries no URL.

The pattern is the same in all five. The source is solid; what it licenses is narrower than what a reader will assume. Write the narrowing into the sentence rather than trusting a reader to infer it, because the sentence is what gets copied forward.

## 5. The citation check

Six questions, run on a sentence before you publish it. Any **no** is a fix, not a caveat.

- Does the ID resolve to a record, and does the page carry a link or a class for it?
- Is the class accurate for the kind of claim this sentence makes?
- Is the release, dialect, or version stated where the sentence depends on one?
- Is every dated number presented as a dated fact rather than a current one?
- Is a preprint, a metadata-only record, or an unconfirmed venue labeled as such?
- Does the cited source support **this** sentence, and is its ceiling written down too?

The last question is the one that survives contact with a review. It is easy to attach a real source to a sentence it does not quite support, and the fix is almost never a different source; it is a narrower sentence.

## 6. Release-sensitive names stay marked

A citation does not make a signature portable, and a later-release document does not become a 19c fact by being linked. The other pages in this book link here rather than restating the rule.

**Plan comparison is the case to get right.** The Oracle Database 19c `DBMS_XPLAN` package reference documents **two** comparison functions in the same chapter of the same reference: `COMPARE_PLANS`, which compares stored plan objects and returns a report as a CLOB, and `DIFF_PLAN`, which takes SQL text plus an outline and returns a task ID for a findings report. Both are documented on the 19c path, so a reader on 19c is not sent to a later release to find either name. [S05](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html)

What still has to be confirmed locally is the exact signature and the parameters available in your installation, because update levels and later releases extend the report options and parameter sets. **Later releases extending an API is not the same as later releases introducing it**, and treating the two as the same is how a 19c runbook ends up citing a function it cannot call.

Which of the two you need, and what each returns, is owned by [Measure First](/01-proven-techniques/01-measure-first/); the general release rule is owned by the [version drift page](/07-appendix-sources/02-version-drift-survival/).

**SQL Quarantine is the harder version of the same problem.** The mechanism is documented for 19c, but the API names in this book's ledger were not read firsthand from the installed package, so a name such as `CREATE_QUARANTINE_BY_SQL_ID` is a sketch to verify, not text to paste. Marking it as a sketch costs one line. Guessing it costs an incident. [S40](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLQ.html)

Three labels cover the whole space, and every release-sensitive name gets one: **documented for release X**, **mentioned in a later guide, introduction release unverified**, or **sketch, unverified on the installed release**. A feature appearing in a later guide is not automatically new in that release, and the label belongs next to the name rather than in a footnote.

## Artifact

A citation record per published claim: the claim, the source ID, the class, the release or version, the access or snapshot date, and the boundary the source does not cross. Section 1's shape is the model, and the [appendix index](/07-appendix-sources/) owns the same template as a fill-in block.

Behind it, the neighboring pages produce their own artifacts: the dated release and repository record from [Version Drift Survival](/07-appendix-sources/02-version-drift-survival/), and the evidence-class ladder from the [preface](/00-preface/01-why-evidence-grades/). Nothing on this page is Oracle execution output.

Source IDs and technique IDs resolve in [Appendix Sources](/07-appendix-sources/).

**Decision:** match the claim to the class, the release, and the date, and write down what the source does not settle. A citation with no ceiling is a promise you cannot keep.

**Next required page:** [Version Drift Survival](/07-appendix-sources/02-version-drift-survival/).
