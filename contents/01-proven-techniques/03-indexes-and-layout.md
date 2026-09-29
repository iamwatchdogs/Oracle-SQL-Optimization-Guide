---
title: Indexes and Layout
description: One index, taught properly. Then the physical-design features, each behind its own gate.
order: 7
draft: false
---

An index is a read shortcut with a write bill.

Every index you add makes reads cheaper and makes every insert, update, and delete on that table do more work. The trade is the feature, not a side effect.

> **Track:** Core, then Practice, then Advanced / gated (with Practice resumed under "Practice, continued" for the decision table and checklist)
>
> **Prerequisites:** [Measure First](/01-proven-techniques/01-measure-first/) and a saved executed plan. Read [Stats Run the Show](/01-proven-techniques/02-stats-run-the-show/) first: an index cannot rescue a plan that reads the wrong number of rows for the wrong reason.
>
> **Evidence status:** Documented mechanisms and cited boundaries. Its blocks are labeled `ILLUSTRATIVE`, `SYNTHETIC`, `SKETCH`, or `PLACEHOLDER`; every plan, count, and timing is `SYNTHETIC`. **No live Oracle database was available**, so no output here is a measurement.
>
> **Next required page:** [Let Oracle Rewrite](/01-proven-techniques/04-let-oracle-rewrite/).

## How this page is banded

| Band                 | Sections                                           |
| -------------------- | -------------------------------------------------- |
| **Core**             | Core access paths (1 to 4)                         |
| **Practice**         | Practice (5, 6) · Practice, continued (11, 12, 13) |
| **Recovery**         | none                                               |
| **Advanced / gated** | Advanced / gated physical design (7 to 10)         |

Each row names the `##` container and the numbered sections inside it. Every `##` and `###` heading on this page is banded exactly once: the four `##` headings are containers whose names state their band, and each numbered `###` section carries the band of the container it sits in.

- **Core (Core access paths, 1 to 4):** read and act. The access-path lesson: when an index is the answer, one index end to end, selectivity and clustering factor, and the wrong shapes.
- **Practice (Practice, 5 and 6; Practice, continued, 11, 12, and 13):** use on a real ticket. Partition pruning, precomputed work, then — after the gated block — the decision table, the junior request checklist, and the stop list. **The Practice band is split in print order on purpose:** 11 to 13 print after the Advanced / gated block because the decision table has to be able to send you to a gated feature and tell you when to stop there. One band, two containers.
- **Recovery (none):** this page names the read trade an index makes but does not drop anything. The drop that undoes a candidate index is owned by the [V0 lab](/00-preface/02-how-to-prove-a-win/).
- **Advanced / gated (Advanced / gated physical design, 7 to 10):** gated. Compression, In-Memory and Exadata, parallel execution, and Automatic Indexing. Each needs a release, edition, or entitlement check.

The Core band is the beginner path and it is deliberately narrow: one index, taught properly, is more useful than a catalog of index types. Read 1 to 4, then use the Practice decision table on a real ticket.

## Core access paths

### 1. When an index is not the answer

Four situations where adding an index is the wrong move. Check them before you check your index catalog.

| Situation                               | Why an index does not help                                                                                            | Go to                                                    |
| --------------------------------------- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| The optimizer's estimate is wrong       | It may not choose your index, or it may choose it and still process the wrong rows. The estimate is the first defect. | [Stats](/01-proven-techniques/02-stats-run-the-show/)    |
| No index exists on the column           | The obvious case. This is the one that is genuinely an index job.                                                     | This page.                                               |
| The statement is not the problem        | The slow thing is a different `sql_id`, not the one you were asked about.                                             | [Measure First](/01-proven-techniques/01-measure-first/) |
| The write cost exceeds the read benefit | The table is write-heavy. You would be trading a report that runs twice a day for a table that is written to all day. | Section 11, the decision table.                          |

The third row is the one people skip. An index on the statement you were asked about does not help the one that is actually slow.

The read/write trade is worth stating numerically. An index on `employees(dept_id)` makes `WHERE dept_id = :dept_id` cheaper. It also makes every insert into `employees` maintain that index. If the table is written to constantly and the report runs twice a day, you have made the frequent operation slower and the rare one faster. That can still be the right trade. It is never automatic.

