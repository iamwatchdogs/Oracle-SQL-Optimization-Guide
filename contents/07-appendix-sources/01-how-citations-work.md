---
title: How Citations Work in This Book
description: Read S-numbers, classes, and links without getting lost.
order: 71
draft: false
---

A junior cited a mirror with no version. Link worked. Facts were five years old. Review flagged it in seconds because the cite had no S-number, no class, no date. The fix took one minute: swap the mirror for S01 Tuning Guide 19c.

You start with copy-paste habits. You grab a sentence from a blog. You keep the link. You lose the version. This page gives you a cite pattern that keeps version attached.

Store receipts that show short code in hand plus full slip in file are more like S-numbers, where inline ID points to full row.

## 1. Short inline, full in file 07

Plain claim: S## in text points to a full row with author, title, version, link.

Worked example: do an S-number lookup demo. First S60. Inline you write S60 after a sqlglot claim. Full row gives repo plus MIT docs plus dialect docs plus GitHub API 2026-09-22 with MIT 9,628 stars push 2026-09-21 Active. Second S61. Inline after a lint claim. Full row gives docs v4.3.0 plus Oracle dialect reference plus GitHub API 2026-09-22 with MIT 9,883 stars push 2026-09-21 Active. Third S64. Inline after a harness claim. Full row gives LICENSE.txt with UPL-1.0 OR Apache-2.0 plus driver docs plus GitHub API 2026-09-22 with 452 stars push 2026-09-19 Active and NOASSERTION explained as dual license. First pass you match each fact to its S-number. Second pass you open the row before you reuse the fact.

Why it matters: short keeps reading fast. Full keeps audit fast. No ID means no trust.

Sourced number: S60 sqlglot MIT 9,628 push 2026-09-21. S61 SQLFluff MIT 9,883 push 2026-09-21. S62 Calcite Apache-2.0 5,186 push 2026-09-21. S63 utPLSQL Apache-2.0 624 push 2026-09-18 needs 19c or newer. S64 python-oracledb 452 push 2026-09-19.

## 2. Mirror versus A1, weight decides

Plain claim: class D never beats class A1 for behavior claims.

Worked example: run a mirror versus A1 demo. First the mirror. Third-party copy of Oracle docs, unknown vintage, no E-number, no version header. Class D at best. Rejected as evidence. Used only to locate the official page. Then S01. Oracle Database SQL Tuning Guide 19c E96095-19 Apr 2025, class A1, TOC read firsthand, chapters 1 to 30 citable. S01 wins. Then S06 DBMS_SQLPA read firsthand with task calls and comparison_metric default elapsed_time, class A1, wins over any blog summary of SPA. First pass you check class letter. Second pass you check version string. No version means no cite for behavior.

Why it matters: mirrors rot silently. A1 pages carry E-numbers and dates you can pin. Review can verify in one click.

Sourced number: 30+ A1 entries, 6 A2, 16 B1, 1 B2, 16 C, 8 D, total 75. S01 19c E96095-19 Apr 2025. S02 26ai Jan 2026. S08 stats brief 19c A2. S12 SPM brief A2.

## 3. C and B classes prove code and design, D only adds color

Plain claim: C proves runnable code, B proves peer design, D proves nothing alone.

Worked example: sort four sources by weight. First S65 HammerDB GPL-3.0 786 stars push 2026-09-18 Active, class C2. Runnable load tool. Second S66 Swingbench 80 stars push 2026-05-26 Active license null, class C2. Runnable Oracle load tool with rights check. Third S49 SQLSolver Apache-2.0 70 stars push 2025-11-22 Low activity, class B1 plus C2. Peer paper plus code, candidate gate only. Fourth a vendor tutorial on SPM. Class D. Background only, never sole proof. First pass you tag each source with class. Second pass you drop D from the proof chain and keep it as walkthrough.

Why it matters: proof chains stay short and checkable. Color stays out of the verdict. Future readers can re-run the same sort.

Sourced number: HammerDB GPL-3.0 786 push 2026-09-18 Active. Swingbench 80 push 2026-05-26 Active license null. SQLSolver Apache-2.0 70 push 2025-11-22 Low. VeriEQL 27 push 2026-03-26 Low no license declared, see S50. Bao AGPL-3.0 223 Dormant, see S53.

<details><summary>In case you don't know about DOI links, it's the permanent ID for a paper that outlives blog URLs.</summary>Example: 10.1145 slash 3514221.3526125 for WeTune. Paste it and you land on the publisher page. S48 pairs that paper with a third-party repro report, class B2.</details>

<details><summary>In case you don't know about NOASSERTION, it's GitHub saying it could not confirm a license.</summary>It does not mean public domain. Open LICENSE.txt. python-oracledb shows NOASSERTION because it is dual licensed UPL-1.0 OR Apache-2.0.</details>

**Keep this: Match each fact to its S-number, class, and date before you reuse it.**
