---
title: Toolbox - Match the Claim to the Tool
description: 'The claim-to-tool map: which instrument proves a plan change, a speedup, semantic safety, load safety, or a revert.'
order: 30
draft: false
---

The tool is chosen by the claim you must prove, never by habit or familiarity. A plan-hash change is a change, not a win. A clean lint result is a selected ruleset that passed, not proof that the SQL is correct. A lower wall-clock number settles nothing until the input and the comparison are identical on both sides.

This chapter keeps the toolchain small and the mapping explicit. Write the sentence you must defend, find the row that proves or rejects it, then take the runbook that produces the evidence. The child pages carry the runbooks; this page is the map.

> **Track:** Core (The claim comes first, Three kinds of tool, three different jobs, Route the question before the tool, Claim to tool, Child pages) · Practice (none) · Recovery (none) · Advanced / gated (Where the map is gated)
>
> **Prerequisites:** Basic SQL and the [environment and setup hub](/00-preface/).
>
> **Evidence status:** Every tool row cites this guide's source ledger: A1 Oracle versioned documentation, A2 Oracle technical briefs, B1 papers, C1/C2 tool documentation and repositories, and D secondary commentary, each carried as an S-ID. **No live Oracle database was available for this page**, so nothing here is a measurement; the rows name instruments and the evidence they produce, never results. The commercial rows are catalogued, not endorsed: a vendor document records what a product claims to do, which is not the same as a result on your database. One record carries an explicit exception rather than a clean class: [S93] is a pre-12c Statspack page retained as a flagged mechanism reference. [S87] is a reviewed third-party script whose Apache-2.0 licence was read from the file after the repository's API field returned `NOASSERTION`.
>
> **Next required page:** [Measure With XPLAN and Monitor](/03-toolbox/01-measure-with-xplan-and-monitor/).

## How this page is banded

| Band                 | Sections                                                                                                                             |
| -------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Core**             | The claim comes first · Three kinds of tool, three different jobs · Route the question before the tool · Claim to tool · Child pages |
| **Practice**         | none                                                                                                                                 |
| **Recovery**         | none                                                                                                                                 |
| **Advanced / gated** | Where the map is gated                                                                                                               |

- **Core (The claim comes first, Three kinds of tool, three different jobs, Route the question before the tool, Claim to tool, Child pages):** read once before you open a tool. These sections are navigation; none of them touches a database.
- **Practice (none):** an index page is not a ticket. Practice starts on the four runbooks named under Child pages.
- **Recovery (none):** nothing here undoes a change. The last row of the map points at the tools that perform a revert.
- **Advanced / gated (Where the map is gated):** read before you use a row that names an Oracle diagnostic, tuning, or guardrail feature, because several rows carry entitlement and license checks.

## The claim comes first

Write the claim as one falsifiable sentence with a metric, a workload, and a window. "This report is faster" is not a claim. "The frozen report workload lost logical reads while returning the same rows" is one, and it tells you which row of the map you need.

The minimum-evidence column is the floor. Below it you have a lead. At it you have something a reviewer can repeat.

## Three kinds of tool, three different jobs

Every tool in this chapter belongs to one of three classes, and the classes are not interchangeable. Mixing them is how a team buys an observability platform and still cannot answer "is this rewrite faster".

| Class               | What it does                                                                 | What it cannot do                               | Example                                                                    |
| ------------------- | ---------------------------------------------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------- |
| **Monitoring**      | Finds the expensive SQL and names the wait class and the calling application | Prove a rewrite is equivalent, or pick an index | AWR, ASH, ADDM [S03]; Statspack [S93]; a commercial observability platform |
| **Rewrite engines** | Generates alternative SQL, hints, and indexes, then executes and ranks them  | Tell you the generated SQL means the same thing | Quest SQL Optimizer [S84]; IDERA DB Optimizer; SQL Tuning Advisor [S17]    |
| **Validation**      | Runs both sides on the same input and accepts or rejects the difference      | Invent a candidate in the first place           | SPA [S06]; Database Replay [S13]; your own harness [S58]                   |

The rule that follows from the table is the one worth remembering: a monitoring product's finding is a lead, a rewrite engine's output is a hypothesis, and only a validation run produces a verdict. Buying tier one does not remove the need for tier three, and a fast tier-two answer is still tier-two output.

## Route the question before the tool

