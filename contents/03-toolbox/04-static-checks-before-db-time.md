---
title: Static Checks Before DB Time
description: Parse, lint, and regression-test SQL before you spend DB time.
order: 34
draft: false
---

Most expensive SQL mistakes are not exotic. They are a dropped predicate, an accidental cross join, an unqualified column, a changed fetch shape, or a rewrite that returns different rows.

Static checks catch some of those before Oracle spends a minute on them. They do not catch every semantic or plan problem. The gate is useful because it is cheap, not because it is magic.

> **Execution boundary:** the examples below are local tooling patterns, not live Oracle results. Keep production data out of the parse and lint stage. Run behavior tests only against a controlled test database.

## 1. Parse and normalize the candidate

Use `sqlglot` with the Oracle dialect to make the SQL text inspectable before it reaches the database:

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

A parse pass proves that the tool can represent the text. It does not prove that the database will choose the same semantics, that a hint is valid, or that a predicate is selective. Dialect coverage and edge cases still need tests.

Apache Calcite with `OracleSqlDialect` is another normalization and rule-checking option. It can help compare relational structures before execution. It is not an Oracle behavior test.

## 2. Lint the configured rules

SQLFluff supports the Oracle dialect and works as a CLI, Python API, and CI gate:

```bash
sqlfluff lint --dialect oracle queries/sales_report.sql
sqlfluff fix --dialect oracle queries/sales_report.sql
```

A clean run means the selected rules passed. It does **not** mean all shape faults are gone. Rule coverage depends on the configuration, disabled rules, parser limitations, and the SQL features present in your project. Keep the configuration in version control and review new rule suppressions.

Use lint to catch mechanical problems such as ambiguous aliases, formatting drift, or configured join conventions. Use behavior tests to catch meaning changes.

## 3. Lock behavior with assertions

A row count is a weak oracle. A count can stay the same while values, ordering, duplicates, or null handling change. Assert the rows and the business-relevant aggregates.

utPLSQL runs tests inside Oracle and is the current practical behavior gate for SQL and PL/SQL changes. A test should run the old and new query against controlled fixtures and compare the expected result set or checksum, not only the elapsed time.

A `python-oracledb` harness is useful when the test is easier to express in Python. Use the same binds, fetch shape, and deterministic ordering for both candidates. The driver removes client-library requirements in thin mode; it does not remove the need for a test database.

## 4. Keep equivalence provers in the candidate lane

WeTune, SQLSolver, VeriEQL, and QED are research systems with relevant ideas for rewrite discovery and semantic verification. Their Oracle dialect support was not verified in this book’s evidence pass. Keep them labeled **CANDIDATE for Oracle**.

A formal proof, if it ever becomes available for your dialect and constraints, would complement tests; it would not replace tests for null semantics, bind behavior, data distribution, or application contracts. Today, a passing behavior suite plus a measured SPA result is the honest path.

## 5. Use the gate in this order

1. Parse the candidate with the Oracle dialect.
2. Normalize and diff the AST or relational form.
3. Run the configured SQLFluff rules.
4. Run result assertions on controlled data.
5. Create a frozen STS and run the SPA trials.
6. Test under realistic concurrency if the change can affect contention or resource use.

A lint failure blocks the next stage. A parse failure blocks the next stage. A behavior failure blocks the next stage. A clean static pass earns DB time; it does not earn a promotion.

## Illustrative scenario

A rewrite parses cleanly and passes the enabled SQLFluff rules. The test suite finds that rows with `status = 'CANCELLED'` disappeared. The linter did its configured job. The rewrite failed the actual contract.

## Output checklist

- [ ] Oracle dialect parser used
- [ ] Before and after structures diffed
- [ ] SQLFluff configuration and selected rules recorded
- [ ] Clean lint described as “selected rules passed,” not “all faults clear”
- [ ] Result assertions cover rows, duplicates, nulls, and relevant aggregates
- [ ] Equivalence provers marked CANDIDATE for Oracle
- [ ] SPA and load gates remain separate

## References

- [sqlglot](https://github.com/tobymao/sqlglot)
- [SQLFluff](https://docs.sqlfluff.com/)
- [SQLFluff dialect reference](https://docs.sqlfluff.com/en/stable/reference/dialects.html)
- [Apache Calcite OracleSqlDialect](https://calcite.apache.org/javadocAggregate/org/apache/calcite/sql/dialect/OracleSqlDialect.html)
- [utPLSQL](https://github.com/utplsql/utplsql)
- [python-oracledb](https://github.com/oracle/python-oracledb)
- [VeriEQL](https://github.com/VeriEQL/VeriEQL)
- [SQLSolver](https://github.com/SJTU-IPADS/SQLSolver)

**Keep this: lint the text, test the meaning, then measure the SQL.**
