---
title: Indexes and Layout
description: B-tree paths, partitioning, MVs, memory, and auto indexes.
order: 13
draft: false
---

"Do I just index every column? No."

Store data so Oracle reads less. Each shortcut has a bill.

An index is like a book index, except it speeds selective reads while taxing each write and using disk space.

<details><summary>In case you don't know about a B-tree path, it's how Oracle walks an ordered index to rows.</summary>Range scan fits selective filters. Full scan fits bulk reads. Skip scan fits special cases. Cost picks the winner.</details>

<details><summary>In case you don't know about partitioning, it's splitting a big table by key values.</summary>Time keys are common. Pruning skips whole parts. The plan shows PARTITION START and STOP when it works.</details>

Start with B-tree design from chapter 8. Check clustering factor. A poor factor kills range-scan value. Keep bitmaps to warehouse patterns. The docs flag DML concurrency limits, so test concurrent writes. For large time-based tables, require pruning in the plan. Functions on the key break it. For equi-partitioned joins, look for partition-wise distribution in the plan.

For repeated rollups, use materialized views. The plan must show MAT_VIEW REWRITE ACCESS. Set refresh policy with eyes open. Stale data is the trade. For hot read-mostly results, use result cache. The plan shows RESULT CACHE. Track hits via DBMS_RESULT_CACHE. For scan-heavy analytics, test In-Memory column store. The plan shows IN-MEMORY TABLE ACCESS. Check `INMEMORY_SIZE` and license scope. On Exadata, check cell offload numbers for Smart Scan plus storage-index skips.

Two late additions matter. Index compression with `CREATE INDEX ... COMPRESS n` or `COMPRESS ADVANCED {LOW|HIGH}` cuts space per block. Check `SELECT compression FROM all_indexes WHERE index_name = '...'` and rerun V0, because LOW needs 12.1.0+ and HIGH needs 12.2.0+ and adds CPU cost. Parallel execution with PX COORDINATOR paths cuts elapsed time on large scans with low concurrency and spare CPU plus I/O. It harms high-concurrency OLTP. Test under load.

**Keep this: Prove less I/O in the plan, not more objects in the schema.**
