---
title: Let Oracle Rewrite
description: OR expansion, unnesting, star paths, and safe approximations.
order: 14
draft: false
---

"Should I rewrite this query by hand? Usually no."

You write a clean join on `employees(id,name,dept_id,salary)` and `departments(id,name)`. Oracle runs a different shape: view folded, predicate pushed, subquery turned to a join. Same result. Less work. Your job is to name the rewrite in the plan and prove it.

A rewrite is like rewording a request, except Oracle keeps the meaning and picks a cheaper execution shape. Drop the rewording now. Meaning stays. Shape changes. Plan names it.

<details><summary>In case you don't know about view merging, it's folding an inner query into the outer one.</summary>Two query blocks become one. The optimizer then sees all tables at once and can pick better join order and access. Nothing to call by hand in most cases. The optimizer merges select-project-join views by cost, with `MERGE` and `NO_MERGE` hints plus `OPTIMIZER_SECURE_VIEW_MERGING` as controls. Check the plan. No `VIEW` row source means it merged. Devs meet it when an inline view hides a filter and forces a late join. It drives join choice across view borders. Do not use `NO_MERGE` everywhere. Forced splits lock in view-first joins and miss index paths, which costs I/O on large sets. Sharp line: it removes the wall between inner and outer query. Example: an inline view on employees joined to departments merges away, leaving a HASH JOIN with the pushed dept filter. See [T-35] https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/query-transformations.html</details>

<details><summary>In case you don't know about subquery unnesting, it's turning a subquery into a join.</summary>`IN` becomes a semijoin. `NOT IN` or `NOT EXISTS` becomes an antijoin. Same rows. One hash pass instead of a filter loop. No manual rewrite needed. The optimizer unnests when the shape keeps results equal. Check the plan for `HASH JOIN SEMI` or `HASH JOIN ANTI` in place of `FILTER`, then run V0 to prove the gain. Devs meet it on `EXISTS` checks and `NOT EXISTS` gaps. It drives set-based execution over per-row probes that scale poorly. Do not keep `FILTER` loops. Per-row probes run the inner query thousands of times and burn CPU and gets. Sharp line: it swaps row-by-row checks for one join. Example: `WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.dept_id=d.id)` moves from FILTER to HASH JOIN ANTI. See [T-37] https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/query-transformations.html</details>

### 1. Give ORs and views a better shape

Plain claim: ORs and layered views block good access paths. Expansion and merging reopen them.

Naive progression:

```sql
-- Naive: OR blocks the dept index
SELECT * FROM employees WHERE dept_id = 10 OR salary > 200000;
-- Plan: TABLE ACCESS FULL, 8 seconds
```

Fixed: let OR expansion split branches. Plan shows `CONCATENATION`, one branch with `INDEX RANGE SCAN` on dept, one with range on salary [T-34].

```sql
-- Same text after stats + indexes, no hand rewrite:
-- Plan: CONCATENATION
--   Branch 1: INDEX RANGE SCAN EMP_DEPT_IX
--   Branch 2: INDEX RANGE SCAN EMP_SAL_IX
```

What the plan shows: `CONCATENATION` plus per-branch access. Do not force it. Cost decides. If one indexed range already serves the OR, expansion adds nothing. Measure.

Second progression:

```sql
-- Naive: inline view hides the filter
SELECT * FROM (SELECT * FROM employees WHERE salary > 50000) e
JOIN departments d ON d.id = e.dept_id WHERE d.name = 'Sales';
-- Plan shows VIEW row source, late filter
-- Fixed: view merging folds it, predicate pushing drops d.name='Sales' inside early
-- Plan: no VIEW, HASH JOIN with pushed access on departments, then rowid to employees
```

Docs: view merging simple/complex [T-35], predicate pushing [T-36]. Merging can hurt in documented cases. Controls exist. Check the plan, then V0.

Why it matters: you keep SQL readable. Oracle picks the shape. The plan names the shape. Unverified on your schema — test on your schema.

### 2. Turn subqueries to joins, stars to bitmap paths

Plain claim: `NOT IN` and `EXISTS` run best as joins. Star schemas run best from dimensions inward.

Naive progression:

```sql
-- Naive: FILTER loop over departments
SELECT d.name FROM departments d
WHERE NOT EXISTS (SELECT 1 FROM employees e WHERE e.dept_id = d.id);
-- Plan: FILTER, one probe per department row
```

Fixed: subquery unnesting converts to `HASH JOIN ANTI`. Same rows. One hash pass [T-37].

```sql
-- Fixed plan: HASH JOIN ANTI, full scan of small departments, hash on employees.dept_id
```

What the plan shows: `HASH JOIN ANTI` or `HASH JOIN SEMI` in place of `FILTER`. Second shape, star:

```sql
-- Naive: fact-first scan on sales + 4 dimensions, 50 seconds
SELECT p.name, t.mth, SUM(s.amount)
FROM sales s, products p, times t, customers c, stores st
WHERE s.prod_id=p.id AND s.time_id=t.id AND s.cust_id=c.id AND s.store_id=st.id
AND p.cat='Bikes' AND t.yr=2026;
```

Fixed: star transformation with `STAR_TRANSFORMATION_ENABLED=TRUE` plus bitmaps on fact keys rewrites to dimension-first bitmap access. Plan shows `STAR TRANSFORMATION` [T-38]. Needs the star pattern and bitmap indexes. Without them, no transform.

Union repeats get join factorization: common joins across `UNION` branches factor once [T-39]. Partial indexes get table expansion: `UNION-ALL` with indexed parts via index and the rest via full scan [T-40]. Repeated expressions get temp-table transformation: cursor-duration temp for the shared result [T-41/T-42]. All are internal. Do not hand-force. Docs: TGSQL ch.5 plus ch.4 cursor-duration tables.

Why it matters: these are the 11 documented transforms [T-34 to T-44]. Each has conditions and controls. The plan proves which one fired. (One aside: I still read the plan twice before I claim a rewrite. Back to shapes.)

### 3. Use vector aggregation and approximations where exactness allows

Plain claim: aggregates over columnar scans vectorize. Counts you do not need exact can approximate.

Naive progression:

```sql
-- Naive: row-store GROUP BY over 200M sales rows, 70 seconds
SELECT prod_id, COUNT(DISTINCT cust_id) FROM sales GROUP BY prod_id;
-- Plan: HASH GROUP BY + TABLE ACCESS FULL
```

Fixed for In-Memory: same text over IM column store shows `VECTOR GROUP BY` plus `TABLE ACCESS INMEMORY FULL`. Docs: TGSQL ch.5 + In-Memory Guide [T-43]. Needs IM store enabled. Not for row-by-row OLTP.

Second progression:

```sql
-- Naive: exact distinct over huge set, slow but exact
SELECT COUNT(DISTINCT cust_id) FROM sales;
-- Fixed: approximate where business accepts error
SELECT APPROX_COUNT_DISTINCT(cust_id) FROM sales;
```

What the plan shows: same access, far less work for the aggregate. Docs: TGSQL ch.4 About Approximate Query Processing [T-44]. Keep the exact query as reference. Measure error on samples. Document the approximation in output. Never use for results that need exactness.

Why it matters: the oldest proof habit still wins. Show the plan before and after. Name the new row source. Pair it with buffer gets and elapsed time from the same Tuning Set [T-06/T-56].

**Keep this: Name the rewrite in the plan, then show the rerun delta. No operation name, no claim.**
