---
title: Safe DDL and CI Gates
description: Redefine without downtime and fail builds on regression.
order: 44
draft: false
---

"'can we add that index without locking the table Friday at 5pm?'"

Ship physical change through a path that has an abort button plus five CI gates.

An online redefine is like a road detour, except traffic keeps moving while you pave the new lane.

<details><summary>In case you don't know about DBMS_REDEFINITION, it's the package that rebuilds a table online.</summary>It uses an interim table. ABORT_REDEF_TABLE stops the job before finish. Privileges and space matter.</details>

<details><summary>In case you don't know about utPLSQL, it's a test framework that asserts on results not speed.</summary>It runs suites in the DB. Green means semantics held. Speed comes later from SPA.</details>

DDL can harm. Online redefinition lowers that harm. You check with CAN_REDEF_TABLE. You start on T_INT. You build indexes on T_INT. You sync. You finish. Abort stays open until finish. Finish is the commit point.

Code rollouts have a second path. Edition-Based Redefinition gives instant switch and revert by edition. Pick one path per change. Record it. Test the rollback once in sandbox. Neither path skips measurement.

Use this exact flow:

```sql
EXEC DBMS_REDEFINITION.CAN_REDEF_TABLE('APP','T', DBMS_REDEFINITION.CONS_USE_PK);
EXEC DBMS_REDEFINITION.START_REDEF_TABLE('APP','T','T_INT');
EXEC DBMS_REDEFINITION.SYNC_INTERIM_TABLE('APP','T','T_INT');
EXEC DBMS_REDEFINITION.FINISH_REDEF_TABLE('APP','T','T_INT');
```

CI adds 5 gates. Gate 1: lint with SQLFluff oracle dialect plus sqlglot parse. Gate 2: utPLSQL for result correctness on a clone. Gate 3: STS capture plus SPA before and after; fail on regression past threshold. Gate 4: HammerDB or Swingbench for concurrency; fail on quarantine events. Gate 5: promote with AWR and ASH watch plus quarantine check.

**Keep this: No DDL without tested abort; no promote without 5 green gates.**
