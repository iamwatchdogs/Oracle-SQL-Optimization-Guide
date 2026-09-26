---
title: Proven Techniques - Choose by Symptom
description: 'A beginner decision map: symptom, evidence class, candidate class, test, and verdict.'
order: 4
draft: false
---

You do not need 68 techniques. You need one symptom and one page.

Start here instead of in the catalog. This page is a decision map, not a technique list. Five questions get you to the right page: what did you see, what evidence would prove it, which candidate class fits, how you will test one candidate, and what verdict you are allowed to claim.

> **Track:** Core (Start with a plain query, The decision loop, Symptom to group, The core order) · Practice (Reference: the technique catalog) · Recovery (none) · Advanced / gated (Boundaries worth keeping)
>
> **Prerequisites:** Basic SQL and the [environment and setup hub](/00-preface/).
>
> **Evidence status:** This page is a documented decision map. Its blocks are labeled `ILLUSTRATIVE`, `SYNTHETIC`, `SKETCH`, or `PLACEHOLDER`. **No live Oracle database was available**, so no output here is a measurement.
>
> **Next required page:** [Measure First](/01-proven-techniques/01-measure-first/).

## How this page is banded

| Band                 | Sections                                                                         |
| -------------------- | -------------------------------------------------------------------------------- |
| **Core**             | Start with a plain query · The decision loop · Symptom to group · The core order |
| **Practice**         | Reference: the technique catalog                                                 |
| **Recovery**         | none                                                                             |
| **Advanced / gated** | Boundaries worth keeping                                                         |

Every `##` section on this page is listed exactly once above. **Which entries are named, and which are not** is a `###` subsection of **Reference: the technique catalog**, so it inherits Practice rather than claiming a band of its own.

- **Core:** the toy query, the five-step loop, the symptom-to-group table, and the ordered page list. This page is a decision map, so the whole map is Core: a reader can act on the routing it produces without any further band check.
- **Practice (Reference: the technique catalog):** the 68-entry catalog and its named/unnamed split. Use it on a real ticket once your evidence names a cause; it is a lookup, not a starting point.
- **Recovery (none):** this page routes and describes; it changes nothing, so it undoes nothing. The rollback and cleanup rules live on the [V0 lab](/00-preface/02-how-to-prove-a-win/).
- **Advanced / gated (Boundaries worth keeping):** every bullet on this page depends on a release, edition, entitlement, or privilege check. Read it before you repeat one of these claims as advice.

## Start with a plain query

Here is the toy statement the whole book uses. It has one filter, one bind, and eleven physical rows in the lab fixture.

**SYNTHETIC — toy query on the V0 lab fixture. Not a measurement.** **Owner boundary:** the object owner is `<object-owner-schema>`; this unqualified form requires that schema to be the current schema.

```sql
SELECT employee_id,
       dept_id,
       salary
FROM employees
WHERE dept_id = :dept_id;
```

That is the entire problem statement for the next five pages. Four words appear everywhere in this chapter set — **plan**, **bind**, **full scan**, and **`plan_hash_value`**. Three of them are now defined on page one, in the page-one vocabulary table under **Two workload terms** on [the route](/), together with the cursor and identity vocabulary they lean on, so nothing in this chapter set is the first place you meet them.

**Full scan** is the exception, and it stays here: reading a table's rows without using an index to find them is taught in [Indexes and Layout](/01-proven-techniques/03-indexes-and-layout/). The plan, execution statistics, and identity terms it sits next to are taught in [Measure First](/01-proven-techniques/01-measure-first/), with the bind and identity fields in its target worksheet.

The plan Oracle picks for the query above can change when the row count, the predicate, the bind value, or the release changes. The fix is not decoration. It is a class of candidate that matches the symptom you actually observed.

## The decision loop

Run these five steps in order. The loop is the method; the technique is just the fourth step.

1. **Symptom.** Write what a user or an alert observed, with a time window. “The report is slow” is a starting sentence. “Department report exceeds 30 s at 09:00 UTC and finishes in 4 s at 11:00” is a target.
2. **Evidence class.** Decide what kind of artifact would prove the symptom: an executed plan, a wait profile, a statement identity, a before/after sample set, or a semantic fixture. If you cannot name the artifact, you are not ready to pick a technique.
3. **Candidate class.** Pick the group whose core question matches the symptom. Only one group is your next move. The others wait.
4. **Test.** Apply exactly one candidate, with a rollback, and compare it against a frozen workload and a measured noise floor. Two candidates at once is zero candidates.
5. **Verdict.** Record `ACCEPT`, `REJECT`, or `INCONCLUSIVE` with its evidence. A faster single run is not a verdict.

