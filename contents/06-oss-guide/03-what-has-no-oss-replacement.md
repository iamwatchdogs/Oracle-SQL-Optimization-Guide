---
title: What Has No OSS Replacement
description: 'The techniques Oracle owns outright, what a thin script can and cannot substitute for, and the controls too release-sensitive to trust.'
order: 63
draft: false
---

Most proven Oracle fixes have no verified open-source replacement. That is the finding, not a gap in the table. Oracle owns the state, the semantics, or the decision that makes a change safe, and open source can prepare inputs, collect outputs, and run load around it.

`None found` in this chapter set has one narrow meaning: no actively maintained implementation of that exact intervention was verified in a **2026-09-22 UTC** pass. It is not a claim about every repository, paper, private tool, or future release.

> **Track:** Core (1, 2) · Practice (3, 4) · Recovery (none) · Advanced / gated (5)
>
> **Prerequisites:** Basic SQL and the [environment and setup hub](/00-preface/).
>
> **Evidence status:** The Oracle behaviors named here are A1 versioned documentation for this book's primary release, 19c, with three exceptions marked where they are cited: the 18c `DBMS_SPM` package reference in section 2, the commercial tool documentation behind [S84] and [S85], and [S93], which is a pre-12c Statspack page retained as a flagged mechanism reference and settles nothing about your release. The collector and load rows, and the driver named in section 2, are C2 repository records at a dated snapshot. The [preface's class legend](/00-preface/01-why-evidence-grades/) defines what each class may support. **No live Oracle database was available**, so this page names mechanisms and gaps and reports no result.
>
> **Next required page:** This branch ends here. Return to [the route](/) and take the next step from the root page.

## How this page is banded

| Band                 | Sections |
| -------------------- | -------- |
| **Core**             | 1, 2     |
| **Practice**         | 3, 4     |
| **Recovery**         | none     |
| **Advanced / gated** | 5        |

- **Core (1, 2):** why the built-ins are not a target, and the line between orchestrating a package and replacing it. Read before you scope any external tooling work.
- **Practice (3, 4):** two things you do with a specific plan or project in hand. Section 3 sizes the load lane honestly; section 4 is the list you hand over when someone asks what was not covered.
- **Recovery (none):** nothing here undoes a change. The undo path by change class is the [accept-or-rollback gate](/05-feedback-loop/03-accept-or-rollback-gate/).
- **Advanced / gated (5):** read before you paste a package signature into a runbook. These controls are documented for a named release, and the release is part of the claim.

## 1. What the built-ins own

The reason is the same in every row, and it is worth naming once: the decision depends on state that only the database holds.

| Family                  | What Oracle owns                                          | Why a script cannot replace it                                          |
| ----------------------- | --------------------------------------------------------- | ----------------------------------------------------------------------- |
| Measurement state       | Retention and the snapshot interval                       | The evidence expires on the instance's own schedule and lives there     |
| Statistics semantics    | Incrementality, histograms, directive decisions           | Estimates are computed against this state, not supplied to it           |
| Plan and cursor control | Baselines, profiles, patches, cursor identity and sharing | A control has to survive a statistics job, a patch, or a restart        |
| Guardrails              | Resource ceilings, the edition switch, quarantine         | The refusal has to happen inside the server, not beside it              |
| Advisor decisions       | The trial, the metric, the comparison report              | A before-and-after claim is only meaningful from the engine that ran it |

A text parser can see a predicate. Only Oracle can say whether the executed plan, the current statistics, the bind values, and the surrounding workload make that predicate cheaper. That is the whole boundary, and it is why several rows in the catalog carry no replacement at all.

## 2. A script is not a replacement

Four pairings, each one drawn from an existing page in this book rather than from a general principle.

