---
title: The Parse-Lint-Test Trio That Is Safe to Use
description: 'What each OSS lane does for a candidate rewrite, where it stops, which lanes are candidate-only, and which T-IDs the lanes bear on.'
order: 62
draft: false
---

Parse, lint, and test are three different claims, and keeping them apart is the whole value of the trio. **Parse** says the text has structure. **Lint** says the text follows a selected set of mechanical rules. **Test** says the database returns the expected meaning. None of them says the plan is faster.

Separate the claims and the review loop gets shorter, because a failure names the layer that failed. Fuse them and a green CI badge hides which of the three actually ran.

This is the tooling page for the OSS chapter. The dated per-tool licence and maintenance inventory is on the [vetting page](/06-oss-guide/01-how-to-vet-oss/), and the executable stage order is the [static-checks toolbox page](/03-toolbox/04-static-checks-before-db-time/). Neither is repeated here. What this page adds is the boundary on each lane, and the lanes you may not promote past candidate.

> **Track:** Core (1–4) · Practice (5, 6) · Recovery (none) · Advanced / gated (none)
>
> **Prerequisites:** Basic SQL, a repository holding the candidate SQL text, and the [environment and setup hub](/00-preface/).
>
> **Evidence status:** The lane facts are C1/C2 records from this book's ledger, read at a dated repository snapshot on **2026-09-22 UTC**; the measurement layer is A1 Oracle documentation, and the candidate provers are B1 paper records. The [preface's class legend](/00-preface/01-why-evidence-grades/) defines what each class may support. **No live Oracle database was available**, so the offline blocks here are `ILLUSTRATIVE` shapes with no reported output and the database step is described, not run.
>
> **Next required page:** [What Has No OSS Replacement](/06-oss-guide/03-what-has-no-oss-replacement/).

## How this page is banded

| Band                 | Sections   |
| -------------------- | ---------- |
| **Core**             | 1, 2, 3, 4 |
| **Practice**         | 5, 6       |
| **Recovery**         | none       |
| **Advanced / gated** | none       |

- **Core (1, 2, 3, 4):** the four stages in order. Read them once; the [toolbox page](/03-toolbox/04-static-checks-before-db-time/) owns the executable gate.
- **Practice (5, 6):** two things you do with a real project and a real candidate in hand: attach the boundary to each lane, and check which T-ID the change actually touches.
- **Recovery (none):** nothing on this page changes a database object, so nothing here needs an undo. The rollback belongs to the change class the gate protects.
- **Advanced / gated (none):** nothing here is gated. The equivalence provers are candidate-only, and section 5 says why without turning that lane into a section of its own.

## 1. Parse before you rewrite

The useful output of a parse stage is a **diff**. A dropped predicate, a changed join key, a hint moved across a boundary, or a rewritten expression should be visible as text before anyone spends database time on it.

**ILLUSTRATIVE — local Python with sqlglot installed. No database and no Oracle client. Expected output: both statements printed back in Oracle dialect, so the diff is visible. Not executed here.**

```python
import sqlglot

before = sqlglot.parse_one(
    "SELECT customer_id FROM orders WHERE order_date >= :start_date",
    read="oracle",
)
after = sqlglot.parse_one(
    "SELECT customer_id FROM orders WHERE order_date >= :start_date AND status = 'OPEN'",
    read="oracle",
)

print(before.sql(dialect="oracle"))
print(after.sql(dialect="oracle"))
```

A successful parse is a structural checkpoint, not an equivalence proof. The parser does not know whether your application intended outer-join semantics, duplicate elimination, null handling, or bind behaviour. That is the [semantic fixture](/00-preface/02-how-to-prove-a-win/)'s job, and the difference between the two claims is the reason this stage is worth running on its own.

Parsing a hint is not validating it either. Confirm hint use through the release-supported hint report in the 19c `DBMS_XPLAN` reference, and re-check the call on your installed release. [S05](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html)

## 2. Lint the rules, not the problem

SQLFluff is a mechanical gate, and the words that matter are **configured rules**. Start from the documented Oracle dialect and keep the rule set in the repository.

**ILLUSTRATIVE — read-only local shell with SQLFluff installed; no database. `lint` reports and changes nothing. Expected output: one pass or fail result per file, with rule violations listed. Not executed here.**

```bash
sqlfluff lint --dialect oracle queries/sales_report.sql
```

**MUTATING — ILLUSTRATIVE — local shell with SQLFluff installed; no database. `fix` rewrites the candidate file in place, so run it only where the rewrite is reviewable and revertible, and keep the `lint` result above as the record of what was wrong. Expected output: the files it rewrote, each reviewed as a diff. Not executed here.**

```bash
sqlfluff fix --dialect oracle queries/sales_report.sql
```

