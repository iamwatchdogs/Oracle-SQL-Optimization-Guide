---
title: Indexes and Layout
description: B-tree paths, partitioning, MVs, memory, and auto indexes.
order: 13
draft: false
---

An index is a read shortcut with a write bill. A layout change is a way to avoid reading work that the query never needed.

The first question is not “which index should I add?” It is “where does the work happen, and what physical structure can remove it without breaking the workload?”

## 1. Design an index for the access path

A B-tree index stores ordered keys and row identifiers. The optimizer may choose a range scan, unique scan, fast full scan, skip scan, or another documented access path when the cost model supports it. The index is a candidate shape, not a guarantee that the optimizer will use it. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/)

For a selective predicate, check the plan and the clustering factor. A high clustering factor can mean that index keys point to table blocks spread across the table, so a range scan may visit more blocks than expected. Check `CLUSTERING_FACTOR` in the dictionary before you keep the design. Do not add five indexes and hope the optimizer discovers the right one. Each extra index consumes space and adds work to inserts, updates, and deletes.

Bitmap indexes and index-organized tables are different tools. Bitmap indexes can fit suitable read-heavy patterns, but concurrent DML changes the cost. Test that trade-off with a representative load. An index-organized table changes the table's physical organization; it is not a drop-in B-tree shortcut. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/)

## 2. Remove partitions and precomputed work

Partitioning is useful when a query touches a known subset of a large table. A predicate on the partition key can enable pruning:

```sql
SELECT COUNT(*)
FROM sales
WHERE sale_date >= DATE '2026-09-01'
  AND sale_date <  DATE '2026-09-02';
```

Verify the actual plan. Look for a single partition or the expected partition range, not just the word “partition.” A function on the key or a type conversion can prevent pruning. [S36](https://docs.oracle.com/en/database/oracle/oracle-database/19/vldbg/partition-concepts.html)

A materialized view moves repeated aggregation out of the request path. It trades freshness and refresh work for read speed. Enable query rewrite only when the view's contents, constraints, and refresh policy fit the business meaning of the result. A result cache is another option for deterministic, slow-changing results; it is not a cache for data that must change immediately. [S44](https://docs.oracle.com/en/database/oracle/oracle-database/26/dwhsg/basic-materialized-views.html) [S45](https://docs.oracle.com/en/database/oracle/oracle-database/26/lnpls/pl-sql-function-result-cache.html)

## 3. Use hardware and advanced structures only when the bill fits

In-Memory can help scan-heavy analytic queries by keeping a columnar representation of hot objects. Check the plan for the documented in-memory access and aggregation operations, then check edition and entitlement requirements. Exadata Smart Scan and storage-index offload are Exadata-specific. They should not be presented as generic Oracle row-store improvements. [S37](https://docs.oracle.com/en/database/oracle/oracle-database/19/inmem/intro-to-in-memory-column-store.html) [S38](https://www.oracle.com/database/technologies/exadata/software/smartscan/)

### Index compression: read the restrictions

Index compression has more choices than “compressed or not.” `COMPRESS n` is prefix or key compression. The 19c Administrator's Guide documents it for non-unique indexes where a ROWID is appended to make the key unique, and for unique multicolumn indexes. `COMPRESS ADVANCED LOW` and `COMPRESS ADVANCED HIGH` use block-level advanced compression; the guide documents them for supported indexes, including indexes that are not good prefix-compression candidates, and allows partition-level decisions. [S76](https://docs.oracle.com/en/database/oracle/oracle-database/19/admin/managing-indexes.html)

The restrictions matter:

- Advanced index compression is not supported for bitmap indexes or index-organized tables.
- `LOW` cannot be specified on a single-column unique index.
- `HIGH` has additional CPU cost compared with `LOW`; `LOW` has only minimal CPU overhead in the documented comparison.
- `LOW` requires database compatibility 12.1.0 or later; `HIGH` requires 12.2.0 or later.

Compression is also an operational change. Rebuilding an index requires more disk space, while coalescing is the lower-cost space path in the guide's comparison. Both consume time and change the physical index. Record segment bytes, compression state, rebuild or coalesce work, and the query-side V0 result. Space saved by itself is not proof of a faster statement. [S76](https://docs.oracle.com/en/database/oracle/oracle-database/19/admin/managing-indexes.html)

### Parallel execution: a resource decision

Parallel execution can reduce elapsed time for a single large scan, join, partitioned-index scan, or bulk operation when the data set is large, concurrency is low, elapsed time matters, and the system has enough CPU, memory, and I/O bandwidth. Oracle's 19c guidance describes an underutilized-CPU condition, including a typical threshold under 30% in its recommendation context. [S77](https://docs.oracle.com/en/database/oracle/oracle-database/19/vldbg/parallel-exec-intro.html)

The same guidance warns against parallel execution for small data sets, high-concurrency workloads, short online transactions, and systems with limited I/O bandwidth or heavily used CPU and memory. On an overutilized system, parallel execution **may reduce performance**, not merely fail to improve it. A single-session benchmark cannot expose that failure mode.

Run a concurrency-realistic test with HammerDB or Swingbench. Record elapsed time, throughput, CPU, memory, and I/O. If throughput falls or resource pressure rises, reject the parallel change even when one serial run looks faster. [S65](https://www.hammerdb.com/) [S66](https://www.dominicgiles.com/swingbench/)

Automatic Indexing can identify index gaps, create candidates for verification, retain useful indexes, and drop unused ones. Availability and licensing depend on the database release, edition, and service entitlement. The research did not settle the exact licensing requirement, so check the current Oracle licensing guide instead of repeating “Tuning Pack required” as a universal fact. [S15](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_AUTO_INDEX.html) [S16](https://doi.org/10.14778/3750601.3750616)

SQL Access Advisor can propose indexes, materialized views, and partitioning changes from a Tuning Set. Treat its output as a proposal until V0 measures the change. [S35]

<details><summary>B-tree and partition checks worth keeping</summary>

For a B-tree design, record the intended access path, selectivity, clustering factor, and write-load test. For a partitioned design, record the partition predicate and the `PARTITION START`/`PARTITION STOP` evidence in the executed plan. If either artifact is missing, the design is still a hypothesis. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/) [S36](https://docs.oracle.com/en/database/oracle/oracle-database/19/vldbg/partition-concepts.html)
</details>

No live Oracle database was available for the research pass. `sqlcl` and `sqlplus` were not on `PATH`. The plans, timings, and load results in this chapter are illustrative procedures, not measurements produced by the research pass.

Source IDs and technique IDs resolve in `.agents/research/07-sources-bibliography.md` and `.agents/research/01-proven-techniques-catalog.md`. Compression and parallel execution use [S76] and [S77].

**Artifact: an index/layout decision table with the access path, resource bill, load test, and rollback operation.**
