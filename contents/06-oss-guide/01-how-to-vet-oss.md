---
title: How to Vet Any OSS Repo in 2 Minutes
description: License, push date, archived flag, and Oracle fit before you trust a tool.
order: 61
draft: false
---

A junior joined a tuning thread with a link to a 1,233-star repo. Install failed on new Python. Issues had sat open for years. The API flag had said Archived all along. Push date was 2020-11-13. Two hours gone. One date check would have saved the thread.

You start where he started. You sort by stars. You assume stars mean care. Stars mean attention. License plus push date mean risk. This page gives you a 2-minute vet that puts risk first.

A used-car check is more like papers plus mileage plus rust before price, and stars are price.

## 1. Papers first, mileage second, stars last

Plain claim: license decides if you can use it, push date decides if it still lives.

Worked example: vet sqlglot, SQLFluff, and Calcite in under a minute. First sqlglot. License MIT. Stars 9,628. Push 2026-09-21. Status Active. See S60. Second SQLFluff. License MIT. Stars 9,883. Push 2026-09-21. Status Active. Oracle dialect documented. See S61. Third Apache Calcite. License Apache-2.0. Stars 5,186. Push 2026-09-21. Status Active. OracleSqlDialect shipped. See S62. First pass you confirm SPDX ID in the API. Second pass you confirm push within 6 months for Active. Third pass you confirm Oracle fit. All three pass.

Why it matters: papers protect you at ship time. Mileage protects you at debug time. Stars never protect you.

Sourced number: sqlglot MIT 9,628 push 2026-09-21 Active. SQLFluff MIT 9,883 push 2026-09-21 Active. Calcite Apache-2.0 5,186 push 2026-09-21 Active. Rules: Active means push within 6 months, Low activity means within 24 months, Dormant means over 24 months, Archived means read-only. Checked 2026-09-22.

## 2. Rust means archived or dormant, walk away from runnable use

Plain claim: old push or Archived flag turns a tool into reading material, not install material.

Worked example: vet OtterTune, SQLd360, and Bao side by side. First OtterTune. 1,233 stars. Push 2020-11-13. Archived read-only. No license declared. See S54. Design notes only. Second SQLd360. 65 stars. Push 2018-01-14. Dormant. No license declared. Prefer successor SQLdb360 with 123 stars, push 2024-12-03, Low activity. See S67. Third Bao for PostgreSQL. AGPL-3.0. 223 stars. Push 2024-09-17. Dormant. Postgres only. See S53. First pass you spot the Archived flag. Second pass you spot Dormant past 24 months. You keep them as papers, you do not pip-install them for Oracle work.

Why it matters: dormant code still runs until it breaks on your version. Then you own the fork. Better to know before you depend on it.

Sourced number: OtterTune 1,233 Archived 2020-11-13. SQLd360 65 Dormant 2018-01-14. SQLdb360 123 Low 2024-12-03. Bao AGPL-3.0 223 Dormant 2024-09-17. VeriEQL 27 stars push 2026-03-26 Low activity no license declared, see S50. SQLSolver Apache-2.0 70 stars push 2025-11-22 Low activity, see S49.

## 3. Oracle fit is a separate gate, not a bonus

Plain claim: without an explicit Oracle promise, general SQL support does not count.

Worked example: vet utPLSQL, python-oracledb, and Swingbench for fit. First utPLSQL. Apache-2.0. 624 stars. Push 2026-09-18. Active. README needs Oracle Database 19c or newer. See S63. Pass. Second python-oracledb. 452 stars. Push 2026-09-19. Active. License UPL-1.0 OR Apache-2.0 in LICENSE.txt, API shows NOASSERTION because the license is dual. See S64. Official Oracle driver. Pass. Third Swingbench. 80 stars. Push 2026-05-26. Active. License null. Oracle load generator by a former Oracle engineer. See S66. Use for load, but ask about rights before you ship it. First pass you check the dialect or driver line. Second pass you check the version floor. A tool can be Active and still miss Oracle.

Why it matters: parsers without Oracle dialect misread hints and date math. Test frames without 19c support fail on your DB. Load tools without rights clearance stall release.

Sourced number: utPLSQL Apache-2.0 624 push 2026-09-18 Active needs 19c or newer. python-oracledb UPL-1.0 OR Apache-2.0 452 push 2026-09-19 Active. Swingbench 80 push 2026-05-26 Active license null. HammerDB GPL-3.0 786 push 2026-09-18 Active, see S65, for contrast with clear share-alike terms.

<details><summary>In case you don't know about archived repos, it's GitHub read-only mode where code stays but no new commits land.</summary>Stars freeze as history. Issues stay open. Fork if you must change it, and own the fork. OtterTune is the example here: 1,233 stars, push 2020-11-13, Archived.</details>

<details><summary>In case you don't know about NOASSERTION, it's GitHub saying it could not confirm a license from the API.</summary>It does not mean public domain. Open LICENSE.txt. python-oracledb shows NOASSERTION because it carries two licenses. SQLd360 and SQLdb360 show NOASSERTION with no license file to back it.</details>

**Keep this: License first, push date second, Oracle dialect third, stars last.**
