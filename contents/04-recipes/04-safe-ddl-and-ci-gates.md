---
title: Safe DDL and CI Gates
description: Redefine without downtime and fail builds on regression.
order: 44
draft: false
---

Can we add that index without locking the table Friday at 5pm. Every junior dev has heard that question. The safe answer used to be no. This file gives you a yes with proof.

You know basic SQL. You write DML. DDL scares you because ALTER can block writes. You fear Friday deploys because rollback feels vague. This file makes DDL online and rollback concrete.

An online redefine is like a road detour, except traffic keeps moving while you pave the new lane.

<details><summary>In case you don't know about DBMS_REDEFINITION, it's the package that rebuilds a table online.</summary>It uses an interim table. ABORT_REDEF_TABLE stops the job before finish. Privileges and space matter. Reference: https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_REDEFINITION.html Unverified — run on your test DB.</details>

<details><summary>In case you don't know about utPLSQL, it's a test framework that asserts on results not speed.</summary>It runs suites in the DB. Green means semantics held. Speed comes later from SPA. See: https://www.utplsql.org/ and https://github.com/utplsql/utplsql SQLFluff oracle dialect: https://docs.sqlfluff.com/en/stable/reference/dialects.html</details>

## 1. Redefine online with an abort button

Plain claim: CAN, START, SYNC, FINISH beats a blocking ALTER.

Use this exact flow:

```sql
EXEC DBMS_REDEFINITION.CAN_REDEF_TABLE('APP','T', DBMS_REDEFINITION.CONS_USE_PK);
EXEC DBMS_REDEFINITION.START_REDEF_TABLE('APP','T','T_INT');
EXEC DBMS_REDEFINITION.SYNC_INTERIM_TABLE('APP','T','T_INT');
EXEC DBMS_REDEFINITION.FINISH_REDEF_TABLE('APP','T','T_INT');
```

Line by line: CAN_REDEF_TABLE checks if APP.T can go online with CONS_USE_PK. START_REDEF_TABLE begins work on interim T_INT. You build indexes and constraints on T_INT here. SYNC_INTERIM_TABLE replays recent writes to T_INT. FINISH_REDEF_TABLE swaps names and ends the job. Abort path is ABORT_REDEF_TABLE with the same three names before finish. Call shapes follow the DBMS_REDEFINITION reference. Unverified — run on your test DB.

How to read success: CAN returns clean. START creates the interim linkage. SYNC lag drops near zero. FINISH swaps fast. Queries keep running through all four steps.

Rollback line: run ABORT_REDEF_TABLE on APP, T, T_INT any time before FINISH. Test the abort once in sandbox. After FINISH, rollback means a new redefine back, not an abort.

Worked progression A — CAN to START to SYNC to FINISH: CAN passes on primary key. START links T_INT. You add the index on T_INT only. SYNC catches up writes. FINISH swaps at low traffic. App sees short lock only at swap.

Worked progression B — abort mid-flight: START succeeded. Your index build on T_INT looks wrong. You run ABORT_REDEF_TABLE. Temp objects clear. Source table never swapped. You fix the interim definition and start again.

## 2. Pick one rollout path per change

Plain claim: one change, one path, one recorded rollback.

Physical table change uses the redefine flow above. App code rollout uses Edition-Based Redefinition with instant switch and revert by edition. Pick one path per change. Record it. Neither path skips measurement. The change still faces SPA on the frozen STS.

No new code here. The four-line block above is the code for table shape changes.

Line by line for the choice: if the fix needs new columns or partitions, use redefine. If the fix needs new views or PL/SQL, use editions. Write the choice in the run log. Write the revert command next to it.

How to read success: the log names the path. The revert was tested in sandbox. SPA shows no regressed statement after the swap.

Rollback line: redefine path reverts with ABORT before FINISH. Edition path reverts by switching edition back. Both need a prior test in sandbox.

Worked progression A — table path with measure: redefine adds a partition to APP.T. SPA before and after on buffer_gets shows flat or better. You FINISH. You watch AWR for one window.

Worked progression B — code path with measure: new edition holds fixed PL/SQL. Old edition stays live. You switch one session first. utPLSQL passes. You switch traffic. Revert is one switch back.

## 3. Fail builds on regression with 5 gates

Plain claim: five small gates beat one big Friday scare.

Gate 1 lints with SQLFluff oracle dialect plus sqlglot parse. No DB needed. Gate 2 runs utPLSQL suites for result correctness on a clone. Gate 3 captures STS and runs SPA before and after, and fails on regression past threshold. Gate 4 runs HammerDB or Swingbench for concurrency and fails on quarantine events. Gate 5 promotes with AWR and ASH watch plus quarantine check. Tool names and gate order come from the research CI pattern. Unverified — run on your test DB.

No new PL/SQL here. Gate 3 reuses the SPA block from the prior file verbatim.

Line by line: lint catches syntax and style early. utPLSQL proves results still match. SPA proves speed did not regress. Load proves concurrency holds. Watched promote proves prod stays calm.

How to read success: all 5 gates green in order. Gate 3 report shows buffer_gets flat or better per statement. Gate 4 shows no quarantine. Gate 5 shows clean AWR for the watch window.

Rollback line: fail at any gate stops promote. DDL aborts with ABORT_REDEF_TABLE. Stats discard with pending delete or restore. Code reverts by edition switch. Each rollback was tested before need.

Worked progression A — CAN to START to SYNC to FINISH to CI gates: redefine passes in test. Lint green. utPLSQL green. SPA green on buffer_gets. Load green. You FINISH in prod during window. You watch AWR one hour.

Worked progression B — gate 3 red blocks gate 5: lint green, utPLSQL green, SPA shows one statement up 40% on buffer_gets. Build fails. No FINISH in prod. You abort redefine, drop pending stats, log sql_id and plan hash. Friday stays calm.

**Keep this: No DDL without tested abort; no promote without 5 green gates.**
