---
title: Feedback Loop That Proves It
description: One change, measured noise, clear accept or rollback, and memory.
order: 50
draft: false
---

Last year I tuned a loop that accepted three fixes in a row without re-baseline. It cost 9 hours of rework and one rolled-back release. Each fix looked good alone. Together they hid two regressions.

An agent loop earns trust only when each change faces the same frozen test.

A loop is like a lab notebook, except each entry links a proposal to its SPA report plus plan hash.

<details><summary>In case you don't know about the noise floor, it's the spread you see when you test the same workload twice with no change.</summary>You run A/A first. That spread sets the bar. Gains below it do not count.</details>

<details><summary>In case you don't know about Reflexion memory, it's a lesson store that blocks repeat of failed ideas.</summary>Each lesson keys on change class plus measured delta. No SPA plus XPLAN hash means no lesson.</details>

The design has 10 stages. Intake freezes the STS. Propose picks one candidate. Static gate parses and tests. Isolated apply touches test only. Measure runs SPA. Decision checks stats. Rollback restores. Log saves proof. Reflect writes a lesson. Promote re-runs SPA on target. Observe watches AWR plus quarantine.

Rules are few. One change at a time. Reps K>=5 per side, 10 to 15 advised. Margin max of 2x noise or 5%. 95% CI must exclude zero. N=3 straight rejects stops the run.

In this chapter:

- [One Change at a Time](/05-feedback-loop/01-one-change-at-a-time/)
- [Noise Floor and Repetition](/05-feedback-loop/02-noise-floor-and-repetition/)
- [Accept or Rollback Gate](/05-feedback-loop/03-accept-or-rollback-gate/)
- [Memory and When to Stop](/05-feedback-loop/04-memory-and-when-to-stop/)

**Keep this: Prove each change on the same workload or record NOT-VERIFIED and claim nothing.**