Five questions, and more tools than questions. Name the question first, because the same tool answers some of them badly and one of them badly enough to mislead you.

| Question                            | What the evidence has to be                                             | Reach for                                                                           |
| ----------------------------------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| What might Oracle do?               | Estimated join order, access paths, predicates, pruning, cost           | `EXPLAIN PLAN` + `DBMS_XPLAN.DISPLAY` [S25] [S05]                                   |
| What did Oracle actually do?        | The exact child cursor, actual row counts, buffers, reads, elapsed time | `DISPLAY_CURSOR` [S05]; SQL Monitor where licensed                                  |
| Why was the execution slow?         | CPU and wait decomposition, calls, fetches, round trips, contention     | SQL Trace + TKPROF [S33] [S81]; Method R when TKPROF is too coarse [S85]; ASH [S03] |
| Is a proposed change better?        | Repeatable before/after runs over representative binds and workload     | SPA [S06] for SQL; Database Replay [S13] for concurrency                            |
| How is the improvement kept stable? | Accepted, verified execution plans                                      | SQL Plan Management [S07] [S21]                                                     |

`EXPLAIN PLAN` answers the first question only, and Oracle documents that an explained plan can differ from the real one because of schema, statistics, bind values, initialization parameters, and the execution environment [S83]. That is not a bug in your setup. It is the difference between an estimate and a measurement.

## Claim to tool

| Claim                                                   | Minimum evidence                                                                                              | Tool + S-ID                                                                        |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| This plan changed                                       | The two `DISPLAY_CURSOR` plans themselves, diffed line by line, plus the row-source statistics on both sides  | DBMS_XPLAN [S05]                                                                   |
| This statement is faster                                | Same statement, same binds and workload, before and after test-execute, repeated runs, medians and CI         | DBMS_SQLPA [S06] + repetition policy [S58]                                         |
| This workload got faster                                | Same STS, AWR deltas over comparable windows                                                                  | STS [S18] + AWR/ASH [S03]; Statspack [S93] on snapshots                            |
| The estimate was wrong for this line                    | `E-Rows` vs `A-Rows` per line                                                                                 | SQL Monitor / `DISPLAY_CURSOR ALLSTATS LAST` [S01] [S05]                           |
| The change is semantically safe                         | Regression tests on the SQL's results; logical equivalence check where feasible                               | utPLSQL [S63]; CANDIDATE provers [S48] [S49] [S50] [S51]                           |
| This estimate was wrong and I need to know why          | `E-Rows` vs `A-Rows` per line, plus when statistics last changed and what `REPORT_COL_USAGE` recorded         | `DISPLAY_CURSOR` + `GATHER_PLAN_STATISTICS` [S01] [S05] + DBMS_STATS [S82]         |
| I cannot think of a better way to write this            | Generated rewrite, hint, and index cases, each executed and ranked by measured statistics                     | A rewrite engine [S84]; Oracle SQL Tuning Advisor for optimizer-native cases [S17] |
| This service is expensive and I do not know which query | Wait-time and top-SQL history correlated to the calling application                                           | AWR/ASH/ADDM [S03], or Statspack [S93] on snapshots                                |
| The change is safe to keep under load                   | Same script both sides; throughput, errors, latency in the repetition policy; RM + quarantine events recorded | HammerDB/Swingbench [S65] [S66] + Resource Manager [S39] + Quarantine [S40]        |
| The regression is reverted                              | Restored stats, dropped patch, profile, or baseline; plan hash returns                                        | DBMS_STATS restore [S29] + DBMS_SQLDIAG [S43] + DBMS_SPM [S07]                     |

The rows separate three kinds of question: what one execution did, what a workload did, and what the SQL means. No timing answers the third kind. The last row is the undo path, and it is only usable if you recorded the change class before you applied anything.

Three readings keep the map honest. The plan row names the plan, not the hash: a `plan_hash_value` is a fingerprint, and two different plans can collide on it while a reworded identical plan will not. Diff the rows. The estimate row states what one line showed; correcting that estimate and re-measuring is a controlled trial, and it belongs to the faster-statement row. In the load row, Resource Manager and quarantine events are recorded whichever way they come out: a zero count is an observation, not proof that the run was safe. One signal is carried here instead of in the cell: the change-class rollback must be executed and verified before the run counts.

