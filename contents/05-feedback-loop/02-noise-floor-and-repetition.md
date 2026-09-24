---
title: Noise Floor and Repetition
description: Run A/A first, repeat K>=5, and report 95% CI on the median.
order: 52
draft: false
---

**Verdict: a change is not faster because one run won.** First measure the wobble. Then repeat the full workload on both
sides. Then calculate the median and its bootstrap interval outside SQLPA.

## Status and scope

This page is a reference design based on primary sources. It was **not executed against a live Oracle database in this
research pass**. There is no measured A/A spread, K-sample set, confidence interval, or production result in this page.
All sample values, medians, percentages, and intervals below are illustrative unless a source is named.

The statistical policy is explicit:

- Run an A/A noise floor on the unchanged workload.
- Use **K >= 5 samples per side** for a formal comparison.
- Prefer **10–15 samples per side** when the workload is noisy or the cost of a wrong decision is high.
- Run a **full-workload SPA pass per side**, not only the motivating statement.
- Calculate medians and the bootstrap **95% CI for the median difference outside SQLPA**.
- Record raw samples, the estimator, bootstrap count, seed or reproducibility method, metric, binds, and STS hash.

Hoefler and Belli's SC15 material is the methodology source for repeats, duration, variability, and confidence reporting:
[S58](https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf). It is not an Oracle-specific K rule. The
`K >= 5` and `10–15` values are this design's operating policy.

## 1. Measure the unchanged workload first

A/A is a boring control. It answers a question that most “before versus after” posts skip: how much does the rig move when
nothing changes?

Freeze the STS, binds, host, workload window, metric, and duration. Run the unchanged workload through at least two
full-workload passes. If the spread is high, do not pretend one later pair is precise. Collect more A/A samples or
fix the measurement conditions first.

### Illustrative scenario

The numbers are synthetic, not measurements from this project:

| A/A pass                        |       `buffer_gets` spread | `elapsed_time` spread |
| ------------------------------- | -------------------------: | --------------------: |
| First unchanged pass            |                       `3%` |                  `9%` |
| Second unchanged pass           |                       `3%` |                  `9%` |
| Research-design starting margin | `max(2x noise, 5%)` = `6%` |  Not a gate by itself |

The `6%` value is illustrative. The `2x noise or 5%` formula is an engineering starting point, not an Oracle rule. The
correct margin is calibrated to the measured rig. A floor from one host is not automatically a floor for another host.

A/A is not a claim that the database is stable. It is the record of how unstable the measurement is. The artifact is the
A/A report, the raw samples, and the floor calculation tied to the STS hash.

## 2. Repeat the full workload and calculate outside SQLPA

A single SPA pass gives you a before report, an after report, and a comparison. It does not by itself create the
repetition policy, a median-difference estimator, or a bootstrap confidence interval. Those calculations belong in an
external harness or analysis script.

### The formal comparison

1. Capture the unchanged before samples on the frozen full workload.
2. Apply one candidate in the isolated target.
3. Capture the after samples on the same full workload and comparable conditions.
4. Record per-statement rows, aggregate rows, plan hashes, rows, and elapsed metrics.
5. Compute the per-side medians outside SQLPA.
6. Compute the median difference using a declared paired or unpaired estimator.
7. Bootstrap the difference, using a recorded number of resamples and reproducibility method.
8. Report the median estimate and the bootstrap 95% CI.
9. Compare the estimate with the A/A floor and the no-regression rule.

Use longer, meaningful executions instead of a pile of tiny runs. Repeat the full workload, not just a single statement.
Keep binds and workload ordering fixed. If the host, statistics, data distribution, or bind set changes, treat the
comparison as a new experiment.

### Illustrative paired samples

The following values are synthetic and are included only to show the shape of the calculation:

| Side   | Ten sample values                                            | Median |
| ------ | ------------------------------------------------------------ | -----: |
| Before | `1200, 1230, 1190, 1215, 1225, 1205, 1210, 1195, 1220, 1208` | `1210` |
| After  | `1060, 1085, 1050, 1070, 1065, 1090, 1055, 1075, 1068, 1072` | `1070` |

An external bootstrap over the paired median difference could produce an illustrative `11.6%` reduction with a `95% CI
[-14%, -8%]`. The interval excludes zero. That still does not override a failed full-workload gate, a semantic test, or
a statement-level regression.

With only three samples, an illustrative interval might span `[-13%, +4%]`. Zero is inside. The correct verdict is not
“probably good.” It is `INCONCLUSIVE` or `REJECT`, followed by a better-powered repeat.

The artifact is the sample JSON, the median-difference calculation, the bootstrap output, and the decision record. Keep
those separate from the SPA report so another engineer can recompute the result.

## 3. Choose metrics without worshiping one number

`buffer_gets` is the primary logical-work metric in this design. `elapsed_time` is the user-visible secondary metric.
CPU time, rows processed, and plan changes are supporting evidence. The choice is deliberate and must be calibrated on
the target workload. Lower variance for `buffer_gets` is a design expectation to test, not a universal fact to quote as
Oracle behavior.

SPA's `comparison_metric` is release-supported and documented in [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html).
The default and available metrics must still be checked against the release reference. The same workload, same binds,
and same duration matter more than the label on the metric.

Plan hashes do not decide the gate. A hash can change with no useful gain, and the same hash can exist with different
runtime behavior. The plan artifact explains the result. The measured samples decide it.

The full STS is the guard against a lucky winner. If one statement improves by an illustrative `18%` while the aggregate
barely moves and two other statements regress, reject the candidate under the no-regression rule. Looking only at the
best mover is how a narrow win becomes a workload loss.

The [DBMS_XPLAN reference](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html) supplies
plan and runtime evidence. It does not replace the external statistics calculation.

Adaptive plans remain workload-dependent. Keep the measurement policy. Do not turn an adaptive feature on or off from a
universal slogan.

The artifact is a metric decision plus a full-workload sample set. The verdict is based on the floor, the interval, and
the per-statement guard.

<details><summary>In case you don't know about A/A, it is a control run with the workload unchanged.</summary>

Run the same STS through the same measurement path twice without applying a candidate. The spread tells you the rig's
normal wobble. Keep the metric-specific floor separate: a stable `buffer_gets` result does not make a noisy
`elapsed_time` result precise.

A/A is not a benchmark of the candidate. It is a prerequisite for interpreting one. The output should include the STS
identity, binds, host, time window, raw samples, report, and calculated floor.

</details>

The bootstrap interval is for the median difference, not for a plan hash or a single SPA aggregate. A point estimate without variability is not enough; record the estimator, resample count, and reproducibility method beside the interval.

**Verdict: A/A sets the bar; repeated full-workload SPA sets the workload; external medians and bootstrap set the
uncertainty.**
