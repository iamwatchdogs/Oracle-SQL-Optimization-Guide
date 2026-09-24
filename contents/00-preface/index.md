---
title: Preface - Trust Runs, Not Rumors
description: How this book grades evidence and turns documented techniques into reproducible tests.
order: 1
draft: false
---

A query can be fast in one environment and slow in another. The difference is usually not magic. It is a different estimate, access path, workload, or release behavior.

This preface gives you two rules:

1. Grade the claim before you spend database time on it.
2. Run a reproducible check before you call it a win.

The rules sound obvious. Most broken tuning processes skip them anyway.

## Evidence is a filter, not a compliment

A source grade tells you what kind of support a claim has. It does not turn a blog post into a benchmark.

| Grade  | Meaning                                                     | How to use it                                                                      |
| ------ | ----------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| **A1** | Oracle versioned product documentation                      | Primary behavior and release scope                                                 |
| **A2** | Oracle technical brief or whitepaper                        | Vendor explanation and guidance                                                    |
| **B1** | Paper or preprint                                           | Evidence for the mechanism or system studied; state whether the venue is confirmed |
| **B2** | Reproducibility report or artifact                          | Independent support, not automatic Oracle proof                                    |
| **C1** | Deterministic tool with documented output                   | Evidence about what ran, not proof of a universal speedup                          |
| **C2** | Maintained open-source project with a verifiable repository | Supporting implementation or test harness                                          |
| **D**  | Blog, forum, or secondary commentary                        | Context and leads only                                                             |

A claim supported by D can point you toward A1. It cannot carry the claim by itself.

## The catalog bar is about evidence and procedure

The research uses this definition:

> **PROVEN** means a technique has documented authoritative evidence or at least two independent verified sources, **and** a deterministic, reproducible verification procedure is stated.

That is the whole bar. It is not a claim that the technique ran in this research pass. A procedure is a set of steps someone with a live Oracle database can execute. A result is the measurements that come back afterward. Do not write one in place of the other.

The catalog has 68 entries: 67 meet that PROVEN bar. T-08, the SQLd360/SQLdb360 community diagnostic collector, is **CONDITIONAL**. It can produce a useful evidence bundle, but its bundle still needs cross-checking against Oracle's own `DBMS_XPLAN` and SQL Monitoring output.

## The proof loop

A fair check has six decisions:

1. **Freeze the workload.** Put the representative SQL and binds in a SQL Tuning Set. [S18](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/managing-sql-tuning-sets.html)
2. **Measure the incumbent.** Run the workload before changing anything. Save elapsed time, `buffer_gets`, and the executed plan.
3. **Measure the noise.** Repeat the unchanged workload. The spread tells you how large a difference must be before it means something. Repetition and variability are the point. [S58](https://spcl.inf.ethz.ch/Publications/.pdf/hoefler-scientific-benchmarking_slides.pdf)
4. **Change one thing.** One statistics preference, one index, one rewrite, one plan control.
5. **Run the same workload again.** Use `DBMS_SQLPA` to compare before and after. [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html)
6. **Decide and file the evidence.** Keep the plan pair, metric summary, source IDs, and rollback command. If the evidence fails, roll back and record why.

A fast first run is a lead. A repeatable improvement is a decision.

## The tools have different jobs

Do not ask AWR to answer a single-statement question, and do not ask an index suggestion to prove correctness.

- AWR frames a workload window.
- ASH samples active sessions and events.
- SQL Monitor and `DBMS_XPLAN` show execution-level plan evidence.
- SQL Trace and TKPROF split parse, execute, fetch, and wait behavior.
- A SQL Tuning Set makes a before/after workload repeatable.
- SQL Performance Analyzer compares the two runs.

The tooling ledger counts **18 Oracle built-in tool rows, 3 client rows, and 12 external rows**: **33 tool entries**. SQL Quarantine is a separate guardrail row, so the rendered inventory has **34 displayed rows**. External tools can be useful candidates without becoming Oracle-proven fixes.

<details><summary>If you are new to plans and workload history</summary>

An execution plan is Oracle's chosen operation sequence for a statement. AWR stores timed workload history. ASH samples active sessions. Together they help you move from “the app feels slow” to “this SQL ID consumed this wait in this window.” The next step is a statement-level plan and a controlled comparison, not a blind index. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/generating-and-displaying-execution-plans.html) [S03](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgdba/)
</details>

No live Oracle database was available for the research pass. `sqlcl` and `sqlplus` were not on `PATH`. The examples here are procedures and illustrations, not executed results.

In this chapter:

- [Why Evidence Grades Decide What You Trust](/00-preface/01-why-evidence-grades/)
- [How to Prove a Win](/00-preface/02-how-to-prove-a-win/)

Source IDs and technique IDs resolve in `.agents/research/07-sources-bibliography.md` and `.agents/research/01-proven-techniques-catalog.md`.

**Decision: a claim without a source is a hypothesis; a claim without a reproducible procedure is not ready to ship.**
