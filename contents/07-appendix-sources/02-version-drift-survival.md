---
title: Version Drift Survival for Oracle Docs and OSS
description: 19c to 26ai changes, superseded briefs, and archived repos without pain.
order: 72
draft: false
---

Oracle docs move. Pin version and date or you will run stale advice.

"'but that blog from 2012 said to do it this way?'"

Short answer: the 2012 stats brief was replaced by the 19c brief. Old advice can hurt new optimizers.

Think of docs like milk cartons: drink the date, not just the brand.

<details><summary>In case you don't know about 26ai, it's the new name for Oracle AI Database 26ai docs that supersede parts of 19c.</summary>Many 19c URLs still work and were checked 2026-09-22. Use 19c for stable behavior, 26ai for new features.</details>

Plain case first. S01 is Tuning Guide 19c from April 2025. S02 is AI Database 26ai from January 2026. Both live now. 26ai adds SQL Transpiler, Automatic SPM, auto error mitigation, PL/SQL dynamic stats. Cite the one you ran. If behavior changed, cite both.

Stats drift is real. S08 19c brief supersedes the 2012 edition. Keep the 2012 link only to warn against stale scripts. Same for adaptive plans: docs describe a feature, one vendor post says turn it off. Treat as workload-dependent. Measure with V0 controls from S19. No post proves a global win.

SPM drift is real too. S11 Real-time SPM paper from 2026 shows background checks fell short in cloud with tight resources. Fix means foreground checks. That is why agent loops here prefer foreground proof. S21 plus S11 cover 19c Auto SPM and 26ai Real-Time SPM together.

OSS drift is real too. OtterTune: 1,233 stars, push 2020-11-13, Archived read-only. Design notes only. SQLd360: 65 stars, push 2018-01-14, Dormant. Prefer SQLdb360: 123 stars, push 2024-12-03, Low activity. Reflexion: MIT, 3,283 stars, push 2025-01-14. ReAct: MIT, 4,183 stars, push 2024-02-06, Dormant. CHESS: Apache-2.0, 281 stars, push 2025-05-26.

Support dates need care. S78 is the Lifetime Support Policy PDF. This pass located it but did not extract text. So no support date is asserted anywhere here. Cite S78 itself when you need a window. Do not cite blogs for dates.

A junior pinned OtterTune tuning code from 2017 posts. Repo had been read-only since 2020. Install failed on new Python. Two hours lost. The API flag had said Archived all along.

**Keep this: Version plus accessed date on every Oracle claim, push date plus license on every repo claim.**
