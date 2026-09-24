---
title: Memory and When to Stop
description: Save lessons from rejects and halt on N=3 misses, plateau, or budget.
order: 54
draft: false
---

**Verdict: memory must point to evidence, and convergence must point to a final artifact.** If the next loop cannot
retrieve the failure conditions, it will repeat the experiment with better confidence and the same mistake.

## Status and scope

This page is part of a reference architecture designed from primary sources. It was **not executed against a live Oracle
database in this research pass**. No lesson store, promotion, observation window, or stop rule was run. Examples with
exact deltas, percentages, iteration counts, or time budgets are illustrative unless a source is named.

Research-only references (not published navigation): `.agents/research/05-agentic-feedback-loop-design.md` §9 and `.agents/research/04-programmatic-approaches.md` §4.11.

Primary references: [S56](https://github.com/noahshinn/reflexion), [S57](https://github.com/ysymyth/ReAct),
[S55](https://github.com/shayantalaei/chess),
[S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html),
[S05](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html),
[S11](https://arxiv.org/html/2608.27758v1), and [S40](https://oracle-base.com/articles/19c/sql-quarantine-19c).

## 1. Store the condition, not just the conclusion

A rejected candidate is useful when the next agent knows what changed, what was measured, and what remains true. A
sentence like “the hint was bad” is too small. It will eventually be reused under different conditions.

### The evidence schema

Persist every iteration with the seven entities from research 04:

```text
loop_run(run_id, git_sha, db_version, host, started_at, finished_at, goal)
loop_change(run_id, change_id, class, target, ddl_or_plsql, proposed_by, rationale)
loop_before(run_id, change_id, task_name, metric, median, ci_low, ci_high, samples_json, plan_hash)
loop_after(run_id, change_id, task_name, metric, median, ci_low, ci_high, samples_json, plan_hash)
loop_verdict(run_id, change_id, verdict, reason, gate_results_json, rollback_cmd, operator)
loop_evidence(run_id, artifact_type, path_or_clob_hash)
loop_lesson(run_id, change_class, outcome, discovered_version, lesson_text)
```

`path_or_clob_hash` means an immutable artifact reference or a content hash such as SHA-256. A filesystem path by itself
is not evidence because the file can change. Store hashes for the SPA report, XPLAN output, SQL Monitor or AWR extract,
raw samples, and rollback proof.

The lesson fields from the research design are:

```text
change_class
precondition_signature
action
outcome
measured_delta
reason_rejected
banned_until
discovered_version
lesson_text
```

`outcome` is the decision and useful result, such as `REJECT`, `ACCEPT`, `INCONCLUSIVE`, or `NOT-VERIFIED`.
`discovered_version` records the Oracle release, capability probe, or relevant feature version under which the lesson
was learned. It is not a vague “latest” label. A lesson from one release can be stale on another.

### Illustrative lesson

The following is synthetic:

- `change_class`: SQL patch
- `precondition_signature`: same SQL ID, same stats generation, same bind band
- `outcome`: `REJECT`
- `measured_delta`: aggregate `buffer_gets` lower by an illustrative `9%`; one statement higher by an illustrative `7%`
- `reason_rejected`: statement-level regression beyond the declared `6%` margin
- `discovered_version`: the exact Oracle banner and capability probe from the test run
- `banned_until`: statistics generation changes or a new version-specific retest is approved

Those values are not measurements from this project. The important part is the linkage: the next proposal can retrieve
the lesson and inspect the hashed artifacts rather than trusting chat memory.

Reflexion is the research basis for using written failure feedback to improve later proposals without retraining [S56](https://github.com/noahshinn/reflexion).
ReAct-style action and test separation and SQL candidate validation patterns support the same design discipline
S57 and S55. The database loop is stricter: a lesson without raw samples and artifact hashes is invalid.

## 2. Retrieve before proposing

At proposal time, search the lesson store by change class, target shape, workload signature, and `discovered_version`.
The agent can then take one of three actions:

- **Skip** the action because the same precondition still holds.
- **Amend** the action because the failure identified a different hypothesis.
- **Retest** only when new evidence exists, such as a new Oracle capability, changed statistics, a different bind band,
  or a corrected semantic test.

Do not let a ban become permanent folklore. Store its expiry or review condition. A lesson is a guardrail, not a
religious taboo.

### Illustrative scenario

A patch fails the no-regression gate for one SQL shape. The next proposal sees the same stats generation and the same
bind band, so it skips the patch and tests a statistics hypothesis instead. A later run has a different statistics
generation and a new measured A/A floor. The agent may retest, but it starts a new `change_id` and keeps the old
lesson linked. The artifact is the retrieval query, the new run ID, and the reason the precondition changed.

## 3. Stop on evidence, not on hope

The research design uses four convergence signals:

1. **Consecutive rejects.** A starter policy is `N = 3`, where `N` is a design parameter, not an Oracle rule. Stop when
   the current hypothesis space has produced `N` rejected changes under the same conditions.
2. **Plateau.** Stop when accepted gains sit below the measured noise floor or the declared materiality threshold.
   “Below noise” is not an improvement.
3. **Budget.** Stop when the iteration, runtime, object, or resource budget is exhausted. A budget is part of the
   experiment, not an excuse to guess faster.
4. **Risk rise.** Stop on a release-specific SQL Quarantine event, repeated oscillation on one object, unexplained
   errors, or a rollback that fails to restore the prior state.

The value of `N`, the accepted-gain window, and every time or object limit are configuration values. Record them in the
run. Do not present an illustrative `N = 3` or four-hour cap as a sourced result.

### Real-Time SPM and adaptive plans

Do not turn a vendor feature into a universal policy. Real-Time SPM evaluates a candidate during the regressing
execution. At execution end, the candidate is rejected and a prior known plan is used for later executions. It does not
instantly rewrite the current statement.

Adaptive plans remain workload-dependent. The loop should measure the affected workload, binds, statistics, and feature
settings before recommending a global change. There is no universal on/off answer here.

## 4. Promote, observe, and close with proof

An accepted change still has a promotion boundary. The loop never mutates production first.

For statistics, gather pending values with the release-supported `PUBLISH FALSE` workflow, use the documented
pending-statistics session or workflow, run the full-workload gate, obtain the human approval required for the target,
and publish only after the verdict. In the 19c documentation, the session switch is
`ALTER SESSION SET OPTIMIZER_USE_PENDING_STATISTICS = TRUE`; verify the name and behavior on the installed release and
confirm that the pending statistics are visible to the test session. After publishing, restore the recorded `PUBLISH`
preference and verify it with `DBMS_STATS.GET_PREFS`; publishing pending statistics does not replace the workflow’s
preference-reset step. If the candidate fails, discard pending values. If publication already occurred, use the
documented historical-statistics restore path and verify the result S29.

For plans, use the release-supported SPM verification path. For redefinition, keep `ABORT_REDEF_TABLE` until the
new state passes the target check. For editions, switch the application back if the observation window fails. For
indexes, use a controlled rollout and a human-approved production window.

The target-side promotion check is part of the artifact. Re-run the full workload, then observe the target for the
agreed window. Save AWR/ASH context, plan evidence, the release-specific quarantine view or event record, and the
approved rollback result. SQL Quarantine names and signatures are `SKETCH` and release-dependent. A quarantine event is
a containment signal, not proof that the loop has already rolled back the candidate.

If a late regression appears, execute the approved class-specific rollback and record the operator, timestamp, and
verification evidence. Do not call this automatic rollback unless the installed feature and procedure provide it.

### Final convergence record

The close-out artifact should contain:

- Run and change IDs, Git revision, Oracle version, and capability probe
- STS identity, bind and workload manifest, metric, and K policy
- A/A floor, raw samples, medians, bootstrap settings, and 95% CI bounds
- Before and after plan hashes plus XPLAN, SPA, Monitor, and AWR hashes
- Verdict, gate results, rollback command, rollback proof, and human approval
- `outcome`, `discovered_version`, lesson text, and any quarantine or risk event

If a license, privilege, standby, clone, or API capability blocked a step, mark that step `NOT-VERIFIED`. Do not turn a
blocked experiment into a performance claim.

The [DBMS_SQLPA reference](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html) supplies
comparison reports. [DBMS_XPLAN](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html)
supplies plan evidence. [Reflexion](https://github.com/noahshinn/reflexion) supplies the feedback-memory pattern. The
[Real-Time SPM paper](https://arxiv.org/html/2608.27758v1) and the [quarantine walkthrough](https://oracle-base.com/articles/19c/sql-quarantine-19c)
bound the version-specific claims. None of them turns this research pass into a production result.

The memory row is a compact index into evidence, not a transcript dump. Before proposing, retrieve lessons matching the change class, precondition signature, and discovered version. After a verdict, record the outcome, measured delta, reason, review window, and artifact hashes. A rejected idea is blocked only for the conditions that made it fail; new facts earn a new experiment.

<details><summary>In case you don't know about convergence, it is the explicit condition for ending the search.</summary>

Stop after the configured number of consecutive rejects, a measured plateau, budget exhaustion, or a risk signal such
as quarantine, oscillation, unexplained errors, or failed rollback proof. The values are configuration. Write them in
the run record and test the stop logic in the harness.

The final artifact is a close-out report with every hash and every unresolved `NOT-VERIFIED` step. The verdict is
`CONVERGED`, `STOPPED_BY_BUDGET`, or `STOPPED_BY_RISK`, not another vague promise to tune it later.

</details>

**Verdict: preserve the evidence, record the version, and stop when the next experiment cannot add information.**
