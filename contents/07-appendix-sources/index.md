---
title: Appendix Sources - How We Track Every Claim
description: The 75-source system behind stars, licenses, and Oracle behavior claims.
order: 70
draft: false
---

Every claim here traces to a numbered source you can open. No mystery numbers.

"'where did that star count come from?'"

Short answer: GitHub API on 2026-09-22. Plus Oracle docs and papers. Each has an ID.

Think of citations here like food labels: what, when, where.

<details><summary>In case you don't know about accessed dates, it's the day the author fetched the page and froze the fact.</summary>Oracle pages change. GitHub stars change. The date tells you which snapshot the number belongs to.</details>

What means 75 distinct sources. 30+ are Oracle versioned docs. 6 are Oracle briefs. 16 are papers. 16 are repos and tools. 8 are blogs for background only.

When means accessed 2026-09-22 for all online sources. Repo stars, push dates, licenses, and archived flags all use that date. Example: sqlglot MIT 9,628 stars push 2026-09-21. SQLFluff MIT 9,883 stars push 2026-09-21. Calcite Apache-2.0 5,186 stars push 2026-09-21.

Where means two files. File 06 holds repo facts and per-technique maps. File 07 holds full bibliography plus search trail. Short form `[S##]` lives in text. Full form lives in 07: author, title, version or date, link.

Classes keep you honest. A1 means Oracle versioned docs. A2 means Oracle briefs. B1 means peer paper or preprint. B2 means third-party repro report. C1 means tool docs. C2 means maintained repo. D means blog or forum, background only.

This appendix has two parts. Part 01 shows how S-numbers, classes, and links fit together. Part 02 shows how to survive version drift from 19c to 26ai and from active to archived.

A junior once pasted a 2012 stats brief as current truth. Date was on page one. The 19c brief had replaced it. One date check would have saved the thread.

In this chapter:

- [How Citations Work in This Book](/07-appendix-sources/01-how-citations-work/)
- [Version Drift Survival for Oracle Docs and OSS](/07-appendix-sources/02-version-drift-survival/)

**Keep this: No ID, no date, no trust — look up the S-number before you quote it.**
