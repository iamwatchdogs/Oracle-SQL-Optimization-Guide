---
title: Appendix Sources - How We Track Every Claim
description: The 80-source system behind stars, licenses, and Oracle behavior claims.
order: 70
draft: false
---

A junior pasted a 2012 stats brief as current truth. Date sat on page one. The 19c brief had replaced it. The thread ran 30 replies before someone checked the header. One date check would have ended it at reply one.

You know basic SQL and you copy numbers fast. You paste star counts without dates. You cite blogs as proof. This appendix stops that with a simple system. Every fact gets an ID, a class, and a date.

Food labels that list what plus when plus where are more like S-numbers, where short code points to full receipt.

## 1. What, when, where, in one short code

Plain claim: S-number plus class plus accessed date traces any claim to its page.

Worked example: look up three facts. First sqlglot stars. Short form S60. Full form gives repo, MIT license docs, dialect docs, GitHub API 2026-09-22 with MIT 9,628 stars push 2026-09-21. See S60. Second SQLFluff Oracle dialect. Short form S61. Full form gives docs v4.3.0 plus dialect reference plus GitHub API 2026-09-22 with MIT 9,883 stars push 2026-09-21. See S61. Third Calcite Oracle dialect. Short form S62. Full form gives site plus OracleSqlDialect javadoc plus GitHub API 2026-09-22 with Apache-2.0 5,186 stars push 2026-09-21. See S62. First pass you read the short code inline. Second pass you open the full row in file 07 for author, title, version, link.

Why it matters: short codes keep text clean. Full rows keep proof intact. No mystery numbers survive.

Sourced number: 80 distinct sources (S01–S80). 30+ A1 Oracle versioned docs. 6 A2 Oracle briefs. 19 B1 papers (P1–P18 plus P20 QueryBooster). 1 B2 repro report. 16 C repos and tools. 8 D blogs for background only. All online sources accessed 2026-09-22.

## 2. Classes keep weight honest

Plain claim: A1 beats D every time, C proves code, B proves design.

Worked example: rank a mirror against A1. First the mirror. Unknown date, unknown version, class D at best. Rejected as evidence per Appendix A. Use only to find the official page. Then S01 Tuning Guide 19c E96095-19 Apr 2025, class A1. Versioned, chaptered, citable for behavior. First pass you ask for class. Second pass you ask for version. A mirror with no version never outranks A1 with an E-number. Same rule sorts B1 papers such as S49 SQLSolver SIGMOD 2024 and S50 VeriEQL OOPSLA 2024 above vendor tutorials, and C2 repos such as S63 utPLSQL Apache-2.0 624 stars needs 19c or newer above blog walkthroughs.

Why it matters: weight stops false ties. A blog post and an Oracle guide are not two equal votes. Class says which one decides.

Sourced number: S01 19c E96095-19 Apr 2025 A1. S02 26ai Jan 2026 A1. S08 stats brief 19c A2. S12 SPM brief 19c A2. S63 utPLSQL Apache-2.0 624 push 2026-09-18 (latest README names 19c+, older runs went back to 11gR2 — match to your DB). S64 python-oracledb UPL-1.0 OR Apache-2.0 452 push 2026-09-19.

## 3. Two files split the job so numbers stay fresh

Plain claim: file 06 holds repo facts and per-technique maps, file 07 holds full bibliography plus search trail.

Worked example: trace 19c versus 26ai plus an archived repo. First S01 versus S02. S01 is 19c Apr 2025. S02 is 26ai Jan 2026 with Transpiler, Automatic SPM, auto error mitigation. Cite the one you ran, cite both if behavior changed. Then OtterTune. 1,233 stars, push 2020-11-13, Archived, see S54. Keep as design note, not runnable tooling. Then SQLd360 65 stars push 2018-01-14 Dormant versus SQLdb360 123 stars push 2024-12-03 Low activity, see S67. First pass you pin version plus accessed date on every Oracle claim. Second pass you pin push date plus license on every repo claim.

Why it matters: docs drift and repos rot. Split files let you update one side without touching the other. Dates tell you which snapshot the number belongs to.

Sourced number: S01 19c E96095-19 Apr 2025. S02 26ai Jan 2026. OtterTune 1,233 Archived 2020-11-13. SQLd360 65 Dormant 2018-01-14. SQLdb360 123 Low 2024-12-03.

<details><summary>In case you don't know about accessed dates, it's the day the author fetched the page and froze the fact.</summary>Accessed dates freeze which snapshot you used. Oracle pages change. Stars change. The date ties a number to a day. This book uses 2026-09-22 for all online sources. Check in two steps: write the accessed date on every cite, and reopen the row before reuse. Writers need it to stay honest. Readers need it to recheck fast. It drives one decision: reuse the fact or refetch first. Do not drop the date for short links. That swap saves seconds and costs hours on drifted advice. Sharp line: the date proves when you saw it, not that it is still true. Example: S61 SQLFluff MIT 9,883 stars push 2026-09-21 was true on 2026-09-22 only. See [S60][S61][S01].</details>

<details><summary>In case you don't know about source classes, it's the weight label from A1 down to D.</summary>Source classes grade weight from A1 down to D. A1 is Oracle versioned docs. A2 is an Oracle brief. B1 is a peer paper. B2 is a third-party repro. C1 is tool docs. C2 is a kept repo. D is a blog, background only. Check in two steps: tag class first, check version next. PROVEN needs 2 sources or 1 strong A1/A2/B1 plus a rerun. Devs need it before merge. It drives one decision: ship or test more. Do not let D beat A1. That swap costs rework from stale advice. Sharp line: class tells you what counts as proof, not what reads nice. Example: S06 DBMS_SQLPA A1 beats any SPA blog. Counts are 30+ A1, 6 A2, 19 B1, 1 B2, 16 C, 8 D, 80 total. See [S06].</details>

In this chapter:

- [How Citations Work in This Book](/07-appendix-sources/01-how-citations-work/)
- [Version Drift Survival for Oracle Docs and OSS](/07-appendix-sources/02-version-drift-survival/)

**Keep this: No ID, no date, no trust — look up the S-number before you quote it.**
