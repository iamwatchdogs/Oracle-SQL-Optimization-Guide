---
title: One Change at a Time
description: Propose a single candidate, apply in isolation, then re-baseline.
order: 51
draft: false
---

**Verdict: one proposal, one isolated apply, one full-workload comparison, one new baseline.** If the change cannot be
named in one sentence, it is not ready to test.

## Status and scope

This page is part of a reference architecture designed from primary sources. It was **not executed against a live Oracle
database in this research pass**. No SQL result, plan, latency, or production outcome here was measured. Every numeric
example is illustrative unless a source is named.

Research-only references (not published navigation): `.agents/research/05-agentic-feedback-loop-design.md` §9 and `.agents/research/04-programmatic-approaches.md` §4.11.

Primary references: [S17](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/sql-tuning-advisor.html),
[S15](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_AUTO_INDEX.html),
[S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html),
[S05](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html), and
[S12](https://www.oracle.com/technetwork/database/bi-datawarehousing/twp-sql-plan-mgmt-19c-5324207.pdf).

## 1. Propose exactly one candidate

A candidate is a hypothesis with a target. It is not a pile of advice from an advisor report.

### Proposal isolation

The frozen `OPT_LOOP_WL` set contains 12 statements. SQL Tuning Advisor suggests a profile for one SQL ID. SQL Access
Advisor suggests an index. Statistics Advisor suggests a gather. The loop records all three as proposals, then picks
only the index for this run. The profile and gather remain in the queue. The numbers below are illustrative; they are
not measurements from this research pass.

The same rule applies to an agent-authored rewrite. If the hypothesis is “this `DISTINCT` is unnecessary,” the candidate
is the rewrite that removes it. Do not refresh statistics, add a hint, and change an index in the same iteration.

### What belongs in the change record

Before apply, record:

- `change_id`, change class, and target object or SQL ID
- The hypothesis and the expected effect
- The exact SQL, DDL, session action, or plan-control operation
- The primary metric and the full-workload test set
- The rollback primitive and its human gate
- The Oracle version, capability probe, and license assumptions

Advisor output is a proposal. Oracle's own tuning and plan-management workflows verify candidates before treating them
as usable changes. Sources: S17, S35, S27, S15, and S12.

The artifact is a single candidate record. The next iteration gets a new `change_id`; it does not quietly inherit the
first candidate's work.

## 2. Gate semantics before spending database time

Fast does not mean correct. A query that returns the wrong answer is not an optimization.

Run the cheap checks first:

- Parse and normalize the candidate with the Oracle dialect.
- Lint the text with the project's SQL linter.
- Run behavior tests for affected results, errors, and edge cases.
- Use an equivalence prover or a comparable semantic checker when the shape and release support it. Treat external
  equivalence tools as candidates until verified for this Oracle workload.

The static tools are sources, not automatic approval: [S60](https://github.com/tobymao/sqlglot),
[S61](https://docs.sqlfluff.com/), [S63](https://github.com/utplsql/utplsql), and
[S50](https://github.com/VeriEQL/VeriEQL). A passing parse only proves that the parser accepted the text.

The semantic gate ends with an artifact: test output or a documented equivalence result tied to the candidate hash.

### Isolated apply has a real target

Apply in a writable clone, an activated snapshot standby, or an interim schema with an abort path. A plain physical
standby is read-only and is **not** a writable SPA `test execute` target. If the test needs writes, use a writable clone
or an activated snapshot standby. Do not mutate production first to discover whether the change is safe.

Other boundaries are equally boring:

- Keep optimizer and system parameter changes out of the first apply.
- Treat `CURSOR_SHARING=FORCE` as a forbidden shortcut, not a tuning plan.
- Keep table redefinition behind `CAN_REDEF_TABLE` and an `ABORT_REDEF_TABLE` path.
- Keep application code changes behind a versioned release and an edition switch when that is the chosen rollout
  mechanism.
- Require a human gate before a production parameter change, production DDL, index drop, or other irreversible action.

The safe sequence is: static gate, cheap explain-plan screen, isolated apply, then full execution. The cheap screen
finds obvious errors. It does not replace `test execute`. The artifact is an apply log that names the target and the
untouched production boundary.

## 3. Measure the same workload, then re-baseline

A before/after pair is only meaningful when both sides replay the same frozen STS, binds, and comparable runtime
conditions. `DBMS_SQLPA` can create the analysis task, run `test execute`, compare performance, and report the
results. The research snippets are labeled exact or sketch; verify the API shape against the Oracle release reference
before running it. Source: [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html).

For each accepted or rejected candidate:

1. Run the full-workload before pass.
2. Apply only the named candidate in the isolated target.
3. Run the full-workload after pass.
4. Compare the report and retain per-statement rows.
5. Capture `DBMS_XPLAN.DISPLAY_CURSOR` or the release-appropriate plan evidence for the affected SQL. A plan hash
   explains the change; it does not decide the verdict.
6. Compute the repetition policy outside SQLPA as described on the [noise-floor page](/05-feedback-loop/02-noise-floor-and-repetition/).

Do not use a single statement as the whole workload. A candidate can help the reported query and damage a neighbor in
the same STS. The aggregate and the no-regression rule decide the result.

### Aggregate wins, statement loses

An index changes one plan hash and lowers the aggregate `buffer_gets` in the report. One unrelated statement rises
beyond the declared margin. The candidate is rejected even though the total looks better. The change is rolled back,
the incumbent evidence is recaptured, and the lesson is linked to the report hashes. These values are illustrative,
not a measured result.

If the candidate passes, promote it through the approved class-specific path. For plan controls, let the vendor's SPM
verification decide acceptance. For statistics, use the pending-statistics workflow described on the
[gate page](/05-feedback-loop/03-accept-or-rollback-gate/). For DDL, finish the redefinition or switch the edition only
after the target-side check. Then re-baseline. The next proposal starts from the accepted state, not from an
unverified stack.

Real-Time SPM has a narrower promise than the folklore: a candidate is evaluated during a regressing execution. At
execution end, the candidate is rejected and a prior known plan is used for later executions. The current statement is
not instantly rewritten. Adaptive plans remain workload-dependent; this page makes no universal on/off recommendation.

The artifact is a hashed before/after record and a verdict. The new baseline appears only after that record passes.

SQL Tuning Advisor is a proposal generator, not an apply button: it can report statistics, access-path, structure, and alternative-plan findings for the loop to select one at a time. SQL Access Advisor and Optimizer Statistics Advisor end at the same place: a candidate awaiting the loop gate.

<details><summary>In case you don't know about isolated apply, it is where a mistake is allowed to be cheap.</summary>

The target is a writable clone, an activated snapshot standby, or a controlled interim schema. A plain physical
standby cannot serve as a writable SPA execution target. Keep production untouched until the candidate has passed the
semantic gate, the repeated full-workload comparison, the rollback test, and the human approval required for that
change class.

The result is a bounded experiment. If the candidate fails, remove it from the isolated target and prove the prior
state with plan and workload evidence. If it passes, promote through the class-specific path and re-check the target.
The artifact is the target ID, the apply log, and the rollback proof.

</details>

**Verdict: one candidate, one isolated target, one hashed verdict.**
