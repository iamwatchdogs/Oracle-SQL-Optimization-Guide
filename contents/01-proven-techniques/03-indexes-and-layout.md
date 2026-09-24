---
title: Indexes and Layout
description: B-tree paths, partitioning, MVs, memory, and auto indexes.
order: 13
draft: false
---

"Do I just index every column? No."

`employees(id,name,dept_id,salary)` has 50M rows. `SELECT * FROM employees WHERE dept_id = 10` returns 40K rows and takes 9 seconds with `TABLE ACCESS FULL`. You add five indexes. Writes slow down. Reads stay slow. More objects did not mean less I/O.

An index is like a book index, except it speeds selective reads while taxing each write and using disk space. Drop the book now. Selective reads gain. Writes pay. Plans prove it.

<details><summary>In case you don't know about a B-tree path, it's how Oracle walks an ordered index to rows.</summary>Root to branch to leaf, then rowid to the table row. Range scan fits selective filters. Unique scan fits one key. Fast full scan fits index-only reads. Skip scan fits narrow edge cases. No setup step creates a path. You create the index, gather stats, then the optimizer picks the path by cost. Check `CLUSTERING_FACTOR` in `ALL_INDEXES`. Low means leaf order matches table blocks. High means scattered reads. Devs use B-tree paths when a filter matches few rows out of millions. They drive less I/O for selective reads. Do not use a full scan for selective reads. Full scans read all blocks and waste buffer gets on 100-row results. Sharp line: it is the cheapest route to few rows when order lines up. Example: `WHERE id BETWEEN 1000 AND 1100` shows INDEX RANGE SCAN plus TABLE ACCESS BY INDEX ROWID BATCHED with A-Rows 101. See [T-24] https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/optimizer-access-paths.html</details>

<details><summary>In case you don't know about partitioning, it's splitting a big table by key values.</summary>Time keys are common. Hash, range, and list each have set rules. Pruning skips whole parts at run time based on your predicate. You define it at CREATE time with a partition key. You query with a plain predicate on that key. Verify with DISPLAY_CURSOR and look for `PARTITION RANGE SINGLE` plus PSTART and PSTOP. Owners of large sales or log tables use it when queries touch one week out of 104. It drives partition elimination, cutting I/O by orders of magnitude. Do not put a function on the key. `TRUNC(sale_date)` blocks pruning and forces `PARTITION RANGE ALL`. Sharp line: it turns a 104-part scan into a one-part read. Example: `WHERE sale_date >= DATE '2026-09-01' AND sale_date < DATE '2026-09-02'` shows PSTART=17 PSTOP=17. See [T-26] https://docs.oracle.com/en/database/oracle/oracle-database/19/vldbg/partition-pruning.html</details>

### 1. Design B-tree use for selective reads, check clustering

Plain claim: an index helps when few rows match and table order matches index order.

Naive progression:

```sql
-- Naive: index on (dept_id) but rows for dept 10 scatter across all blocks
SELECT * FROM employees WHERE dept_id = 10;
-- Plan: INDEX RANGE SCAN + TABLE ACCESS BY INDEX ROWID, 40K random block reads. Slower than FULL.
```