One aside: the row everybody skips is the one that would have saved the ticket. Back to the estimate.

### 2. One index, taught properly

Looking up a name in a phone's contact list means jumping straight to the entry; reading the whole list and discarding every line that does not match is a different operation that returns the same name. A list holding three entries with that name still tells you nothing about how many you will find, and that is the difference an index makes and the difference a non-unique one does not.

The [measure-first page](/01-proven-techniques/01-measure-first/) saved the canonical V0 plan pair for this statement and found two separate defects: a `filter` instead of an `access`, and an estimate of 1,000 for a statement that returns 4. The first defect is what this page fixes. The second one is a statistics defect, and it is the more interesting half of the lesson.

Every number below comes from the plan pair owned by [section 8 of the V0 lab](/00-preface/02-how-to-prove-a-win/). There is one synthetic pair in this book, and this page does not invent a second one.

**ILLUSTRATIVE — SQLcl or SQL\*Plus.** The lab fixture from [the V0 lab](/00-preface/02-how-to-prove-a-win/), with `:dept_id = 42`. Expected output shape: the four employee rows for department `42`, employees `3, 4, 7, 8`, including the row with a null salary. No live output is supplied. **Owner boundary:** the object owner is `<object-owner-schema>`; this unqualified form requires that schema to be the current schema.

```sql
SELECT employee_id,
       dept_id,
       salary
FROM employees
WHERE dept_id = :dept_id;
```

Before the index, this reads the table and filters. The full canonical `before_01` plan is printed once, in [section 3 of the Measure First page](/01-proven-techniques/01-measure-first/); it is not repeated here. Two facts from it drive this section:

- **The access path is a `filter`, not an `access`.** `A-Rows 10,000` in the before plan is rows **examined** by the full scan. The `filter` line is the reason the statement read the whole table to produce 4 rows. That is the access-path defect this page fixes.
- **The estimate is `E-Rows 1,000`** for a statement that returns 4. That is the separate statistics defect, and the index alone does not fix it.

**MUTATING — candidate index.** Requires the object owner or an authorized DDL role with owner-confirmed create privilege. Replace `<object-owner-schema>` with the owner-supplied value so the DDL runs on the same `object_owner_schema` boundary the [V0 fixture and capture](/00-preface/02-how-to-prove-a-win/) use; that is the schema whose `EMPLOYEES` table this page's plans describe. Expected output: one successful DDL operation and no row change to the table. Do not run this in production.

```sql
DEFINE object_owner_schema = <object-owner-schema>

CREATE INDEX &object_owner_schema.IDX_EMP_DEPT_ID_CANDIDATE
  ON &object_owner_schema.employees (dept_id);
```

**This index is not unique, and that matters.** `employees` has no primary key, and the fixture deliberately contains a duplicate physical row, so `dept_id = 99` returns two rows. A non-unique index carries no guarantee about how many rows a value has. Keep that in mind for the explanation below; it is the part most tutorials get wrong.

**ILLUSTRATIVE — the statistics half of the candidate.** The `before_01` plan estimated 1,000 rows for a statement that returns 4. That is what the optimizer produces when it has no usable per-value distribution for the column. Restoring or regenerating the column statistics is the fix for _that_ defect, and it is a separate candidate on its own page. This lesson assumes the statistics work is done and shows only the access path that results.

After the index, the predicate becomes an `access` and the scan becomes an `INDEX RANGE SCAN`. The canonical `after_01` plan is printed once, on the same Measure First page; only the scan lines that matter are quoted here:

**SYNTHETIC — the scan lines that matter; the full plan is on the Measure First page.**

```text
|* 1 |  INDEX RANGE SCAN             | IDX_EMP_DEPT_ID_CANDIDATE |     10 |      4 |      60,000 |
   1 - access("DEPT_ID"=:DEPT_ID)
```

**What changed, and the causal chain matters more than the list.**

- **The predicate moved from filter to access.** This is the mechanism. Everything else follows from it. The optimizer can now use the index to find matching keys instead of reading rows and discarding them.
- **The access path changed to `INDEX RANGE SCAN`.** The optimizer chose it. You do not control that choice; you make the index cheap enough to be worth choosing. A good index that the optimizer declines helps nobody.

