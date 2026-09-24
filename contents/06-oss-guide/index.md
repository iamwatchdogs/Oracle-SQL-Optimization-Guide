---
title: OSS Guide - What Open Source Can and Can't Do for Oracle SQL
description: Which OSS tools help Oracle SQL work, and where built-ins still rule.
order: 60
draft: false
---

Open source does not tune Oracle for you. It helps in three narrow lanes.

"'so which GitHub repo fixes my slow query?'"

Short answer: none of them. The fix lives inside Oracle. OSS only preps and checks your SQL before it reaches the DB.

Think of OSS here like a metal detector on a beach. It beeps on shapes. It does not dig.

<details><summary>In case you don't know about SPDX license IDs, it's the short code GitHub reports for a repo license.</summary>MIT means permissive reuse. Apache-2.0 means permissive reuse with patent grant. GPL-3.0 means share-alike. NOASSERTION means GitHub could not confirm a license. Read the LICENSE file yourself.</details>

Drop the picture now. Precise terms: parse, lint, test. Parse means read SQL text into structure. Lint means flag bad patterns in CI. Test means assert results did not change.

Every repo fact in this chapter was checked 2026-09-22 with the GitHub API. Fields checked: stars, last push, license, archived flag.

Rules used: Active means last push within 6 months. Low activity means within 24 months. Dormant means over 24 months. Archived means read-only.

Three numbers to anchor you. sqlglot: MIT, 9,628 stars, push 2026-09-21. SQLFluff: MIT, 9,883 stars, push 2026-09-21. Apache Calcite: Apache-2.0, 5,186 stars, push 2026-09-21.

Stars do not prove Oracle safety. License and push date prove maintenance. Oracle dialect support proves fit.

This guide has three parts. Part 01 shows the 2-minute vet. Part 02 shows the safe trio: sqlglot, SQLFluff, utPLSQL. Part 03 lists what has no OSS replacement and needs built-ins.

In this chapter:

- [How to Vet Any OSS Repo in 2 Minutes](/06-oss-guide/01-how-to-vet-oss/)
- [The Parse-Lint-Test Trio That Is Safe to Use](/06-oss-guide/02-parse-lint-test-trio/)
- [What Has No OSS Replacement](/06-oss-guide/03-what-has-no-oss-replacement/)

**Keep this: No license, no push, no Oracle dialect, no use.**
