---
title: Recipes You Can Script
description: Frozen inputs, measured change, and gates that block harm.
order: 40
draft: false
---

Friday at 4pm. A report runs slow. You re-run it by hand. New binds each time. New timing each time. Nothing proves anything. Monday brings the same bug back.

You know basic SQL. You write SELECT with JOINs. You write INSERT, UPDATE, DELETE. You fear Friday deploys because prod behaves different from test. This chapter closes that gap.

A recipe run is like a lab test, except the sample is SQL text plus binds plus plans.

<details><summary>In case you don't know about STS, it's a named set of SQL saved inside Oracle for replay.</summary>STS holds text, binds, and plan data. Both runs read the same set. That makes the compare fair. See DBMS_SQLSET reference: https://docs.oracle.com/en/database/oracle/oracle-database/18/arpls/DBMS_SQLSET.html</details>

<details><summary>In case you don't know about SPA, it's the Oracle tool that runs a workload twice and compares the two runs.</summary>SPA reports per-statement deltas. It can compare on buffer_gets or elapsed_time. It writes a report you can parse. See DBMS_SQLPA reference: https://docs.oracle.com/en/database/oracle/oracle-database/26/arpls/DBMS_SQLPA.html</details>

## 1. Freeze the input before you change anything

Hand runs drift. Binds shift. Plans shift. Data shifts. A scripted run freezes the workload first as an STS. You capture from the cursor cache over a 300-second window. You inspect the top 20 by buffer_gets. You lock the set. Both later runs read that same set. No frozen set means no claim.

## 2. Measure twice on the same set

One fast run proves nothing. SPA runs test execute twice on the frozen STS. Once before the change. Once after. Then it compares on buffer_gets first and elapsed_time second. You read per-statement rows, then the aggregate. You record plan hash per statement. A plan change alone is not proof. Only measured deltas count. SPA needs repeated runs per side. Research sets K>=5 reps as the floor.

## 3. Gate stats, DDL, and promote

Stats drive plans. You set INCREMENTAL TRUE and STALE_PERCENT 5 in a script. You test with PUBLISH FALSE before you publish. DDL moves through CAN, START, SYNC, FINISH with an abort path. CI adds 5 gates: lint, utPLSQL on a clone, SPA workload compare, load check, watched promote. See DBMS_STATS reference: https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_STATS.html and DBMS_REDEFINITION reference: https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_REDEFINITION.html and pending-stats flow: https://docs.oracle.com/en/database/oracle/oracle-database/18/tgsql/controlling-the-use-of-optimizer-statistics.html and SQLFluff dialects: https://docs.sqlfluff.com/en/stable/reference/dialects.html and utPLSQL: https://www.utplsql.org/

You will see four moves in this chapter. Freeze with STS. Compare before and after with SPA. Script the stats pipeline. Guard DDL and CI. Each move has code you can run. Each move names its rollback. No step mutates prod first.

Numbers set the tone. Capture runs 300 seconds. SPA needs K>=5 reps per side. Stats use 5% stale limits. CI has 5 gates. Small numbers. Clear pass or fail.

In this chapter:

- [Freeze With STS](/04-recipes/01-freeze-with-sts/)
- [Before and After With SPA](/04-recipes/02-before-after-with-spa/)
- [Stats Pipeline You Can Script](/04-recipes/03-stats-pipeline-you-can-script/)
- [Safe DDL and CI Gates](/04-recipes/04-safe-ddl-and-ci-gates/)

**Keep this: Freeze first, change once, measure twice, promote only on proof.**