**The index provided the access path; the statistics provided the estimate.**

- **The estimate moved from 1,000 to 10.** **That is a big improvement, and it is still not 4.**
- **The index is not unique, so it grants no row-count guarantee.** **The index gave the optimizer an access path; restoring the statistics gave it a distribution.** `E-Rows` moved from 1,000 to 10 because the per-value distribution on the column was there to be read, not because the index existed. Drop the index and the estimate goes back to guessing, because the estimator's problem was never the access path. The non-unique index still grants no row-count guarantee.
- **An index can still be ignored, or still be wrong.** One on a column the optimizer believes is useless will be ignored outright, and one used on a column with bad statistics can still carry a wrong cost.
- **A `TABLE ACCESS BY INDEX ROWID` line appeared.** The index found the four keys it needed, but a non-unique index on one column does not store `salary` or `employee_id`, so Oracle went back to the table for each of those four rows. A **covering** index, one that contains every column the query selects, removes this line entirely.

**The work number moved from 100,300 to 60,000, and the rows examined moved from 10,000 to 4.** Together those are the synthetic evidence that the candidate reduced logical work: the before plan read the whole table to find 4 rows, the after plan examined about 4 and returned those 4. It is not a speed claim, and it is not a result; the measured comparison is the [V0 lab](/00-preface/02-how-to-prove-a-win/) and the [noise floor](/05-feedback-loop/02-noise-floor-and-repetition/).

**The uniqueness contrast, once and correctly.** If `employee_id` had a unique index, `WHERE employee_id = :x` could return **at most one row**, and the optimizer would apply that as a hard bound without reading a row of data. That is what uniqueness buys: a guarantee, not a faster path.

That last point is the whole difference between an index that helps a lot and one that helps a little. If your query selects only `dept_id`, this index is covering. If it selects `salary`, every row costs an extra table visit.

### 3. Selectivity and clustering factor: the two numbers that decide

Sort a spreadsheet by department and the rows read in department order, but the cells are still physically stored in the order somebody typed them, so department 42's four rows sit scattered across the whole sheet. That gap between the sorted view and the physical order is the clustering factor, and it is the reason an index on the right column can still end up reading the entire table.

**Selectivity** is the fraction of rows a predicate matches. A predicate that matches a small fraction of the table is highly selective and index-friendly. A predicate that matches most of the table is not, and a full scan is genuinely the cheaper path. The optimizer is right to full-scan that. "I dislike full scans" is not a plan.

Be careful with the numbers, because four of them are easy to confuse and this page's own example is a live case of it:

- The canonical fixture has **11 physical employee rows**. That is the toy table defined in the [V0 lab](/00-preface/02-how-to-prove-a-win/).
- With `:dept_id = 42`, the statement **returns 4 rows**. That is the correct answer for the fixture.
- The `before_01` plan shows **`E-Rows 1,000`**. That is the optimizer's **estimate**, not a row count and not a table size. The fixture has no 1,000 rows; the estimator simply had no usable distribution and produced a number of the wrong order.
- The **before** plan shows **`A-Rows 10,000`**. That is an **invented plan-artifact value for teaching**, and it is the canonical V0 artifact owned by [section 8 of the V0 lab](/00-preface/02-how-to-prove-a-win/). It belongs to the full scan only, and it is not the fixture's row count.

**Those are not the same measurement, and none of them is a live result.** 11 is what the toy fixture physically contains. 10,000 is a synthetic stand-in for the **before** scan only, placed there to make the _shape_ of a wasteful scan visible at a readable magnitude, so you can see rows examined dwarfing rows returned.

The **after** plan is not scaled that way: its index examined 4 rows, which is what real index access on this fixture would do. If you ran the real statement against the real 11-row fixture, the before scan would examine 11 rows rather than 10,000, and the absolute numbers would be tiny even though the shape was identical.

The after plan's `buffer_gets 60,000` is the same kind of synthetic magnitude: it was scaled to the same teaching purpose rather than measured on 11 rows, and a real run on this fixture would report a buffer-gets count orders of magnitude lower.

