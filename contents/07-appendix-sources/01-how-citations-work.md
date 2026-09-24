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

Sourced number: S60 sqlglot MIT 9,628 push 2026-09-21. S61 SQLFluff MIT 9,883 push 2026-09-21. S62 Calcite Apache-2.0 5,186 push 2026-09-21. S63 utPLSQL Apache-2.0 624 push 2026-09-18 (latest README names 19c+, older runs went back to 11gR2). S64 python-oracledb 452 push 2026-09-19.

## 2. Mirror versus A1, weight decides

Plain claim: class D never beats class A1 for behavior claims.

Worked example: run a mirror versus A1 demo. First the mirror. Third-party copy of Oracle docs, unknown vintage, no E-number, no version header. Class D at best. Rejected as evidence. Used only to locate the official page. Then S01. Oracle Database SQL Tuning Guide 19c E96095-19 Apr 2025, class A1, TOC read firsthand, chapters 1 to 30 citable. S01 wins. Then S06 DBMS_SQLPA read firsthand with task calls and comparison_metric default elapsed_time, class A1, wins over any blog summary of SPA. First pass you check class letter. Second pass you check version string. No version means no cite for behavior.

Why it matters: mirrors rot silently. A1 pages carry E-numbers and dates you can pin. Review can verify in one click.

Sourced number: 30+ A1 entries, 6 A2, 19 B1, 1 B2, 16 C, 8 D, total 80. S01 19c E96095-19 Apr 2025. S02 26ai Jan 2026. S08 stats brief 19c A2. S12 SPM brief A2.

## 3. T-number to chapter map — no hunting in research folders

Plain claim: every T-ID lives in this book. No need to open `.agents/`.

Worked example: T-01 AWR and T-02 ASH and T-57 ADDM live in `01-measure-first`. T-03 Monitor and T-04 XPLAN live in `03-toolbox/01`. T-06 STS plus T-56 SPA live in `03-toolbox/02` and `04-recipes/01-02`. T-05 Trace lives in `03-toolbox/01` section 3. T-07 Test Case Builder plus T-64 Quarantine and Resource Manager kill (part of T-64, S39) live in `03-toolbox/03`. T-08 SQLdb360 lives in `01-measure-first` section 3 — CONDITIONAL, cross-check it. T-09 to T-23 stats live in `04-recipes/03`. T-24 to T-33 plus T-67 compression plus T-68 parallel live in `01-indexes-and-layout`. T-34 to T-44 rewrites live in `01-let-oracle-rewrite` (T-39 Join factorization lives here, not in guardrails). T-45 hints to T-53 outlines live in `01-stabilize-and-ship`. T-54 Tuning Advisor to T-55 ADG live in `05-feedback-loop/01`. T-58 method to T-61 Transpiler live in preface plus `04-safe-ddl`. T-62 redefine to T-66 Repair live in `04-safe-ddl` plus `05-feedback-loop/03`. T-42 is a footnote to T-41, not a fix you apply. Full T text stays in research file 01. This map is the bridge.

## 4. C and B classes prove code and design, D only adds color

Plain claim: C proves runnable code, B proves peer design, D proves nothing alone.

Worked example: sort four sources by weight. First S65 HammerDB GPL-3.0 786 stars push 2026-09-18 Active, class C2. Runnable load tool. Second S66 Swingbench 80 stars push 2026-05-26 Active license null, class C2. Runnable Oracle load tool with rights check. Third S49 SQLSolver Apache-2.0 70 stars push 2025-11-22 Low activity, class B1 plus C2. Peer paper plus code, candidate gate only. Fourth a vendor tutorial on SPM. Class D. Background only, never sole proof. First pass you tag each source with class. Second pass you drop D from the proof chain and keep it as walkthrough.

Why it matters: proof chains stay short and checkable. Color stays out of the verdict. Future readers can re-run the same sort.

Sourced number: HammerDB GPL-3.0 786 push 2026-09-18 Active. Swingbench 80 push 2026-05-26 Active license null. SQLSolver Apache-2.0 70 push 2025-11-22 Low. VeriEQL 27 push 2026-03-26 Low no license declared, see S50. Bao AGPL-3.0 223 Dormant, see S53.

<details><summary>In case you don't know about DOI links, it's the permanent ID for a paper that outlives blog URLs.</summary>A DOI link is a permanent ID that outlives blog URLs. It points to the publisher page for a paper. Use it in two steps: copy the DOI such as 10.1145/3514221.3526125 for WeTune P4, then paste at doi.org to land on the full record. Authors need it for audit. Readers need it to check venue fast. It drives one decision: which exact paper version backs this claim. Do not swap in a blog rewrite. Blogs rot, change URLs, strip methods, and cost dead links plus lost proof. Sharp line: DOI pins the paper, blog pins traffic. Example: S48 pairs the WeTune DOI with a third-party repro report B2. See https://doi.org/10.1145/3514221.3526125 [S48][P4].</details>

<details><summary>In case you don't know about NOASSERTION, it's GitHub saying it could not confirm a license.</summary>NOASSERTION means GitHub could not confirm a license from the API. It does not mean public domain. Setup is manual: open LICENSE.txt in the repo root and read the header. python-oracledb shows NOASSERTION because it is dual licensed UPL-1.0 OR Apache-2.0. Teams use this check during the two-minute vet. It drives one decision: treat as rights-unclear until you read the file. Assuming free use costs legal rework, while reading costs a minute. Sharp line: NOASSERTION forces you to read, never to assume. Example: python-oracledb passes after file read, while SQLd360 and SQLdb360 show NOASSERTION with no license file to back it. Unverified — check the repos for current LICENSE.txt. See [S64][S67].</details>

**Keep this: Match each fact to its S-number, class, and date before you reuse it.**