The [V0 lab](/00-preface/02-how-to-prove-a-win/) implements steps 4 and 5 in full. Steps 1 to 3 are what the five pages below teach you to get right.

## Symptom to group

Use the row that matches what you saw, not the row that mentions the feature you are excited about.

| Symptom you observed                                            | Evidence that would prove it                                     | Candidate class                                          | Page                                                                             |
| --------------------------------------------------------------- | ---------------------------------------------------------------- | -------------------------------------------------------- | -------------------------------------------------------------------------------- |
| Plan estimates a handful of rows, execution produces millions   | `E-Rows` and `A-Rows` far apart on one line                      | Optimizer statistics                                     | [Stats Run the Show](/01-proven-techniques/02-stats-run-the-show/)               |
| Correct estimates, but the access path reads the whole table    | Full scan where a selective index exists, poor clustering factor | Access paths and layout                                  | [Indexes and Layout](/01-proven-techniques/03-indexes-and-layout/)               |
| The same aggregation recomputed on every request                | Repeated identical work, no reuse, high parse or CPU share       | Access paths, then precomputation                        | [Indexes and Layout](/01-proven-techniques/03-indexes-and-layout/)               |
| Results are wrong, or a rewrite changed rows, nulls, duplicates | Semantic fixture F1–F6 disagrees between incumbent and candidate | Usually **not** a rewrite; fix the statement or the data | [Let Oracle Rewrite](/01-proven-techniques/04-let-oracle-rewrite/)               |
| The plan changed after stats, a patch, or a release             | New `plan_hash_value`, different work, same statement            | Stabilize and govern the decision                        | [Stabilize and Ship Safely](/01-proven-techniques/05-stabilize-and-ship-safely/) |
| You cannot name the statement, the plan, or the window          | Nothing yet                                                      | Stop and measure                                         | [Measure First](/01-proven-techniques/01-measure-first/)                         |

If two rows match, measure first. The measurement page breaks the tie.

## The core order

Read these in order. Each page names its own band, across four possible bands (Core, Practice, Recovery, Advanced / gated), so you know whether you are allowed to act. The **Bands** column below is the index-level summary; the band table at the top of each page is authoritative.

| #   | Page                                                                             | Bands                                                           | Use when                                                                                 | Skip when                                                                                  |
| --- | -------------------------------------------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ |
| 1   | [Measure First](/01-proven-techniques/01-measure-first/)                         | Core 1–4 · Practice 5–9 · Advanced / gated 10                   | You have a symptom and no executed plan, statement identity, or before-sample yet.       | You already have a frozen workload, a noise floor, and a named target.                     |
| 2   | [Stats Run the Show](/01-proven-techniques/02-stats-run-the-show/)               | Core 1–3 · Practice 4, 8–10 · Advanced / gated 5–6 · Recovery 7 | Estimates are wrong, or a predicate is skewed enough that one number cannot describe it. | Estimates match actual rows. Adding statistics will not move a correct plan.               |
| 3   | [Indexes and Layout](/01-proven-techniques/03-indexes-and-layout/)               | Core 1–4 · Practice 5, 6, 11–13 · Advanced / gated 7–10         | Estimates are right but the read work is wrong: too many blocks, too many rows scanned.  | The estimate is the problem. Fix the input before you buy a faster path to the wrong rows. |
| 4   | [Let Oracle Rewrite](/01-proven-techniques/04-let-oracle-rewrite/)               | Core 1–2 · Practice 3, 4, 9, 10 · Advanced / gated 5–8          | You want the optimizer to find a legal cheaper shape, or you must reject a bad rewrite.  | You have not confirmed result semantics. A faster wrong answer is a defect, not a win.     |
| 5   | [Stabilize and Ship Safely](/01-proven-techniques/05-stabilize-and-ship-safely/) | Advanced / gated 1–10 (no Core, no Practice)                    | A plan keeps drifting, or a control must survive a stats job, patch, or release.         | You want a first speedup. Stabilization is for decisions that must keep working.           |

**Bands in plain terms.** There are four bands, and they are real section ranges on every page, not labels.

| Band                 | One-line rule                                                              |
| -------------------- | -------------------------------------------------------------------------- |
| **Core**             | A junior can read it and act on the output.                                |
| **Practice**         | Use it on a real ticket, usually with an owner in the loop.                |
| **Recovery**         | How you **undo** something already applied, not a way to improve a result. |
| **Advanced / gated** | Needs a release, edition, entitlement, or privilege check first.           |

