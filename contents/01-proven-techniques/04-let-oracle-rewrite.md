---
title: Let Oracle Rewrite
description: OR expansion, unnesting, star paths, and safe approximations.
order: 14
draft: false
---

"Should I rewrite this query by hand? Usually no."

Let the optimizer rewrite first. Check the plan it picked.

A query transformation is like rewording a request, except Oracle keeps the meaning and picks a cheaper execution shape.

<details><summary>In case you don't know about view merging, it's folding an inner query into the outer one.</summary>Folded queries expose better joins. Some shapes run worse folded. Controls exist for that reason.</details>

<details><summary>In case you don't know about subquery unnesting, it's turning a subquery into a join.</summary>Filters become HASH JOIN SEMI or ANTI paths. The plan names the new shape. V0 proves the gain.</details>

The list is fixed in chapter 5. OR expansion turns ORs into UNION-ALL branches and shows CONCATENATION. Predicate pushing moves filters inside views to prune early. Star transformation handles star schemas and shows `STAR TRANSFORMATION`, but needs `STAR_TRANSFORMATION_ENABLED` plus bitmaps on fact keys. Join factorization merges common joins across UNION branches. Table expansion splits partially indexed access into branches. Temp-table transformation stores a repeated result for cursor duration. Do not force it by hand. It is internal.

Two special cases close the set. VECTOR GROUP BY speeds aggregation over In-Memory scans. Check the plan line plus scan timing. `APPROX_COUNT_DISTINCT` trades exactness for speed. Keep the exact query as reference. Measure error on samples. Document the approximation in output.

The oldest proof habit still wins. Do not cite the manual. Show the plan before and after. Name the new row source. Pair it with buffer gets and elapsed time from the same Tuning Set.

**Keep this: Name the rewrite in the plan, then show the rerun delta.**
