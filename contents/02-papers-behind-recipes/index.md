---
title: Papers Behind the Recipes - Read the Claim, Not the Result
description: 'Which sources can license an Oracle claim, and the six-question pass that decides it.'
order: 20
draft: false
---

You do not need this branch to fix a slow query. You need it the moment a paper, a vendor blog, or a colleague's benchmark arrives and someone asks what it proves about **your** database.

This chapter set is where you learn to read a database paper without importing someone else's result as your own. The habit is small and it is the whole point: read for the shape of the claim, then go measure.

> **Track:** Core
>
> **Prerequisites:** None. You need no running database, no privileges, and no prior paper-reading practice.
>
> **Evidence status:** Every source in this chapter set is drawn from the guide's source ledger, and every citation carries a verification status. The only source used here that was read firsthand is [S11](https://arxiv.org/html/2608.27758v1); the rest are snippet-verified, metadata-verified, TOC-verified, or preprint. **No live Oracle database was available for any page in this chapter set**, so nothing here is a measurement.
>
> **Next required page:** [How to Read a DB Paper](/02-papers-behind-recipes/01-how-to-read-a-db-paper/).

## Skip this branch if

- **You only need to run the V0 lab.** Go back to the [techniques chapter set](/01-proven-techniques/) and the [V0 lab](/00-preface/02-how-to-prove-a-win/). Nothing in these three pages is a prerequisite for measuring a before and an after.
- **You are about to change production.** Read [Stabilize and Ship Safely](/01-proven-techniques/05-stabilize-and-ship-safely/) instead. This branch is about what you may claim, not about what you may do on Friday afternoon.
- **You are looking for a query to paste.** The recipes in [Recipes](/04-recipes/) are the copyable part of this guide. Papers are not recipes, and no block in this chapter set is meant to run against your database.

The people who should read this branch are the ones who will be asked to defend a decision: the engineer who proposed the change, the reviewer who has to sign off, and whoever writes the runbook afterward.

## Reading path

Read the three pages in order. Each one narrows the claim you are allowed to make.

