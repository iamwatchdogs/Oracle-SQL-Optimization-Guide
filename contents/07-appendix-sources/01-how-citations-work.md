---
title: How Citations Work in This Book
description: Read S-numbers, classes, and links without getting lost.
order: 71
draft: false
---

S## is short. The bibliography holds the full receipt. Learn the code once.

"'what does [S60] even mean?'"

Short answer: [S60] points to row S60 in file 07. That row gives author, title, date, link.

Think of S-numbers like store receipts: short code in hand, full slip in file.

<details><summary>In case you don't know about DOI links, it's the permanent ID for a paper that outlives blog URLs.</summary>Example: 10.1145/3514221.3526125 for WeTune. Paste it and you land on the publisher page.</details>

<details><summary>In case you don't know about NOASSERTION, it's GitHub saying it could not confirm a license.</summary>It does not mean public domain. Open LICENSE.txt. python-oracledb shows NOASSERTION because it is dual licensed.</details>

Plain form first. Inline [S60] in text means sqlglot repo and docs. Full form means Org, Title, version or date, URL, accessed 2026-09-22. Same pattern for all 75 sources.

Classes tell weight. A1 means Oracle versioned docs with E-numbers or G-numbers. Example: S01 Tuning Guide 19c, S06 DBMS_SQLPA. A2 means Oracle briefs and whitepapers. Example: S08 stats brief 19c, S12 SPM brief.

B1 means peer paper or preprint. Example: S49 SQLSolver SIGMOD 2024, S50 VeriEQL OOPSLA 2024, S53 Bao SIGMOD 2021. B2 means third-party repro report. Example: S48 WeTune plus SIGMOD repro report.

C1 means deterministic tool docs. C2 means maintained repo. Example: S60 sqlglot MIT 9,628 stars 2026-09-21. S61 SQLFluff MIT 9,883 stars 2026-09-21. S62 Calcite Apache-2.0 5,186 stars 2026-09-21. S63 utPLSQL Apache-2.0 624 stars, needs 19c or newer. S64 python-oracledb dual UPL-1.0 OR Apache-2.0, 452 stars. S67 SQLd360 65 stars plus SQLdb360 123 stars, both no license declared.

D means blog or forum. Use for background only. Never as sole proof for behavior.

Rejected as evidence: doc mirrors of unknown date, vendor tutorials as sole proof, YouTube or SlideShare, unofficial adaptive-optimization page, LLM summary sites. Original paper or Oracle page wins each time.

A junior once cited a mirror with no version. Link worked. Facts were five years old. The S-system would have flagged it: no A1 ID, no date, class D at best.

**Keep this: Match each fact to its S-number, class, and date before you reuse it.**