Check `CLUSTERING_FACTOR` in `ALL_INDEXES`. High means index order fights table order. Each key points to a new block. Low means keys in one leaf point to the same blocks. Docs: Concepts, Index Clustering Factor (https://docs.oracle.com/en/database/oracle/oracle-database/23/cncpt/indexes-and-index-organized-tables.html) [T-24].

Fixed:

```sql
-- Fixed: selective predicate that fits the layout
SELECT id, name FROM employees WHERE id BETWEEN 1000 AND 1100;
-- Plan: INDEX RANGE SCAN on EMP_ID_PK + TABLE ACCESS BY INDEX ROWID BATCHED, A-Rows=101
```

What the plan shows: `INDEX RANGE SCAN` for bounded ranges, `INDEX UNIQUE SCAN` for `WHERE id = 42`, `INDEX FAST FULL SCAN` when the index covers the query without table access, `INDEX SKIP SCAN` in narrow cases. Each has set conditions in ch.8 [T-24]. Keep bitmaps to warehouse patterns. Docs flag DML concurrency limits, so test concurrent writes before use on OLTP [T-25].

Why it matters: cost includes clustering factor. Bad factor kills range-scan value. No factor check, no index.

### 2. Prune partitions and precompute repeats

Plain claim: skip partitions, or skip the work itself.

Naive progression:

```sql
-- Naive: 104 weekly partitions, filter on TRUNC(load_date) blocks pruning
SELECT COUNT(*) FROM sales WHERE TRUNC(sale_date) = DATE '2026-09-01';
-- Plan: PARTITION RANGE ALL, all 104 parts scanned
```

Fixed:

```sql
-- Fixed: predicate on the key, no function
SELECT COUNT(*) FROM sales WHERE sale_date >= DATE '2026-09-01' AND sale_date < DATE '2026-09-02';
-- Plan: PARTITION RANGE SINGLE, PSTART=17 PSTOP=17, TABLE ACCESS FULL on one part
```

What the plan shows: `PARTITION RANGE SINGLE` for one part, `PARTITION RANGE ITERATOR` for a range. Hash only prunes equality and `IN` lists. Functions and type conversions on the key break pruning [T-26]. For equi-partitioned joins on the key, look for partition-wise distribution [T-27].

Second progression, repeats:

```sql
-- Naive: monthly rollup scans 200M rows each run
SELECT TRUNC(sale_date,'MM'), SUM(amount) FROM sales GROUP BY TRUNC(sale_date,'MM');
-- Plan: TABLE ACCESS FULL + HASH GROUP BY, 90 seconds
-- Fixed: materialized view with ENABLE QUERY REWRITE, QUERY_REWRITE_ENABLED=TRUE
CREATE MATERIALIZED VIEW sales_mth_mv ENABLE QUERY REWRITE AS
SELECT TRUNC(sale_date,'MM') m, SUM(amount) s FROM sales GROUP BY TRUNC(sale_date,'MM');
-- Same SELECT now shows MAT_VIEW REWRITE ACCESS, 0.4 seconds
```

Docs: Data Warehousing Guide basic rewrite (https://docs.oracle.com/en/database/oracle/oracle-database/19/dwhsg/basic-query-rewrite-materialized-views.html) [T-28]. Stale data is the trade. Set refresh policy with eyes open. For hot read-mostly results, use result cache. Plan shows `RESULT CACHE`. Track hits via `DBMS_RESULT_CACHE`. Only for deterministic, slow-changing results [T-29].

Why it matters: pruning can cut work by orders of magnitude. Rewrite cuts repeat work to near zero. Both must appear in the plan. (One aside: I still grep plans for PARTITION before I trust them. Back to layout.)

### 3. Use memory, hardware, and auto help where they fit

Plain claim: scan-heavy analytics wants columnar or offload. OLTP wants neither.

Naive progression:

```sql
-- Naive: full scan aggregate on row store, 60 seconds
SELECT dept_id, AVG(salary) FROM employees GROUP BY dept_id;
```

Fixed for analytics: mark hot object `INMEMORY`, set `INMEMORY_SIZE`, rerun. Plan shows `TABLE ACCESS INMEMORY FULL` and `VECTOR GROUP BY` for aggregation [T-30/T-43]. Docs: In-Memory Guide 19c (https://docs.oracle.com/en/database/oracle/oracle-database/19/inmem/intro-to-in-memory-column-store.html). Check Enterprise Edition license scope first.

On Exadata, check cell offload stats (`cell physical IO bytes saved for offload`) for Smart Scan plus storage-index skips [T-31]. Offload needs direct-path full-scan shapes. Docs: Exadata Smart Scan page (https://www.oracle.com/database/technologies/exadata/software/smartscan/).

Two late additions. Index key compression (`COMPRESS n` or `COMPRESS ADVANCED LOW/HIGH`) packs more keys per block. Check `SELECT compression FROM all_indexes`. LOW needs 12.1.0+, HIGH needs 12.2.0+, HIGH adds CPU cost. Not for bitmap or IOT. Docs: Admin Guide 19c ch.21 §21.3.8 [T-67]. Parallel execution (`PX COORDINATOR`, `PX SEND`) cuts elapsed time on large scans with low concurrency and spare CPU plus I/O. It harms high-concurrency OLTP and overused systems. Test under load with HammerDB or Swingbench, not single-session only. Docs: VLDB and Partitioning Guide ch.8 [T-68]. Automatic Indexing finds gaps, tests invisible, keeps winners. It showed ~15% gain on customer loads with up to 60% space-reclaim potential (VLDB 2025) [T-32]. Check `DBMS_AUTO_INDEX.REPORT_ACTIVITY`. SQL Access Advisor proposes indexes, MVs, partitioning from a Tuning Set. Proposals need V0 [T-33]. Unverified on your schema — test on your schema.

Why it matters: each shortcut has a bill. Memory, license, CPU, writes. The plan plus rerun proves the bill was worth it.

**Keep this: Prove less I/O in the plan, not more objects in the schema. Show the operation, then the rerun delta.**
