---
title: The Parse-Lint-Test Trio That Is Safe to Use
description: sqlglot for parse, SQLFluff for lint, utPLSQL for test, plus a Python harness.
order: 62
draft: false
---

Parse, lint, and test are three different claims. Parse says the text has structure. Lint says the text follows selected mechanical rules. Test says the database returns the expected meaning. None of them says the plan is faster.

Keep that separation and the review loop gets shorter. A failure should tell you which layer failed instead of hiding inside one green CI badge.

## 1. Parse before you rewrite

Use an Oracle-aware parser to turn the before and after statements into comparable trees. The useful output is the diff: a removed predicate, a changed join key, a hint moved across a boundary, or a rewritten expression.

A small starting shape is:

```python
from sqlglot import parse_one

before = parse_one(sql_before, read="oracle")
after = parse_one(sql_after, read="oracle")
```

The parser gives you a mechanical representation. It does not know whether your application intended outer-join semantics, duplicate elimination, null handling, or bind behavior. A successful parse is a structural checkpoint, not an equivalence proof.

sqlglot's dated repository snapshot was MIT, 9,628 stars, last pushed 2026-09-21, and active under this pass's rule. Oracle is documented as a dialect. [S60](https://github.com/tobymao/sqlglot) [S60](https://sqlglot.com/sqlglot/dialects.html) Apache Calcite's dated snapshot was Apache-2.0, 5,186 stars, last pushed 2026-09-21, with `OracleSqlDialect`. Use it when you need a rule framework, not as a claim that Oracle will choose the resulting plan. [S62](https://calcite.apache.org/javadocAggregate/org/apache/calcite/sql/dialect/OracleSqlDialect.html)

Parsing hint text is also not hint validation. Confirm hint use through the release-supported `DBMS_XPLAN` hint report. [S05](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html)

## 2. Lint the rules, not the whole problem

SQLFluff is a mechanical gate. Start with the documented Oracle dialect:

```bash
sqlfluff lint --dialect oracle path/to/query.sql
```

The same file can pass lint and still return the wrong rows. A linter does not understand the domain meaning of a billing predicate, a regional partition, or a bind-sensitive join. It also does not know whether the chosen plan is cheaper.

The dated SQLFluff snapshot was MIT, 9,883 stars, last pushed 2026-09-21, and active under the pass's rule. [S61](https://github.com/sqlfluff/sqlfluff) [S61](https://docs.sqlfluff.com/en/stable/reference/dialects.html)

Use lint for the work it owns: formatting, naming rules, configured mechanical checks, and consistent review noise. Keep the rule set in the repository. A tool's default rules are not an Oracle performance policy.

## 3. Test behavior where it matters

Parsing and linting happen before the database. Behavior tests happen inside a disposable Oracle database or schema.

With utPLSQL, a fixture should assert more than “the command ran.” Depending on the change, check:

- returned row count;
- a known aggregate or checksum;
- duplicate and null behavior;
- error behavior for invalid input;
- the result for a bind value at the edge of the distribution.

The dated utPLSQL snapshot was Apache-2.0, 624 stars, last pushed 2026-09-18, and active. Its current README names Oracle Database 19c or newer. [S63](https://github.com/utplsql/utplsql) [S63](https://www.utplsql.org/)

Keep fixtures small enough to diagnose. A test that asserts a vague business rule without a concrete expected result is documentation, not a gate. A test that asserts exact rows, aggregates, and error cases can stop a rewrite before it reaches a performance run.

## 4. Measure with Oracle, then script the edges

python-oracledb is the harness boundary. It can connect, execute statements, collect measurements, and call release-supported Oracle package procedures. [S64](https://github.com/oracle/python-oracledb)

The measurement decision still belongs to Oracle:

1. Freeze the workload in a SQL Tuning Set.
2. Capture the executed plan with `DBMS_XPLAN`.
3. Run the before trial.
4. Apply one change.
5. Run the after trial.
6. Compare the workload and inspect per-statement regressions.

`DBMS_SQLPA` supplies the before/after comparison. python-oracledb supplies a way to orchestrate the call. That distinction matters because a Python script with a `compare` function is not SQL Performance Analyzer. [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html) [S18](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/managing-sql-tuning-sets.html)

Package names, signatures, and client assumptions change by release. If you use SQL*Plus in the procedure, cite the 19c SQL*Plus guide [S79](https://docs.oracle.com/en/database/oracle/oracle-database/19/sqpug/) and verify the installed client. If a script uses SQL Quarantine or another newer API, verify the current package reference before writing the call. [S40](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLQ.html)

## Where the candidates fit

VeriEQL, SQLSolver, WeTune, and QED are research candidates for equivalence or rewrite verification. Their papers and repositories do not establish Oracle dialect coverage in this pass. Keep them labeled as candidates. [S48](https://dl.acm.org/doi/10.1145/3514221.3526125) [S49](https://github.com/SJTU-IPADS/SQLSolver) [S50](https://github.com/VeriEQL/VeriEQL) [S51](https://www.vldb.org/pvldb/vol17/p3602-wang.pdf)

QueryBooster is also a candidate: its paper is in the corpus, but Oracle support was not verified. [S80](https://doi.org/10.14778/3611479.3611497)

## The technique map matters

- **T-58**, application design and SQL performance methodology, belongs in the measurement and proof chapters, not in a generic “tools” appendix.
- **T-59**, bind variables and cursor reuse, belongs in the stabilization chapter.
- **T-60**, test-environment deployment before production, belongs in the safe-DDL/CI and accept-or-rollback chapters.
- **T-61**, the automatic SQL Transpiler, belongs in the rewrite and control chapters. It is release-sensitive and applies only to eligible PL/SQL constructs. [S46](https://docs.oracle.com/en/database/oracle/oracle-database/26/nfcoa/oracle-ai-database-26ai-new-features-guide.pdf)

The full source ledger remains in `.agents/research/07-sources-bibliography.md`; this published page gives the compact map and the links needed to use it.

## The artifact

A useful pipeline leaves four receipts: an AST or parse result, a lint result, a behavior-test result, and an Oracle before/after report. The first three stop bad text. The fourth decides whether the change earned its place.

**Parse the text. Lint the rules. Test the meaning. Let Oracle measure the claim.**
