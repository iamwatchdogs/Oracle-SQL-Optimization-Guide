---
title: Accept or Rollback Gate
description: Five checks must pass or you restore and log the lesson.
order: 53
draft: false
---

A team kept a patch that cut one query 20% and slowed three others 8% each. Aggregate load rose. Quarantine fired two days later. Cleanup took a full sprint.

You have seen a query run faster once then run slower in prod. The gate below blocks that ship. Thesis up front: five checks pass means promote, one miss means roll back, verify hash, and log.

An accept gate is like a border check, except five stamps are needed and one miss sends the change back.

Status: designed, not run. This env had no live Oracle DB. No sqlcl or sqlplus on PATH. All accept, rollback, and verify-hash steps are NOT-VERIFIED here. Authority comes from sources. [S06] DBMS_SQLPA, https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html. [S05] DBMS_XPLAN, https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html. [S12] SPM brief, https://www.oracle.com/technetwork/database/bi-datawarehousing/twp-sql-plan-mgmt-19c-5324207.pdf. [S07] DBMS_SPM, https://docs.oracle.com/en/database/oracle/oracle-database/18/arpls/DBMS_SPM.html. [S11] Real-Time SPM, https://arxiv.org/html/2608.27758v1. [S40] quarantine, https://oracle-base.com/articles/19c/sql-quarantine-19c. [S29] stats control and restore. [S43] DBMS_SQLDIAG, https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLDIAG.html.

## 1. Five checks decide

Claim: keep only changes that clear all five checks on the frozen STS.

Walkthrough A: pass path. Noise floor from A/A is 3% on buffer_gets. Margin is max of 6% or 5%, so 6%. Index over K=10 shows aggregate buffer_gets down 12%. Check 1 passes. Bootstrap 95% CI is [-15%, -8%]. Zero sits outside. Check 2 passes. No STS statement regresses past 6%. Worst mover is -1%. Check 3 passes. Result sets match. utPLSQL suites stay green. Check 4 passes. Rollback text is recorded and ran once in sandbox: DROP INDEX TEST.ORDERS_STATUS_IDX. Check 5 passes. Verdict is accept. Promote path opens. This verdict is NOT-VERIFIED here.

Walkthrough B: fail path. SQL patch cuts aggregate 9%. Check 1 passes. CI is [-12%, -4%]. Check 2 passes. One STS statement moves +7% on buffer_gets. Margin is 6%. Check 3 fails. Verdict is reject even though the average improved. No debate. One miss ends the run for that idea.

Why this rule exists: D1 says verify before commit. Only known or verified plans run [S12]. D3 sets a quantitative regression threshold from Auto SPM and Real-Time SPM [S11]. Check 3 applies that threshold at statement scope. D9 puts semantic guard before speed claims. Equivalence provers are candidates [S50] https://github.com/VeriEQL/VeriEQL. utPLSQL tests are usable now [S63] https://github.com/utplsql/utplsql. Check 5 forces a tested rollback path before any keep.

Cost of skipping it: check 3 gets waived to ship faster. Hidden regression reaches prod. AWR confirms load rise. Users feel p95 pain. Rollback happens under traffic.

## 2. Reject means restore and prove it

Claim: rollback runs at once by change class, then hash plus SPA prove return.

Walkthrough C: stats refresh path. Pending stats were gathered but not published. Test shows regression. Rollback discards pending before publish. That discard is the commit-point guard [S29]. Verify with DISPLAY_CURSOR. Old plan hash 1842217434 must show again. SPA re-run must show no residual delta. Until both hold, rollback is not done. This restore is NOT-VERIFIED here.

Walkthrough D: patch and baseline path. SQL patch was created with DBMS_SQLDIAG.CREATE_SQL_PATCH. Reject drops the patch with DBMS_SQLDIAG [S43]. SPM baseline path disables the new baseline with ALTER_SQL_PLAN_BASELINE [S07]. Unaccepted plans simply do not run. Table redefinition path runs ABORT_REDEF_TABLE before finish [S41], https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_REDEFINITION.html. Edition path switches the app back to the prior edition [S42]. Runaway path uses Resource Manager kill plus quarantine [S39][S40]. Full matrix: profile drops [S34], auto index drops [S15], session change ends with the session [S19].

Why this rule exists: D8 demands a tested rollback for every change class. Vendor primitives make restore deterministic. SPM evolve semantics verify before a plan becomes accepted [S12][S07]. Real-Time SPM moved verification to foreground because background resources may lag [S11]. The loop copies that foreground discipline. Verify-hash plus SPA re-run stops silent residue.

Cost of skipping it: drop runs but no verify follows. Old hash never returns. Next loop measures against a polluted baseline. Numbers drift for weeks. Debug starts from false ground.

## 3. Log proof and respect human gates

Claim: no improved line enters the log without artifact hash, and hard changes wait for a human.

Walkthrough E: log path. Accepted index writes run id, git sha, DB version, task names, medians, CI bounds, K samples, plan hashes, SPA report hash, XPLAN text, rollback text, operator. Rejected patch writes the same fields plus reason_rejected and measured delta from the SPA comparison rows. Lesson links to those hashes. A lesson without SPA plus XPLAN artifacts is invalid and gets dropped. Evidence-before-claim is enforced [S06][S05].

Walkthrough F: human gate path. Schema redesign needs approval. Prod parameter change needs approval. Prod index drop needs approval. Loop never mutates prod first. Cheap pre-gate uses SPA explain plan plus DISPLAY_CURSOR review before any execution. Observe after promote watches AWR, ASH, quarantine view DBA_SQL_QUARANTINE, and SPM activity. Auto rollback fires on regression signal. All observe steps are NOT-VERIFIED here.

Why this rule exists: G1 through G8 bound the loop. Test first. Contain runtime. Cap iterations, time, and objects. Refuse forbidden moves such as CURSOR_SHARING=FORCE as a permanent fix [S20]. SPM evolve remains the vendor gate for plan promote [S12]. Pending stats publish remains the gate for stats [S29]. Redefinition finish and edition switch remain gates for DDL [S41][S42].

Cost of skipping it: direct prod index drop blocks writes. Parameter flip changes every session. No artifact hash means no audit trail. Post-incident review finds claims with no proof. Trust collapses.

<details><summary>In case you don't know about SQL quarantine, it's Oracle control that blocks plans that blew up.</summary>It tracks runaway executions. Check DBA_SQL_QUARANTINE after promote. Any event triggers review. Quarantine detail lives in TGSQL ch.4 plus walkthrough https://oracle-base.com/articles/19c/sql-quarantine-19c. Review step is NOT-VERIFIED here.</details>

<details><summary>In case you don't know about SPM evolve, it's vendor verification that accepts only better plans.</summary>It tests non-accepted plans with verify YES. It commits only on win. Use it for plan promote with DBMS_SPM.EVOLVE_SQL_PLAN_BASELINE. That evolve call is NOT-VERIFIED here.</details>

**Keep this: Five checks pass means promote; one miss means roll back, verify hash, and log.**
