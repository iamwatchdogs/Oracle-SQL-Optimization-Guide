---
title: OSS Guide - Vet the Tool Before You Trust the Output
description: 'An external tool is a dependency: licence, maintenance state, Oracle fit, and role, plus the built-ins no OSS project replaces.'
order: 60
draft: false
---

An external tool is a dependency you have to vet like any other. "It is open source" is a statement about how the code is licensed. It is not a reason to adopt a tool, and it is not evidence that the tool reads your SQL correctly, matches your release, or produces a result you may act on.

What open source does well on an Oracle workload is preparation and observation: make a candidate cheaper to inspect, run it offline, assert its behavior, package diagnostics, and generate load. What it does not do is decide whether a change is legal, safe, or faster. That decision belongs to Oracle, and the [toolbox chapter](/03-toolbox/) owns the instruments that make it.

> **Track:** Core (1–5) · Practice (6, 7) · Recovery (none) · Advanced / gated (none)
>
> **Prerequisites:** Basic SQL and the [environment and setup hub](/00-preface/).
>
> **Evidence status:** Repository and licence facts are C1/C2 records from the source ledger, read at one dated snapshot on **2026-09-22 UTC**. Section 5's built-in claims are A1 Oracle documentation for 19c, except the 18c `DBMS_SPM` reference marked inline, and section 7's gap list cites untriaged B1 papers. The [preface's class legend](/00-preface/01-why-evidence-grades/) defines what each class may support. **No live Oracle database was available**, so no lane row here is a measurement.
>
> **Next required page:** [The Four Gates for Vetting Any OSS Repo](/06-oss-guide/01-how-to-vet-oss/).

## How this page is banded

| Band                 | Sections      |
| -------------------- | ------------- |
| **Core**             | 1, 2, 3, 4, 5 |
| **Practice**         | 6, 7          |
| **Recovery**         | none          |
| **Advanced / gated** | none          |

- **Core (1, 2, 3, 4, 5):** the thesis, the three pages, the dating rule, the lane map, and the swap to refuse. Read this once before you install anything.
- **Practice (6, 7):** two things you do with a specific project in front of you. Section 6 turns a repository's state into a role; section 7 records what was never checked so nobody upgrades "untriaged" to "unusable".
- **Recovery (none):** nothing on this page changes a database, so nothing here has an undo. The rollback belongs to the change class you adopt later.
- **Advanced / gated (none):** nothing here is gated. The gate order lives on the next page, and every gated claim in this chapter set points there.

## 1. Tools are dependencies

Three sentences hold this chapter together, and you may apply them to any repository in any language.

**Open source tells you the licence, not the correctness.** A permissive licence is a legal fact about distribution. Whether the tool parses your dialect is a technical fact you have to check separately, and the two are unrelated.

**A tool earns a role, not a seat.** "We need something to lint SQL" is a need. "This project lints SQL" is a candidate. The four-gate check sits between them, and it is the check that decides which one you have.

**The decision stays in the database.** Parsing text, running a linter, and asserting rows all raise the cost of a bad change. None of them lowers it. Oracle decides, and the [claim-to-tool map](/03-toolbox/) says which instrument produces the artifact for the claim you are defending.

## 2. The child pages

Read the three pages in order. Each one narrows what you are allowed to do with a tool you found.

1. **[The Four Gates for Vetting Any OSS Repo](/06-oss-guide/01-how-to-vet-oss/)** decides whether a project is a dependency at all, with a stop condition per gate.
2. **[The Parse-Lint-Test Trio](/06-oss-guide/02-parse-lint-test-trio/)** decides what the useful tools do for a candidate rewrite, where each lane stops, and which lanes are candidate-only.
3. **[What Has No OSS Replacement](/06-oss-guide/03-what-has-no-oss-replacement/)** decides the ceiling: which techniques Oracle owns outright, and which controls are release-sensitive enough to be marked rather than trusted.

If you only want the per-tool inventory, take [The Four Gates for Vetting Any OSS Repo](/06-oss-guide/01-how-to-vet-oss/), which holds it. If you only want the answer to "can OSS replace my advisor?", take [What Has No OSS Replacement](/06-oss-guide/03-what-has-no-oss-replacement/).

## 3. The snapshot rule

Repository state is a **dated fact**, not a property. A star count, a last-push date, a licence identifier, and an archive flag all change without notice, and those four are the fields this book checks before it will call a project a candidate. A dependency policy of your own may require more.

Every such fact in this chapter set therefore carries the date it was read: **2026-09-22 UTC**. That date is not decoration. It is the boundary of the claim. A fact read on that date says what the repository metadata returned that day and nothing about what it returns tomorrow.

The [vetting page](/06-oss-guide/01-how-to-vet-oss/) holds the complete dated inventory, the four maintenance labels, and the gate order. This page states the rule; that page applies it. If you reuse a number from this chapter set, re-read the repository before you rely on it.

One more boundary, stated once: the ledger behind these facts records them as a **scoped pass**, not a survey. A tool absent from the list was not cleared; it was not checked.

## 4. The lanes worth having

Each lane below is a job, not a product. The dated per-tool inventory lives on the [vetting page](/06-oss-guide/01-how-to-vet-oss/), so it is not reprinted here.

| Lane                | Representative tool              | What it can do for an Oracle workload                  | What it cannot settle                    |
| ------------------- | -------------------------------- | ------------------------------------------------------ | ---------------------------------------- |
| Parse and normalize | sqlglot [S60]                    | Read Oracle-dialect text, expose a tree, diff shapes   | Equivalence, selectivity, or plan cost   |
| Lint                | SQLFluff [S61]                   | Apply documented Oracle-dialect rules in CI            | Meaning, correctness, or a cheaper plan  |
| Behavior test       | utPLSQL [S63]                    | Assert rows, aggregates, and errors in a test database | Performance under production load        |
| Driver and harness  | python-oracledb [S64]            | Connect, execute, collect, call package procedures     | The tuning decision itself               |
| Load                | HammerDB [S65], Swingbench [S66] | Apply realistic concurrency and resource pressure      | A detection window, or a diagnosis       |
| Diagnostics bundle  | SQLdb360 and SQLd360 [S67]       | Package collected output for offline review            | Licence, maintenance, or a cross-check   |
| Rule framework      | Apache Calcite [S62]             | Apply dialect-aware rules to make candidates           | Oracle execution, or a correctness proof |
| Equivalence provers | VeriEQL [S50], SQLSolver [S49]   | Suggest a candidate or an equivalence argument         | A gate that can reject a rewrite         |

The records behind that table, each read at the **2026-09-22 UTC** snapshot, are [S60](https://github.com/tobymao/sqlglot) sqlglot, [S61](https://github.com/sqlfluff/sqlfluff) SQLFluff, [S62](https://calcite.apache.org/) Calcite, [S63](https://github.com/utplsql/utplsql) utPLSQL, and [S64](https://github.com/oracle/python-oracledb) python-oracledb. The load pair is [S65](https://github.com/TPC-Council/HammerDB) HammerDB and [S66](https://github.com/domgiles/swingbench-public) Swingbench. The collector row is a single record covering two projects: [S67](https://github.com/mauropagano/sqld360) SQLd360 and [SQLdb360](https://github.com/sqldb360/sqldb360).

The two equivalence provers are B1 paper and repository evidence rather than C1/C2 tooling, and neither has verified Oracle dialect coverage: [S50](https://github.com/VeriEQL/VeriEQL) VeriEQL, [S49](https://github.com/SJTU-IPADS/SQLSolver) SQLSolver, [S48](https://ipads.se.sjtu.edu.cn/_media/publications/wetune_final.pdf) WeTune, and [S51](https://www.vldb.org/pvldb/vol17/p3602-wang.pdf) QED. That lane is the one the [vetting page](/06-oss-guide/01-how-to-vet-oss/) keeps behind a gate, and the [trio page](/06-oss-guide/02-parse-lint-test-trio/) says where each of the eight lanes stops.

The last column is the useful one. Every tool in this table makes a change cheaper to inspect and none of them decides whether the change is correct or faster. That is why the useful workflow looks boring: inspect offline, then let Oracle decide.

A driver is the clearest example of the boundary. `python-oracledb` can call a release-supported `DBMS_SQLPA` workflow, save the report, and fail loudly if the call is wrong. The comparison logic is still Oracle's. [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html)

## 5. The swap to refuse

For statistics, plan management, the advisors, and the core guardrails, the maintained implementation is Oracle's. A script can schedule those APIs, call them, collect the output, and report it. That is orchestration, and orchestration is a legitimate use of a driver. It is not a replacement, because the state Oracle reads and writes is the state the decision depends on.

Concretely: use a driver to run the workflow and save the report; use `DBMS_SQLPA` to compare the before and after trials; use `DBMS_SPM` to decide which plan is allowed to survive a change; use `DBMS_STATS` to change the optimizer's input. A Python function named `compare` is not any of those four. [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html) [S07](https://docs.oracle.com/en/database/oracle/oracle-database/18/arpls/DBMS_SPM.html) — the 18c package reference, with the 19c companion chapter — [S29]

The third lane is narrower than it looks and is worth stating precisely. Load generators can expose contention and resource pressure that a single session never will, which is why the 19c parallel-execution guidance makes a concurrency-realistic run part of the evidence. What no load tool gives you is a detection window, a stop criterion, or a diagnosis. [S77](https://docs.oracle.com/en/database/oracle/oracle-database/19/vldbg/parallel-exec-intro.html)

## 6. Archived code is a source

Stars are the wrong first filter, and the dated snapshot makes the reason concrete. At **2026-09-22 UTC**, **OtterTune** recorded 1,233 stars, a last push on **2020-11-13**, and an **archived, read-only** state. [S54](https://github.com/cmu-db/ottertune) The repository is unreadable as runnable tooling and perfectly readable as a description of a tuning loop: which knobs are exposed, what the feedback signal is, and where the loop is allowed to stop.

The diagnostic collectors make the same point from the other direction. In that same snapshot **SQLd360** was dormant after a **2018-01-14** push and **SQLdb360** was low activity after a **2024-12-03** push, and both reported no confirmed licence identifier. [S67](https://github.com/mauropagano/sqld360) [SQLdb360](https://github.com/sqldb360/sqldb360) Independent write-ups describe what the collectors do; they cannot settle rights or maintenance, which is why they are corroboration only. [S75](https://dincosman.com/2025/02/23/oracle-database-health/)

Archived does not mean useless. It means the repository no longer promises maintenance, so it cannot inherit credibility from its popularity. The role label is the whole output of this section: design evidence, not a dependency.

## 7. What this pass did not close

A gap list is part of the answer, not an embarrassment. Two categories were left open.

**Not triaged at all.** Oracle's own sample schemas for a reproducible repro database, and the OpenTelemetry database instrumentation for `python-oracledb`, were never checked. Nobody has established whether either would have helped.

**Papers without a code check.** SLER [S68](https://arxiv.org/abs/2603.04169) and the survey [S69](https://ieeexplore.ieee.org/iel8/11629178/11629165/11629242.pdf), QueryBooster [S80], and QED [S51](https://www.vldb.org/pvldb/vol17/p3602-wang.pdf) are all in the ledger. What is missing for each is the same thing: a repository, a licence, and a verified Oracle coverage. A paper with a DOI is not a tool you can run.

None of these is evidence against the projects. Each is a debt with a name, and the honest wording is "not checked", never "does not exist".

## Artifact

A vetting record per external tool, one line each, filled in before an install decision:

**PLACEHOLDER — one row per tool. An empty licence or date field is a stop.**

```text
tool:                   ____________________
licence read from file: ____________________
maintenance snapshot:   ____________________   -- date, last push, archived flag
Oracle fit evidence:    ____________________
role:                   ____________________   -- parse | lint | test | load | collect | research
role UNKNOWN, so not installed: yes / no
install decision:       yes / no
```

The dated per-tool inventory is on the [vetting page](/06-oss-guide/01-how-to-vet-oss/); this record is the decision, not the catalogue. A row with a blank licence or a blank snapshot date is a lead, not a dependency.

Source IDs and technique IDs resolve in [Appendix Sources](/07-appendix-sources/).

**Decision:** "it is open source" is a licence fact, not an adoption reason. Vet the tool, date the facts, and let Oracle make the decision the tool cannot.

**Next required page:** [The Four Gates for Vetting Any OSS Repo](/06-oss-guide/01-how-to-vet-oss/).
