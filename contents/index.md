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

Number: 18 papers, 6 briefs. Classes A1/A2/B1/B2/C1/C2/D. PROVEN = 2 sources or 1 strong plus rerun.

<details><summary>In case you don't know about Oracle SQL tuning, it's the work of making a query use less time and less I/O.</summary>You read the plan Oracle picked. You lock the good plan so it stays fast.</details>

<details><summary>In case you don't know about an execution plan, it's the steps Oracle chose to run your query.</summary>You save both plans. You compare hash, rows, and reads.</details>

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
