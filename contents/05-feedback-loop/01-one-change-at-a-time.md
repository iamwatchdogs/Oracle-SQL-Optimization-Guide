---
title: One Change at a Time
description: Propose a single candidate, apply in isolation, then re-baseline.
order: 51
draft: false
---

Last year a tuning loop accepted three fixes in a row without re-baseline. It cost 9 hours of rework and one rolled-back release. Each fix passed alone. Together they hid two regressions.

You have seen a query run faster once then run slower in prod. That gap is why this rule exists. Thesis up front: one proposal, one apply in test, one SPA verdict, then re-baseline.

A single-change loop is like a taste test, except you add one spice then ask the same 20 eaters.

Status: designed, not run. This env had no live Oracle DB. No sqlcl or sqlplus on PATH. No credentials. All steps below are NOT-VERIFIED here. Authority comes from sources. [S17] SQL Tuning Advisor ch.25, https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/sql-tuning-advisor.html. [S35] SQL Access Advisor ch.26. [S27] Optimizer Statistics Advisor ch.18. [S15] DBMS_AUTO_INDEX, https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_AUTO_INDEX.html. [S06] DBMS_SQLPA, https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html. [S05] DBMS_XPLAN, https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html. [S12] SPM brief, https://www.oracle.com/technetwork/database/bi-datawarehousing/twp-sql-plan-mgmt-19c-5324207.pdf.

## 1. Propose exactly one candidate

Claim: each loop tests a single idea with written rationale.

Walkthrough A: STS OPT_LOOP_WL holds 12 statements, frozen. You run SQL Tuning Advisor with scope COMPREHENSIVE and time_limit 600. Report suggests a SQL profile for sql_id abc123. SQL Access Advisor suggests an index on ORDERS(STATUS, CREATED_AT). Optimizer Statistics Advisor flags stale stats on ORDERS. Auto-index report lists one more candidate. Four ideas exist. You pick one. You write down why: index matches two filter predicates in three STS statements. Other ideas wait.

Walkthrough B: agent-authored rewrite path. Query uses SELECT DISTINCT over a join that cannot duplicate rows. Hypothesis: DISTINCT adds a sort with no benefit. You propose removal of DISTINCT as the single change. No stats refresh in the same loop. No hint in the same loop. Rationale names the sort step seen in DISPLAY_CURSOR.

Why this rule exists: advisors already list high-quality candidates with reasons [S17][S35][S27][S15]. That list is proposal only. Oracle plan evolution verifies candidates against baselines one by one [S07][S12]. Automatic indexing verifies one index effect through the workload [S16]. D6 bans interleaved changes because attribution breaks. D12 says design proposals from advisor output first.

Cost of skipping it: two good ideas merge. Buffer_gets drops 10% in test. Prod shows a regression on statement 7. No one knows which idea hurt it. You revert both. You lose the real win with the bad one. Hours burn.

## 2. Apply where failure is cheap

Claim: the single change lands in test only, behind a cheap screen.

Walkthrough C: cheap screen first. You run SPA with execution_type explain plan on the frozen STS. Cost is low. Plan shows the new index gets used for two statements. No error. You proceed to test execute. That order saves DB time. This step is NOT-VERIFIED here because no test DB existed.

Walkthrough D: isolated apply. You create the index in the test schema. Or you use a standby copy. Or you redefine on an interim table with DBMS_REDEFINITION and keep ABORT ready. Prod stays untouched. Session parameter tweaks stay out. Global CURSOR_SHARING change stays out per G5. Forbidden moves stay refused [S20][S19].

Why this rule exists: SPA can analyze a standby workload from the primary [S13]. Redefinition has ABORT before finish as the safe exit [S41]. Editions allow a switch back [S42]. S3 exists to keep blast radius small. S2 gates before DB time with parse, lint, and behavior tests. Parse uses sqlglot [S60] https://github.com/tobymao/sqlglot. Lint uses SQLFluff Oracle dialect [S61] https://docs.sqlfluff.com. Behavior tests use utPLSQL [S63] https://github.com/utplsql/utplsql. Equivalence provers are candidates only [S50] https://github.com/VeriEQL/VeriEQL.

Cost of skipping it: index builds in prod to save time. Build locks the table. Writes queue. App latency spikes. Rollback now needs a prod drop during traffic. A 10-minute test becomes a 3-hour incident.

## 3. Measure once, then re-baseline

Claim: one SPA verdict covers one change, then the baseline moves.

Walkthrough E: measure. You run two test execute runs on the frozen STS. You set comparison_metric to buffer_gets. You run compare performance. You read per-statement rows first, then the aggregate. You capture DISPLAY_CURSOR per statement. Plan-hash change alone decides nothing. Only measured deltas decide. SQL Monitor covers heavy statements. This full measure is NOT-VERIFIED here.

Walkthrough F: re-baseline. Change passes the gate. You load the winning plan with DBMS_SPM.LOAD_PLANS_FROM_CURSOR_CACHE [S07]. That plan becomes the next incumbent. Next loop proposes against that new baseline. A rejected change never moves the baseline. Rollback verifies the old hash returns, then the loop continues.

Why this rule exists: SPA exists to predict workload impact by building two versions and comparing them [S06]. Metrics are choosable. Elapsed_time is default. Buffer_gets is the primary here for lower variance. D4 demands the same workload before and after. D5 demands a deliberate metric choice. Re-baseline keeps each verdict independent.

Cost of skipping it: you stack idea two on top of an unverified idea one. Numbers drift. Statement 4 improves 15% from idea one, then drops 12% from idea two. Net shows +3%. You ship. Prod load shifts binds. Idea two collapses. Debug starts from a false baseline. Rework doubles.

<details><summary>In case you don't know about SQL Tuning Advisor, it's an Oracle tool that suggests profiles plus stats plus plan fixes.</summary>SQL Tuning Advisor runs four checks: statistics, profiling, access path, structure, plus alternative plans. You run it on one SQL ID, AWR range, or tuning set with scope COMPREHENSIVE and time_limit 600. The report is proposal only. Test DB path is still required. Tuning owners use it as first pass on any regressed statement. It drives one decision: which single hypothesis to test next in SPA. Do not apply all four tips at once. Mixed changes break attribution, and the cost is hours untangling which tip hurt statement seven. Sharp line: it writes the shortlist so the loop does not guess blind. Example: sql_id abc123 gets a profile tip plus a stale-stats flag. You pick the profile first and run SPA K>=5 on buffer_gets. Other tips wait. That proof step is NOT-VERIFIED here. See [T-54] https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/sql-tuning-advisor.html</details>

<details><summary>In case you don't know about isolated apply, it's change in test where failure costs little.</summary>Isolated apply lands one change in test only behind a cheap screen. First run SPA explain plan to screen, then test execute. Targets are a clone, standby, or interim table with abort ready. Prod sees only promoted wins. Session tweaks stay out and forbidden moves stay refused. Release owners use it for every loop turn. It drives one decision: is this safe enough to measure at full cost. Do not build an index in prod to save time. Build locks, writes queue, latency spikes, and the cost turns a ten-minute test into a three-hour incident. Sharp line: it keeps blast radius at test size until proof exists. Example: the index builds in the test schema, SPA on OPT_LOOP_WL shows clean, the redefine path keeps ABORT ready, and prod stays untouched until the promote gate re-runs SPA on target. See [S06][S13][S41][S42].</details>

**Keep this: One proposal, one apply in test, one SPA verdict, then re-baseline.**
