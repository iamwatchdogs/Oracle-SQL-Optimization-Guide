---
title: Stabilize and Ship Safely
description: Baselines, profiles, advisors, and guardrails that block regressions.
order: 15
draft: false
---

A speedup that disappears after a stats job, a parameter change, or an upgrade is not finished. It is a temporary observation.

Stabilization is the part of tuning that turns “this was fast in a test” into “this can be released, observed, and reversed.”

## 1. Control plans, then verify the control

Start with the plan, not a permanent hint. A hint can be ignored, become stale, or hide a bad estimate. Check the hint report in `DBMS_XPLAN` before claiming that the hint did anything. [S19](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/influencing-the-optimizer.html)

A SQL profile adds auxiliary optimizer information to a SQL ID without changing the application text. A SQL patch attaches a controlled workaround to a SQL ID when a known error or optimizer problem needs a short-term mitigation. Both need a drop or disable path. They are controls, not root-cause repairs by default. S34 and [S43](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLDIAG.html)

SQL Plan Management gives critical SQL a governed plan history. Capture an incumbent plan, use the baseline as the stability boundary, and let the documented evolution workflow evaluate candidates:

```sql
EXEC :n := DBMS_SPM.LOAD_PLANS_FROM_CURSOR_CACHE(sql_id => 'abc123');
SELECT * FROM TABLE(DBMS_XPLAN.DISPLAY_SQL_PLAN_BASELINE(sql_handle => 'XYZ'));
```

Do not treat baseline protection as an absolute rule that every unaccepted plan can never run. With a governed baseline, Oracle normally protects the known plan while candidates go through the release-specific evolution or verification workflow. A plan hash is an identifier, not a performance verdict. [S12](https://www.oracle.com/technetwork/database/bi-datawarehousing/twp-sql-plan-mgmt-19c-5324207.pdf) [S21](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/overview-of-sql-plan-management.html)

### Real-Time SPM: the execution boundary matters

Automatic SPM is documented from 19c. Real-Time SPM is a 26ai feature. In Real-Time SPM, a candidate is evaluated during user execution. If that execution regresses, the candidate is rejected at the end of the execution and a previously accepted plan is used for later executions. It does **not** retroactively rewrite the statement that was already running. [S11](https://arxiv.org/html/2608.27758v1) [S21](https://docs.oracle.com/en/database/oracle/oracle-database/26/tgsql/overview-of-sql-plan-management.html)

That boundary matters when you interpret evidence. A regressing execution can still finish badly. Real-Time SPM limits the blast radius for later executions; it does not promise that the first regressing execution was harmless.

### Adaptive plans need a comparison

Adaptive plans can defer or adjust runtime decisions when the workload and statistics justify it. The benefit is workload-dependent. Do not keep them on or disable them from a slogan. Run V0 with the feature enabled and disabled, compare elapsed time and `buffer_gets`, inspect the final branch, and record the result. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/) [S19](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/influencing-the-optimizer.html)

## 2. Keep cursor sharing deliberate

Literal-heavy applications create more child cursors and more parse work. Bind variables let Oracle reuse statements, while adaptive cursor sharing can choose different plans for different bind values. Check `V$SQL` and `V$SQL_SHARED_CURSOR` for cursor counts and bind-sensitivity flags. Test both common and skewed binds in the Tuning Set. S20

Do not make `CURSOR_SHARING=FORCE` a permanent fix. Do not scatter session-level optimizer changes through the application. Both can hide the real workload shape and create cursor pollution. Keep parameter experiments in a controlled session, record the change, and revert it. S20

## 3. Let advisors propose; make SPA decide

SQL Tuning Advisor can analyze a SQL ID, AWR range, or Tuning Set. Optimizer Statistics Advisor can review statistics practices. SQL Access Advisor can propose access structures. Automatic Indexing can create and test candidates. The output is a proposal, not a deployment. Sources: [S17](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/sql-tuning-advisor.html), S27, and S35.

Apply one recommendation at a time. Run SQL Performance Analyzer before and after, then keep the result only if the workload beats its noise floor and no relevant statement regresses. Keep the plan pair and the rollback command beside the report. [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html)

A schema-level fix needs its own deployment path. `DBMS_REDEFINITION` supports an online redefinition workflow with an abort operation. Edition-Based Redefinition supports switching application code between editions and switching back. Neither makes an unverified performance change safe by itself. [S41](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_REDEFINITION.html) [S42](https://docs.oracle.com/en/database/oracle/oracle-database/18/adfns/editions.html)

### Illustrative: one SQL ID through the ship packet

This is synthetic; it shows the artifact, not a result.

```text
SQL_ID: <synthetic SQL ID>
→ plan: save the incumbent XPLAN and candidate plan hash
→ metric: compare full-STS elapsed_time and buffer_gets against the A/A floor
→ rollback: disable or drop the candidate baseline, restore the accepted plan, and rerun the incumbent workload
```

Accept only after the semantic, full-workload effect, uncertainty, no-regression, and rollback gates pass. The exact API and metric choice remain release- and workload-specific.

## 4. Add guardrails for the bad day

Resource Manager can cap or switch runaway work. SQL Quarantine is a separate mechanism that blocks a quarantined plan shape from being selected again under its documented configuration. Do not mix the two: **Manager kills or switches work; Quarantine blocks a plan shape.** Verify the release-specific API names before calling them. [S39](https://docs.oracle.com/en/database/oracle/oracle-database/19/admin/managing-resources-with-oracle-database-resource-manager.html) [S40](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLQ.html)

The 26ai automatic SQL error mitigation feature and the PL/SQL-to-SQL transpiler are safety and execution aids, not substitutes for root-cause work. Transpilation applies only to eligible PL/SQL constructs; it does not cover every PL/SQL construct. [S46](https://docs.oracle.com/en/database/oracle/oracle-database/26/nfcoa/oracle-ai-database-26ai-new-features-guide.pdf)

<details><summary>Profiles and patches are temporary controls</summary>

A profile changes optimizer information for a SQL ID. A patch attaches a workaround to a SQL ID. Both can buy time when the application cannot change immediately, and both can hide a problem if nobody records the expiry. Keep the incident ID, owner, expiry, test result, and drop command. If the root cause can be fixed, fix it; if it cannot, make the control visible. S34 and [S43](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLDIAG.html)
</details>

No live Oracle database was available for the research pass. `sqlcl` and `sqlplus` were not on `PATH`. The examples describe procedures and release behavior; they do not report a local execution.

Research-only references (not published navigation): `.agents/research/07-sources-bibliography.md` and `.agents/research/01-proven-techniques-catalog.md`.

**Artifact: a ship packet with the accepted plan, metric distribution, semantic test, guardrail state, observation window, and tested rollback command.**