**One thing this pair is not, so you do not read a ratio into it.** The per-row figures are not comparable, and this page will not pretend otherwise. Before, the synthetic 100,300 `buffer_gets` spread over 10,000 examined rows is about 10 per row. After, 60,000 over 4 rows is about 15,000 per row. The two sides were scaled independently to make one shape visible, so the ratio between them carries no meaning. **Read the shape — 10,000 rows examined to return 4, against 4 examined to return 4 — and read nothing else.** The 40% drop in the work number is the smallest true fact on this page; the access-path change is the lesson.

The plan pair on this page is **SYNTHETIC teaching data**, and no number on it was observed by running Oracle.

So the selectivity in this example is 4 rows out of 11, which is highly selective and exactly the case an index serves. The defect is not the selectivity. The defect is that the estimator could not see it, and with only a filter and no access path the statement had to read every row in the table before the filter could discard them.

**Clustering factor** is the number of table blocks the index has to visit. A low clustering factor means the rows for adjacent index keys live near each other physically, so a range scan touches few blocks. A high clustering factor means the matching rows are scattered across the whole table, so a range scan touches nearly as many blocks as a full scan, and you have paid for an index and gotten nothing.

**ILLUSTRATIVE — SQLcl or SQL\*Plus, clustering factor read.** Requires the documented catalog access for the index. Expect one row with `CLUSTERING_FACTOR` and `NUM_ROWS` for the named index. The distinct-key count is `DISTINCT_KEYS`. One operational caveat earns its place: **the starred statistic columns come back empty until you have collected index statistics with `DBMS_STATS`**, so an un-analyzed index returns nothing and you may misread that as "this index is fine." Gather first, then read.

```sql
SELECT index_name,
       clustering_factor,
       num_rows,
       distinct_keys
FROM   all_indexes
WHERE  owner = '<object-owner-schema>'
AND    table_name = 'EMPLOYEES'
AND    index_name = 'IDX_EMP_DEPT_ID_CANDIDATE';
```

If the clustering factor is close to the number of table blocks, the index will not help a range scan much, and you should stop before you create it. Reading this number is cheaper than creating the index and discovering it afterwards.

### 4. When an index is the wrong shape

**Bitmap indexes** fit read-heavy, low-cardinality, low-concurrency-DML patterns. A bitmap index stores a bit per possible key value, which is why the documentation associates it with low-cardinality columns and very compact storage. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/) The cost is that concurrent DML must rewrite bitmap segments, which makes it a poor fit for a write-heavy table. Bitmap indexes also cannot support a full index scan in the way a B-tree can in some cases. Test the read/write trade with a representative load, not a single query.

**Index-organized tables** are a different animal entirely. An IOT stores the table rows in the index itself. It is not a drop-in B-tree shortcut; it is a change to how the table is physically organized, with different space, clustering, and maintenance consequences. If you do not have a specific reason to reorganize the table, this is not your next step.

**Skip scans** are for low-cardinality leading columns where the leading column has few distinct values. The optimizer skips values. Do not add a composite index hoping to get one; that is an optimizer decision, not a design decision.

**Function-based indexes** exist for predicates on expressions, like `WHERE UPPER(city) = :city`. A plain index on `city` does not serve that predicate. The [statistics page](/01-proven-techniques/02-stats-run-the-show/) covers the matching expression statistic, because a function-based index and a matching expression statistic are two halves of the same fix.

The Core band ends here. If your estimates were wrong rather than your access path, stop and go to [Stats Run the Show](/01-proven-techniques/02-stats-run-the-show/) before you keep reading.

## Practice

### 5. Partition pruning, stated correctly

Here is the correction most guides get wrong, and getting it wrong makes you confident about a plan that did not do what you think.

**Oracle prunes partitions. It does not remove them.** Pruning means the optimizer excludes partitions from the scan based on the predicate, and the partition list appears in the executed plan. The partitions still exist. Nothing was deleted. A common mode of pruning is partition elimination from the plan's access paths.

