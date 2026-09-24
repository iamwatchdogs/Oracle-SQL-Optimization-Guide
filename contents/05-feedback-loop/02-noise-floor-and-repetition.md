---
title: Noise Floor and Repetition
description: Run A/A first, repeat K>=5, and report 95% CI on the median.
order: 52
draft: false
---

A junior shipped a 200 ms win seen once. Prod showed slower p95 for a week. Rollback took two days. The test had no floor and no reps.

You have seen a query run faster once then run slower in prod. That pattern is noise beating proof. Thesis up front: A/A floor first, K>=5 with 95% CI, buffer_gets first and elapsed_time second.

A noise floor is like a ruler, except it measures wobble in your own test rig before you measure change.

Status: designed, not run. This env had no live Oracle DB. No sqlcl or sqlplus on PATH. All A/A runs, K reps, and CI builds below are NOT-VERIFIED here. Authority comes from sources. [S58] Hoefler and Belli SC15, https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf. [S06] DBMS_SQLPA 19c, https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html. [S05] DBMS_XPLAN 19c, https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html.

## 1. Run A/A before any claim

Claim: test the unchanged workload twice and record the spread.

Walkthrough A: freeze STS OPT_LOOP_WL with 8 statements. Run DBMS_SQLPA.CREATE_ANALYSIS_TASK. Run EXECUTE_ANALYSIS_TASK with test execute named aa_run_1. Run again named aa_run_2. Set comparison_metric to buffer_gets. Run compare performance named aa_cmp. Read REPORT_ANALYSIS_TASK. Result: aggregate buffer_gets differs 3% with zero change. That 3% is the noise floor. Margin becomes max of 2x noise or 5%. Here that is max of 6% or 5%, so 6%. Later gains must clear 6%. This exact run is NOT-VERIFIED here.

Walkthrough B: A/A on elapsed_time shows 9% spread on the same host. Same workload. Same binds. Higher variance. That gap is why elapsed_time stays secondary. Buffer_gets stays primary for the gate. Both get reported. Neither gets trusted without a floor.

Why this rule exists: benchmarking method requires variance to be measured before any effect claim [S58]. SPA predicts impact by comparing two workload versions [S06]. A/A uses that same compare path with zero change to set the bar. D7 says faster once is not evidence. No floor means no verdict.

Cost of skipping it: every small delta reads as a win. A 2% dip ships. Prod cache state flips it to +5%. Team debates ghosts. A day burns on a non-effect.

## 2. Repeat K times and show the interval

Claim: minimum 5 reps per side, 10 to 15 advised, plus a 95% CI that must exclude zero.

Walkthrough C: tiny numbers. Before side buffer_gets for one statement over K=10: 1200, 1230, 1190, 1215, 1225, 1205, 1210, 1195, 1220, 1208. Median is 1210. After side with index: 1060, 1085, 1050, 1070, 1065, 1090, 1055, 1075, 1068, 1072. Median is 1070. Drop is 11.6%. Bootstrap 2000 resamples of the median difference gives 95% CI [-14%, -8%]. Zero sits outside. Noise floor is 3%. Margin is 6%. Drop clears margin. Interval clears zero. Win counts pending other gate checks.

Walkthrough D: same shape, K=3. Before: 1200, 1235, 1190. After: 1120, 1185, 1095. Medians jump with each extra sample. Bootstrap CI spans [-13%, +4%]. Zero sits inside. Verdict is reject. Action is clear: add reps to K=10, use longer single runs over many ultra-short runs, same host, same binds. Short runs inflate variance [S58]. This decision path is NOT-VERIFIED here because no samples were taken in this env.

Why this rule exists: SC15 demands enough reps and duration plus confidence reporting [S58]. Longer single measurements beat many ultra-short ones. Median resists outliers better than mean on skewed DB timings. 95% CI on the median difference forces the effect to survive variance. K>=5 is minimum. K=10 to 15 is advised for statement metrics plus one full SPA pass per side for the aggregate.

Cost of skipping it: K=1 ships the best run. Next run regresses. Reviewers cannot tell luck from gain. Rework repeats each sprint. Trust in tuning drops.

## 3. Order metrics and guard the aggregate

Claim: buffer_gets first, elapsed_time second, plan hash never alone, STS aggregate guards chance best-movers.

Walkthrough E: index changes plan hash for sql_id abc123 from 1842217434 to 2901463682. Buffer_gets drops 11%. Elapsed_time drops 7%. CPU time drops 9%. Rows processed match exactly. All three metrics come from the same SPA report. Hash change supports the story. Measured deltas decide. Hash alone would have passed a bad rewrite with equal hash churn and zero gain.

Walkthrough F: STS holds 20 statements. Best mover improves 18%. Aggregate improves 1%. Two other statements regress 6% each. Verdict is reject under the no-regression rule. With N statements, one best mover often improves by chance. Aggregate plus per-statement guard blocks that trap [S06][S58]. Full STS compare is NOT-VERIFIED here.

Why this rule exists: SPA default comparison metric is elapsed_time and switches to buffer_gets [S06]. Elapsed_time is user-visible but noisy. Buffer_gets tracks logical work with lower variance. Tertiary signals are CPU time and rows from the same report. Plan hash shifts for calm reasons. Only measured outcomes count. D5 makes metric choice deliberate.

Cost of skipping it: team tunes one statement and ships. Three others slow in prod. AWR shows load rise. Quarantine may fire. Rollback now touches prod traffic. A narrow win becomes a wide incident.

<details><summary>In case you don't know about A/A, it's two runs of the same code with zero change to gauge wobble.</summary>You compare run 1 to run 2. The delta is noise. Later gains must clear max of 2x noise or 5%. That margin is an engineering choice. Calibrate it to your measured floor.</details>

<details><summary>In case you don't know about 95% CI, it's the range that should hold the true median in 95 of 100 repeats.</summary>You build it by bootstrap on your K samples. Use 2000 resamples. Report low, median, high. If it includes zero, you have no win. This build step is NOT-VERIFIED here.</details>

**Keep this: A/A floor first, K>=5 with 95% CI, buffer_gets first and elapsed_time second.**
