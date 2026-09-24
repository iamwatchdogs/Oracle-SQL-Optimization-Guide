---
title: Feedback Loop That Proves It
description: One change, measured noise, clear accept or rollback, and memory.
order: 50
draft: false
---

**Verdict: one change, one frozen workload, one auditable verdict.** A fast run is not a result. A plan diff is not a result. The result is a repeatable comparison with evidence attached.

> **Execution boundary:** this reference architecture was not executed against a live Oracle database in the research pass. There is no project benchmark, production result, or measured speedup here. Exact medians, confidence intervals, percentages, and time counts are illustrative unless a source is named.

Research-only references (not published navigation): `.agents/research/05-agentic-feedback-loop-design.md` §9 and `.agents/research/04-programmatic-approaches.md` §4.11. The sequence below is an operating outline, not an execution transcript.

## Decision table

| Question                 | Required evidence                                                                            | Verdict or next action                                  |
| ------------------------ | -------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Is the change isolated?  | One change record, target, hypothesis, metric, semantic gate, and rollback primitive         | Test in the isolated target or reject before apply      |
| Is the signal real?      | A/A floor, full-workload SPA pass per side, K>=5 samples, and external median/CI calculation | Accept, reject, or mark inconclusive                    |
| Can it ship?             | Semantics, effect size, uncertainty, no regression, and recovery                             | `ACCEPT`, `REJECT`, or `NOT-VERIFIED`                   |
| Can the next loop learn? | Condition-keyed lesson with measured delta, version, and artifact hashes                     | Retrieve, skip, amend, or retest with a new `change_id` |

The K policy is this design's operating rule. SC15 supports repeats, duration, variability, and confidence reporting; it does not prescribe an Oracle-specific K. Use 10–15 samples per side when variance or the cost of a wrong decision is high.

A plan hash explains what changed. It does not prove that the change helped. A missing capability, privilege, license, or test target is a result too.

## Child pages

- [One Change at a Time](/05-feedback-loop/01-one-change-at-a-time/) — proposal isolation, semantic gate, and re-baselining.
- [Noise Floor and Repetition](/05-feedback-loop/02-noise-floor-and-repetition/) — A/A control, repeated full-workload trials, and external statistics.
- [Accept or Rollback Gate](/05-feedback-loop/03-accept-or-rollback-gate/) — five checks, class-specific recovery, and human approval.
- [Memory and When to Stop](/05-feedback-loop/04-memory-and-when-to-stop/) — searchable lessons, convergence signals, and close-out evidence.

## Checklist / artifact

- [ ] Record the change ID, frozen STS, binds, metric, A/A floor, and K policy.
- [ ] Keep before/after SPA reports, XPLAN or Monitor/AWR artifacts, and raw samples.
- [ ] Record the gate result, class-specific rollback, verification proof, and human approval.
- [ ] Store the condition, version, outcome, and hashes so the next loop can retrieve the lesson.

<details><summary>Noise floor: the movement you see when nothing changes</summary>

The noise floor is the spread between unchanged A/A runs on the same STS, host, binds, metric, and workload window. It sets the minimum effect worth discussing. `max(2x measured noise, 5%)` is an illustrative engineering starting point, not an Oracle requirement or measured result. The artifact is the A/A report and the recorded floor calculation.

</details>

Primary references used by this chapter include [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html), [S05](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html), [S58](https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf), [S56](https://github.com/noahshinn/reflexion), [S12](https://www.oracle.com/technetwork/database/bi-datawarehousing/twp-sql-plan-mgmt-19c-5324207.pdf), [S11](https://arxiv.org/html/2608.27758v1), and [S40](https://oracle-base.com/articles/19c/sql-quarantine-19c). Related source IDs: S17, S35, S27, and S15.

**Artifact:** a hashed verdict that another engineer can recompute.
