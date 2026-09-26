---
title: The Four Gates for Vetting Any OSS Repo
description: 'Four gates in order - licence, maintenance state, Oracle fit, and role - with the evidence that settles each one and a stop condition when it cannot be settled.'
order: 61
draft: false
---

A repository becomes a candidate only after four gates pass in order: **licence, maintenance and archive state, Oracle fit, and role**. Stars are a popularity signal, not a dependency decision, and the order matters because a failed licence gate makes the other three irrelevant.

The expensive part of a bad dependency is not reading the README. It is discovering, after installation, that the project has no usable grant, no current release behavior on your database, or no Oracle path at all.

This page is the only place in the book that prints the complete dated per-repository inventory. The other OSS pages link here for the licence and maintenance facts rather than repeating them. It covers repositories; the two classes that are not repositories — reviewed third-party scripts and commercial instruments — are handled in section 2 and on the [toolbox map](/03-toolbox/).

> **Track:** Core (1–5) · Practice (6) · Recovery (none) · Advanced / gated (7)
>
> **Prerequisites:** Basic SQL and the [environment and setup hub](/00-preface/).
>
> **Evidence status:** The licence, star, last-push, and archive facts below are C1/C2 records read through a repository metadata API on **2026-09-22 UTC** and carried in this book's source ledger; the research-only rows are B1 paper records. The [preface's class legend](/00-preface/01-why-evidence-grades/) defines what each class may support. **No live Oracle database was available**, and no tool was installed or run, so nothing here is a result.
>
> **Next required page:** [The Parse-Lint-Test Trio](/06-oss-guide/02-parse-lint-test-trio/).

## How this page is banded

| Band                 | Sections      |
| -------------------- | ------------- |
| **Core**             | 1, 2, 3, 4, 5 |
| **Practice**         | 6             |
| **Recovery**         | none          |
| **Advanced / gated** | 7             |

- **Core (1, 2, 3, 4, 5):** the snapshot rule and then the four gates, in order. None of them touches a database, and each one ends with a stop condition.
- **Practice (6):** the time-boxed procedure. Run it against one named project while the repository is open in front of you; it is a procedure, not a promise about how long reading takes.
- **Recovery (none):** vetting changes nothing. The undo path belongs to the change class you adopt after the role is named.
- **Advanced / gated (7):** the research-only repositories, which stay gated because their Oracle dialect coverage was not verified. Read this before you treat a paper's repository as a possible gate.

## 1. The snapshot rule

The governing principle for this whole chapter set: **repository state is a dated fact**. Stars, the last-push date, the licence identifier, and the archive flag are four fields that change without notice, and they are the four fields this gate checks. A dependency policy of your own may require more.

The ledger behind this page recorded them by reading repository metadata on **2026-09-22 UTC**. Those values describe that day. The maintenance labels below are labels for that dated snapshot, not predictions:

| Label            | The rule that produced it, applied to the snapshot date |
| ---------------- | ------------------------------------------------------- |
| **Active**       | last push within six months of the snapshot date        |
| **Low activity** | last push within 24 months of the snapshot date         |
| **Dormant**      | last push older than 24 months                          |
| **Archived**     | the repository is marked read-only                      |

Those two thresholds are this book's own engineering choices, not a rule any source states. Nothing stops you from being stricter: a project you would only accept with a push inside three months is a perfectly good policy, and stricter is safer.

Re-read those four fields before you depend on a project. The [version drift page](/07-appendix-sources/02-version-drift-survival/) owns the dating rule for the whole book, and this page is its OSS-specific form.

One term to keep straight. `NOASSERTION` and a null licence are not the same as public domain. They mean the metadata source returned no confirmed identifier. The licence file is the evidence; the API label is a pointer to it.

## 2. Gate 1: licence

**What settles it:** the repository's own licence file, read as text, plus a recorded grant.

Four grants appear in this book's ledger, and they behave differently:

- **MIT** and **Apache-2.0** are explicit repository metadata in the dated pass for sqlglot, SQLFluff, Apache Calcite, and utPLSQL.
- **A dual grant** is not a metadata failure. `python-oracledb` returned no confirmed SPDX identifier because its licence file offers `UPL-1.0 OR Apache-2.0`. Read the file, pick a branch, and record which one you rely on. [S64](https://github.com/oracle/python-oracledb/blob/main/LICENSE.txt)
- **No declared licence** is a stop, not a formality. Swingbench returned a null licence in the snapshot, so its rights are unresolved. Unresolved rights are an install decision of no. [S66](https://github.com/domgiles/swingbench-public)
- **A metadata field that cannot name the licence has not settled it.** GitHub reports `NOASSERTION` for `tpt-oracle` because its LICENSE file appends the Apache NOTICE template as Sections 4-9, and the file is plain Apache-2.0. Read the text. The same trap caught `python-oracledb` above, and a team that trusted the API field would have rejected a permissively licensed script. [S87](https://github.com/tanelpoder/tpt-oracle/blob/master/LICENSE.txt)
- **Copyleft** changes what you may do with the result. HammerDB is GPL-3.0 in the snapshot, which is fine for generating your own load and a different question entirely if you intend to redistribute a modified tool. [S65](https://github.com/TPC-Council/HammerDB)

The explicit-metadata records are [S60](https://github.com/tobymao/sqlglot) sqlglot, [S61](https://github.com/sqlfluff/sqlfluff) SQLFluff, [S62](https://calcite.apache.org/) Calcite, and [S63](https://github.com/utplsql/utplsql) utPLSQL.

**When the answer is unknown:** record the licence field as unresolved and stop. Do not install, do not fork, and do not copy code. Ask whoever owns the licensing answer; it is not yours to close by inference, and a public URL plus a high star count is not a grant.

### A third-party script is not a repository, and three of the four gates need a different question

The four gates all presume a repository: a licence _file_ to read, a last-push date, an archive flag, a star count. A single-file script published by a named practitioner does not fit that shape, and forcing it to fit produces the wrong answer. Snapper is the case in point [S87].

**Gate 1 passes, and it passes the hard way.** The repository's API reports its licence as `NOASSERTION`, because the LICENSE file appends the Apache NOTICE template as Sections 4 through 9 and the auto-detector cannot parse the result. The file itself is plain Apache-2.0, Copyright 2018. This is the same trap as `python-oracledb` in the table above, and it is the whole argument for reading the text: a metadata field that cannot name your licence has not settled anything. **The rule that resolves it is the one already on this page — read the file, record what it says, and note which field disagreed.**

The other three gates need rephrasing rather than relaxing:

- **Maintenance** is a last-push date and an archive flag, and a script is no different. Snapper's repository reads 741 stars, last push 2026-06-02, not archived, at the 2026-09-26 snapshot.
- **Oracle fit** is not a dialect reference, because a script has none. It is a read of the script: what it selects from, whether it writes anything, and whether it shells out or touches the network. That is a stronger check than a dialect claim, not a weaker one, and it is the reason the next rule is not optional.
- **Role** is the same question as always, and the answer for a script is narrower than for a library. You are not installing a dependency. You are running a file against a session.

So the procedure for this class:

- **Read the whole script before you run it.** Not the header. A script that reaches out to the network, shells out, or writes outside the session is a different tool from one that only issues `SELECT`s against core views. This is a code review and it is not optional.
- **Record the source as a dated snapshot**, exactly as gate 2 records a repository: the URL, the author, the licence as read from the file, the last-push date, and the date you read it. A script with no version is a script that changes under you.
- **Grant the minimum views it needs** and nothing more. Snapper reads `GV$SESSTAT`, `GV$SESS_TIME_MODEL`, `GV$SESSION_EVENT`, and `GV$SESSION`. That is the whole grant. A script that also wants `DBA_*` or a scheduler privilege is not the script you vetted.
- **Do not fork it, do not vendor it into your pipeline, and do not build a CI job on it.** The licence permits all three. The risk profile is why you should not: a script you did not write is a script whose next revision you did not review. You may run it, on a session you are allowed to inspect, and save its output.
- **Label the role by what it reports, not by what it decides.** It is a measurement instrument. It never decides whether a change is legal, safe, or faster.

That last point is the one that keeps this a chapter about open source rather than a chapter about a specific tool. Snapper tells you which wait dominates. It does not tell you whether the wait is your fault.

### Two more classes the ledger does not have a row for

**Oracle Support's own collection tools.** SQL Health Check and SQLTXPLAIN bundle plans, object metadata, optimizer statistics, and parameters for a single statement, and they are the first thing to reach for before a support escalation. This chapter does not link them, on purpose: their availability and current support matrix are settled through My Oracle Support rather than through public documentation, and every public write-up about them is a secondary source. Name them, check the matrix yourself, and treat them as a **CANDIDATE** until you have.

**Commercial instruments.** Quest SQL Optimizer, IDERA DB Optimizer, Method R Workbench, dbForge, **SonarQube Server**, and the observability platforms are not open source and are not substitutes for anything on this list. SonarQube is the trap worth naming: the SonarQube _Community Build_ is open source and the _Server_ edition is commercial, the documentation this ledger cites describes the commercial edition [S86], and putting "SonarQube" in an open-source table without saying which one is how a team ends up with a licence question nobody asked. Name the edition. They are catalogued in the [toolbox map](/03-toolbox/) because the honest reason to buy one is a specific gap, and the [toolbox page](/03-toolbox/) states what each gap is. What belongs here is the vetting principle that transfers: a vendor document tells you what a product claims to do, and a product page tells you the product exists. Neither is a result on your database.

## 3. Gate 2: maintenance and archive state

**What settles it:** the dated snapshot of the last-push date and the archive flag, read before the README's promises. This is the book's one complete dated inventory.

| Repository      | Dated snapshot, read 2026-09-22 UTC                                  | Practical reading                              |
| --------------- | -------------------------------------------------------------------- | ---------------------------------------------- |
| sqlglot         | MIT; 9,628 stars; push 2026-09-21; active                            | Installable candidate; test the Oracle dialect |
| SQLFluff        | MIT; 9,883 stars; push 2026-09-21; active                            | Installable candidate; confirm the dialect     |
| Apache Calcite  | Apache-2.0; 5,186 stars; push 2026-09-21; active                     | A rule framework, not an Oracle runtime        |
| utPLSQL         | Apache-2.0; 624 stars; push 2026-09-18; active                       | Usable when your release meets the floor       |
| python-oracledb | dual grant; 452 stars; push 2026-09-19; active                       | The licence file, not the API label, is proof  |
| HammerDB        | GPL-3.0; 786 stars; push 2026-09-18; active                          | Load generator after the licence review        |
| Swingbench      | no declared licence; 80 stars; push 2026-05-26; active               | Load candidate; rights are still a gate        |
| OtterTune       | 1,233 stars; push 2020-11-13; archived; no licence asserted          | Design evidence only                           |
| SQLd360         | 65 stars; push 2018-01-14; dormant; no licence confirmed             | Dormant collector; check the successor         |
| tpt-oracle      | Apache-2.0 read from LICENSE.txt; 741 stars; push 2026-06-02; active | Reviewed script; Snapper reads core views only |
| SQLdb360        | 123 stars; push 2024-12-03; low activity; no licence confirmed       | Collector needing a fresh rights check         |

The records are [S60](https://github.com/tobymao/sqlglot), [S61](https://github.com/sqlfluff/sqlfluff), [S62](https://calcite.apache.org/), [S63](https://github.com/utplsql/utplsql), [S64](https://github.com/oracle/python-oracledb), [S65](https://github.com/TPC-Council/HammerDB), [S66](https://github.com/domgiles/swingbench-public), and [S54](https://github.com/cmu-db/ottertune). The two collector rows come from one record that covers both projects: [S67](https://github.com/mauropagano/sqld360) SQLd360 and [SQLdb360](https://github.com/sqldb360/sqldb360).

Two readings matter more than the numbers. An **archived** repository is unreadable as runnable tooling and readable as a description of a design; the [archived-code section](/06-oss-guide/) is the worked example. A repository can be **popular and unsuitable for your release**, because stars measure attention and not dialect coverage.

**When the answer is unknown:** if you cannot read a last-push date or an archive flag, treat maintenance as unestablished and keep the tool out of any pipeline you are accountable for. You may read it, clone it, and study it. You may not schedule it.

## 4. Gate 3: Oracle fit

**What settles it, in two tiers.** "Supports SQL" is not "supports Oracle SQL", and a documented dialect is a weaker fact than a construct you have watched parse.

- **The documented floor passes this gate for evaluation.** Find the project's own statement of Oracle support: the dialect reference, the driver documentation, or a stated release floor, and record the sentence rather than a paraphrase. That is enough to install the tool on a disposable target and read its documentation.
- **The verified floor is what passes it for installation.** Run something of yours through the tool and confirm the constructs your release actually emits come back intact, not silently dropped. A parser that cannot read a construct your statements use is a failed gate, not a partial pass.

- **sqlglot** names Oracle among its dialects. That supports a parse-and-diff lane, and nothing about semantic equivalence or speed. [S60](https://sqlglot.com/sqlglot/dialects.html)
- **SQLFluff** documents an `oracle` dialect. Use that configuration rather than assuming generic rules are equivalent. [S61](https://docs.sqlfluff.com/en/stable/reference/dialects.html)
- **Apache Calcite** ships `OracleSqlDialect`, which is a dialect implementation and not an Oracle execution engine. [S62](https://calcite.apache.org/javadocAggregate/org/apache/calcite/sql/dialect/OracleSqlDialect.html)
- **utPLSQL**'s current documentation names Oracle Database 19c or newer. Older releases carry different support claims, so match the version you run. [S63](https://www.utplsql.org/)
- **python-oracledb** is the driver's own boundary. It connects and executes; the tuning decisions still come from Oracle packages. [S64](https://oracle.github.io/python-oracledb/)
- **HammerDB** and **Swingbench** are load tools. Their value depends on a workload, a session count, a hardware profile, and a licence decision, not on the tool's name.

The verified tier has a runbook: the [static-checks toolbox page](/03-toolbox/04-static-checks-before-db-time/) owns the parse, diff, and assertion stages, and a driver can be what makes them scriptable.

**When the answer is unknown:** a tool with no documented Oracle path stays out of the pipeline. Record it as research-only, and use it to inform a decision you then make with Oracle's own instruments.

## 5. Gate 4: name the role

**What settles it:** one written sentence naming what the tool does and what it is not allowed to decide. If you cannot write that sentence, the role is unknown and the tool is a lead.

| Role                            | Tools in this ledger                                                                  | The line you must be able to write             |
| ------------------------------- | ------------------------------------------------------------------------------------- | ---------------------------------------------- |
| **Installable candidate**       | sqlglot, SQLFluff, utPLSQL, python-oracledb, HammerDB, Swingbench after rights review | "It prepares or loads; Oracle decides."        |
| **Framework or rule source**    | Apache Calcite                                                                        | "It generates candidates, not plans."          |
| **Reviewed third-party script** | Snapper in tpt-oracle [S87]                                                           | "It measures one session; it decides nothing." |
| **Conditional collector**       | SQLdb360 and SQLd360 [S67]                                                            | "It packages output I still cross-check."      |
| **Research candidate**          | VeriEQL, SQLSolver, WeTune, QED, SLER, QueryBooster                                   | "It is a hypothesis I must test."              |
| **Design evidence**             | OtterTune and other archived research prototypes                                      | "It tells me a shape, not an install."         |

The collector record is [S67](https://github.com/mauropagano/sqld360) and [SQLdb360](https://github.com/sqldb360/sqldb360): one ledger row, two projects, two repositories. The two are not interchangeable, and the difference decides which one you reach for: SQLd360 is scoped to a single SQL ID and produces a statement dossier, while SQLdb360 grew out of it and assesses a whole database. The record covers both because the licence question is the same for both, and in this book's dated pass neither returned a confirmed licence identifier — which is why the role reads "cross-check" and not "install".

SonarQube is a separate product from SQLFluff with a separate rule set, analysing PL/SQL for bugs, security issues, maintainability smells, and data-dictionary-aware rules [S86]. It is commercial, so it sits in the catalogue rather than the installable list — but if your estate already runs it, the pairing is cheap and the two fail on different things: SQLFluff on shape and style, SonarQube on PL/SQL correctness and code smells. Neither is a performance gate, and the reason is worth stating in the negative because it is the boundary people push against — a text analyser has no optimizer statistics, no data distribution, no bind values, no cursor environment, and no runtime row sources.

The honest answer is usually "candidate", and that label is useful rather than evasive. A candidate is a project you may evaluate on a disposable target. A replacement is a project you would be paged for.

**When the answer is unknown:** write the role as `UNKNOWN` and do not install. An unlabelled tool in a pipeline is how a research prototype quietly becomes production infrastructure.

## 6. The two-minute procedure

This is a time box, not a measurement. Two minutes of attention, four artifacts, one decision per gate. It is a procedure; how long it actually takes on your project is yours to record.

**Minute one, gates 1 and 2.** Open the licence file and record the grant as text, including a dual grant's branches. Then read the four dated fields: stars, last push, licence identifier, archive flag. Write the snapshot date next to them, and take the identifier you just confirmed in the licence file as one of the four.

**Minute two, gates 3 and 4.** Find the project's own statement of Oracle support and record the specific sentence, not a paraphrase. Then write the role line, and add whether the tool is candidate-only.

Four artifacts come out of it, and the unknown branch has a slot of its own:

**PLACEHOLDER — the four gate outputs. Fill all four before the install decision.**

```text
gate 1  licence grant as written:   ____________________
gate 2  snapshot date + 4 fields:   ____________________
gate 3  Oracle evidence sentence:   ____________________
gate 4  role line:                  ____________________
        role line says UNKNOWN:     yes / no
        candidate-only:             yes / no
```

A missing licence, a missing Oracle path, or missing maintenance evidence leaves you with a lead. A role line that says `UNKNOWN` means no install, whatever the other three gates say. An archived repository can still inform your design; it cannot borrow credibility from its stars.

## 7. The candidate lane is gated

The research repositories are a separate lane with a separate gate, and the gate is not maintenance. It is **verified Oracle dialect coverage**, which this ledger did not establish for any of them.

| Project            | Dated record status                                                                      | The gate that keeps it a candidate                              |
| ------------------ | ---------------------------------------------------------------------------------------- | --------------------------------------------------------------- |
| Bao for PostgreSQL | AGPL-3.0; 223 stars; push 2024-09-17; dormant                                            | Steers a different engine; Oracle hint mapping unverified [S53] |
| VeriEQL            | no confirmed licence; 27 stars; push 2026-03-26; active                                  | Bounded equivalence; Oracle coverage unverified [S50]           |
| SQLSolver          | Apache-2.0; 70 stars; push 2025-11-22; low activity                                      | Equivalence prover; Oracle coverage unverified [S49]            |
| WeTune             | Code location from a third-party report; no API-verifiable host, licence, stars, or push | Rule discovery evidence, not verified Oracle tooling [S48]      |
| QED                | Paper only; no repository checked                                                        | An equivalence decider with no code to run [S51]                |

The records are [S53](https://github.com/learnedsystems/baoforpostgresql) Bao for PostgreSQL, [S50](https://github.com/VeriEQL/VeriEQL) VeriEQL, [S49](https://github.com/SJTU-IPADS/SQLSolver) SQLSolver, [S48](https://ipads.se.sjtu.edu.cn/_media/publications/wetune_final.pdf) WeTune, and [S51](https://www.vldb.org/pvldb/vol17/p3602-wang.pdf) QED.

A research repository can be valuable without being a safe Oracle dependency. Preserve the role label and the dated facts, and keep the licence and the paper in separate columns, because they fail independently.

## Artifact

A vetting record per external tool, with the four gate outputs, the snapshot date, and one role line. The template is section 6. An unresolved licence, an undated snapshot, or a role line that reads `UNKNOWN` is a stop, and the record says which one it was.

**Decision:** licence, maintenance, Oracle fit, then role. A failed gate is a stop, not a note, and "not checked" is a status rather than a defect in the tool.
