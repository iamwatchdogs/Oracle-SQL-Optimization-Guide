---
title: Oracle SQL Optimization for Junior Devs
description: Prove every speed win twice. A short book from 68 proven Oracle fixes, tools, and safe ship habits.
order: 0
draft: false
---

"What is this? Some kinda list of fast queries? Kind of."

This is a short book that teaches one skill: prove a SQL change made things faster, then ship it without breaking prod.

Imagine a kitchen where every cook claims their version is faster. This book is the scale on the counter. Same dish. Same weight. Two weigh-ins. No scale, no win.

<details><summary>In case you don't know about Oracle SQL tuning, it's the work of making a query use less time and less I/O.</summary>You read the plan Oracle picked. You fix bad guesses with fresh numbers or better layout. You lock the good plan so it stays fast.</details>

<details><summary>In case you don't know about an execution plan, it's the steps Oracle chose to run your query.</summary>Two runs can pick two plans. You save both plans. You compare hash, rows, and reads. That is proof.</details>

How to read this book:

- Start at [00-preface](/00-preface/) if you have 10 minutes. It shows how evidence grades work and the 6-step check every chapter uses.
- Read [01-proven-techniques](/01-proven-techniques/) for the 68 fixes in 5 moves: measure, feed estimates, fix layout, let rewrites happen, lock the plan.
- Use [02-papers-behind-recipes](/02-papers-behind-recipes/) when someone cites a paper from another database. Only 3 papers here are Oracle-tested. The rest are ideas until Oracle runs prove them.
- Keep [03-toolbox](/03-toolbox/) open while you work. One claim, one tool: plan, monitor, tuning set, analyzer, loader, linter.
- Copy from [04-recipes](/04-recipes/) when you need exact calls for tuning sets, before-and-after compares, stats pipelines, and safe deploys.
- Finish with [05-feedback-loop](/05-feedback-loop/) for the boring loop that wins: one change, frozen input, measured noise, accept or roll back, write the lesson.
- Check [06-oss-guide](/06-oss-guide/) before you add a GitHub tool. Parse and lint help. Plan control stays inside Oracle.
- Use [07-appendix-sources](/07-appendix-sources/) to look up any `[S##]` number, class, and date.
- Skip [08-bonus-batch-api](/08-bonus-batch-api/) unless you need cheap async AI calls. It is not Oracle. It is marked bonus for that reason.

**Keep this: If you did not measure it twice on the same workload, you did not fix it.**
