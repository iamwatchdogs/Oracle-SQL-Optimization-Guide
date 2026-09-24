---
title: Load Test Without Prod
description: Prove a change holds under parallel work before prod sees it.
order: 33
draft: false
---

Picture a fix that wins solo at midnight and locks 30 sessions at 10 a.m.

Solo speed is not safety. Parallel work is the test.

You can run SELECT. You have seen a query pass alone and watch it fail in the rush. This page proves a change holds when users pile on.

Load testing is like a fire drill, except you run fake users against a copy so real users never feel the fault.

<details><summary>In case you don't know about HammerDB, it's a free load runner with TPROC-C and TPROC-H style work for Oracle and other systems.</summary>HammerDB is an open-source database benchmark for load proof. It runs TPROC-C and TPROC-H style work for Oracle and more. Install via .deb, .rpm, or tar.gz per docs, then check libs with `./hammerdbcli` plus `librarycheck`, which needs the Oracle client `libclntsh.so` or `OCI.DLL`. Teams use it on a test copy after a rewrite passes unit tests. They run the same Tcl script before and after with the same users and time. It drives one decision: reject on mix regress or move to guardrails. Solo timing hides locks, and that hide costs a 10 a.m. stall. Sharp line: HammerDB proves concurrency, never logic. Example: build a TPROC-C schema, ramp users, hold peak, and compare throughput and waits, keeping medians. Unverified — check the repo docs for script paths. See https://www.hammerdb.com/ GPL-3.0, 786 stars, push 2026-09-18, hosted by the TPC Council [S65].</details>

## 1. One loader, one realistic mix

Plain claim: test the mix prod runs, not one hero query.

Worked example A — HammerDB guardrail run. Build a TPROC-C style schema on a test copy with fresh stats. Write one Tcl script that ramps users, holds peak, then cools down. Run it from hammerdbcli before your change. Save throughput, error count, and top waits. Apply your index or rewrite. Run the same script again with the same user counts and same length.

How to read it: same script twice gives two numbers you can trust. Throughput up with errors flat is good. Throughput up with lock waits up is not good. One run is noise — run twice per side and keep medians.

Worked example B — Swingbench check for Oracle mixes. Swingbench ships Order Entry plus SH plus Call-Circle style mixes, with charbench for headless runs, oewizard for data gen, plus a Docker image. 80 stars, last push 2026-05-26, no license declared in the repo. Vendor page calls it a free load generator. Check rights before you ship it in CI. Pick one mix that looks like your app. Run it the same way: before change, after change, same users, same time. Unverified — test on your schema for exact Docker tags and data sizes.

Decision it drives: faster solo plus slower mix means reject. Faster on both means move to guardrails.

## 2. Guardrails first, repro without prod

Plain claim: caps stop the bleed. A packaged case lets you repro without prod data.

Worked example C — set caps before the load run. Use DBMS_RESOURCE_MANAGER to cap runaway work by CPU or calls or elapsed time. Use SQL Quarantine to block a known-bad plan from running again. Both write proof: V$RSRC views show terminations and throttles, quarantine views show blocks. If your after-change run trips quarantine, the plan is bad even if one timing looked good.

How to read guardrail output: zero quarantine hits plus zero Resource Manager kills means the mix stayed inside bounds. One quarantine hit means that SQL ID plus plan hash is now blocked — read which line tripped it and why. Caps that fire on the before run too mean your caps are too tight, not that your change failed.

Worked example D — pack the failure for isolation. SQL Test Case Builder via DBMS_SQLDIAG packages DDL, stats, plan, and data samples into a test case. That bundle moves to an isolated DB. You repro the bad plan there, not on prod. Docs: Performance Tuning Guide ch.22 plus DBMS_SQLDIAG ref (https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLDIAG.html). Exact export paths vary by release. Unverified — test on your schema for your directory objects.

One aside: midnight wins love morning locks. Back to the mix.

Decision it drives: quarantine hit means fix the plan or drop the change. Clean run plus clean repro case means you can defend the change in review.

## 3. Close the loop on revert

Plain claim: every change needs a one-command way back.

Worked example E — stats restore check. Before you gather new stats on test, export or keep history via DBMS_STATS. After the load run, restore, then confirm plan hash returns to the before value with DISPLAY_CURSOR. If the hash does not return, your revert missed a patch, profile, or baseline.

Worked example F — patch and baseline drop check. If you used a SQL patch (DBMS_SQLDIAG) or a profile or a baseline (DBMS_SPM), drop or disable that one object, then rerun the hero query plus the mix sampler. Same hash as before means the revert worked. New hash means something else still pins the plan — check fixed plans and evolve reports.

How to read it: plan hash is the revert receipt. A-Rows vs E-Rows confirms the estimate path is back. Load errors at zero confirms users see no scar.

Decision it drives: hash back plus mix clean means the revert is safe to document. Hash stuck means keep digging before you call it reverted.

<details><summary>In case you don't know about SQL Quarantine, it's Oracle's block that stops a known-bad plan from running again.</summary>SQL quarantine blocks a plan that exceeded resource limits from running again. Resource Manager kills the runaway per plan directives, and quarantine records it. You check `DBA_SQL_QUARANTINE` after promote and treat any event as a hard fail. Unverified — run on your test DB. SRE and loop owners use it as the guardrail after each promote. It drives one decision: roll back now and blacklist this shape. Do not rely on app timeouts alone. Timeouts hide the plan and let it retry, and the cost is repeated blowups under traffic. Sharp line: it remembers the bad plan so the DB refuses to repeat it. Example: a new plan runs 40x over limit, Resource Manager kills it, quarantine logs the SQL ID, the loop halts, and the old baseline returns. See [T-64] https://oracle-base.com/articles/19c/sql-quarantine-19c</details>

**Keep this: Pass a parallel run with zero quarantine hits before you call it safe.**
