---
title: Toolbox
description: Deterministic tools that prove what changed and what is safe.
order: 30
draft: false
---

Picture a junior with 4 screens open, each showing a different plan for the same query.

No guess ships. Each claim gets one tool that can prove or reject it.

You can run SELECT. You have seen a slow query. You have heard "it feels slow after the stats job." That is the baseline. This chapter starts there.

A toolbox is like a test bench, except each tool checks one claim and writes down its proof.

<details><summary>In case you don't know about deterministic, it's output you can repeat with machine-readable proof when inputs and DB state match.</summary>Our set lists only tools with docs checked on 2026-09-22.</details>

## 1. Measure first, argue later

Plain claim: the executed plan is the truth. Not the guessed plan. The run plan.

Worked example: run your SQL, then read the cursor cache:

```sql
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR());
```

For a known SQL ID, name it:

```sql
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_CURSOR('gwp663cqh5qbf', 0, 'ALLSTATS LAST'));
```

Shapes above come from Oracle DBMS_XPLAN 19c docs (https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html).

How to read it: check Plan hash value at the top. Check Rows (optimizer guess) against A-Rows (real rows) per line. Check timing per line.

Decision it drives: hash changed means the plan changed. Big guess-vs-real gap means the estimate pushed a bad choice. No hash, no verdict.

## 2. Freeze the work, then compare

Plain claim: one fast run proves nothing. Same workload twice proves a change.

Worked example: load top SQL into one set with DBMS_SQLSET.CREATE_SQLSET plus LOAD_SQLSET, then build a task:

```sql
EXEC :tname := DBMS_SQLPA.CREATE_ANALYSIS_TASK(sqlset_name => 'my_sts');
EXEC DBMS_SQLPA.EXECUTE_ANALYSIS_TASK(task_name => :tname, execution_type => 'test execute', execution_name => 'before_change');
```

After your change, run `test execute` again as `after_change`, then `compare performance`. Shapes from Oracle DBMS_SQLPA 19c docs (https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html) and STS guide (https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/managing-sql-tuning-sets.html).

How to read it: open REPORT_ANALYSIS_TASK. Look for improved, regressed, unchanged per statement. Default is elapsed_time. You can set buffer_gets.

Decision it drives: regressed means stop. Improved across the set means keep testing under load.

## 3. Prove safe before prod, catch shape faults early

Plain claim: solo wins can fail at 10 a.m. with 30 sessions. Mechanical faults can fail before you even connect.

Worked example A — load: drive a copy with HammerDB (GPL-3.0, 786 stars, last push 2026-09-18, https://www.hammerdb.com/) from hammerdbcli with a Tcl script. Watch Resource Manager caps and SQL Quarantine blocks. Zero quarantine hits is the gate.

Worked example B — static: parse with sqlglot (`parse_one`, MIT, 9628 stars, https://github.com/tobymao/sqlglot), lint with SQLFluff (`sqlfluff lint --dialect oracle`, MIT, 9883 stars, https://docs.sqlfluff.com/). Unverified — test on your schema for exact config paths.

One aside: four screens, one query, zero proof — classic. Back to the proof.

How to read it: load output gives throughput plus errors plus quarantine events. Lint output gives rule hits plus file and line.

Decision it drives: quarantine hit means fix the plan. Lint hit means fix the text. Stored-result fail means the rewrite changed meaning.

<details><summary>In case you don't know about SQL Tuning Sets, it's a stored copy of SQL text, binds, and stats you can replay and move.</summary>DBMS_SQLSET is the newer interface in 19c. Same calls work in DBMS_SQLTUNE. Move the set to test when you need isolation.</details>

In this chapter:

- [Measure With XPLAN and Monitor](/03-toolbox/01-measure-with-xplan-and-monitor/)
- [Freeze Work With STS](/03-toolbox/02-freeze-work-with-sts/)
- [Load Test Without Prod](/03-toolbox/03-load-test-without-prod/)
- [Static Checks Before DB Time](/03-toolbox/04-static-checks-before-db-time/)

**Keep this: Match each claim to one tool that can prove or reject it.**