**A driver is a harness.** `python-oracledb` can connect, run a frozen statement, collect timings, and call a release-supported package procedure. Use it when the work is orchestration. [S64](https://github.com/oracle/python-oracledb) · **The built-in is the measurement.** SQL Performance Analyzer owns the before trial, the after trial, the comparison metric, and the per-statement report. A harness schedules it; it does not reimplement it. [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html)

**A script is not a statistics authority.** When the change is statistics, `DBMS_STATS` and the release's own statistics semantics apply, and a pending-statistics workflow where the release supports one is the safe shape: gather pending, measure, then publish or discard from evidence. [S29] · **The built-in is the control.** `DBMS_SPM` answers which plan is allowed to survive a change. Parsing a hint or comparing plan hashes does not answer that, because the baseline state is the answer. [S07](https://docs.oracle.com/en/database/oracle/oracle-database/18/arpls/DBMS_SPM.html) — the 18c package reference, with the 19c companion chapter.

The test is short and it survives review: **if your script could be deleted and the claim would still hold, it was a harness. If deleting it would leave the claim unsupported, you have a dependency and you owe it a licence, a snapshot, and a rollback.**

### There are three worlds, not two

There are three worlds here, not two, and leaving out the third misleads anyone about to spend money.

The third world is commercial instruments, and for several rows in the gap list below it does the same work Oracle does. Quest SQL Optimizer and IDERA DB Optimizer generate rewrite, hint, and index alternatives and then _execute_ them and rank the results by measured statistics [S84]. That is not a harness. That is the T-54-to-T-57 row — advisor-grade recommendation plus before/after testing — delivered by a vendor. Method R's `mrprof` does response-time trace accounting at a resolution the vendor claims TKPROF does not reach — a claim to test on your own traces, not a benchmark [S85]. The observability platforms do the AWR-and-ASH job, continuously, across every instance you connect.

So the honest version of the table has a third column: for each gap, what Oracle does, what a commercial product does, and what open source does. For most rows the third cell is "nothing", and the second is "the same thing Oracle does, for a licence fee". For a few — parsing, linting, behavior tests, load generation, portable collection — open source is genuinely competitive, and those are the rows where this chapter has something to say.

Two boundaries on the commercial world, because a paid tool is still a tool. A vendor document records what a product claims to do, which is a **CANDIDATE** and not a result; the only way it becomes evidence is the [validation run](/05-feedback-loop/03-accept-or-rollback-gate/) on your own workload. And a rewrite engine that executes its generated SQL against your instance is doing exactly what the [static gate](/03-toolbox/04-static-checks-before-db-time/) exists to prevent — load, cache pollution, TEMP consumption, and DML side effects — so the target has to be one you are allowed to change.

**`None found` in this chapter set has one narrow meaning: no actively maintained _open-source_ implementation of that exact intervention was verified in a 2026-09-22 UTC pass.** It is not a claim that nothing exists. It is not a claim about commercial products, private tools, or future releases. Read it as a statement about this ledger, in this pass, on this date.

## 3. The load boundary is real, not magical

The load lane is the narrowest place an external tool does real work, and the one most often oversold. What decides it is the licence, not the popularity: at the dated snapshot **HammerDB** carried GPL-3.0 and **Swingbench** declared no licence at all, so one of the two load lanes in this ledger is still waiting on a rights answer. The dated numbers behind both are on the [vetting page](/06-oss-guide/01-how-to-vet-oss/). [S65](https://github.com/TPC-Council/HammerDB) [S66](https://github.com/domgiles/swingbench-public)

What a load run can do is expose contention, I/O pressure, and resource exhaustion that a single session never will. That is why the 19c parallel-execution guidance makes a concurrency-realistic run part of the evidence for the parallelism technique: it documents both when parallelism helps and when resource pressure makes it worse. [S77](https://docs.oracle.com/en/database/oracle/oracle-database/19/vldbg/parallel-exec-intro.html)

What no load tool gives you is a **detection window**, a stop criterion, or a diagnosis. Run duration depends on the data volume, the session count, the hardware, and the criteria you declared in advance. A tool that finds nothing in ten minutes has proved nothing, and the honest question is whether the run resembles the failure mode you care about. The [load gate](/03-toolbox/03-load-test-without-prod/) owns the guardrails, and it owns them because a load run changes shared state and needs a rehearsed rollback.

## 4. The gap list is part of the answer

The list below is the real one. Each row names the catalog entries with no verified open-source implementation, states the support status, and says what the built-in does instead, so a reader never has to guess whether a gap is a defect or a design. The link in the first column is the **primary page** for the range; the [T-number map](/07-appendix-sources/01-how-citations-work/) is the authority when a range is split.

| T-IDs                                                               | Support status                               | What the built-in does instead                                                                                             |
| ------------------------------------------------------------------- | -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| [T-01, T-02](/01-proven-techniques/01-measure-first/)               | None found                                   | AWR retains the snapshots; ASH samples active sessions by wait. Snapshot-based: Statspack plus Snapper [S93] [S87]         |
| [T-03, T-04](/01-proven-techniques/01-measure-first/)               | None found; collectors package it            | SQL Monitor and `DBMS_XPLAN` produce the plan and runtime rows                                                             |
| [T-05](/01-proven-techniques/01-measure-first/)                     | None found                                   | SQL Trace and `tkprof` split parse, execute, and fetch time. Commercial: Method R at higher resolution [S85]               |
| [T-06, T-07](/01-proven-techniques/01-measure-first/)               | None found                                   | Tuning sets and the Test Case Builder freeze and replay a case                                                             |
| [T-08](/01-proven-techniques/01-measure-first/)                     | Collectors only; entry stays **conditional** | The bundle needs an Oracle cross-check [S67]                                                                               |
| [T-09 to T-23](/01-proven-techniques/02-stats-run-the-show/)        | None found                                   | `DBMS_STATS`, histograms, extended stats, directives, advisor                                                              |
| [T-24 to T-33](/01-proven-techniques/03-indexes-and-layout/)        | Load validation only                         | Access paths, partitioning, views, caches, auto indexing                                                                   |
| [T-45 to T-53](/01-proven-techniques/05-stabilize-and-ship-safely/) | None found                                   | Hints, profiles, patches, baselines, and cursor sharing                                                                    |
| [T-54 to T-57](/01-proven-techniques/05-stabilize-and-ship-safely/) | None found; a driver orchestrates            | SQL Tuning Advisor, SPA, and ADDM make the decisions. Commercial: Quest and IDERA generate and test the alternatives [S84] |
| [T-62 to T-66](/04-recipes/04-safe-ddl-and-ci-gates/)               | None found                                   | Redefinition, EBR, Resource Manager, and quarantine hold state                                                             |
| [T-67](/01-proven-techniques/03-indexes-and-layout/)                | None found                                   | The 19c Administrator's Guide documents the DDL [S76]                                                                      |
| [T-68](/01-proven-techniques/03-indexes-and-layout/)                | Load validation only                         | The VLDB guide owns the when and when-not conditions [S77]                                                                 |

Two ranges are split and the link above is only the first page. **T-54 to T-57** also runs through [Before/After With SPA](/04-recipes/02-before-after-with-spa/) and, for T-57, the ADDM reference on [Measure First](/01-proven-techniques/01-measure-first/). **T-62 to T-66** is shared with the [accept-or-rollback gate](/05-feedback-loop/03-accept-or-rollback-gate/). The map resolves both; this table only names where to start.

The three records behind that table are [S67](https://github.com/mauropagano/sqld360) SQLd360 and [SQLdb360](https://github.com/sqldb360/sqldb360) — one row covering both collectors — [S76](https://docs.oracle.com/en/database/oracle/oracle-database/19/admin/managing-indexes.html) for the compression documentation, and [S77](https://docs.oracle.com/en/database/oracle/oracle-database/19/vldbg/parallel-exec-intro.html) for the parallel-execution conditions.

Two families are not listed because they do have verified tooling, and the [trio page](/06-oss-guide/02-parse-lint-test-trio/) owns them: the transformation range, where parsers and rule frameworks generate candidates, and the method and test ranges, where lint and assertions keep bad text out of a performance run.

## 5. Release-sensitive rows in the gap list

Three rows in that list are release-sensitive rather than merely unsupported, and they behave differently. The guardrail row covers quarantine and error-mitigation controls whose names and eligibility rules belong to a named release. The two access-structure rows cover compression, which carries documented compatibility prerequisites, and parallelism, whose when-and-when-not conditions are versioned guidance.

The [citations page](/07-appendix-sources/01-how-citations-work/) owns the general rule and the worked plan-comparison example, so this page does not repeat it. The part that belongs here is the record you keep per row, and it is small:

**PLACEHOLDER — the release-confirmation record. One row per control you depend on. Fill it before the control enters a runbook.**

```text
control:              ____________________
documented release:   ____________________
source:               ____________________
signature confirmed on installed release: yes / no
parameter set differs from the reference:  yes / no / unknown
if unknown, the control is: SKETCH
```

An unanswered field is not a small gap. It means the control is still a sketch, and a sketch is not something you arm at 02:00.

## Artifact

For every entry you intend to script around, one packet containing: the T-ID or the mechanism name, the thin script, the Oracle package call, the release reference with the access date, the before-and-after report, and the rollback command. That packet shows what the automation did and what Oracle decided, and it is what a reviewer reads instead of a promise.

The gap list in section 4 travels with the packet. A gap you have named is a boundary you can plan around; a gap you have not named is a discovery you have scheduled for someone in production.

**Decision:** where the catalog says no verified implementation exists, script around Oracle and name the gap. A release-sensitive control gets marked, dated, and confirmed, or it stays a sketch.
