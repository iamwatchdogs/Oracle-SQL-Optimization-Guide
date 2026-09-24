---
title: Version Drift Survival for Oracle Docs and OSS
description: 19c to 26ai changes, superseded briefs, and archived repos without pain.
order: 72
draft: false
---

A junior pinned OtterTune tuning code from 2017 posts. Repo had been read-only since 2020. Install failed on new Python. Two hours lost. The API flag had said Archived all along. Push date was 2020-11-13. Stars were 1,233 and meant nothing.

You run 19c today and read 26ai posts tomorrow. Old briefs still rank in search. Old repos still rank on stars. This page shows how to pin version and date so drift does not burn you.

Milk cartons that print drink-by dates are more like Oracle docs, where date decides if advice still applies.

## 1. 19c versus 26ai, cite the one you ran

Plain claim: S01 is stable 19c, S02 is new 26ai, both live now.

Worked example: run a 19c versus 26ai demo. First S01 Tuning Guide 19c E96095-19 Apr 2025. TOC read firsthand, chapters 1 to 30, base for plans, stats, SPM, advisors. Cite it for stable behavior. Then S02 AI Database 26ai Jan 2026. TOC read firsthand. Adds SQL Transpiler, Automatic SPM, auto error mitigation, PL/SQL dynamic stats. Cite it for new behavior. Then S11 Real-time SPM paper 2026 plus S21 SPM overview. Background checks fell short in cloud with tight resources, fix means foreground checks. First pass you pin version plus accessed date on every Oracle claim. Second pass you cite both S01 and S02 when behavior changed across releases.

Why it matters: old advice can hurt new optimizers. New features do not exist on old DBs. Version pin stops both faults.

Sourced number: S01 19c E96095-19 Apr 2025 A1. S02 26ai Jan 2026 A1. S11 PVLDB 2026 Real-time SPM B1. S21 SPM overview A1. All accessed 2026-09-22.

## 2. Superseded briefs stay as warnings, not guides

Plain claim: S08 19c replaces the 2012 stats brief, keep old only to warn.

Worked example: trace stats drift. First the 2012 stats brief linked under S08. Superseded. Do not follow for current gathers. Then S08 19c brief plus S09 stats concepts 19c plus S10 optimizer 18c brief. Current path for gathers, NDV, adaptive query. Then adaptive plan dispute. Docs describe a feature in S01 chapter 4 and S10, one vendor post says turn it off. Treat as workload-dependent. Measure with V0 controls from S19 Influencing the Optimizer. First pass you check the header date. Second pass you check supersede note. No post proves a global win.

Why it matters: search ranks old PDFs high. Teams script old flags into new jobs. Date check breaks the loop.

Sourced number: S08 19c brief A2 supersedes 2012 edition. S09 19c stats concepts A2. S10 18c optimizer brief Feb 2018 A2. S19 Influencing the Optimizer A1 for enable and disable controls.

## 3. Archived repo drift hurts as much as doc drift

Plain claim: push date plus license tells you when a repo became reading material.

Worked example: run an archived-repo drift demo. First OtterTune. 1,233 stars, push 2020-11-13, Archived read-only, no license declared, see S54. Design notes only. Then SQLd360 65 stars push 2018-01-14 Dormant versus SQLdb360 123 stars push 2024-12-03 Low activity, both no license declared, see S67. Prefer SQLdb360 for bundles, keep SQLd360 as history. Then Reflexion MIT 3,283 stars push 2025-01-14 Low, ReAct MIT 4,183 stars push 2024-02-06 Dormant, CHESS Apache-2.0 281 stars push 2025-05-26 Active, see S56, S57, S55. First pass you read archived flag before stars. Second pass you read push date before README promises. Support dates need care: S78 Lifetime Support Policy PDF was located but text not pulled, so no support date is asserted anywhere here. Cite S78 itself for windows.

Why it matters: install faults waste hours. Design notes still help, but only when labeled as notes. Flags give you the label.

Sourced number: OtterTune 1,233 Archived 2020-11-13. SQLd360 65 Dormant 2018-01-14. SQLdb360 123 Low 2024-12-03. Reflexion MIT 3,283 push 2025-01-14. ReAct MIT 4,183 push 2024-02-06 Dormant. CHESS Apache-2.0 281 push 2025-05-26.

<details><summary>In case you don't know about 26ai, it's the new name for Oracle AI Database 26ai docs that supersede parts of 19c.</summary>Many 19c URLs still work and were checked 2026-09-22. Use 19c for stable behavior, 26ai for new features. Cite both when a feature changed.</details>

<details><summary>In case you don't know about support policy, it's the Oracle PDF that sets support windows.</summary>This pass located S78 but did not pull text. So no date is asserted here. Cite S78 directly when you need a window. Do not cite blogs for dates.</details>

**Keep this: Version plus accessed date on every Oracle claim, push date plus license on every repo claim.**
