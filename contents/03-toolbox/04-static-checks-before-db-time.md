---
title: Static Checks Before DB Time
description: Parse, lint, assert, and gate a candidate before it spends a minute of database time.
order: 34
draft: false
---

Most expensive SQL mistakes are not exotic. They are a dropped predicate, an accidental cross join, an unqualified column, a changed fetch shape, or a rewrite that returns different rows.

Static checks catch some of those before Oracle spends a minute on them. They do not catch every semantic or plan problem. The gate earns its place because it is cheap, not because it is magic. This page is where the open-source bridge lives: parse and lint offline, lock behavior with assertions, keep equivalence provers in the candidate lane, and run the stages in an order a CI can follow.

> **Track:** Core (1, 2) · Practice (3, 5) · Recovery (none) · Advanced / gated (4)
>
> **Prerequisites:** Basic SQL, a repository where the candidate SQL text lives, and a controlled test database for the assertion stage.
>
> **Evidence status:** The tools below are C1/C2 records from this guide's ledger with their licenses verified at the recorded repository snapshot: sqlglot [S60](https://github.com/tobymao/sqlglot), SQLFluff [S61](https://docs.sqlfluff.com/), Apache Calcite [S62](https://calcite.apache.org/), utPLSQL [S63](https://github.com/utplsql/utplsql), and python-oracledb [S64](https://github.com/oracle/python-oracledb). The provers are B1 research records: WeTune's paper and its reproducibility report [S48](https://ipads.se.sjtu.edu.cn/_media/publications/wetune_final.pdf), SQLSolver's repository [S49](https://github.com/SJTU-IPADS/SQLSolver), VeriEQL's repository [S50](https://github.com/VeriEQL/VeriEQL), and QED's paper [S51](https://www.vldb.org/pvldb/vol17/p3602-wang.pdf). Two commercial instruments are named in the lint and rewrite lanes and are catalogued rather than endorsed: SonarQube [S86] and a rewrite engine [S84], both C1 vendor documentation recording what a product claims to do and not a result on your database. **No live Oracle database was available**, and no tool run is reported here. Local blocks are labeled `ILLUSTRATIVE`.
>
> **Next required page:** [Recipes You Can Script](/04-recipes/).

## How this page is banded

| Band                 | Sections |
| -------------------- | -------- |
| **Core**             | 1, 2     |
| **Practice**         | 3, 5     |
| **Recovery**         | none     |
| **Advanced / gated** | 4        |

- **Core (1, 2):** parse and lint run offline against SQL text. No database, no privilege, no entitlement; a failure is visible in the editor.
- **Practice (3, 5):** assertions run against a controlled test database, and the gate order is what you apply on a real ticket before database time is spent.
- **Recovery (none):** nothing here changes a database object, so nothing here needs an undo. The rollback belongs to the change class that follows the gate.
- **Advanced / gated (4):** the provers are research artifacts whose Oracle dialect support was not verified. Gated on that verification, which is why they stay in the candidate lane.

## 1. Parse and normalize the candidate

Use `sqlglot` with the Oracle dialect to make the SQL text inspectable before it reaches the database:

**ILLUSTRATIVE — local Python with sqlglot installed; no database and no Oracle client. Expected output: both statements printed back in Oracle dialect, so the diff is visible.**

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

sqlglot is MIT at the recorded snapshot, with Oracle listed among its dialects [S60]. A parse pass proves the tool can represent the text. It does not prove that the database will choose the same semantics, that a hint is valid, or that a predicate is selective.

Apache Calcite with `OracleSqlDialect` is another normalization and rule-checking option, Apache-2.0 at the recorded snapshot [S62]. It can help compare relational structures before execution. It is not an Oracle behavior test, and a generated relational form is a candidate, not a result.

## 2. Lint the configured rules

SQLFluff supports the Oracle dialect and works as a CLI, a Python API, and a CI gate. It is MIT at the recorded snapshot, with Oracle named in its dialect reference [S61]:

**ILLUSTRATIVE — read-only local shell with SQLFluff installed; no database. `lint` reports and changes nothing. Expected output: one pass/fail result per file, with rule violations listed.**

```bash
sqlfluff lint --dialect oracle queries/sales_report.sql
```

**MUTATING — ILLUSTRATIVE — local shell with SQLFluff installed; no database. `fix` rewrites the candidate file in place, so it is a state change like any other: run it on a branch where the rewrite is reviewable and revertible, and keep the `lint` result above as the record of what was wrong. Expected output: the files it rewrote, each reviewed as a diff before it goes anywhere.**

```bash
sqlfluff fix --dialect oracle queries/sales_report.sql
```

A clean run means the selected rules passed. It does not mean all shape faults are gone. Rule coverage depends on the configuration, disabled rules, parser limitations, and the SQL features present in your project. Keep the configuration in version control and review new rule suppressions.

Use lint to catch mechanical problems such as ambiguous aliases, formatting drift, or configured join conventions. Use behavior tests to catch meaning changes.

SQLFluff is one lane, not the only one. SonarQube analyses PL/SQL for bugs, security issues, maintainability smells, and data-dictionary-aware rules, and it is a separate product with a separate rule set rather than a second SQLFluff configuration [S86]. If your PL/SQL is in version control, running both is cheap and they fail on different things: SQLFluff on shape and style, SonarQube on code smells and PL/SQL-specific correctness. Neither one is a performance gate, and the reason is worth stating once, in the negative, because it is the boundary people push against: **a text linter has no optimizer statistics, no data distribution, no bind values, no cursor environment, and no runtime row sources.** It cannot know whether your predicate is selective on your data, so it cannot tell you that your rewrite is cheaper. Use these tools in CI for correctness and maintainability, and do not go looking for a setting that turns them into a performance gate. There isn't one.

## 3. Lock behavior with assertions

A row count is a weak oracle. A count can stay the same while values, ordering, duplicates, or null handling change. Assert the rows and the business-relevant aggregates.

utPLSQL runs tests inside Oracle and is the practical behavior gate for SQL and PL/SQL changes. It is Apache-2.0 at the recorded snapshot, and its README requires Oracle Database 19c or newer [S63]. A test should run the old and new query against controlled fixtures and compare the expected result set or checksum, not only elapsed time.

Run both candidates with the same binds and the same fetch shape. Then decide the ordering question on purpose rather than by habit.

A checksum comparison is order-sensitive, so an unordered result set can fail, or pass, for reasons that have nothing to do with the rewrite. There are two defensible answers and you have to pick one and write it down. If the contract requires a specific order, the candidate must reproduce that order, and the test asserts it. If the contract does not, add an explicit `ORDER BY` to _both_ sides of the test so the comparison is stable, and do not let the candidate inherit an ordering requirement it never had. Asserting a deterministic order as though it were always required quietly turns a SQL implementation detail into a contract, and the next person to touch that query inherits a rule nobody chose.

Four more things belong in that assertion, because they are the ones a rewrite actually breaks:

- **Duplicates.** A rewrite that adds or removes a `DISTINCT` keeps the row count and changes the meaning.
- **Nulls.** `NULL` handling is where outer-join rewrites live or die, and a count will not show it.
- **Datatypes.** A rewrite can return the same values under a different type, and a client that formats dates or numbers will render them differently.
- **Collation and sort order.** The same characters in a different collation sort differently, so an ordered result can change without any value changing.

Exceptions are the fifth. A rewrite that raises where the original returned rows, or returns where the original raised, passes a comparison you never ran because one side aborted.

A `python-oracledb` harness is useful when the test is easier to express in Python. The driver is dual-licensed UPL-1.0 OR Apache-2.0 at the recorded snapshot [S64], and its thin mode removes the client-library requirement. It does not remove the need for a test database, and it is not an optimizer, an advisor, or a before/after judge.

## 4. Keep equivalence provers in the candidate lane

WeTune, SQLSolver, VeriEQL, and QED are research systems with relevant ideas for rewrite discovery and semantic verification. None of them is a production gate, and none of them has verified Oracle dialect coverage.

| Prover    | What the record says                                                                   | License and record status                   |
| --------- | -------------------------------------------------------------------------------------- | ------------------------------------------- |
| WeTune    | SIGMOD 2022 paper plus a third-party reproducibility report; no official repo verified | Paper and report only [S48]                 |
| SQLSolver | Unbounded-equivalence prover, SIGMOD 2024, dedicated artifacts repo                    | Apache-2.0; Oracle support unverified [S49] |
| VeriEQL   | Bounded equivalence with integrity constraints, OOPSLA 2024                            | No license declared in the repository [S50] |
| QED       | Query equivalence decider, PVLDB 17:3602                                               | Paper only; no repository verified [S51]    |

Keep them labeled **CANDIDATE for Oracle**. A formal proof, if it ever becomes available for your dialect and your constraints, would complement tests; it would not replace tests for null semantics, bind behavior, data distribution, or application contracts. Today, a passing behavior suite plus a measured comparison is the honest path.

### Review what a rewrite engine handed you

This page's stages matter most when the candidate was not written by you. A commercial rewrite engine generates a large set of alternatives, executes them, and ranks them by measured statistics [S84]. That is genuinely useful, and it is not a review.

Three things to hold onto, and the first is the one people get wrong.

**A generated rewrite is optimized for a plan, and a plan does not know what your query means.** The places generated rewrites most often change meaning are null handling, duplicate elimination, outer-join semantics, ordering, date and time conversion, and floating-point behavior. The last two are the ones people forget, because each looks like an arithmetic identity and neither is. A rewrite that changes the expression a date is built from can move a boundary, and a rewrite that reassociates floating-point arithmetic changes the low-order digits. Both pass a row count.

**If the engine ran its candidates against production, it created load, polluted the buffer cache, consumed TEMP, and — if any candidate was a DML statement — may have written to your tables.** A benchmark that mutates the system it is measuring is not a benchmark. Every alternative this book tests runs against a target you are allowed to change, with the rollback written before the run starts.

**A winner for one bind value, in one cache state, is a winner for that one case.** A rewrite that is 3× faster at `dept_id = 1` and 2× slower at `dept_id = 99999` has not won. That is why the bind manifest and the [frozen set](/03-toolbox/02-freeze-work-with-sts/) come before the measurement, and why representative bind classes are part of the candidate rather than something you check afterwards if the first number looks good.

## 5. Use the gate in this order

Run these stages in order, and stop at the first failure:

1. Parse both candidates with the Oracle dialect. A parse failure blocks the next stage.
2. Normalize and diff the AST or relational form, and put the diff in the review.
3. Run the configured SQLFluff rules from the repository configuration. A lint failure blocks the next stage.
4. Run result assertions against controlled fixtures on a test database. A behavior failure blocks the next stage.
5. Create the frozen set and run the controlled comparison, using the [STS runbook](/03-toolbox/02-freeze-work-with-sts/) and the [SPA recipe](/04-recipes/02-before-after-with-spa/).
6. If the change can affect contention or resource use, run the [load gate](/03-toolbox/03-load-test-without-prod/).
7. Record the verdict with the artifacts from every stage that ran.

A clean static pass earns database time. It does not earn a promotion, and a green CI badge is not a performance claim.

**ILLUSTRATIVE — a scenario, not a measurement.** A rewrite parses cleanly and passes the enabled SQLFluff rules. The test suite finds that rows with `status = 'CANCELLED'` disappeared. The linter did its configured job; the rewrite failed the actual contract.

## Artifact

A gate record with one row per stage:

- [ ] Oracle dialect parser used, before and after structures diffed
- [ ] SQLFluff configuration and selected rules recorded; SonarQube run separately if PL/SQL is in version control [S86]
- [ ] Clean lint described as "selected rules passed," not "all faults clear"
- [ ] Result assertions cover rows, duplicates, nulls, datatypes, collation, exceptions, and relevant aggregates
- [ ] Both candidates compared with the same binds and fetch shape; the ordering decision recorded as a contract requirement or a test-only stabilization
- [ ] If the candidate came from a rewrite engine, the semantic review covered date/time conversion and floating-point reassociation
- [ ] No candidate executed against production
- [ ] Equivalence provers marked CANDIDATE for Oracle, with their license and record status
- [ ] Controlled comparison and load gate kept as separate stages
- [ ] Verdict written with the artifacts from every stage that ran

The blocks above are `ILLUSTRATIVE` local tooling shapes, and the tool facts are repository and documentation records rather than results.

Source IDs and technique IDs resolve in [Appendix Sources](/07-appendix-sources/).

**Decision:** lint the text, test the meaning, then measure the SQL. A stage that has not run is a stage that has not passed.

**Next required page:** [Recipes You Can Script](/04-recipes/).