A file can pass lint and still return the wrong rows. A linter does not know what a billing predicate means, which partition holds a region, or whether the chosen join is cheap. It also does not know the rule set you have not configured, so "no violations" is a statement about the configuration and not about the SQL.

Say the sentence the tool licenses: **the selected rules passed**. A tool's defaults are not an Oracle performance policy, and a new rule suppression deserves the same review as the rule it replaces.

## 3. Test behavior where it matters

Parsing and linting happen before the database. Behavior tests happen inside a disposable database or schema, and they are the only stage that can say the rewrite still means the same thing.

A fixture that asserts only "the command ran" is a smoke test. Depending on the change, assert the returned row count, a known aggregate or checksum, duplicate and null behavior, the error behavior for invalid input, and the result for a bind value at the edge of the distribution. A row count alone is weak, because a count can stay constant while values, ordering, or nulls change.

Keep fixtures small enough to diagnose. A test asserting a vague business rule with no concrete expected result is documentation, not a gate. Run both candidates with the same binds and the same fetch shape, and settle the ordering question on purpose: assert a specific order if the contract requires one, and add an explicit `ORDER BY` to both sides if it does not. A checksum comparison is order-sensitive, and an unstable order makes a result fail for reasons unrelated to the rewrite.

## 4. Measure with Oracle, then script the edges

Everything above is free. This stage is not, and it is the only one that can support a performance claim.

The measurement decision belongs to Oracle. Freeze the workload in a SQL Tuning Set, capture the executed plan, run a before trial, apply one change, run the after trial, and compare the workload per statement. `DBMS_SQLPA` supplies that comparison; the [SPA recipe](/04-recipes/02-before-after-with-spa/) owns the block sequence and the task lifecycle, and the [noise floor policy](/05-feedback-loop/02-noise-floor-and-repetition/) owns how many samples make the difference real. [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html) [S18](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/managing-sql-tuning-sets.html)

A driver is what makes the edges scriptable: capture, trial, poll, save, and fail loudly. It is a harness, and the distinction is worth defending in review, because a Python function that prints a comparison is not SQL Performance Analyzer.

**MUTATING — ILLUSTRATIVE. Connects to a database and reads a saved report, so it needs a service and a schema. Not executed here. Substitute your own task name and confirm every argument on the installed release. Expected output: the saved comparison report's first lines.**

```python
import os
import oracledb

connection = oracledb.connect(
    user=os.environ["ORA_USER"],
    password=os.environ["ORA_PASSWORD"],
    dsn=os.environ["ORA_DSN"],
)
try:
    with connection.cursor() as cursor:
        cursor.execute(
            "SELECT report FROM DBA_ADVISOR_REPORTS WHERE task_name = :task",
            task="<known-analysis-task-name>",
        )
        print(cursor.read()[0].read())
finally:
    connection.close()
```

Three edges are worth scripting beyond the call itself: **binds and identity**, so both sides ask the same question; **the UTC window**, so a later reader can join the run to a plan; and **the status check**, so an errored or timed-out task is never read as a result.

Package names, signatures, and client assumptions change by release, so confirm the call against the installed reference. If SQL\*Plus is part of the procedure, the 19c client guide is the boundary to cite, and a newer control such as SQL Quarantine needs its own release check. [S79](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqpug/) [S40](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLQ.html)

## 5. The lane boundaries

Each lane below names what it may decide and what it may not. Licence and maintenance are not in this table; they are the dated inventory on the [vetting page](/06-oss-guide/01-how-to-vet-oss/), and the column that decides an install is there.

| Lane                | Boundary for an Oracle workload                        | Candidate-only |
| ------------------- | ------------------------------------------------------ | -------------- |
| Parse and normalize | Structure and diff, never equivalence                  | No             |
| Lint                | Configured mechanical rules, never meaning             | No             |
| Behavior test       | Meaning, never performance under real load             | No             |
| Driver and harness  | Orchestration, never the tuning decision               | No             |
| Load                | Pressure only, with rights still an open gate          | No             |
| Diagnostics bundle  | Packaging, conditional on an Oracle cross-check        | No             |
| Rule framework      | Candidates, and correctness only if coverage is proven | Yes            |
| Equivalence provers | A hypothesis to test, never a gate on a rewrite        | Yes            |

