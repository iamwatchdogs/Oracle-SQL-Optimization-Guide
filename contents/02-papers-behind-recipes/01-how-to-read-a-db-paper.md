---
title: How to Read a DB Paper
description: A six-question pass, a so-what test, and a one-page read note that keeps a result from becoming your result.
order: 21
draft: false
---

You are reading for the shape of the claim, not for the headline number. The number is the part that travels worst, and it is the part most likely to end up in a design document with your name on it.

> **Track:** Core, then Practice, then Advanced / gated
>
> **Prerequisites:** None. Keep the source open while you read this page.
>
> **Evidence status:** The worked read on this page uses [S11](https://arxiv.org/html/2608.27758v1), recorded on the [branch index](/02-papers-behind-recipes/) as the only source used in this chapter set that was read firsthand. The scoping example uses [S16](https://doi.org/10.14778/3750601.3750616), which is snippet-verified at abstract level. Both blocks on this page are `ILLUSTRATIVE` or `PLACEHOLDER`. **No live Oracle database was available**, so no result here is a measurement.
>
> **Next required page:** [Oracle's Own Papers](/02-papers-behind-recipes/02-oracles-own-papers/).

## How this page is banded

| Band                 | Sections |
| -------------------- | -------- |
| **Core**             | 1, 2, 3  |
| **Practice**         | 4        |
| **Recovery**         | none     |
| **Advanced / gated** | 5        |

- **Core (1, 2, 3):** read once and reuse. What a paper may claim, the six-question pass, and the so-what test that decides whether the claim reaches your database.
- **Practice (4):** fill the read note against a real source. The worked read on this page is the model; bring your own paper next.
- **Recovery (none):** nothing here is a rollback. A read note is a correction to a sentence, not a change to a system.
- **Advanced / gated (5):** gated on having the source in front of you. The exercise is only sound if you can check the sentence against the text that produced it.

## 1. What a paper is allowed to claim

A paper makes three separable moves, and only the third produces a number.

- **It names a problem.** Usually accurately, and usually in terms the authors' system already had.
- **It builds something.** A method, a prototype, a feature, a measurement harness.
- **It measures.** On a workload, at a scale, on an engine, on a release, on a date.

The first two travel reasonably well as design. The third is welded to its context, because context is what made the number possible. Venue, volume, and page range describe the record. They say nothing about which database was exercised.

So the first thing you establish, before the abstract and before the results table, is **which engine the paper actually ran on**. If Oracle is absent from the methods, the measurement cannot become an Oracle claim no matter how good the paper is.

## 2. The six-question pass

> **"What is the one claim that survives?"**

Six questions, in this order, about twenty minutes. The order matters: the last question is the one most readers skip, and it is the only one that protects you. The `Where to look` column is the reading order: abstract, then methods, then evaluation setup, then results, then limitations.

| #   | Question                                  | Where to look              | Write down                                        | A bad answer looks like           |
| --- | ----------------------------------------- | -------------------------- | ------------------------------------------------- | --------------------------------- |
| 1   | What problem did they **name**?           | Abstract, introduction     | Their sentence, in their words                    | A restatement of your own problem |
| 2   | What was the **baseline**?                | Abstract, then methods     | The system or method they had to beat             | "No baseline"                     |
| 3   | What **workload and data size**?          | Evaluation setup           | Engine, query mix, scale, and how many runs       | "A realistic workload"            |
| 4   | What was **measured** versus **assumed**? | Results and footnotes      | The instrument, and the number of samples         | Quoting an estimate as a result   |
| 5   | What is the **one claim that survives**?  | Abstract, then limitations | One sentence, scoped                              | Two or three claims, unscoped     |
| 6   | What must be **true on my database**?     | Limitations, release notes | Release, engine, entitlement, and the measurement | "Should work the same"            |

Two disciplines make the pass reliable.

**Two blanks, not one.** `not recorded in the source` means the paper does not state it; that is a property of the paper and you are done. `not extracted in this pass` means the paper may well state it and you did not capture it; that is a debt you owe, and it is discharged by going back to the source. A blank filled with a guess is worse than either, because the guess will be quoted later without the blank.

**Question 4 separates the two halves of every result.** A measured number came out of an instrument. An assumed number came out of the authors' model, or out of a cost estimate, or out of a prior paper. Both appear in results sections, and the prose rarely distinguishes them.

## 3. The so-what test for my database

After the six questions, one gate decides whether the claim reaches your work: **so what for my database?**

The claim is usable only if you can name the measurement that would falsify it **on your instance, at your scale, on your release**. If you cannot name that measurement, you do not have a finding; you have an interesting sentence and an untested assumption behind it.

Section 4 of [What Doesn't Transfer to Oracle](/02-papers-behind-recipes/03-what-doesnt-transfer-to-oracle/) turns that gate into a four-move procedure and names the target worksheet and the noise-floor policy it leans on. Do not skip it, because the transfer step is where most borrowed results break.

## 4. Practice: one Oracle paper, all six questions

This is the worked read. Every line is restated from the ledger record for [S11](https://arxiv.org/html/2608.27758v1), marked with one of the two blanks from section 2, or written from the gates in sections 3 and 5. "Auto STS" is the automatic SQL Tuning Set, a workload container this guide defines under [working terms](/00-preface/01-why-evidence-grades/). The note names two releases: **19c**, this guide's primary release, and **Oracle AI Database 26ai**, where plan verification happens in the foreground. The blank in question 3 is a debt, not a fact about the paper.

**ILLUSTRATIVE — a filled read note. Prose is a restatement of the ledger record for [S11](https://arxiv.org/html/2608.27758v1), not a measurement and not a new reading of the paper.**

```text
Source ID and title:
             S11 - Chakkappen, Ziauddin, Su, Kunjibettu, Bayliss.
             "Real-time SQL Plan Management in Oracle."
Venue, year, DOI or URL:
             PVLDB 19(12):4169–4181, 2026. DOI 10.14778/3827998.3828024
Status:      read firsthand

1. Problem named
   Background plan verification is documented as too slow for cloud
   systems and constrained resources, which is what motivated
   Real-Time SPM.

2. Baseline
   Background verification: 12c Auto SPM Evolve Advisor, then 19c
   Auto SPM using Auto STS with a regression threshold on plan metrics.

3. Workload and data size
   not extracted in this pass. The paper reports deployment in Oracle
   production; the workload profile was not captured here. Debt: read the
   paper's evaluation setup and replace this line, or state that the
   paper does not record it.

4. Measured versus assumed
   Measured and reported: production deployment. Recorded as design,
   not as a benchmark: the architecture of 19c Auto SPM and 26ai
   Real-Time SPM.
   not extracted in this pass: instrument, sample count, threshold
   values. Debt: take them from the evaluation section, or record
   that the paper does not state them.

5. The one claim that survives
   Verify before you commit, and keep the previously accepted plan
   available to reinstate. Background verification is 19c; foreground
   verification of a new plan during user execution is 26ai.

6. What must be true on my database
   - Release check: foreground verification is 26ai. 19c gets
     background Auto SPM. Confirm on the installed release.
   - The paper's motivation is a claim about constrained environments.
     Whether your environment is one of them is a measurement, not
     an assumption.
   - A regression has to be observable for the gate to fire. Name the
     comparison and the window first.

7. The measurement that would falsify it
   On your instance, does the installed release expose foreground
   plan verification? If you claim background verification is too
   slow, a timing measurement on your own database says so.

8. The one sentence I am allowed to publish
   Oracle engineers document a verify-before-commit design for plan
   management, with background verification from 19c and foreground
   verification in Oracle AI Database 26ai.
```

What that read licenses you to say, and what it does not.

**The note licenses two statements, and field 8 holds the one you publish.** Field 8 reads: Oracle engineers document a verify-before-commit design for plan management, with background verification from 19c and foreground verification in Oracle AI Database 26ai. Conflating those releases is how a gate gets missed. The second statement stays outside the field: background verification can be too slow under constrained resources, which is the argument for foreground checks.

**It licenses nothing else.** It does not say Real-Time SPM exists on your release. It carries no number you may quote about your workload, your latency, or your regression rate. And it does not promise that a gate built on the same idea will catch your regression; the comparison, the window, and the workload are yours to define.

Where the mechanism itself lives is [Oracle's Own Papers](/02-papers-behind-recipes/02-oracles-own-papers/). This page tells you only how you knew it from the paper.

## 5. Advanced / gated: reading an abstract honestly

**The gate:** run this only with the source in front of you, and only if you will record that you did not run the experiment. An abstract read from a search result is a third-hand quote, and you cannot claim snippet-verified from a search-result snippet: that label means the snippet came from the source record, and a search hit is not the record.

An abstract is the authors' compressed claim, written before your workload existed. Three rules keep it honest.

1. **Carry the owner and the population.** A number is meaningless without both. Whose measurement is it, on what, how big?
2. **Never convert a report into a target.** "The abstract reports X" and "you should expect X" are different sentences, and only the first is evidence.
3. **Keep the unresolved part in the sentence.** When a result has a boundary, the boundary is part of the result, not a caveat appended later.

The worked example is [S16](https://doi.org/10.14778/3750601.3750616), snippet-verified at abstract level: about 15% performance improvement and up to 60% space-reclamation potential, reported on customer workloads by a vendor-authored paper.

**The scoped sentence, which you may publish:**

> The abstract of an Oracle-authored PVLDB paper reports about 15% performance improvement and up to 60% space-reclamation potential for automatic indexing on customer workloads.

**The sentences you may not publish:** that automatic indexing gives you 15%, that 15% is a normal expectation, or that the figure predicts anything about a database you have not measured. The ledger records the number as an abstract-level figure from a vendor-authored benchmark. It is an existence proof that the feature moves workloads, not a promise about yours.

The same rule applies to a number with a visible remainder. [S49](https://github.com/SJTU-IPADS/SQLSolver), snippet-verified, proves 346 of 359 equivalent query pairs drawn from Calcite and Spark SQL rewrite rules. The 359 is the population and the 13 are part of the finding. Quoting only the 346 turns a scoped result into a clean one it never was.

## Artifact

One read note per paper, one page, filled in the same order every time. Copy it, and treat an unfilled field as a finding about the source, or as a gap in your extraction that you owe the reader by fixing. `PLACEHOLDER` means a fill-in template: fill it in, then use it; the [block taxonomy in the V0 lab](/00-preface/02-how-to-prove-a-win/) owns the full label contract.

**PLACEHOLDER — the read-note template. One note per source. Fill it in, then use it.**

```text
Source ID and title:
Venue, year, DOI or URL:
Status: read firsthand / snippet-verified / metadata-verified / TOC-verified / preprint

1. Problem named:
2. Baseline:
3. Workload and data size:     (not recorded in the source / not extracted in this pass)
4. Measured vs assumed:
5. The one claim that survives:
6. What must be true on my database:
7. The measurement that would falsify it:
8. The one sentence I am allowed to publish:
```

The template has eight fields and the pass has six questions because fields 7 and 8 are not questions: field 7 comes from the so-what gate in section 3, and field 8 from the licensing rules in section 4, or section 5's scoped-sentence rules when the claim rests on an abstract. Fill 1 to 6 first, then the other two.

Every filled example on this page is `ILLUSTRATIVE`, and every number in it is quoted from the source ledger with its status attached.

**Decision:** a paper licenses you to test a hypothesis, not to state a result. Six questions, then the one measurement that would prove you wrong.
