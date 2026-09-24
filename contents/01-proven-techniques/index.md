---
title: Proven Techniques - What Actually Works
description: '68 catalog entries in 8 groups: 67 PROVEN plus T-08 CONDITIONAL, each with a verification path.'
order: 10
draft: false
---

The catalog is a map of causes, not a list of buttons to press in sequence.

It contains **68 entries**: **67 PROVEN** and **one CONDITIONAL**, T-08. PROVEN means the research found documented evidence and a reproducible verification procedure. It does not mean this pass executed 68 fixes on a live database.

A basic query gives you a useful starting point:

```sql
SELECT d.name, AVG(e.salary)
FROM employees e
JOIN departments d ON d.id = e.dept_id
GROUP BY d.name;
```

The same SQL can choose a different plan when the data volume, predicates, binds, or Oracle release changes. The next move is to identify the cause, not to decorate the query with every technique in this chapter.

## The eight groups

| Group                        |              Entries | Core question                                               |
| ---------------------------- | -------------------: | ----------------------------------------------------------- |
| Measurement and diagnosis    |            T-01–T-08 | Which SQL, wait, and plan line deserves attention?          |
| Optimizer statistics         |            T-09–T-23 | Are the optimizer's numbers representative?                 |
| Access structures and layout | T-24–T-33, T-67–T-68 | Can Oracle read less or use a cheaper physical path?        |
| Query transformations        |            T-34–T-44 | Can the optimizer use a better legal shape?                 |
| Plan and cursor controls     |            T-45–T-53 | Can a known-good choice survive changing data and sessions? |
| Advisors and measurement     |            T-54–T-57 | Can Oracle propose a candidate that the team verifies?      |
| Application and methodology  |            T-58–T-61 | Can the change be tested, reproduced, and deployed safely?  |
| Schema change and guardrails |            T-62–T-66 | Can a failed or runaway change be contained and reversed?   |

T-34–T-44 is **10 transformations plus the T-42 mechanism note**, not 11 standalone fixes. T-42 explains the cursor-duration temporary-table mechanism behind the temporary-table transformation; it is not a separate user-applied intervention.

## The sequence that keeps you honest

Work in this order unless evidence gives you a reason to move:

1. **Measure first.** Name the SQL ID, window, wait, and executed plan.
2. **Feed the optimizer better input.** Check statistics before adding a hint.
3. **Fix the physical work.** Test indexes, partitioning, materialized views, memory, compression, or parallelism against the read/write bill.
4. **Inspect optimizer rewrites.** Name the operation in the plan and check result semantics.
5. **Stabilize the decision.** Use advisors, baselines, profiles, patches, and guardrails only with a verification and rollback path.

The sequence is not a law. It is the shortest route to an attributable result. Adding a hint before understanding the estimate is just moving the failure somewhere less visible.

## Boundaries worth keeping

- An index is a read/write trade. More objects do not automatically mean less work.
- A materialized view trades freshness for precomputation.
- A profile or patch can help without changing SQL text, but it is not a permanent substitute for a root-cause fix.
- Automatic Indexing, In-Memory, Smart Scan, parallel execution, and guardrail features depend on release, edition, service entitlement, and workload. Check the current licensing and product documentation.
- A faster plan is not automatically a better application. Validate latency, throughput, correctness, and resource use.

<details><summary>What a plan baseline actually protects</summary>

A SQL Plan Baseline is a repository of known plans and their evidence. With a governed baseline, Oracle normally protects the accepted plan while a candidate is evaluated through the plan-management workflow. Do not turn that into an absolute rule that every unaccepted plan is impossible to evaluate: plan evolution and Real-Time SPM have their own candidate-evaluation behavior. [S12](https://www.oracle.com/technetwork/database/bi-datawarehousing/twp-sql-plan-mgmt-19c-5324207.pdf) [S21](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/overview-of-sql-plan-management.html)
</details>

No live Oracle database was available for the research pass. `sqlcl` and `sqlplus` were not on `PATH`. Every entry in this chapter remains a documented procedure until a reader runs it against a representative database.

In this chapter:

- [Measure First](/01-proven-techniques/01-measure-first/)
- [Stats Run the Show](/01-proven-techniques/02-stats-run-the-show/)
- [Indexes and Layout](/01-proven-techniques/03-indexes-and-layout/)
- [Let Oracle Rewrite](/01-proven-techniques/04-let-oracle-rewrite/)
- [Stabilize and Ship Safely](/01-proven-techniques/05-stabilize-and-ship-safely/)

Source IDs and technique IDs resolve in `.agents/research/07-sources-bibliography.md` and `.agents/research/01-proven-techniques-catalog.md`. The compression and parallel additions are cited as [S76] and [S77].

**Decision: start with the group that explains the observed work, not the group with the most clever feature.**
