---
title: Noise Floor and Repetition
description: Measure the unchanged workload first, repeat the full set, and calculate the interval outside the report.
order: 52
draft: false
---

A change is not faster because one run won. Measure how much the rig moves when nothing changes, repeat the full workload on both sides, and do the arithmetic outside the report that produced the trials.

Other pages say "repeat enough to separate signal from noise" and point here. This page states the policy: the unchanged control, what counts as a sample, the trial counts and their attribution, the metric order, the composed bar, and the interval the acceptance rule demands.

> **Track:** Core (1, 3) · Practice (2, 4, 5, 6) · Recovery (none) · Advanced / gated (7)
>
> **Prerequisites:** [How to Prove a Win](/00-preface/02-how-to-prove-a-win/) for the A/A definition, the K>=5 discipline, and the raw-sample contract; a frozen set from [Freeze With STS](/04-recipes/01-freeze-with-sts/).
>
> **Evidence status:** Comparison and metric selection are A1-sourced from the 19c `DBMS_SQLPA` reference [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html), plan evidence from `DBMS_XPLAN` [S05](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html), and the repetition and variability requirements from B1 benchmarking methodology [S58](https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf). Every count and threshold below is labeled a source recommendation or an engineering choice. **No live Oracle database was available**, so no spread, sample set, or interval on this page was measured here.
>
> **Next required page:** [Accept or Rollback Gate](/05-feedback-loop/03-accept-or-rollback-gate/).

## How this page is banded

| Band                 | Sections   |
| -------------------- | ---------- |
| **Core**             | 1, 3       |
| **Practice**         | 2, 4, 5, 6 |
| **Recovery**         | none       |
| **Advanced / gated** | 7          |

- **Core (1, 3):** take the unchanged control and choose the metrics before any candidate exists. Both sections decide what a later number is allowed to mean, and neither needs a change applied.
- **Practice (2, 4, 5, 6):** on a real ticket, run both sides repeatedly, apply the declared counts and margin, distrust the best mover, and compute the interval outside the report.
- **Recovery (none):** this page measures and reports. Nothing here undoes a change; a failed verdict hands the undo to [Accept or Rollback Gate](/05-feedback-loop/03-accept-or-rollback-gate/).
- **Advanced / gated (7):** read before the first trial, because running an analysis task needs a privilege and an entitlement that a read session does not have.

## 1. Measure the unchanged workload first

Run the unchanged workload before the candidate exists. Freeze the set, the binds, the host, the workload window, the metric, and the duration; run the full workload with nothing changed; record the spread. That spread is the noise floor: the movement you see when nothing moves.

The [preface](/00-preface/02-how-to-prove-a-win/) defines the A/A control and states this guide's K>=5 and bootstrap discipline. This page adds the operating order: floor first, repetitions second, margin third. A floor taken on one host is not automatically the floor for another host.

**ILLUSTRATIVE — synthetic spread and derived margin, not a measured floor.**

| Metric                                        | A/A spread (floor) | Margin `max(2x floor, 5%)` | Required improvement `>= floor + margin` |
| --------------------------------------------- | ------------------ | -------------------------- | ---------------------------------------- |
| `buffer_gets` (primary)                       | `3%`               | `6%`                       | `9%`                                     |
| `elapsed_time` (advisory, reported not gated) | `9%`               | `18%`                      | `27%` — advisory, not a gate             |