Pruning resolves at one of **two** times, and knowing which is the difference between reading a plan and misreading it. **Static pruning** happens at compile time, when the predicate carries a literal, and `PARTITION START`/`PARTITION STOP` hold partition numbers. **Dynamic pruning** happens at run time, when the exact partitions are not known beforehand — bind variables, subqueries, star transformation, nested-loop joins. A `KEY` in `PSTART`/`PSTOP` instead of a number means dynamic pruning is **working**, not broken. In the common serial case the evidence is the `PARTITION RANGE SINGLE` or `PARTITION RANGE ITERATOR` line plus the `PARTITION START`/`PARTITION STOP` values; `PARTITION RANGE ALL` and `PARTITION RANGE SUBQUERY` are also legitimate operation names. In a parallel plan, only the start and stop columns carry the pruning information — the operation column describes the parallel operation instead. [S36](https://docs.oracle.com/en/database/oracle/oracle-database/19/vldbg/partition-pruning.html)

This matters because "the plan shows a single partition" is evidence, and "the partitions were removed" is a misunderstanding of that evidence.

**ILLUSTRATIVE — SQLcl or SQL\*Plus.** A date-range predicate against a range-partitioned table in the target schema. `sales` is an illustrative table, not a V0 fixture object, so the partition key, partitioning strategy, and interval definition are whatever the target schema actually declares; this block is a shape for reading the plan, not a runnable DDL.

```sql
SELECT COUNT(*)
FROM   sales
WHERE  sale_date >= DATE '2026-09-01'
AND    sale_date <  DATE '2026-09-02';
```

**Pruning fails silently, and the two failure modes are not the same.** A function on the partition key is the first case, and the harshest: the optimizer cannot evaluate the predicate at compile time **or** narrow the partitions from it, so the plan can fall back to `PARTITION RANGE ALL`. That is the outcome to look for, and it is the one case where pruning is genuinely lost rather than merely deferred. A type conversion or implicit cast does something subtler and more misleading: it **converts static pruning into dynamic pruning**, so the plan still prunes, just later and with less to show for it. Either way the predicate can look like a clean range and the plan can still disappoint you, which is why you verify against the plan and never against the SQL. Look for the `PARTITION RANGE` line and read the `PARTITION START`/`PARTITION STOP` values — the plan displays them as `PSTART`/`PSTOP`, so type the field the display shows you. If they are absent, or the plan shows `PARTITION RANGE ALL` when you expected a single partition, pruning did not happen and you have a different problem than the one you thought. [S36](https://docs.oracle.com/en/database/oracle/oracle-database/19/vldbg/partition-pruning.html)

**Partition-wise joins** and **partition-wise aggregations** are the other two partitioning features worth knowing exist. They reduce the amount of data exchanged during a join or aggregation, which is a real win at volume. They are also workload-specific, and the 19c guidance is explicit that a partition-wise join offers significant performance benefits for **both serial and parallel execution** — so do not read "partition-wise" as a synonym for "parallel-only". ([19c partitioning concepts](https://docs.oracle.com/en/database/oracle/oracle-database/19/vldbg/partition-concepts.html); this claim is not in the ledger, so treat it as read-firsthand-but-unfiled rather than as a cited source.) If you do not know whether your workload is one of them, you do not have a reason to enable them.

### 6. Precomputed work: materialized views and result cache

Both of these trade freshness for read speed. That trade is a business decision before it is a database one.

**Materialized views** precompute a query's result. A materialized view with query rewrite enabled can let Oracle substitute the view for a matching query at runtime, so the application does not have to change.

The freshness policy is the point: a view refreshed on commit and a view refreshed nightly answer different questions, and a rewritten query that returns slightly stale data may be fine for a dashboard and a defect in a report. [S44](https://docs.oracle.com/en/database/oracle/oracle-database/26/dwhsg/basic-materialized-views.html)

**Reference and version note:** that link is the **26ai** edition of the Data Warehousing Guide. The mechanism is documented well before 26ai and is available on the 19c primary path; the link documents a later edition of the same feature, not a 26ai introduction. Use it as a mechanism reference and check the installed release for the exact rewrite requirements.

**The SQL result cache** caches deterministic query results in memory, keyed by the query and its bind values. It is a fit for a result that is expensive to compute and safe to reuse.

It is not a fit for data that must reflect every write immediately; a cached result can be stale within its validity window, and a result that is wrong for a user reading their own uncommitted-looking state is a support ticket. The PL/SQL function result cache is a related mechanism for function return values. [S45](https://docs.oracle.com/en/database/oracle/oracle-database/26/lnpls/pl-sql-function-result-cache.html)

**Reference and version note:** that link is the **26ai** edition of the PL/SQL Language Reference. As with the view above, the mechanism predates 26ai and is available on 19c; the link is a mechanism reference, not a release gate.

The rule for both: do not enable freshness trading on someone else's behalf. Get the business owner to agree what stale means before you build it.

The Practice band continues after this group. Everything from here to section 10 is gated. Read it to recognize the mechanism. Ask the DBA, SRE, or release owner before you act on it.

## Advanced / gated physical design

### 7. Compression

Index compression is not a binary choice. `COMPRESS n` is prefix or key compression. `COMPRESS ADVANCED LOW` and `COMPRESS ADVANCED HIGH` use block-level advanced compression. The 19c Administrator's Guide documents the key forms for non-unique indexes where a ROWID is appended to make the key unique, and for unique multicolumn indexes, and documents the advanced forms for supported indexes including those that are not good prefix-compression candidates, with partition-level decisions allowed. [S76](https://docs.oracle.com/en/database/oracle/oracle-database/19/admin/managing-indexes.html)

The restrictions are not decorative:

- Advanced index compression is not supported for bitmap indexes or index-organized tables.
- `LOW` cannot be specified on a single-column unique index.
- `HIGH` carries additional CPU cost compared with `LOW`; the documented comparison gives `LOW` minimal CPU overhead.
- `LOW` requires database compatibility 12.1.0 or later. `HIGH` requires 12.2.0 or later.

Compression is also an operational change, not a metadata flag. Rebuilding an index needs more disk space. Coalescing is the lower-cost space path in the guide's comparison. Both consume time and change the physical index. Record segment bytes, compression state, rebuild or coalesce work, and the query-side V0 result. **Space saved is not evidence of a faster statement.** A smaller index can still be slower to traverse if the compression scattered the keys.

### 8. In-Memory and Exadata

**Oracle Database In-Memory** can keep a columnar representation of hot tables in a separate memory area, so analytic queries scan columns instead of rows. Check the executed plan for the documented in-memory access and aggregation operations, and check edition, memory sizing, and entitlement. It is a fit for scan-heavy analytics, not for row-by-row transactional traffic. [S37](https://docs.oracle.com/en/database/oracle/oracle-database/19/inmem/intro-to-in-memory-column-store.html)

**Exadata Smart Scan and storage indexes** are Exadata-specific. They push filtering into the storage layer. They should not be presented as generic Oracle row-store improvements, because on a non-Exadata system the mechanism does not exist at all. [S38](https://docs.oracle.com/en/engineered-systems/exadata-database-machine/sagug/monitoring-smart-io.html), the Exadata System Software guide's own Smart I/O section, which documents the offload of predicate evaluation to the storage servers and the storage indexes built alongside it. That guide is scoped to Exadata, which is what makes it the record for the boundary rather than for a row-store promise.

### 9. Parallel execution

Parallel execution splits one statement across multiple processes. It reduces elapsed time for a single large operation. It does not increase total throughput; it consumes more resources to do the same work faster.

The 19c guidance is specific about the conditions. Parallel execution suits a large data set, low concurrency, elapsed time being what matters, and a system with CPU, memory, and I/O bandwidth to spare. The guidance describes a low-CPU-usage condition, including a typical threshold under 30% in its recommendation context.

It explicitly warns against parallelism for small data sets, high-concurrency workloads, short online transactions, and systems with limited I/O bandwidth or heavily used CPU and memory. On a system already running hot, parallel execution can **reduce** performance, not merely fail to improve it. [S77](https://docs.oracle.com/en/database/oracle/oracle-database/19/vldbg/parallel-exec-intro.html)

That last sentence is the reason a single-session test is not enough. A parallel statement on an idle lab database looks great. The same statement on a busy production system can make the whole system slower. If throughput falls or resource pressure rises under a concurrency-realistic test, reject the parallel change even though one serial-versus-parallel comparison looked faster. Load-test tools like HammerDB and Swingbench exist for exactly this, and the [load-testing page](/03-toolbox/03-load-test-without-prod/) covers running them without production.

### 10. Automatic Indexing

Automatic Indexing identifies index gaps, creates candidate indexes, observes whether they are used, retains the useful ones, and can drop the ones that are not. That last behavior is the reason to be careful with it: it creates and drops database objects on its own schedule.

Availability and licensing depend on release, edition, and service entitlement. The research did not settle the exact licensing requirement, so check the current Oracle licensing guide rather than repeating "Tuning Pack required" as a universal fact. [S15](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_AUTO_INDEX.html) [S16](https://doi.org/10.14778/3750601.3750616)

**SQL Access Advisor** can propose indexes, materialized views, and partitioning changes from a SQL tuning set. Treat its output as a proposal until V0 measures the change. An advisor that recommends eleven indexes has given you eleven hypotheses, not a solution. [S35](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/sql-access-advisor.html), _Optimizing Access Paths with SQL Access Advisor_, chapter 26 of the 19c SQL Tuning Guide. That bibliography record was TOC-verified and the chapter is [verified here](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/sql-access-advisor.html).

## Practice, continued

The Advanced / gated group above is reference material. These three sections are back in the Practice band, because they are what you actually use on a ticket.

### 11. Decision table

| Symptom in the executed plan                                                 | First check                                                    | Smallest next move                                          |
| ---------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------- |
| `E-Rows` far from `A-Rows` at one line                                       | Better statistics, not an index                                | Readable, gatherable statistics                             |
| `filter` on a selective predicate, no matching `access`                      | B-tree index on the predicate column                           | Object-owner create privilege, non-production target        |
| `INDEX RANGE SCAN` present but `buffer_gets` still high                      | Clustering factor, or a covering index                         | Readable `CLUSTERING_FACTOR`; knowledge of selected columns |
| `TABLE ACCESS BY INDEX ROWID` on a query that selects few columns            | Covering index on the selected columns                         | The extra columns are not volatile                          |
| Scan of a large table with a date-range predicate, plan shows all partitions | Fix the predicate or the partition design so pruning can occur | Partition key known; function or cast identified            |
| Same aggregation recomputed on every request                                 | Materialized view with query rewrite, or the result cache      | Business agreement on freshness tolerance                   |
| Large single scan, elapsed time is the metric, low concurrency               | Parallel execution                                             | Entitlement, and CPU/memory/I/O headroom                    |
| Table is write-heavy and reads are a small fraction of the traffic           | Probably no index, and possibly fewer of the ones you have     | A write A/A floor on the table                              |
| Oracle is proposing index changes you do not understand                      | Read the proposal, then apply one candidate through V0         | Tuning set, advisor privilege, owner approval               |

Details that did not fit the table above:

- **`E-Rows` far from `A-Rows` at one line** — test: One object regenerated, same frozen workload. Rollback: Discard pending, or restore retained statistics. Owner: DBA.
- **`filter` on a selective predicate, no matching `access`** — test: Same workload, same binds, plan pair saved. Rollback: `DROP INDEX`, then verify the object is gone. Owner: DBA.
- **`INDEX RANGE SCAN` present but `buffer_gets` still high** — test: Compare `buffer_gets` on the same binds. Rollback: Drop the index; rebuild if compression was the change. Owner: DBA.
- **`TABLE ACCESS BY INDEX ROWID` on a query that selects few columns** — test: Compare `buffer_gets` and plan lines. Rollback: Drop the index. Owner: DBA.
- **Scan of a large table with a date-range predicate, plan shows all partitions** — test: Check `PARTITION START`/`PARTITION STOP` in the plan. Rollback: Revert the SQL change; the partition design stays. Owner: DBA.
- **Same aggregation recomputed on every request** — test: Compare the rewritten query against the original. Rollback: Drop the view or disable the rewrite. Owner: business owner, service owner.
- **Large single scan, elapsed time is the metric, low concurrency** — test: Concurrency-realistic load test, not one session. Rollback: Reset the parallel degree to the prior value. Owner: DBA.
- **Table is write-heavy and reads are a small fraction of the traffic** — test: Measure the write cost before and after. Rollback: Drop the index; the write cost returns. Owner: DBA.
- **Oracle is proposing index changes you do not understand** — test: One proposal at a time, with the plan pair. Rollback: Drop the created object; record `already_absent` if it is gone. Owner: DBA.

### 12. The junior's checklist for requesting an index change

> **"Why an index and not statistics?"**

You are not running production DDL. You are writing a request a DBA can act on. Fill this in.

1. **The symptom.** What a user or alert observed, with the UTC window. Not "slow."
2. **The statement identity.** The full identity tuple, as defined in the [Measure First worksheet](/01-proven-techniques/01-measure-first/).
3. **The plan evidence.** The exact plan line that shows the problem: the `filter` that should be an `access`, or the `buffer_gets` that is too high.
4. **The candidate.** One index, named, with its columns, in which schema. Not "an index on dept_id" but the exact statement an owner can review.
5. **Why an index and not statistics.** One sentence. If you cannot write it, the candidate belongs on the [statistics page](/01-proven-techniques/02-stats-run-the-show/).
6. **The read benefit hypothesis.** The metric and the direction you expect, stated as a hypothesis.
7. **The write cost.** Which table becomes slower, and how you will measure it. The V0 lab locks a write A/A floor and both write thresholds from incumbent evidence _before_ the candidate is applied.
8. **The test.** The frozen workload, the bind manifest, the metric, and the sample count.
9. **The semantic check.** The F1–F6 fixtures, run on the incumbent before the change and on the candidate after.
10. **The rollback.** The exact `DROP INDEX` statement, the owner, and the precheck that proves the object exists before you drop it and reports `already_absent` if it does not.
11. **The approval.** The named person who can run it and the named person who can approve it. These are sometimes different people, and the create privilege does not imply the drop privilege.

**ILLUSTRATIVE — a change request, not a change.**

```text
symptom: department report exceeds 30s at 09:00 UTC, 4s at 11:00 UTC
statement_identity:
  sql_id: <known-sql-id>
  child_number: <known-child-number>
  parsing_schema_name: <known-parsing-schema>
  con_id: <known-con-id>
  con_id_reason: <scope-reason-or-na>
  instance_id: <known-instance-id-or-na>
  instance_scope_reason: <single_instance_vsql-or-multi-instance-scope>
  session_instance_id: <read-from-v-instance>
plan_hash_value: <before-hash> -> <after-hash>
plan evidence: TABLE ACCESS FULL with filter("DEPT_ID"=:DEPT_ID), 100,300 buffer_gets for 4 returned rows
candidate: CREATE INDEX <object-owner-schema>.IDX_EMP_DEPT_ID_CANDIDATE ON <object-owner-schema>.employees (dept_id)
why not statistics alone: estimate is E-Rows 1000 against 4 rows returned, so statistics are also suspect; request both in the V0 run
write cost: employees inserts; write A/A floor to be locked before the candidate
rollback: DROP INDEX <object-owner-schema>.IDX_EMP_DEPT_ID_CANDIDATE (same object_owner_schema boundary, owner-confirmed drop privilege)
approver: <named DBA>
status: NOT RUN
```

That request is actionable. "Add an index to speed up the report" is not.

### 13. When to stop

Stop and go back to measurement if:

- You have not saved the exact plan for the exact statement identity.
- You cannot name the metric and the window.
- The read you want to speed up is not the read the users are complaining about.
- The candidate is a second change on top of a first one you have not measured separately.
- The rollback needs a privilege you do not have and the owner has not confirmed.

## Artifact

An index and layout decision table with: the access path, the selectivity and clustering factor, the read metric, the write metric, the release and edition boundary, and the tested rollback command. A candidate with no write metric is not a candidate; it is a hope.

Every plan, count, and timing on this page is `SYNTHETIC`.

**Decision:** an index is a read/write trade. Measure the read you expect to improve and the write you expect to worsen, or you have not made a decision, you have made a change.