1. **[How to Read a DB Paper](/02-papers-behind-recipes/01-how-to-read-a-db-paper/)** gives you a repeatable six-question pass and a read-note template. Read it once, then reuse the template.
2. **[Oracle's Own Papers](/02-papers-behind-recipes/02-oracles-own-papers/)** is the only page in this chapter set that holds primary evidence about Oracle behavior: three peer-reviewed papers written by Oracle engineers, plus the vendor brief lineage behind them.
3. **[What Doesn't Transfer to Oracle](/02-papers-behind-recipes/03-what-doesnt-transfer-to-oracle/)** sorts the rest of the literature by the engine it actually ran on, Calcite last as the one partial exception, and gives you the procedure for turning a foreign result into a hypothesis about your own database.

> **The honesty rule for this branch.** Every source here comes from this guide's source ledger, and every one of them carries a verification status you are expected to keep attached to the sentence it supports. **No paper in this guide is a substitute for a measurement on your own database.** A source can tell you that a mechanism exists and that it was deployed somewhere. It cannot tell you what happened on your instance, at your scale, under your release.

## Status labels

A citation without a status is a claim without a boundary. These are the labels used across the three pages, and each one caps how far the sentence may travel.

| Label                 | What it means                                                                 | What it can never support             |
| --------------------- | ----------------------------------------------------------------------------- | ------------------------------------- |
| **read firsthand**    | The text was retrieved and used directly.                                     | A result on your own database         |
| **snippet-verified**  | The claim comes from a snippet from the source record, or the ledger summary. | A claim about the paper's full method |
| **metadata-verified** | Title, venue, year, and link confirmed; no finding relied on.                 | Any claim about a finding             |
| **preprint**          | Posted, with the venue unconfirmed as proceedings.                            | A citation that implies peer review   |
| **TOC-verified**      | Named from a verified table of contents only.                                 | Behavioral detail inside the chapter  |

Two examples of the same rule. [S11](https://arxiv.org/html/2608.27758v1) is read firsthand, so this guide may describe its architecture. [S16](https://doi.org/10.14778/3750601.3750616) is snippet-verified at abstract level, so this guide may report the abstract's figures and must not report an experiment.

## How this page is banded

| Band                 | Sections                                                                     |
| -------------------- | ---------------------------------------------------------------------------- |
| **Core**             | Skip this branch if · Reading path · Status labels · Band map · Decision map |
| **Practice**         | none                                                                         |
| **Recovery**         | none                                                                         |
| **Advanced / gated** | none                                                                         |

- **Core (Skip this branch if, Reading path, Status labels, Band map, Decision map):** this index is navigation and vocabulary. Read it once, then work the three pages in order.
- **Practice (none):** nothing here is a ticket. Practice lives on pages 21, 22, and 23: apply the pass to a real source on page 21, check a real claim table on page 22, and convert a result into a hypothesis under the one-line rule on page 23. Filling the verdict column is not Practice; page 23 bands it Advanced / gated.
- **Recovery (none):** this chapter set has no rollback procedure. It produces reading notes and verdict tables, not changes to a database.
- **Advanced / gated (none):** nothing here is gated, and there is no single branch-wide gate either. Each page states its own: page 21 gates on having the source in front of you, page 22 on a release check, and page 23 on a named measurement before any verdict other than `NOT-TESTED`.

## Band map

Bands are real section ranges, not labels. The band table at the top of each page is authoritative; this table is the index-level summary.

| Page                                                                                  | Core | Practice | Recovery | Advanced / gated |
| ------------------------------------------------------------------------------------- | ---- | -------- | -------- | ---------------- |
| [How to Read a DB Paper](/02-papers-behind-recipes/01-how-to-read-a-db-paper/)        | 1–3  | 4        | none     | 5                |
| [Oracle's Own Papers](/02-papers-behind-recipes/02-oracles-own-papers/)               | 1–4  | 6        | none     | 5                |
| [What Doesn't Transfer](/02-papers-behind-recipes/03-what-doesnt-transfer-to-oracle/) | 1–3  | 4, 5     | none     | 6                |

No page in this branch has a Recovery band. None of them undoes a change; they decide what a source licenses you to say.

## Decision map

Use the row that matches your situation, not the row that matches the page number.

| What you are doing                                                  | What you need                                      | Go to                                                                                 |
| ------------------------------------------------------------------- | -------------------------------------------------- | ------------------------------------------------------------------------------------- |
| A paper claims a large speedup and you must answer for it           | The six questions, then one falsifying measurement | [How to Read a DB Paper](/02-papers-behind-recipes/01-how-to-read-a-db-paper/)        |
| You need to know what Oracle has actually built                     | Oracle-authored papers and the brief lineage       | [Oracle's Own Papers](/02-papers-behind-recipes/02-oracles-own-papers/)               |
| Someone proposes a rewrite guard or a tuning loop learned elsewhere | The engine list, then the conversion procedure     | [What Doesn't Transfer](/02-papers-behind-recipes/03-what-doesnt-transfer-to-oracle/) |
| You are about to quote a number in a design document                | The claim table, column 3                          | [Oracle's Own Papers](/02-papers-behind-recipes/02-oracles-own-papers/)               |
| You have a number and want to know if it applies to you             | The transfer table with a verdict column           | [What Doesn't Transfer](/02-papers-behind-recipes/03-what-doesnt-transfer-to-oracle/) |
| You are convinced, and the source is a preprint                     | The status label table, then the citation check    | [How Citations Work](/07-appendix-sources/01-how-citations-work/)                     |

## Artifact

A branch-entry record with three fields, copied once per source you are about to cite. `PLACEHOLDER` means a fill-in template: fill it in, then use it; the [block taxonomy in the V0 lab](/00-preface/02-how-to-prove-a-win/) owns the full label contract, and no label on this page marks anything that was executed.

**PLACEHOLDER — the branch-entry record. One block per source. Fill it in before you cite.**

```text
Source ID and title:     ____________________
Status you will keep:    ____________________
The one sentence it licenses: ____________________
If that line is empty, you have collected a source, not cited one.
```

Behind it, the three pages produce their own artifacts: a one-page read note from [How to Read a DB Paper](/02-papers-behind-recipes/01-how-to-read-a-db-paper/), an evidence ladder from [Oracle's Own Papers](/02-papers-behind-recipes/02-oracles-own-papers/), and a filled transfer table from [What Doesn't Transfer](/02-papers-behind-recipes/03-what-doesnt-transfer-to-oracle/).

Nothing in this chapter set is Oracle execution output, and no number here was measured by this project.

**Decision:** before you cite anything, write its ID, its status, and the one sentence it licenses you to publish. Keep the status attached to that sentence wherever it travels.
