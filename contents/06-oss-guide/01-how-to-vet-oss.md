---
title: How to Vet Any OSS Repo in 2 Minutes
description: License, push date, archived flag, and Oracle fit before you trust a tool.
order: 61
draft: false
---

Any OSS repo passes or fails in 2 minutes. Check four fields, then decide.

"'is 9,883 stars enough to trust it?'"

Short answer: no. Stars measure attention. License plus push date measure risk.

Think of vetting like buying a used car: papers, mileage, rust.

<details><summary>In case you don't know about archived repos, it's GitHub read-only mode where code stays but no new commits land.</summary>Stars freeze as history. Issues stay open. Fork if you must change it, and own the fork.</details>

Papers means license. GitHub reports an SPDX ID. MIT and Apache-2.0 allow broad reuse. GPL-3.0 and AGPL-3.0 add share-alike duties. UPL-1.0 OR Apache-2.0 means dual choice. NOASSERTION or null means none declared. Never guess. Open LICENSE.txt.

Mileage means last push and stars on 2026-09-22. Active means push within 6 months. Low activity means within 24 months. Dormant means over 24 months. Archived means read-only, even with high stars.

Examples from this pass. sqlglot: MIT, 9,628 stars, 2026-09-21, Active. SQLFluff: MIT, 9,883 stars, 2026-09-21, Active. Apache Calcite: Apache-2.0, 5,186 stars, 2026-09-21, Active. utPLSQL: Apache-2.0, 624 stars, 2026-09-18, Active. python-oracledb: UPL-1.0 OR Apache-2.0, 452 stars, 2026-09-19, Active. HammerDB: GPL-3.0, 786 stars, 2026-09-18, Active.

Rust means archived or dormant. OtterTune: 1,233 stars, 2020-11-13, Archived. Use for design notes only. SQLd360: 65 stars, 2018-01-14, Dormant. Prefer SQLdb360: 123 stars, 2024-12-03, Low activity. Bao for PostgreSQL: AGPL-3.0, 223 stars, 2024-09-17, Dormant. VeriEQL: 27 stars, 2026-03-26, Low activity, no license declared. SQLSolver: Apache-2.0, 70 stars, 2025-11-22, Low activity.

Last check means Oracle fit. sqlglot lists Oracle among 30+ dialects. SQLFluff lists an Oracle dialect. Calcite ships OracleSqlDialect. utPLSQL README requires Oracle Database 19c or newer. Swingbench: 80 stars, 2026-05-26, Active, but license null. Ask about rights before you ship it.

A team I saw pinned the 2018 SQLd360 bundle and skipped the vet. It ran. No fixes had landed since 2018-01-14. They debugged old Python for a day, then added SQLdb360 next to it.

**Keep this: License first, push date second, Oracle dialect third, stars last.**