A tool earns its row by producing the artifact named in the middle column. If you cannot produce that artifact, the claim stays unproven no matter which tool you ran.

## Child pages

Each page decides one question, so jump to the row you are stuck on.

- [Measure With XPLAN and Monitor](/03-toolbox/01-measure-with-xplan-and-monitor/) decides **what Oracle actually executed**: the tagged cursor, the plan that ran, the line where the estimate broke, and how two saved plans compare.
- [Freeze Work With STS](/03-toolbox/02-freeze-work-with-sts/) decides **whether both sides saw the same workload**: the capture window, what the set really contains, and the named trials built from it.
- [Load Test Without Prod](/03-toolbox/03-load-test-without-prod/) decides **whether the change survives concurrency**: a realistic mix, guardrails armed before the run, and a rollback that has been executed.
- [Static Checks Before DB Time](/03-toolbox/04-static-checks-before-db-time/) decides **whether the candidate deserves database time at all**: parse, lint, assertions, and an ordered CI gate.

One ordering note. When you are holding new SQL text rather than an existing plan, start with that last page: its gate spends no database time, and the rest of this chapter only starts once the static gate has passed.

## Where the map is gated

Several rows carry an entitlement or license check before you use them, especially against production.

This book prints no pack table, and that is a decision rather than a gap. Oracle's feature documentation tells you what a feature does; it does not tell you what you must license, and the other public source is a tuning-pack datasheet old enough that the product line it describes has been repackaged several times since. Neither is license text [S90]. The entitlement depends on your release, your edition, and whether you are on-premises or on a cloud service.

So the rule is one sentence: **confirm the entitlement against the Oracle licensing guide for your exact release and deployment, and never repeat a pack requirement as a universal fact.**

What you can rely on without a license check is the ungated half of the map. `DBMS_XPLAN`, `EXPLAIN PLAN`, `DBMS_STATS`, SQL Plan Management, SQL Trace, and the core dynamic performance views are database features, not pack options. Snapper takes its deltas from core views [S87], and Statspack gives you interval history from snapshots [S93]. When the licensed reports are not available to you, that is the stack, and it is enough to run this book's whole method.

SQL Performance Analyzer and Database Replay both depend on the Real Application Testing option. Resource Manager and SQL Quarantine are configured features you confirm on the target.

The S-ID links source the feature documentation rather than the license text: [S03](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgdba/) for AWR and ASH, [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/) for SQL Monitor and tracing, [S06](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLPA.html) for the analyzer, [S18](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/managing-sql-tuning-sets.html) for tuning sets, and [S39](https://docs.oracle.com/en/database/oracle/oracle-database/19/admin/managing-resources-with-oracle-database-resource-manager.html) [S40](https://docs.oracle.com/en/database/oracle/oracle-database/19/arpls/DBMS_SQLQ.html) for the guardrails.

The load generators are external tools with their own terms: HammerDB is GPL-3.0 and hosted by the TPC Council [S65](https://www.hammerdb.com/), while the Swingbench repository declares no license [S66](https://github.com/domgiles/swingbench-public). Commercial instruments carry their own terms too, and a rewrite engine that executes generated SQL against your instance is a licensed tool whether or not the SQL is [S84]. Check release, edition, entitlement, and tool license before you plan a run.

## Artifact

A claim-to-tool record with four fields: the sentence you must prove, the minimum evidence that would prove or reject it, the tool and S-ID you will use, and the gate you must clear first. If the claim field is empty, you have picked a tool, not a question.

Behind it, the four pages produce their own artifacts: a saved executed plan and comparison from [Measure With XPLAN and Monitor](/03-toolbox/01-measure-with-xplan-and-monitor/), a frozen set with named trials from [Freeze Work With STS](/03-toolbox/02-freeze-work-with-sts/), a guarded load report with a tested rollback from [Load Test Without Prod](/03-toolbox/03-load-test-without-prod/), and a gate record from [Static Checks Before DB Time](/03-toolbox/04-static-checks-before-db-time/).

The rows above name instruments and the artifacts they produce; none of them is a result.

Source IDs and technique IDs resolve in [Appendix Sources](/07-appendix-sources/).

**Decision:** write the claim first, then take the row that can reject it. A tool you cannot put a claim against is a habit, not evidence.

**Next required page:** [Measure With XPLAN and Monitor](/03-toolbox/01-measure-with-xplan-and-monitor/).