Each page repeats its own band table near the top, so the section numbers above always match the page you are reading.

- On the Measure page, section 7 is banded Practice but is a **required preflight**, not skippable depth.
- On the Stats page, section 7 is banded **Recovery** rather than Practice, because retention and restore is how you undo a statistics change and is not a tuning technique. Read it before you publish.
- The Stabilize page is **Advanced / gated across its whole range**, with no Core, no Practice, and no Recovery sections. That is why its row reads differently from the other four.

## Reference: the technique catalog

The research catalog has **68 entries**: **67 `PROVEN`** and **one `CONDITIONAL`**, T-08. `PROVEN` means the research behind this guide found documented support plus a reproducible verification procedure. It does not mean this guide executed 68 fixes on a live database. T-08, the SQLd360/SQLdb360 community diagnostic collector, stays `CONDITIONAL` because it is not a peer of a versioned Oracle package reference.

**This catalog is a reference map, not a beginner task list.** Come back here when your evidence names a cause, then use the T-ID to find the mechanism and the source class. The [evidence chapter](/00-preface/01-why-evidence-grades/) owns the `PROVEN` bar.

This chapter set covers most of the catalog but not all of it. Read the third column as a pointer to where the mechanism is discussed, not as a claim that this chapter set teaches every entry end to end. Where a row says **elsewhere**, the teaching lives in another chapter set and you should follow that link.

| Catalog group                | Entries              | Grade                                                              | Primary page                                                                     |
| ---------------------------- | -------------------- | ------------------------------------------------------------------ | -------------------------------------------------------------------------------- |
| Measurement and diagnosis    | T-01–T-08            | 7 `PROVEN` + 1 `CONDITIONAL` (T-08)                                | [Measure First](/01-proven-techniques/01-measure-first/)                         |
| Optimizer statistics         | T-09–T-23            | 15 `PROVEN`                                                        | [Stats Run the Show](/01-proven-techniques/02-stats-run-the-show/)               |
| Access structures and layout | T-24–T-33, T-67–T-68 | 12 `PROVEN`                                                        | [Indexes and Layout](/01-proven-techniques/03-indexes-and-layout/)               |
| Query transformations        | T-34–T-44            | 11 `PROVEN`, one of which (T-42) is a mechanism note, not a fix    | [Let Oracle Rewrite](/01-proven-techniques/04-let-oracle-rewrite/)               |
| Plan and cursor controls     | T-45–T-53            | 9 `PROVEN`                                                         | [Stabilize and Ship Safely](/01-proven-techniques/05-stabilize-and-ship-safely/) |
| Advisors and measurement     | T-54–T-57            | 4 `PROVEN`, one of which (T-55) is not covered in this chapter set | [Stabilize and Ship Safely](/01-proven-techniques/05-stabilize-and-ship-safely/) |
| Application and methodology  | T-58–T-61            | 4 `PROVEN`                                                         | Split; see bullets                                                               |
| Schema change and guardrails | T-62–T-66            | 5 `PROVEN`                                                         | Split; see bullets                                                               |
| **Total**                    | **68**               | **67 `PROVEN` + 1 `CONDITIONAL`**                                  |                                                                                  |

The `Grade` column is the count, not a restatement of it. Add the `Entries` column and you get 68; add the `PROVEN` cells and you get 67. Two of the 68 rows are flagged inside the `Grade` cells because they are not standalone techniques, so **65 of the 67 `PROVEN` entries are techniques and two of the 68 catalog rows are not.** T-42 explains a mechanism behind T-41 and T-55 has no page in this chapter set at all, and both are catalog rows rather than interventions. A reader who wants techniques rather than catalog rows is therefore looking at 66: those 65, plus the one `CONDITIONAL` entry T-08.

Three things the table cannot say:

- **T-34–T-44 is 10 transformations plus the T-42 mechanism note**, not 11 standalone fixes.
- **T-54–T-57 splits.** T-54 and its relatives are gates on the Stabilize page; T-56 SPA is [elsewhere](/04-recipes/02-before-after-with-spa/); T-57 ADDM has its own [Advanced reference](/01-proven-techniques/01-measure-first/); T-55, tuning on an Active Data Guard standby, is **not covered in this chapter set**.
- **T-58–T-61 and T-62–T-66 are mostly elsewhere.** The method, not the T-ID, is what this chapter set teaches: [How to prove a win](/00-preface/02-how-to-prove-a-win/) and [One Change at a Time](/05-feedback-loop/01-one-change-at-a-time/). Redefinition and EBR live in [Safe DDL and CI Gates](/04-recipes/04-safe-ddl-and-ci-gates/). T-61, the PL/SQL transpiler, is release-gated on the [rewrite page](/01-proven-techniques/04-let-oracle-rewrite/).

