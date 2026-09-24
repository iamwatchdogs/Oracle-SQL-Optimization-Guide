---
title: Accept or Rollback Gate
description: Five checks must pass or you restore and log the lesson.
order: 53
draft: false
---

**Verdict: one failed gate is enough to reject.** A better average does not cancel a regressed statement. A different plan
hash does not cancel a failed semantic test. The gate exists to stop optimistic arithmetic.

## Status and scope

This is a reference architecture designed from primary sources. It was **not executed against a live Oracle database in
this research pass**. No accept, rollback, quarantine event, or production promotion in this page was observed. The
numbers in examples are illustrative, not measurements from this project.

Research-only references (not published navigation): `.agents/research/05-agentic-feedback-loop-design.md` §9 and `.agents/research/04-programmatic-approaches.md` §4.11. API names marked `SKETCH` below are release-dependent; verify the signature in the Oracle package reference before execution.

Primary references: [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html),
[S05](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html),
[S12](https://www.oracle.com/technetwork/database/bi-datawarehousing/twp-sql-plan-mgmt-19c-5324207.pdf),
[S07](https://docs.oracle.com/en/database/oracle/oracle-database/18/arpls/DBMS_SPM.html),
[S11](https://arxiv.org/html/2608.27758v1), [S40](https://oracle-base.com/articles/19c/sql-quarantine-19c),
[S43](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLDIAG.html),
[S50](https://github.com/VeriEQL/VeriEQL), [S63](https://github.com/utplsql/utplsql), and
[S41](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_REDEFINITION.html).

## 1. Five checks decide

Every candidate passes the same gate on the same frozen full workload:

1. **Semantics.** Parse, lint, and behavior tests pass. Equivalence tooling is supporting evidence, not a substitute
   for domain tests.
2. **Effect size.** The primary full-workload metric improves beyond the measured A/A floor and the declared margin.
3. **Uncertainty.** The external median-difference bootstrap 95% CI supports the direction and excludes zero.
4. **No regression.** No statement in the STS regresses beyond the declared margin. The margin is an engineering
   policy calibrated to the rig, not an Oracle constant.
5. **Recovery.** The class-specific rollback is recorded, executed once in the sandbox, and verified against the
   incumbent state and a repeat workload run.

The exact margin and estimator belong in the run record. A recommendation such as `max(2x measured noise, 5%)` is a
starting point in this design. It is not a sourced Oracle threshold.

### Illustrative pass and fail

The following is synthetic:

| Gate                | Illustrative result              | Verdict                                      |
| ------------------- | -------------------------------- | -------------------------------------------- |
| Primary aggregate   | `12%` lower `buffer_gets`        | Pass if above the measured floor plus margin |
| Bootstrap interval  | `[-15%, -8%]`                    | Pass; calculated outside SQLPA               |
| Worst STS statement | `1%` higher                      | Pass if below the declared margin            |
| Semantic tests      | Result fixtures unchanged        | Pass                                         |
| Rollback rehearsal  | Incumbent plan evidence restored | Pass                                         |

A second illustrative candidate lowers aggregate `buffer_gets` by `9%`, but one statement rises by `7%` while the margin
is `6%`. Gate four fails. The verdict is `REJECT`. The aggregate number cannot rescue the statement.

Real-Time SPM has a specific meaning here. A candidate is evaluated during the regressing execution. At execution end,
the candidate is rejected and a prior known plan is used for later executions. It does not instantly rewrite the
current statement. Do not describe it as a universal instant repair.

## 2. Roll back by change class, then prove the state

“Run the undo command” is not a rollback plan. The undo command must match the object, preserve the workload boundary,
and leave evidence that the incumbent state is back.

| Change class           | Test rollback                                                                                                                       | Important boundary                                                                                                                                                                                                                                                       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Pending statistics     | Discard pending statistics before publish.                                                                                          | Gather with `PUBLISH FALSE`, use the documented pending-statistics session or workflow, run the gate, then publish only on `ACCEPT`. If already published, restore a retained historical-statistics snapshot with the applicable `DBMS_STATS.RESTORE_*_STATS` operation. |
| SQL profile            | Drop the profile.                                                                                                                   | Confirm that the statement no longer depends on the profile and rerun the affected workload.                                                                                                                                                                             |
| SQL patch              | Remove or disable the patch through the release-supported `DBMS_SQLDIAG` workflow.                                                  | The exact name and signature are release-dependent. Do not copy a call shape from another release.                                                                                                                                                                       |
| SQL plan baseline      | Disable or drop the candidate baseline with the release-supported `DBMS_SPM` operation such as `ALTER_SQL_PLAN_BASELINE`.           | An unaccepted candidate is not an accepted production plan. Keep the prior accepted plan.                                                                                                                                                                                |
| Manually created index | Drop the index through the normal DDL process.                                                                                      | Index DDL and production index drops need a human-approved window.                                                                                                                                                                                                       |
| Auto-created index     | Use the documented auto-index lifecycle or an explicitly approved drop.                                                             | Auto-index cleanup is policy and release dependent; do not assume it is an instant rollback.                                                                                                                                                                             |
| Table redefinition     | Run `ABORT_REDEF_TABLE` before `FINISH_REDEF_TABLE`.                                                                                | `FINISH` is the commit point. Human approval belongs before production finish.                                                                                                                                                                                           |
| Edition-based code     | Switch the application session back to the prior edition.                                                                           | Verify the application is actually using the old edition before calling rollback complete.                                                                                                                                                                               |
| Session parameter      | Revert the session setting or end the session.                                                                                      | Never substitute a system parameter change for a local test.                                                                                                                                                                                                             |
| Runaway execution      | Stop it with the approved Resource Manager control and quarantine the bad plan using the release-supported SQL Quarantine workflow. | Resource Manager control and SQL Quarantine are separate controls. Quarantine is containment, not generic rollback. SQL Quarantine names and signatures are `SKETCH` and release-dependent.                                                                              |

After the rollback, capture the incumbent plan and rerun the same full workload. A plan hash, when applicable, is a
useful return-to-state signal. It is not the only proof. The verdict is `ROLLBACK VERIFIED` only when the state and the
workload behavior both match the pre-change baseline.

### Pending statistics are a workflow, not a publish button

For a risky statistics change, the sequence is:

1. Set the documented `PUBLISH FALSE` preference or equivalent release-supported setting.
2. Gather the statistics as pending.
3. Start the documented pending-statistics session or workflow that makes the optimizer consult the pending values. In
   the 19c documentation, the session switch is `ALTER SESSION SET OPTIMIZER_USE_PENDING_STATISTICS = TRUE`; verify
   the name and behavior on the installed release. Oracle recommends setting this at session level.
4. Run the full-workload SPA comparison and external repetition statistics.
5. Publish only after the gate passes and the human approver signs the target.
6. Restore the recorded `PUBLISH` preference after publishing, then verify the restored preference. Publishing pending
   statistics does not replace the workflow’s preference-reset step.
7. If the gate fails, discard the pending statistics. If publication already happened, use the documented historical
   statistics restore path and verify the result.

The point is not to memorize a parameter spelling. The point is to prove that the measurement used the new statistics
before allowing publication. Source: S29.

## 3. Human gates and evidence

The loop never mutates production first. Production sees a candidate only after the isolated test, semantic gate,
repeated workload comparison, rollback rehearsal, and required human approval.

Human approval is required for:

- Production parameter changes
- Production index creation, deletion, or other DDL
- Publishing risky statistics on critical objects
- Table redefinition finish and other schema architecture changes
- Application rewrites or edition switches that change production behavior
- Any rollback that itself has material workload or availability impact

The loop may automate the evidence collection. It may not automate away the person who owns an irreversible production
decision.

Every verdict writes the seven research 04 entities: `loop_run`, `loop_change`, `loop_before`, `loop_after`,
`loop_verdict`, `loop_evidence`, and `loop_lesson`. `loop_evidence` stores the artifact path or immutable content hash.
Hash the SPA report, XPLAN output, Monitor or AWR extract, and the rollback proof. A path without a hash is not durable
evidence.

The promote step is class-specific:

- Statistics: publish pending values only after the verified workflow and approval.
- Plans: use the release-supported SPM evolution path; do not hand-accept a candidate by skipping verification.
- Redefinition: finish only after the target-side check; keep the abort path until the new state is accepted.
- Editions: switch the application to the tested edition and observe the result.
- Indexes: use a controlled rollout and a human-approved production window.

After promotion, watch the target with AWR/ASH, plan activity, and the release-appropriate quarantine view. A late
regression starts the approved rollback workflow. Do not call that “automatic rollback” unless the installed
feature and procedure actually provide it.

Adaptive plans remain workload-dependent. Measure the workload before changing a global optimizer setting. There is no
universal on/off claim in this gate.

The artifact is a signed or hashed `loop_verdict` plus the class-specific rollback and observation evidence.

SQL Quarantine is a separate containment control: it can prevent a known-bad SQL plan from running again after the configured condition. It is not a universal undo button. The researched `DBA_SQL_QUARANTINE`-style view and `DBMS_SQLQ` workflow are release-dependent and treated as `SKETCH`; check the installed release and licensing before use. A view or event record becomes an observation artifact only after a controlled load test or promotion.

<details><summary>In case you don't know about SPM evolve, it is Oracle's verification gate for a candidate plan.</summary>

SPM keeps a prior known plan while a candidate is unaccepted. The release-supported evolve operation tests the candidate
and changes its accepted state only when the configured verification succeeds. Use the exact
`DBMS_SPM.EVOLVE_SQL_PLAN_BASELINE` call shape from the installed package reference, and do not hand-accept a plan by
bypassing verification.

The evidence artifact is the baseline inventory before and after evolution, the SPA or vendor verification report, and
the observed runtime plan. Real-Time SPM is different: candidate evaluation happens during a regressing execution, and
the prior known plan is used for later executions after the candidate is rejected. Neither behavior means the currently
running statement is instantly rewritten.

</details>

**Verdict: all five gates pass means promote; any miss means execute the class rollback, verify it, and log the evidence.**
