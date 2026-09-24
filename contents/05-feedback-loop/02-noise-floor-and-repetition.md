---
title: Noise Floor and Repetition
description: Run A/A first, repeat K>=5, and report 95% CI on the median.
order: 52
draft: false
---

"'it was 200 ms faster once, so can we ship?'"

Faster once is noise; proof needs reps plus a floor plus an interval.

A noise floor is like a ruler, except it measures wobble in your own test rig before you measure change.

<details><summary>In case you don't know about A/A, it's two runs of the same code with zero change to gauge wobble.</summary>You compare run 1 to run 2. The delta is noise. Later gains must clear it.</details>

<details><summary>In case you don't know about 95% CI, it's the range that should hold the true median in 95 of 100 repeats.</summary>You build it by bootstrap on your K samples. If it includes zero, you have no win.</details>

Start with A/A. Run the unmodified workload twice through SPA test execute. Name them aa_run_1 and aa_run_2. Compare on buffer_gets. The spread is your noise floor. That number sets the bar for every later claim. No floor means no verdict.

Reps come next. Minimum is 5 per side. Advised is 10 to 15 for statement metrics plus one full SPA pass per side for the aggregate. Longer single runs beat many ultra-short runs. Same workload. Same binds. Same host. Record each sample. Compute median. Bootstrap 2000 resamples for 95% CI on the median. Report low, median, high.

Metrics have order. Primary is buffer_gets through SPA comparison_metric for logical work with lower variance. Secondary is elapsed_time for user-visible effect. Tertiary is CPU time and rows from the same report. Plan-hash change alone is never proof. Plans shift for calm reasons. Only measured outcomes decide.

Multiple looks mislead. With N statements, one best mover often improves by chance. The aggregate STS verdict plus no-regression per statement guards that trap.

**Keep this: A/A floor first, K>=5 with 95% CI, buffer_gets first and elapsed_time second.**
