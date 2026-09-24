---
title: Let Oracle Rewrite
description: OR expansion, unnesting, star paths, and safe approximations.
order: 14
draft: false
---

Usually, do not hand-rewrite a query before you understand the plan. Oracle already has documented transformations for several common shapes.

Your job is narrower and more useful: make the query eligible, read the operation Oracle chose, verify that the result still means the same thing, and measure the change.

## The transformation set

T-34 through T-44 contain **10 transformations plus the T-42 mechanism note**. T-42 explains how cursor-duration temporary tables support the temporary-table transformation. It is not a separate fix that you hand-force.

| ID   | Transformation                 | What to look for                                                        |
| ---- | ------------------------------ | ----------------------------------------------------------------------- |
| T-34 | OR expansion                   | `CONCATENATION` with separate access paths                              |
| T-35 | View merging                   | The view boundary disappears from the plan                              |
| T-36 | Predicate pushing              | The filter appears earlier in the relevant view block                   |
| T-37 | Subquery unnesting             | `HASH JOIN SEMI` or `HASH JOIN ANTI` replaces a filter pattern          |
| T-38 | Star transformation            | `STAR TRANSFORMATION` on a qualifying star workload                     |
| T-39 | Join factorization             | A repeated join is factored across `UNION` branches                     |
| T-40 | Table expansion                | `UNION ALL` uses indexed and full-scan portions where eligible          |
| T-41 | Temporary-table transformation | An internal temporary row source appears when the criteria fit          |
| T-43 | In-memory aggregation          | `VECTOR GROUP BY` on an eligible In-Memory scan                         |
| T-44 | Approximate query processing   | An approved approximate function replaces an exact calculation          |
| T-42 | Mechanism note                 | Cursor-duration temporary tables explain T-41; do not force it yourself |

These are eligibility-driven transformations, not switches every query gets. The optimizer applies them when the shape, statistics, cost, and release conditions line up. [S24] [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/)

## 1. Give ORs and views a legal cheaper shape

An `OR` predicate can prevent one useful index from serving the whole statement. If the branches are eligible, OR expansion can expose separate access paths:

```sql
SELECT *
FROM employees
WHERE dept_id = 10
   OR salary > 200000;
```

Look for `CONCATENATION` and inspect each branch. Do not force the transformation if one indexed path already serves the predicate and the extra branch costs more. Measure both plans. [T-34]

Views can also hide a filter behind a row source. View merging and predicate pushing can remove that boundary and let the optimizer choose access earlier. The result must be the same. A transformation that improves the plan but changes duplicate handling, null behavior, or outer-join semantics is not an optimization; it is a bug. [T-35][T-36]

## 2. Turn subqueries and star queries into sets when eligible

A subquery that expresses existence or absence can sometimes become a semijoin or antijoin instead of a repeated filter pattern:

```sql
SELECT d.name
FROM departments d
WHERE NOT EXISTS (
  SELECT 1
  FROM employees e
  WHERE e.dept_id = d.id
);
```

The executed plan may show `HASH JOIN ANTI`. That is evidence of a transformation, not evidence of a speedup. Run V0 and check the returned rows. The same rule applies to star transformation, join factorization, and table expansion: each has documented preconditions, and none should be treated as a universal rewrite. [T-37][T-38][T-39][T-40]

A star transformation, for example, depends on the qualifying star pattern, configuration, and access structures. A temporary-table transformation depends on the optimizer's internal criteria. T-41 is a plan event to investigate; T-42 is the mechanism note that explains it. [T-41][T-42]

## 3. Use vectorized and approximate results only where the contract allows it

With an eligible In-Memory columnar object, aggregation may use `VECTOR GROUP BY`. That is useful for scan-heavy analytics, not row-by-row OLTP. Check the plan and the licensing or memory requirements before treating it as a default. [T-43]

Approximate query processing is a business decision as much as a database decision:

```sql
SELECT APPROX_COUNT_DISTINCT(cust_id)
FROM sales;
```

Use it when the product requirement accepts an approximation. Keep the exact query as a reference, measure the error on representative samples, and label the result as approximate. Never use it for a value that must be exact. [T-44]

Materialized-view query rewrite is a separate layout technique, T-28. It precomputes results and carries a freshness trade. It is not one of the ten transformations above.

## Transpiler limits

The automatic SQL Transpiler in 23ai/26ai can convert eligible PL/SQL constructs used inside SQL into SQL expressions. It is not a universal PL/SQL optimizer. Eligibility rules decide which constructs qualify; non-eligible constructs remain on the normal PL/SQL path. Check the release documentation before predicting a plan change or calling the function “transpiled.” [S46](https://docs.oracle.com/en/database/oracle/oracle-database/26/nfcoa/oracle-ai-database-26ai-new-features-guide.pdf)

<details><summary>View merging and subquery unnesting are evidence, not magic</summary>

View merging removes an eligible inline-view boundary. Subquery unnesting turns eligible existence or non-existence checks into join shapes. Both can expose better access paths, but both have documented conditions. Read the executed plan, verify the result set, and run V0. The plan operation starts the investigation; it does not finish it. [S24] [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html)
</details>

No live Oracle database was available for the research pass. `sqlcl` and `sqlplus` were not on `PATH`. The example plans and timings are illustrative, not executed results.

Source IDs and technique IDs resolve in `.agents/research/07-sources-bibliography.md` and `.agents/research/01-proven-techniques-catalog.md`.

**Artifact: name the transformation, save the before/after plans, pass the result-equivalence check, and attach the V0 metric delta.**