### Which entries are named, and which are not

Nineteen of the 68 entries carry a name somewhere in this book. The other **49 are recorded as ranges only**, and saying so is more useful than printing a name nobody wrote down.

| Named entries                                                                                                                                                                                                                                                                                     | Where the name is recorded                                                                                        |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| T-08                                                                                                                                                                                                                                                                                              | SQLd360/SQLdb360 community diagnostic collector, the one `CONDITIONAL` entry                                      |
| T-34 OR expansion · T-35 View merging · T-36 Predicate pushing · T-37 Subquery unnesting · T-38 Star transformation · T-39 Join factorization · T-40 Table expansion · T-41 Temporary-table transformation · T-42 Mechanism note · T-43 In-memory aggregation · T-44 Approximate query processing | The transformation table on [Let Oracle Rewrite](/01-proven-techniques/04-let-oracle-rewrite/), one row per entry |
| T-55 tuning on an Active Data Guard standby · T-56 SQL Performance Analyzer · T-57 ADDM                                                                                                                                                                                                           | The split bullets above                                                                                           |
| T-58 application design and SQL performance methodology · T-59 bind variables and cursor-reuse conventions · T-60 test-environment deployment before a production change · T-61 the PL/SQL transpiler                                                                                             | The T-ID table on the [OSS trio page](/06-oss-guide/02-parse-lint-test-trio/)                                     |

The unnamed 49 are T-01–T-07, T-09–T-23, T-24–T-33, T-45–T-53, T-54, T-62–T-66, and T-67–T-68. For those ranges the finest naming this book actually holds is the group-level description on the [OSS gap list](/06-oss-guide/03-what-has-no-oss-replacement/) — access paths, partitioning, views, caches and auto indexing for T-24–T-33, hints, profiles, patches, baselines and cursor sharing for T-45–T-53, and redefinition, EBR, Resource Manager and quarantine for T-62–T-66. Assigning a per-entry name inside those ranges would mean inventing a mapping between a T-ID and a mechanism that the research catalog recorded but these pages never wrote down, so this book does not print one. The [T-number map](/07-appendix-sources/01-how-citations-work/) is the resolution path for a range, and the page it points to is where the mechanism is actually taught.

## Boundaries worth keeping

- An index is a read/write trade. More objects do not automatically mean less work.
- A materialized view trades freshness for precomputation.
- A profile or patch can help without changing SQL text, but it is not a permanent substitute for a root-cause fix.
- Automatic Indexing, In-Memory, Smart Scan, parallel execution, and guardrail features depend on release, edition, service entitlement, and workload. Check the current licensing and product documentation.
- A faster plan is not automatically a better application. Validate latency, throughput, correctness, and resource use.

Every SQL block, plan, row count, and timing in this chapter set is `ILLUSTRATIVE`, `SYNTHETIC`, `SKETCH`, or `PLACEHOLDER`. The catalog counts are catalog metadata, not Oracle execution output.

## Artifact

A routing record with: the symptom you observed and the UTC window, the evidence class that would prove it, the one candidate class you chose, the test you ran, and the verdict you are allowed to claim. If any of those five is missing, you have a lead, not a result.

Behind it, this chapter set's owning artifacts are the [target worksheet and saved executed plan](/01-proven-techniques/01-measure-first/), the [statistics decision record](/01-proven-techniques/02-stats-run-the-show/), the [index and layout decision table](/01-proven-techniques/03-indexes-and-layout/), the [ship packet](/01-proven-techniques/05-stabilize-and-ship-safely/), and the semantic fixture results, which this chapter set does **not** own: F1 through F6 are defined by [section 10 of the V0 lab](/00-preface/02-how-to-prove-a-win/) and the [rewrite page](/01-proven-techniques/04-let-oracle-rewrite/) only restates them. Every technique page in this chapter set works from the same canonical synthetic plan pair, owned by [section 8 of the V0 lab](/00-preface/02-how-to-prove-a-win/).
If a number on a technique page disagrees with the V0 lab, the V0 lab is right.

**Decision:** start with the group that explains the observed work, not the group with the most clever feature.
