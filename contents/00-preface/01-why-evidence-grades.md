---
title: Why Evidence Grades Decide What You Trust
description: A1 to D grades, the proven bar, and what stays out.
order: 2
draft: false
---

A junior ships an index from a blog post. Staging looks fast. Prod gets slower. The blog was wrong for that data. No grade, no check, no rollback plan.

This topic gives you grades so that story stops. You trust runs, not rumors.

You write SELECT and JOIN. You search when a query drags. You find five tips that clash. That is the baseline. Grades sort those five in minutes.

An evidence class is a referee badge, except it names the source type and the rerun you must do.

One aside: I once kept a tip that passed once and failed weekly. Back to grades.

## 1. Grades name the tester

Claim: Each grade names who tested the claim and how to re-test it.

Example: Take the blog claim "disable bind variables for speed." Grade it D. D means blog or forum, per the research index compiled 2026-09-22. It suggests, never proves. Open the 19c Tuning Guide E96095-19 April 2025 [S01] https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/ . That is A1. A1 means Oracle versioned docs. Open the statistics brief for 19c [S08]. That is A2. A2 means Oracle whitepaper or brief. Now you have D vs A1/A2. Still not PROVEN. PROVEN needs 2 sources, or 1 strong source from A1/A2/B1 plus a repeatable check. Log the tip as D. Link the A1 page. Queue the rerun. That is the full grading move.

Why it matters: You can reject a tip without a fight. Point to the grade. Ask for the rerun.

Number: 68 entries passed this gate. Zero passed on D alone. The scale is A1/A2/B1/B2/C1/C2/D.

Here is the scale in plain form. A1: Oracle versioned docs. Example: Tuning Guide 19c, DBMS_SQLPA reference [S06] https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html . A2: Oracle briefs. Example: statistics gathering brief 19c. B1: peer-reviewed papers. Example: Automatic Indexing VLDB 2025, Real-Time SPM PVLDB 2026. B2: third-party repeat of a paper. Example: SIGMOD 2022 repeat for WeTune. C1: deterministic tool with readable output. Example: DBMS_XPLAN, DBMS_SQLPA, SQL Monitor, TKPROF. C2: kept open source with live repo. Example: HammerDB, python-oracledb. D: blogs and forums. Context only. Never proof alone.

Progression 1: raw tip to D tag to A1 page to rerun gate.
Progression 2: single paper claim to B1 tag to Oracle run required to catalog entry.

## 2. The PROVEN bar filters claims

Claim: PROVEN means two sources agree, or one strong source plus a rerun.

Example: Use tiny employees and departments. A blog says a new index speeds the JOIN. Grade D. Find A1 support for index structures in the 19c docs. Still not enough. Run V0. Step 1: freeze the JOIN in a SQL Tuning Set. Step 2: DBMS_SQLPA test execute for before [S06]. Step 3: add one index only. Step 4: test execute for after, then compare performance on elapsed_time, then buffer_gets. Step 5: repeat and keep medians per Hoefler and Belli SC15 [S58] https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf . Step 6: save DBMS_XPLAN DISPLAY_CURSOR for both plans, as covered in [S01]. Compare plan hash, E-Rows vs A-Rows, access predicates. If medians beat noise and plans show fewer reads, you pass. If not, you roll back. Unverified here: sqlcl and sqlplus were missing in the research pass, so this walkthrough was not executed here. It is a procedure to run on your DB, not a result.

Why it matters: One change at a time shows cause. Medians show truth. Plans show mechanism.

Number: 33 tools support this bar. DBMS_SQLPA and DBMS_XPLAN are C1. 19 papers inform it. Only Oracle-tested ones count for Oracle wins.

Candidates show the bar working. Bao is proven on PostgreSQL, not Oracle here. AutoSteer covers other engines per its abstract, not Oracle here. LLM rewrites lack Oracle runs here. They stay in CANDIDATE. They are not in the 68. That is not bias. That is scope control.

## 3. Read the citation, check the source

Claim: A citation tells you class, version, and where to check.

Example: Read [S01] — Oracle. Oracle Database SQL Tuning Guide, 19c. E96095-19, April 2025. https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/ . S01 is the short ID. A1 is the class. E96095-19 April 2025 is the exact version. The URL opens the guide. Read [S12] for the SQL Plan Management brief 19c. Read [S58] for SC15 slides. Each [S##] maps to a full record with title, version, date, URL, access date 2026-09-22. Practice on three IDs. Then you can read all 19 papers and 6 briefs the same way. Check 19c vs 26ai scope each time. The research index marks version scope where verified and flags gaps where not.

Why it matters: You audit fast. You also catch stale advice. A 2012 tip may not fit 19c defaults.

Number: 19 papers plus 6 Oracle briefs plus 33 tools. PROVEN = 2 sources or 1 strong A1/A2/B1 plus a rerun. That rule built the 68-entry catalog in 8 groups.

<details><summary>In case you don't know about optimizer statistics, it's the numbers Oracle keeps about your tables.</summary>They are numbers Oracle keeps on your tables and indexes. Row counts, block counts, value spread, and clustering. Fresh numbers lead to sound plans. Old numbers lead to poor guesses. Setup is the auto task by default. Keep it on. Tune edges with `DBMS_STATS.SET_TABLE_PREFS` and `GATHER_TABLE_STATS` with AUTO_SAMPLE_SIZE. Owners and DBAs check them after loads and when plans flip overnight. They drive join order and access choice. Do not run 100% gathers on huge tables by habit. Full scans each night blow the window and can flip plans for no gain. Sharp line: stats fix the input the cost model reads. Example: a dept filter matches 20 rows but the plan shows FULL with E-Rows far from A-Rows. Fresh stats flip it to INDEX RANGE SCAN. See [T-09][T-10][S08].</details>

The catalog was built bottom-up from docs to papers to tools. No remembered list. 68 entries passed. The rest stayed out. No live DB was open here. sqlcl and sqlplus were missing. Nothing here claims a local run.

**Keep this: Trust A1 plus a rerun; treat D as a hint, never proof.**