Every row is a C1/C2 record at the **2026-09-22 UTC** snapshot: [S60](https://github.com/tobymao/sqlglot) sqlglot, [S61](https://github.com/sqlfluff/sqlfluff) SQLFluff, [S63](https://github.com/utplsql/utplsql) utPLSQL, [S64](https://github.com/oracle/python-oracledb) python-oracledb, [S65](https://github.com/TPC-Council/HammerDB) HammerDB, [S62](https://calcite.apache.org/) Calcite, and the collectors, where one record covers two projects: [S67](https://github.com/mauropagano/sqld360) SQLd360 and [SQLdb360](https://github.com/sqldb360/sqldb360). The prover lane is B1 paper and repository evidence: [S48](https://ipads.se.sjtu.edu.cn/_media/publications/wetune_final.pdf) WeTune, [S49](https://github.com/SJTU-IPADS/SQLSolver) SQLSolver, [S50](https://github.com/VeriEQL/VeriEQL) VeriEQL, [S51](https://www.vldb.org/pvldb/vol17/p3602-wang.pdf) QED.

Two rows carry the boundary that matters most in review. The **load** lane is the only one where rights are still open in this ledger, so it needs a licence decision before a run, and the [load gate](/03-toolbox/03-load-test-without-prod/) is where the run is owned. The **prover** lane is the only one where a paper's claim could be mistaken for a guarantee; each prover needs its own verified Oracle dialect coverage before it can reject a rewrite, and none of them has it here.

## 6. The technique map

The catalog assigns T-IDs, and this chapter set touches four of them. The T-number lookup table in the [citations page](/07-appendix-sources/01-how-citations-work/) says which page owns each range.

| T-ID | What the catalog entry is                                                     | Where the method is taught                                                       |
| ---- | ----------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| T-58 | Application design and SQL performance methodology, the pre-production method | [How to Prove a Win](/00-preface/02-how-to-prove-a-win/)                         |
| T-59 | Bind variables and cursor-reuse conventions                                   | [Stabilize and Ship Safely](/01-proven-techniques/05-stabilize-and-ship-safely/) |
| T-60 | Test-environment deployment before a production change                        | [Safe DDL and CI Gates](/04-recipes/04-safe-ddl-and-ci-gates/)                   |
| T-61 | The automatic SQL Transpiler, which is Oracle's own                           | [Let Oracle Rewrite](/01-proven-techniques/04-let-oracle-rewrite/)               |

The four descriptions in the second column are the catalog's, not this page's: the lanes below bear on T-58 and T-60, they do not redefine them, and the parse/lint/assert stages are this page's own contribution to a method whose entry point is T-58. T-58 is also taught on [Measure First](/01-proven-techniques/01-measure-first/), because the target worksheet has to be filled in before a candidate means anything, and T-60 is also owned by the [accept-or-rollback gate](/05-feedback-loop/03-accept-or-rollback-gate/), because a fixture that passes is still a change that needs a verdict.

T-61 is the one to be careful about. The automatic SQL Transpiler is an Oracle feature with its own eligibility rules and its own release boundary, and an OSS parser has no role in enabling it. It appears here only because a transpiler candidate is text you should parse and diff like any other. [S46](https://docs.oracle.com/en/database/oracle/oracle-database/26/nfcoa/oracle-ai-database-26ai-new-features-guide.pdf) — the 26ai New Features Guide, so a later release than this book's primary 19c; confirm the feature on your installed release.

## Artifact

A gate record with one row per stage that ran, and an explicit `NOT RUN` for each stage that did not:

- [ ] Oracle-dialect parser used, before and after structures diffed
- [ ] SQLFluff configuration and selected rules recorded, described as "selected rules passed"
- [ ] Result assertions cover rows, duplicates, nulls, datatypes, collation, exceptions, and the relevant aggregates
- [ ] Both candidates compared with the same binds and fetch shape, and the ordering decision recorded as a contract requirement or a test-only stabilization
- [ ] Frozen set captured, before and after trials named, and the comparison report saved whole
- [ ] Task status checked, and the named execution verified before the numbers were read
- [ ] Lane boundary and snapshot date recorded for every tool in the chain
- [ ] Provers marked candidate-only, with the coverage that is still unverified
- [ ] Verdict written with the artifacts from every stage that ran

The same record, as a block you can fill in and keep with the run:

**PLACEHOLDER — the gate record as a fill-in block. One per candidate. A stage left blank is `NOT RUN`, which is not the same as passed.**

```text
stage 1  parse result and structure diff:  ____________________
stage 2  lint config and selected rules:   ____________________
stage 3  fixture rows, aggregates, errors: ____________________
stage 4  frozen set name, trial names:     ____________________
stage 5  task status and execution named:  ____________________
stages NOT RUN:                            ____________________
verdict, with the artifact behind it:      ____________________
rollback artifact and its proof:           ____________________
```

The offline blocks above are `ILLUSTRATIVE` shapes and the harness block is a `MUTATING` shape. None of them has been run, and the lane facts are repository records rather than results.

Source IDs and technique IDs resolve in [Appendix Sources](/07-appendix-sources/).

**Decision:** parse the text, lint the configured rules, assert the meaning, and let Oracle measure the claim. A stage that has not run is a stage that has not passed.

**Next required page:** [What Has No OSS Replacement](/06-oss-guide/03-what-has-no-oss-replacement/).
