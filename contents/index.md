---
title: Oracle SQL Optimization for Junior Devs
description: Prove every speed win twice. A short book from 68 proven Oracle fixes, tools, and safe ship habits.
order: 0
draft: false
---

Tuesday 2 a.m. your query stalls. A blog hint makes it fast once. At 9 a.m. it stalls again.

This book proves a change is faster, then ships it safe.

You know SELECT, JOIN, WHERE. You copy tips when stuck. Baseline set.

This book is a counter scale, except it weighs plans and reads instead of flour.

One aside: I shipped one too. Back to the check.

## 1. Tips are hints, grades decide

Claim: A tip proves nothing until a stronger source backs it.

Example: A blog says hints always fix slow JOINs. Grade it D. D means blog or forum. Check the 19c Tuning Guide E96095-19 April 2025 [S01] https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/ . That is A1. D plus A1 is still not PROVEN. PROVEN needs 2 sources, or 1 strong source plus a rerun. Mark D. Require a rerun.

Why it matters: You keep only claims you can re-test.

Number: Catalog holds 68 entries. D alone passed zero.

Progression 1: tip to D to A1 to rerun.
Progression 2: guess to fact to trace.

## 2. One change, two runs

Claim: One run is noise. Two runs on one workload is signal.

Example: Take tiny employees and departments. Freeze them in a Tuning Set for V0. Step 1: save the workload. Step 2: DBMS_SQLPA test execute for before [S06] https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html . Step 3: apply one change. Step 4: test execute for after, compare on elapsed_time and buffer_gets. Step 5: repeat and keep medians per Hoefler and Belli SC15 [S58] https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf . Step 6: save DISPLAY_CURSOR for both, as covered in [S01]. Compare hash, E-Rows vs A-Rows, predicates. Unverified: sqlcl and sqlplus were missing, so no runs here. Run V0 on your DB.

Why it matters: Same input and medians stop false wins.

Number: 33 tools back it. DBMS_SQLPA [S06] and DBMS_XPLAN [S01] are C1.

## 3. Every number needs a source

Claim: Without a source, you cannot trust the number.

Example: Read [S01] — Oracle. Tuning Guide, 19c. E96095-19, April 2025. https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/ . S01 is the ID, A1 the class, 19c the version. Read [S06] for DBMS_SQLPA. Read [S58] for SC15. Each [S##] maps to a full record. No record, no trust.

Why it matters: You audit fast. You check 19c vs 26ai scope.

Number: 19 papers, 6 briefs. Classes A1/A2/B1/B2/C1/C2/D. PROVEN = 2 sources or 1 strong plus rerun.

<details><summary>In case you don't know about Oracle SQL tuning, it's the work of making a query use less time and less I/O.</summary>You read the plan Oracle picked. You fix bad guesses with fresh numbers or better layout. You lock the good plan so it stays fast. Steps are fixed. Save the DISPLAY_CURSOR pair first. Fix stats, index, or rewrite next. Compare with SPA last. Teams with a 40-second regress need it now. Devs shipping new SQL need it before prod. It drives one decision: change and prove, or roll back. Do not start with blind index adds. Blind indexes cost writes and space with no proof. Sharp line: tuning proves per-statement gain, not app feel. Example: an employees join jumps from 2s to 40s. AWR plus ASH names the SQL ID. XPLAN shows E-Rows 500 versus A-Rows 2M. See the Tuning Guide 19c, https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/ [S01].</details>

<details><summary>In case you don't know about an execution plan, it's the steps Oracle chose to run your query.</summary>It is the step list Oracle chose for your SELECT and JOIN. It names join order and how each table was read. It also shows row guesses and cost per line. You get it after you run the query. Run `SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR());` for the last cursor. `EXPLAIN PLAN FOR` plus `DISPLAY()` only shows a compile guess. Devs and DBAs pull it when a query slows with no code change. It comes first, before any index or rewrite. It drives one decision. Same plan hash means look at data or load. New hash means the optimizer picked a new path. Do not use wall time alone. Wall time hides which line moved and pushes blind rewrites that cost test cycles. Sharp line: it is the only proof of what ran, line by line. Example: `SELECT * FROM employees WHERE dept_id = 10;` then compare hash 3693697075 for TABLE ACCESS FULL versus the hash for INDEX RANGE SCAN. Unverified — check on your DB for your hash. See [T-04][S05] https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/generating-and-displaying-execution-plans.html</details>

How to read this book:

- Start at [00-preface](/00-preface/) if you have 10 minutes. It shows how evidence grades work and the 6-step check every chapter uses.
- Read [01-proven-techniques](/01-proven-techniques/) for the 68 fixes in 5 moves: measure, feed estimates, fix layout, let rewrites happen, lock the plan.
- Use [02-papers-behind-recipes](/02-papers-behind-recipes/) when someone cites a paper from another database. Only 3 papers here are Oracle-tested. The rest are ideas until Oracle runs prove them.
- Keep [03-toolbox](/03-toolbox/) open while you work. One claim, one tool: plan, monitor, tuning set, analyzer, loader, linter.
- Copy from [04-recipes](/04-recipes/) when you need exact calls for tuning sets, before-and-after compares, stats pipelines, and safe deploys.
- Finish with [05-feedback-loop](/05-feedback-loop/) for the boring loop that wins: one change, frozen input, measured noise, accept or roll back, write the lesson.
- Check [06-oss-guide](/06-oss-guide/) before you add a GitHub tool. Parse and lint help. Plan control stays inside Oracle.
- Use [07-appendix-sources](/07-appendix-sources/) to look up any `[S##]` number, class, and date.
- Skip [08-bonus-batch-api](/08-bonus-batch-api/) unless you need cheap async AI calls. It is not Oracle. It is marked bonus for that reason.

No live DB was open here. sqlcl and sqlplus were missing.

**Keep this: If you did not measure it twice on the same workload, you did not fix it.**