The composed bar the [gate's check 1](/05-feedback-loop/03-accept-or-rollback-gate/) cites applies to the primary row, the aggregate logical-work metric. The `elapsed_time` row is advisory: elapsed time is reported alongside and discussed, but no check turns it into a verdict, so treat its figure as context rather than a threshold you can be rejected against. Both rows are illustrative inputs: the floor is whatever your own unchanged control measured, and the margin is an engineering choice calibrated to it.

If the spread is high, collect more unchanged samples or fix the measurement conditions before you trust any later pair. A single after-run cannot be more precise than the control that precedes it. The artifact is the unchanged-control report, the raw samples, and the floor calculation recorded beside the set identity.

## 2. Repeat the full workload and calculate outside the report

A comparison pass gives you a before report, an after report, and per-statement rows. It does not give you a repetition policy, a median difference, or a confidence interval. **The comparison statistics are computed outside the report, never read from it.**

**A sample, defined once for this chapter:** one value of the declared aggregate metric from one full-workload repetition on one side. Five samples per side therefore means five repetitions of the full workload per side — not five statements inside one run, and not five rows extracted from a report. Each side's median is taken over those values.

Two conditions must both hold before the interval counts, and neither one replaces the other:

- **The repetition count.** At least five aggregate samples per side, 10–15 preferred, counted as section 4 states.
- **The per-execution raw rows.** At least five comparable raw samples per side in the preface's sense: one owner-approved row per execution with `aggregation_level` set to `per_execution` and the identity fields on every row. A row taken from a report without that evidence stays `SPA_TRIAL_REPORT` and does not satisfy this condition.

Both conditions come from the [preface](/00-preface/02-how-to-prove-a-win/), which owns the raw-sample contract; this page owns how the two counts are used together.

1. Capture the before samples on the frozen full workload.
2. Apply the one candidate from the [change record](/05-feedback-loop/01-one-change-at-a-time/).
3. Capture the after samples under the same conditions.
4. Keep per-statement rows, aggregate rows, plan hashes, and metric values.
5. Compute each side's median outside the report.
6. Compute the median difference with a declared paired or unpaired estimator.
7. Bootstrap the difference with a recorded resample count and seed.
8. Compare the estimate with the floor, then hand the result to the gate.

Repeat the full workload, not just the motivating statement, and prefer longer runs over many ultra-short ones [S58]. If the host, statistics, data distribution, or bind set changes between sides, the comparison is void and the run starts again as a new experiment.

## 3. Choose metrics without worshiping one number

Lead with logical work. `buffer_gets` is this guide's primary metric because it counts block requests rather than a clock: it answers how much work the plan did [S06]. Report elapsed time alongside it, because elapsed time is what the user notices and what the machine's contention moves around.

Treat the lower variance of logical work as an expectation to test on your workload, not as a fact to quote. CPU time and rows processed from the same report are supporting evidence, and they are read beside the primary metric rather than instead of it.

A plan-hash change alone is never evidence: a hash identifies a plan shape, not an outcome, and only measured samples decide [S58]. The plan artifact explains a result; the samples decide it. Read the plan line through the [toolbox runbook](/03-toolbox/01-measure-with-xplan-and-monitor/), which this page does not repeat.

## 4. State the repetition policy

Counts use the sample definition from section 2: five per side means five full-workload repetitions per side, with the per-execution raw-row condition holding at the same time.

| Setting          | Value                                                                                                              | Attribution                                                         |
| ---------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------- |
| Minimum per side | `5` aggregate samples = `5` full-workload repetitions                                                              | Engineering choice under [S58]'s repetition principle               |
| Recommended      | `10–15` samples per side, plus one full-workload comparison pass                                                   | Same engineering choice; upper end when variance or stakes are high |
| Duration         | Every repetition runs the full workload to completion; declare a minimum duration per repetition in the run record | Engineering choice under [S58]'s duration principle                 |
| Margin           | `max(2x floor, 5%)`                                                                                                | Engineering choice, calibrated to your own floor                    |

**The bar, stated once: `required improvement >= floor + margin`.** The floor is the measured unchanged-control spread for that metric; the margin is the engineering choice in the table above. The gate's check 1 cites this sentence instead of restating the parts, and section 1 shows the arithmetic.

**The estimator, stated once:** the difference of the side medians, `median(before) - median(after)` on the primary metric, so a positive value means the after side used less work. Bootstrap it unpaired by default; use the paired branch only when repetition i on one side corresponds to repetition i on the other under identical conditions, and record which branch you used.

**Attribution, stated once.** [S58] is the methodology source behind the counts: it requires enough repetitions, enough duration, and a reported variability for any benchmark claim, and it deliberately stops short of prescribing a trial count for Oracle. The floor of 5 and the recommendation of 10–15 are this guide's operating policy under that source, recorded the same way in the preface. They are recommendations to run more trials, not results measured in this guide.

The margin is a different kind of number. It is an engineering choice calibrated to the noise floor you measured, explicitly not a universal constant and not an Oracle threshold. Write the margin, the estimator, and the counts into the run record before the candidate runs; a margin chosen after the result is not a margin.

## 5. Expect the best mover to be chance

Examine a frozen set of N statements and one of them can look improved even when nothing changed. Neither source quantifies that risk for your set: the package reference supplies the aggregate and per-statement rows [S06], and the benchmarking methodology requires reported variability instead of a best-case pick [S58]. This page therefore treats the best mover as a hazard to guard against, not a rate to quote.

Two guards hold the line. The first is the aggregate verdict over the frozen set, so a single lucky row cannot carry the run. The second is the no-regression constraint, whose per-statement criterion is stated on the [accept or rollback gate](/05-feedback-loop/03-accept-or-rollback-gate/). That page combines both into a verdict; this page supplies the numbers it uses.

## 6. Compute the interval outside SQL

The interval is the part readers trust, so it comes from a calculation you can rerun, not from a figure printed in a report.

**COPYABLE — the canonical harness for this chapter. Local Python, no database and no Oracle client: line 1 is the before samples, line 2 the after samples, and an optional line 3 reading `paired` selects the paired branch. Fewer than five samples on a side is refused, because the book requires at least five comparable samples per side before an interval counts. Expected output: a median difference (positive means the after side used less work), a 95% interval, and whether that interval excludes zero.**

```python
import random
import statistics
import sys

MIN_SAMPLES_PER_SIDE = 5  # the book's K>=5 discipline; a smaller side is refused, not rounded up

# stdin: line 1 = before samples, line 2 = after samples, whitespace separated.
# Optional line 3: "paired" selects the paired branch of the bootstrap.
lines = [ln.strip() for ln in sys.stdin if ln.strip()]
if len(lines) < 2:
    raise SystemExit("need one before line and one after line")
before = [float(x) for x in lines[0].split()]
after = [float(x) for x in lines[1].split()]
paired = len(lines) > 2 and lines[2].lower() == "paired"
if len(before) < MIN_SAMPLES_PER_SIDE or len(after) < MIN_SAMPLES_PER_SIDE:
    raise SystemExit(
        f"need at least {MIN_SAMPLES_PER_SIDE} samples per side, got "
        f"{len(before)} before and {len(after)} after"
    )
if paired and len(before) != len(after):
    raise SystemExit("paired branch needs one before value per after value")

# The estimator: the difference of the two observed side medians. The resampling
# below never replaces it, because a bootstrap summary is not the declared estimator.
point = statistics.median(before) - statistics.median(after)

rng = random.Random(20260922)  # engineering choice: fixed seed so the run recomputes
draws = 5000  # engineering choice: resample count, used for the interval only
differences = []
for _ in range(draws):
    if paired:
        idx = [rng.randrange(len(before)) for _ in range(len(before))]
        b = statistics.median([before[i] for i in idx])
        a = statistics.median([after[i] for i in idx])
    else:
        b = statistics.median(rng.choices(before, k=len(before)))
        a = statistics.median(rng.choices(after, k=len(after)))
    differences.append(b - a)  # sign convention: positive = after used less work

differences.sort()
low = differences[int(0.025 * draws)]
high = differences[int(0.975 * draws)]
print(f"median difference: {point:.2f}")
print(f"95% CI: [{low:.2f}, {high:.2f}]")
print(f"excludes zero: {low > 0 or high < 0}")
```

Three rules this block encodes, and they are the page's own rules rather than additions to them.

- **The point estimate** is the **difference of the two observed side medians**, which is the estimator section 4 declares. The resampled distribution is used **only** for the interval, so a bootstrap summary can never be reported as the estimate.
- **The sign convention** is `median(before) - median(after)`, so a positive difference is an improvement and the interval must sit above zero for the check to pass.
- **The minimum-sample guard** refuses a side with fewer than five values, because one value per side produces a zero-width interval around a single difference, which reports a clean pass for a measurement that was never made.

This block is the book's one estimator; the SPA recipe links here instead of printing a second copy.

The acceptance rule requires this interval to exclude zero, alongside the other four checks it runs. That rule lives on the [gate page](/05-feedback-loop/03-accept-or-rollback-gate/). Record the branch, the estimator, the resample count, and the seed beside the interval, because an interval without them is a number another engineer cannot recompute. The seed `20260922` and the resample count `5000` in the block are engineering choices declared as such, not source recommendations, while the 95% level itself is the preface's canonical interval for a formal claim.

An interval that spans zero is not "probably good." It is inconclusive, and the honest next step is a better-powered repeat under the counts in section 4.

## 7. Where the measurement run is gated

Creating and running an analysis task needs the `ADVISOR` privilege plus the Real Application Testing entitlement that SQL Performance Analyzer depends on, and the report call needs the same task-owner session the task was created in. Both are recorded in the [claim-to-tool map](/03-toolbox/), with the licensing check that goes with them.

Confirm entitlement before you plan a formal comparison, and record `BLOCKED_PENDING_DECISION` when a privilege or entitlement blocks it. A blocked run is a recorded outcome, not a performance claim.

## Artifact

A measurement record another engineer can recompute:

- [ ] Unchanged control run first, with the spread and the metric-specific floor saved
- [ ] Trial counts and margin written into the run record before the candidate ran
- [ ] Full workload repeated on both sides under the same set, binds, window, and metric
- [ ] Samples, medians, estimator, resample count, and seed kept outside the report
- [ ] Interval computed outside the report and checked against the zero exclusion rule
- [ ] Plan hashes and the report kept as explanation, never as the verdict
- [ ] Best-mover result ignored unless the aggregate and no-regression checks both pass

The Python calculation is `COPYABLE`; the tables above are `ILLUSTRATIVE`. No sample set on this page came from a run.

Source IDs and technique IDs resolve in [Appendix Sources](/07-appendix-sources/).

**Decision:** the floor sets the bar, the repetitions set the uncertainty, and the interval decides whether there is anything there at all.

**Next required page:** [Accept or Rollback Gate](/05-feedback-loop/03-accept-or-rollback-gate/).
