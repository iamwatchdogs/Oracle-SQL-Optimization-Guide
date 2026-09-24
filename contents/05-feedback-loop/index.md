---
title: Feedback Loop That Proves It
description: One change, measured noise, clear accept or rollback, and memory.
order: 50
draft: false
---

Last year I tuned a loop that accepted three fixes in a row without re-baseline. It cost 9 hours of rework and one rolled-back release.

You have seen a query run faster once then run slower in prod. This chapter blocks that outcome. Thesis up front: prove each change on the same frozen workload or claim nothing.

A loop is like a lab notebook, except each entry links a proposal to its SPA report plus plan hash.

Status is clear. This loop was designed, not run. This env had no live Oracle DB. Every P0-P12 step stays NOT-VERIFIED here. Run the protocol on a test DB first.

Authority sits in sources. [S06] DBMS_SQLPA https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html. [S05] DBMS_XPLAN https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_XPLAN.html. [S58] Hoefler and Belli SC15 https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf. [S56] Reflexion https://github.com/noahshinn/reflexion. [S12] SPM brief https://www.oracle.com/technetwork/database/bi-datawarehousing/twp-sql-plan-mgmt-19c-5324207.pdf. [S11] Real-Time SPM https://arxiv.org/html/2608.27758v1. [S40] quarantine https://oracle-base.com/articles/19c/sql-quarantine-19c.

## 1. One change keeps blame clear

Claim: test one candidate per loop, then re-baseline.

Walkthrough: STS OPT_LOOP_WL holds 12 statements, frozen. Advisors suggest a profile and an index. You pick the index only. You apply it in test. SPA test execute before and after decides. Win becomes the next baseline.

Why this rule exists: plan evolution verifies candidates one by one [S07][S12]. Auto indexing verifies one index effect [S15][S16]. D6 bans interleaved changes because attribution breaks.

Cost of skipping it: stats plus index land in one go. Statement 7 slows 8%. Debug takes hours. Rollback removes all three.

## 2. Noise first, reps always

Claim: run A/A first, then K reps, then a 95% interval.

Walkthrough: aa_run_1 versus aa_run_2 on unchanged STS shows 3% spread on buffer_gets. That spread is the noise floor. Margin is max of 2x noise or 5%, so 6% here. Later change shows 12% median drop over K=10. Bootstrap gives 95% CI [-15%, -8%]. Zero sits outside. Win counts. With K=2 the CI is [-14%, +6%]. Verdict is reject.

Why this rule exists: SC15 requires reps plus variance reports [S58]. SPA defaults to elapsed_time and switches to buffer_gets [S06]. Primary is buffer_gets. Secondary is elapsed_time.

Cost of skipping it: one fast run ships. Prod load flips the result. You chase ghosts for a day.

## 3. Gate, memory, stop

Claim: five checks decide. Lessons block repeats. Stops end drift.

Walkthrough: patch cuts aggregate 9% but one statement regresses 7% past a 6% margin. Gate fails. You drop the patch. DISPLAY_CURSOR must show the old hash again. Lesson stores class, signature, delta, reason. After N=3 straight rejects the run halts. Plateau, budget end, or quarantine event would also halt.

Why this rule exists: Real-Time SPM keeps the old plan when the new plan is not better [S11]. Reflexion feeds failure text forward [S56]. Quarantine blocks runaway plans [S40].

Cost of skipping it: same bad index returns weekly. Budget burns. Quarantine fires in prod.

<details><summary>In case you don't know about the noise floor, it's the spread you see when you test the same workload twice with no change.</summary>Noise floor is the no-change delta on one frozen tuning set. You set it before any claim. Same binds, same host, same metric. Recommended margin is max(2x noise, 5%), an engineering choice you calibrate to your floor. Loop owners use it at intake on every new host. Do not skip it to save time. Without it each 2% dip reads as a win, and the cost is days spent debating ghosts. Sharp line: it draws the line between wobble and win. Example: unchanged OPT_LOOP_WL shows 3% on buffer_gets, so margin becomes 6%. A later index drops 12% median and passes. Below 6% would fail even with a nice plan diff. See [S58] https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf</details>

<details><summary>In case you don't know about Reflexion memory, it's a lesson store that blocks repeat of failed ideas.</summary>Reflexion memory saves failure text so the next propose avoids the same miss without retraining. Each row holds change class, signature, action, measured delta from SPA rows, reason, and ban window. The hash comes from DISPLAY_CURSOR. Next propose reads by signature match. No SPA plus XPLAN artifacts means no lesson. Agent owners use it after each reject. It drives one decision: skip, amend, or allow retest on new facts. Do not keep retrying from chat recall. That spins and burns a full K=10 cycle each time. Sharp line: it turns each reject into a searchable block for that shape. Example: a patch fails no-regression and its lesson bans that hint until the stats date moves. The next loop picks a stats test instead. See [S56] https://github.com/noahshinn/reflexion</details>

In this chapter:

- [One Change at a Time](/05-feedback-loop/01-one-change-at-a-time/)
- [Noise Floor and Repetition](/05-feedback-loop/02-noise-floor-and-repetition/)
- [Accept or Rollback Gate](/05-feedback-loop/03-accept-or-rollback-gate/)
- [Memory and When to Stop](/05-feedback-loop/04-memory-and-when-to-stop/)

**Keep this: Prove each change on the same workload or record NOT-VERIFIED and claim nothing.**
