---
title: Measure First
description: Read an execution plan from zero, name the statement exactly, and know which measurement tool answers which question.
order: 5
draft: false
---

A plan is the answer to “how did Oracle read this?” It is not the answer to “why is the app slow?”

Those are different questions, and mixing them is how teams end up optimizing the wrong statement three hours before a release.

> **Track:** Core, then Practice, then Advanced / gated
>
> **Prerequisites:** Basic SQL and the [environment and setup hub](/00-preface/).
>
> **Evidence status:** Definitions and tool boundaries are documented against A1 package references [S05] [S81] [S82] and the A1 tuning guides [S01] [S03]. Four claims on this page rest on a weaker class and are marked where they appear: the documented `EXPLAIN PLAN` divergence on an A2 technical brief [S83], the parallel-execution `ALLSTATS LAST` caution on class-D practitioner reports [S92], the reviewed third-party script [S87], whose Apache-2.0 licence was read from the file after the repository's API field returned `NOASSERTION`, and the Statspack mechanism [S93], which is a pre-12c page retained as a flagged reference that settles nothing about your release. Its blocks are labeled `ILLUSTRATIVE`, `SYNTHETIC`, `SKETCH`, or `PLACEHOLDER`; every plan excerpt, row count, and timing is `SYNTHETIC`. **No live Oracle database was available**, so no output here is a measurement.
>
> **Next required page:** [Stats Run the Show](/01-proven-techniques/02-stats-run-the-show/).

## How this page is banded

| Band                 | Sections      |
| -------------------- | ------------- |
| **Core**             | 1 to 4        |
| **Practice**         | 5, 6, 7, 8, 9 |
| **Recovery**         | none          |
| **Advanced / gated** | 10            |

- **Core (1 to 4):** read and act; these define a plan and its fields, and need no privilege beyond a read session.
- **Practice (5, 6, 7, 8, 9):** use on a real ticket. Section 7 is the required target-identification worksheet, so treat it as a **preflight gate**: do not read a plan until it is filled in.
- **Recovery (none):** nothing on this page applies or undoes a change. Measurement itself changes no state, so the rollback rules live with the change class, on the [V0 lab](/00-preface/02-how-to-prove-a-win/).
- **Advanced / gated (10):** read before you need it. The ADDM and window-summary monitoring reference needs a confirmed snapshot interval, retention, and entitlement.

The Core sections are the beginner path: read 1 to 4, then go to [Stats Run the Show](/01-proven-techniques/02-stats-run-the-show/). Section 7 is banded Practice rather than Core because it asks for instance and container scoping, but it is a **required preflight**, not optional depth. A reader who skips it produces a measurement nobody can join to a plan or a sample.

## 1. What a plan actually is

> **"How did Oracle read this?"**

When Oracle runs a statement, it picks an ordered set of operations. That list is the execution plan: which object it touches, in what order, with which join, and how it expects each step to behave. Read it from the inside out, because the indentation shows the tree.

It is like a recipe written in reverse dependency order. The innermost lines produce rows. The lines above them consume those rows. The top line is the final result.

The recipe analogy has one hard limit: the plan is a plan until it runs. A plan you have not executed is a guess about the runtime decisions Oracle will make under your data and your bind values.

One gate comes before all of that: section 7 is the required preflight for naming the target. Fill it in before you act on any plan, and before you read the plan pair in the next section.

## 2. Ten things to read

In a codebase, the function signature tells you what a function promises and the profiler tells you what it cost. Neither artifact holds both, and the ten fields below are the two artifacts printed side by side.

You do not need the dozens of columns of `V$SQL_PLAN`. Ten fields answer almost every first question. The last column matters: runtime fields do **not** live in `V$SQL_PLAN`, and reading them from there is a common mistake.

| What to read                 | What it is                                                         | The question it answers                                    | Where it comes from                                        |
| ---------------------------- | ------------------------------------------------------------------ | ---------------------------------------------------------- | ---------------------------------------------------------- |
| Operation and options        | The step, such as `TABLE ACCESS FULL` or `INDEX RANGE SCAN`        | How does Oracle read the rows here?                        | `V$SQL_PLAN`                                               |
| `E-Rows`                     | Estimated rows the optimizer expected at this step                 | What did the optimizer think would happen?                 | `V$SQL_PLAN`                                               |
| `A-Rows`                     | Actual rows this step processed, when runtime statistics exist     | What really happened?                                      | `V$SQL_PLAN_STATISTICS_ALL`, surfaced by `DBMS_XPLAN`      |
| Access and filter predicates | The conditions applied as an index lookup or as a row filter       | Where did Oracle look, and what did it discard afterwards? | `V$SQL_PLAN` (predicate section)                           |
| Cost                         | The optimizer's unitless price for the whole plan                  | How did the optimizer rank its options?                    | `V$SQL_PLAN`                                               |
| `buffer_gets`                | Logical block requests served through the buffer cache             | How much work did the run request?                         | `V$SQL` / `V$SQL_PLAN_STATISTICS_ALL`                      |
| `Starts`                     | How many times this step started                                   | Is the step being repeated?                                | `V$SQL_PLAN_STATISTICS_ALL` with `ALLSTATS`                |
| `A-Time`                     | Accumulated time attributed to this step, including its children's | Where should I look for the time?                          | `V$SQL_PLAN_STATISTICS_ALL` with `ALLSTATS`                |
| `plan_hash_value`            | A fingerprint of the plan shape                                    | Is this the same plan as the one I saved?                  | `V$SQL` / `V$SQL_PLAN`                                     |
| Wait events                  | What the session was doing when it was not on CPU                  | Was the time spent working, or waiting?                    | `V$SESSION` / `V$SQL_PLAN` with `V$ACTIVE_SESSION_HISTORY` |

Four of those deserve their own plain-language rule.

**Cost is not time.** Cost is a unitless number the optimizer uses to compare options against each other. A cost of 5 is not 5 milliseconds. A plan with a lower cost is usually the plan Oracle expects to be cheaper, which is not the same as the plan that will be fastest on your data. It is also not a ranking key for choosing between candidate rewrites: that is how you end up shipping the plan the optimizer liked most instead of the one that measured fastest.

**`buffer_gets` is not disk I/O.** It counts logical block requests. A high `buffer_gets` with low physical reads usually means the buffer cache is serving repeated work. That is still work; it is just cheap work. Use it as a work counter and elapsed time as a latency counter, and never substitute one for the other.

**`Starts` and `A-Time` are two different questions.** `Starts` is a count of operation starts, and a high count multiplied by the inner row source is the signature of a nested loop amplifying work or a scalar subquery re-running. It is one of the most useful numbers in the plan and it is a count, not a duration. `A-Time` is accumulated time, and it is **not exclusive**: a parent operation's `A-Time` includes the time its children spent. A line showing 90% of the statement's time may simply be the one that called the other 90%. Use `A-Time` to decide where to look, never to attribute cost to a line.

There is one more pair worth separating while you are here, because the runbook uses both and the plan prints them in the same block. `Buffers` is logical reads and is close to cache-independent, which makes it the most stable number to compare between two trials on the same data. `Reads` is physical reads and swings with cache state. A `Reads` improvement between two runs may be a warm cache rather than a better plan.

## 3. The canonical plan pair, estimated versus actual

There is exactly one synthetic plan pair in this book, and the [V0 lab](/00-preface/02-how-to-prove-a-win/) owns it. Section 8 of that page defines the values; every technique page in this chapter set reuses them so you are never comparing two invented plans that disagree. If a number here ever differs from the V0 page, the V0 page wins. Section 3 of [Indexes and Layout](/01-proven-techniques/03-indexes-and-layout/) owns the explanation of **why** these magnitudes are synthetic and is worth reading once before you quote a number from this pair.

The statement is the V0 toy report with `:dept_id = 42`, and the canonical answer is four employee rows: `3, 4, 7, 8`.

**SYNTHETIC — the canonical V0 plan pair. Invented plan values, not Oracle output, not a measurement.**

**SYNTHETIC — before, trial `before_01`.** One step, because a single-table query with a filter has one access path. The statement returns 4 rows to the client; that count is a client-visible result, and on a single-step full scan it does not appear as a plan line of its own.

```text
Plan hash value: P_BEFORE

| Id | Operation          | Name      | E-Rows | A-Rows | buffer_gets |
|  0 | TABLE ACCESS FULL  | EMPLOYEES |  1,000 |  10,000 |     100,300 |
---------------------------------------------------
     filter("DEPT_ID"=:DEPT_ID)
```

**SYNTHETIC — after, trial `after_01`.**

```text
Plan hash value: P_AFTER

| Id | Operation                     | Name                      | E-Rows | A-Rows | buffer_gets |
|  0 | SELECT STATEMENT              |                           |      1 |      4 |      60,000 |
|* 1 |  INDEX RANGE SCAN             | IDX_EMP_DEPT_ID_CANDIDATE |     10 |      4 |      60,000 |
|  2 |   TABLE ACCESS BY INDEX ROWID | EMPLOYEES                 |     10 |      4 |      60,000 |
---------------------------------------------------
   1 - access("DEPT_ID"=:DEPT_ID)
```

Label the fields before you interpret them.

| Line in the excerpt          | Field              | What it tells you about this run                                                         |
| ---------------------------- | ------------------ | ---------------------------------------------------------------------------------------- |
| `P_BEFORE` / `P_AFTER`       | `plan_hash_value`  | The plan shape's fingerprint. Save it; compare it after a change.                        |
| 4 rows (client result)       | _not a plan field_ | Four rows reached the client. That is the canonical answer for department `42`.          |
| `A-Rows 10,000`, before      | `A-Rows`           | Rows **examined** by the full scan, before the filter. Work, not output.                 |
| `A-Rows 4`, after            | `A-Rows`           | Rows **examined** by the index, and also rows returned. The throwaway work is gone.      |
| `E-Rows 1,000`               | `E-Rows`           | What the optimizer predicted for that step. It predicted 1,000; the statement returns 4. |
| `filter("DEPT_ID"=:DEPT_ID)` | Filter predicate   | The bind was applied after reading rows, not used to find them.                          |
| `buffer_gets 100,300`        | Work counter       | Logical block requests the run made, whether or not the rows survived.                   |

### Three row counts, three different jobs

This is the single most misread thing on a plan, so it is worth being precise.

- **`A-Rows 10,000`** in the before plan is rows **examined**. The full scan pulled rows out of the table and looked at them all. That number is work, not output.
- **`A-Rows 4`** in the after plan is both rows examined and rows returned, because the index found exactly the four rows it needed. That is the same number for two different reasons, and it is the whole win.
- **`E-Rows`** is what the optimizer **predicted** for that step, before anything ran.

The gap between 10,000 examined and 4 returned in the before plan is the work this statement threw away. That ratio, not the final row count, is what an access path is supposed to improve. The after plan closes the gap: it examined 4 and returned 4.

### What the pair does and does not tell you

The before plan full-scans the whole table and applies a filter, examining 10,000 rows to return 4. The after plan uses the index as an `access`, examines about 4 rows, and returns those same 4. The `buffer_gets` drop from 100,300 to 60,000 is the synthetic evidence that the candidate reduced logical work on this fixture.

Now the beginner question, because it is the one that matters:

> **"What do I investigate next?"**

Answer, in this order:

1. The predicate is a **filter**, not an **access**. Oracle read rows and then discarded most of them. That is the shape of a missing access path. The [index page](/01-proven-techniques/03-indexes-and-layout/) continues this exact plan pair.
2. The estimate is 1,000 for a statement that returns 4. That is a **statistics** defect, and it comes first, because an index on a column the optimizer believes is useless is not a cheap read. The [stats page](/01-proven-techniques/02-stats-run-the-show/) owns that half.
3. `buffer_gets 100,300` against a 4-row answer is the read-to-return ratio that shape produces. It is evidence of wasted work, not proof of which fix wins. The candidate that closes the gap is the one that examined 4 rows rather than the whole table.

The plan tells you where to look. It does not tell you which change wins. That is the [measurement page in the toolbox](/03-toolbox/01-measure-with-xplan-and-monitor/), the [SPA recipe](/04-recipes/02-before-after-with-spa/), and the [noise floor policy](/05-feedback-loop/02-noise-floor-and-repetition/).

## 4. Joins, briefly

A join method is another decision on the same tree.

- **Nested loop:** take a small outer set, and for each row probe the inner set. Cheap when the outer side is tiny and the inner side has an index.
- **Hash join:** build a hash table from one side, then probe it with the other. A cost-based optimizer frequently reaches for it when both sides are large, but that is a decision it prices, not a fixed default.
- **Merge join:** sort both sides, then walk them together. Wins when the inputs already arrive ordered.

There is also a fourth thing on the tree that is not a join: **view merging**, where a `VIEW` line disappears because the optimizer used the view's SQL directly. And **subquery unnesting**, where a subquery becomes a join shape. Both are on the [rewrite page](/01-proven-techniques/04-let-oracle-rewrite/).

You do not need to force a join method. You need to notice when the chosen one is expensive for your data volume.

One aside: the join hint is the first thing added and almost never the last thing removed. Back to the tree.

## 5. Which measurement tool answers which question

> **"What would the optimizer like to do, without running?"**

Six tools, six different questions. Reach for the cheapest one that answers yours, in this order.

| Tool                                              | What it answers                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------- |
| `EXPLAIN PLAN`                                    | What would the optimizer like to do, without running?                           |
| `DBMS_XPLAN.DISPLAY_CURSOR`                       | Which plan and runtime statistics are attached to the cursor that actually ran? |
| SQL Monitor (`V$SQL_MONITOR`, `DBMS_SQL_MONITOR`) | What is this one live execution doing right now?                                |
| AWR                                               | What happened across this window, ranked by time and work?                      |
| ASH                                               | Where were active sessions sampled, and under which wait?                       |
| SQL Trace and `tkprof`                            | Where did parse, execute, fetch, and wait time go?                              |

This table is tool-first, so read it as a ladder rather than a menu. It is also incomplete on purpose: it stops at diagnosis. Two more questions come after it — _is the proposed change better_, which is [SPA](/04-recipes/02-before-after-with-spa/) or Database Replay, and _how is the improvement kept stable_, which is [SQL Plan Management](/01-proven-techniques/05-stabilize-and-ship-safely/). If you find yourself reaching for a diagnostic tool to answer either of those, you have picked the wrong rung.

What each one costs, and when to skip it:

- **`EXPLAIN PLAN`** writes to a plan table or a global temporary table, shows no runtime statistics, and never executes the query. Skip it for evidence; keep it for orientation.
- **`DBMS_XPLAN.DISPLAY_CURSOR`** needs `SELECT`/`READ` on `V$SQL_PLAN`, `V$SESSION`, `V$SQL_PLAN_STATISTICS_ALL`, and `V$SQL`, and re-executes nothing. This is the default first tool.
- **SQL Monitor** adds monitoring thresholds, `SELECT` access to the monitor views, and monitoring overhead. Skip it when the statement already finished or is too short to appear.
- **AWR** depends on snapshot retention and interval. Skip it when the incident falls outside the retained window.
- **ASH** is sampled and can miss short statements. Skip it when you need an exact row count or an exact elapsed time.
- **SQL Trace and `tkprof`** add real overhead and need `ALTER SESSION`, `DBMS_MONITOR`, or an equivalent privilege. Last resort, not first.

Four of them carry a trap worth naming.

**`EXPLAIN PLAN` is a compile-time opinion, and the divergence is documented.** It does not run your statement, so it cannot show you what the runtime did with your bind values, and it cannot show actual rows. Oracle's own position is that an explained plan can differ from the actual plan because of schema, statistics, bind values and types, initialization parameters, and the execution environment — and with binds in particular the explained plan may not represent the real cursor plan at all [S83]. Use it to orient yourself in ten seconds, then move to the executed cursor.

**The executed cursor needs runtime statistics to be useful.** `A-Rows` and per-step I/O appear when plan statistics were gathered. Put the `GATHER_PLAN_STATISTICS` hint on the statement rather than setting `STATISTICS_LEVEL = ALL` on the instance, because the hint is scoped to the one statement you are asking about and the instance setting is scoped to everything. Without either you get a plan shape and nothing about the run. If your display has no actual rows, that is the first thing to fix, not the plan.

**`ALLSTATS LAST` is unreliable for a parallel statement.** "Last" can resolve to the coordinator, and coordinator row counts are not slave row counts. For parallel execution use SQL Monitor; if you cannot, write the limitation next to the numbers. This one rests on practitioner reports rather than a package reference, so treat it as a rule to verify on your own release, not a documented guarantee [S92].

**ASH is sampled.** It can tell you a line was active under a wait. It cannot tell you how many rows that line produced. If the question is "how many?", use plan statistics or SQL Monitor.

### When nothing is licensed

The ladder above has licensed rungs on it, and a reader without a Diagnostics Pack is left holding two tools. That is a gap in this chapter, and here is the answer.

**Snapper** is a single SQL\*Plus script that takes deltas from the core dynamic views — `GV$SESSTAT`, `GV$SESS_TIME_MODEL`, `GV$SESSION_EVENT`, and its own ASH-like samples from `GV$SESSION` — and reports what a session is doing and which waits dominate [S87]. It installs nothing and reads only core views, which is what makes it usable on a deployment with no diagnostic entitlement. The repository is Apache-2.0, read from the file; the [OSS guide](/06-oss-guide/01-how-to-vet-oss/) owns the review procedure and the reason you still do not vendor it. It is not historical unless you save the output, and its sampling is not Oracle ASH, so the two sample counts do not belong in the same column.

**Statspack** is the historical lane most often reached for when AWR is not available. `SPREPORT.SQL` compares two snapshots and `SPREPSQL.SQL` reports on a single SQL hash value [S93]. Whether it is licensed on your deployment is a question for the licensing guide, not this page. It is coarser than AWR and needs a schema maintained, and it gives you interval history where AWR would.

**`V$SQLSTATS` and `V$SQL`** are core views, not pack features, and they are the low-overhead current-state evidence: `V$SQLSTATS` for polling top SQL without churning the instance, `V$SQL` when you need the optimizer environment, module, action, and bind sensitivity that `V$SQLSTATS` drops. Normalize before you compare — `elapsed_time / executions`, `buffer_gets / executions` — because lifetime totals rank statements by uptime rather than by damage.

**SQLd360** is the collector in this family, catalogued as **T-08** and the one `CONDITIONAL` entry in the whole catalog. It is an install-nothing SQL\*Plus script that gathers plans, metadata, optimizer context, and whatever history is available for one SQL ID into an offline bundle, and it asks whether Tuning, Diagnostics, or neither is licensed so it can skip repositories it is not entitled to read [S67]. It is conditional because it is not a peer of an Oracle versioned package reference — it is a community tool whose licence this book's ledger has not confirmed, and the [OSS guide](/06-oss-guide/01-how-to-vet-oss/) treats that as a stop condition, not a footnote. Use it to package a dossier; do not treat its output as the measurement.

This is not a consolation prize. `DISPLAY_CURSOR` with the hint, the core views, a session trace, and SPM are enough to run every procedure in this book. The licensed tools shorten the diagnosis; they do not change the method.

### Comparing two plans

`DBMS_XPLAN` ships two comparison functions, and **both are on this book's primary path.** `COMPARE_PLANS` is documented in the 19c package reference at **§224.5.1**, and it is absent from the 12.2 reference — so **19c is the release that introduced it**, not a later one. `DIFF_PLAN` is older, and its **signature changed** between 12.2 and 19c. That is the distinction worth carrying: _the name is stable, the signature is what moves._ The release you are running is the release you have, so check the package reference for _your_ release before you plan a call around either one.

Read the subprogram table, not the Overview, when you check. The 19c Overview states that the package "supplies five table functions" and then lists only the five **table** functions. `COMPARE_PLANS` and `DIFF_PLAN` are plain functions: they are absent from that list and present in Table 224-2. An earlier draft of this book skimmed the Overview, concluded the function was missing from 19c, and wrote the mistake up as a release boundary. The name being absent from a prose list is not the function being absent from the package.

What each one does, so you know which you would want once you have confirmed availability:

**`DBMS_XPLAN.COMPARE_PLANS`** takes a reference plan and a list of plans and returns a report as a CLOB. It compares **stored plan objects**, and the list can mix sources: cursor cache, AWR, SQL tuning set, SQL plan baseline, plan table, SQL profile, and advisor. Its parameters are `type` (`TEXT`, `HTML`, `XML`), `level` (`BASIC`, `TYPICAL`, `ALL`), and `section` (`SUMMARY`, `FINDINGS`, `PLANS`, `INFORMATION`, `ERRORS`). The plan objects come from the `plan_object_list` type and its subclasses, described in the same chapter.

**`DBMS_XPLAN.DIFF_PLAN`** has a different shape entirely. It takes `sql_text` and an `outline`, generates a target plan from the outline, compares it against the plan for that text, and returns a **task ID** you use to retrieve a report of findings. There is no CLOB return and no plan-source list.

Which one you want, once availability is settled:

- You already have two or more saved plan artifacts and want a written diff of the plan shapes. **→ `COMPARE_PLANS`.**
- You have SQL text plus an outline and want a findings report against the outline's plan. **→ `DIFF_PLAN`.**
- You are on 19c, or you have neither, or you just want to know whether anything changed. **→ Save both `DISPLAY_CURSOR` outputs and diff them yourself.** That path works on every release and needs nothing you have not already used.

And one boundary on what a diff settles, because it is routinely over-read: comparing plans and comparing row sources are two checks, not one. A candidate can keep the same plan shape and move `A-Rows` two orders of magnitude on one step, which is a cardinality fix that went the wrong way. Diff the plan _and_ the row-source statistics.

The [version drift page](/07-appendix-sources/02-version-drift-survival/) explains why the release label belongs next to the behavior.

For tracing, plan display, and monitor mechanics, see [Measure With XPLAN and Monitor](/03-toolbox/01-measure-with-xplan-and-monitor/). This page teaches you what to look for; that page is the runbook.

## 6. Cumulative counters are not samples

`V$SQL` counters such as `EXECUTIONS`, `ELAPSED_TIME`, and `BUFFER_GETS` accumulate since the cursor was created. `ELAPSED_TIME` is in microseconds. Read `ELAPSED_TIME` before and after and you have a difference for every execution since the cursor existed, including the ones you did not run and did not time.

That is not a measurement. It is a total with no denominator you control.

- Do not use cumulative counters as an A/A control or a before/after pair.
- Do not divide a cumulative total by a guess of how many executions ran.
- Use a named trial report, a separately extracted per-execution sample, or a saved plan artifact instead.

The [V0 lab](/00-preface/02-how-to-prove-a-win/) is explicit about this: a named SQL Performance Analyzer trial report is a controlled trial artifact, not automatically one raw row per execution, and SPA can repeat and aggregate. If your only evidence is an aggregated report, the raw-sample gate is `BLOCKED_PENDING_DECISION` until an owner-approved extraction path exists.

## 7. Name the target before you investigate it

**This worksheet is a preflight gate, not optional depth.** Do not read a plan, request a fix, or hand work to a DBA until every field below is filled in. Copying a SQL ID from a ticket does not name a target. A statement has an identity that includes more than its text hash.

Fill this worksheet before you read any plan. Every field is required; an unexplained `N/A` is a stop, not a convenience.

| Field                                      | What to record                                                                                          | Why it matters                                                                                                                     |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------- |
| Statement tag                              | A `MODULE` and `ACTION` pair you set with `DBMS_APPLICATION_INFO`, such as `V0_LAB` / `EMPLOYEE_REPORT` | Without an action, every run collapses into the same attribution bucket.                                                           |
| `sql_id`                                   | The identifier for the normalized SQL text, read from the target system                                 | It locates the statement family. It does not identify a cursor, container, or instance.                                            |
| `child_number`                             | The cursor variant under that `sql_id`                                                                  | A statement can have several plans. The child number picks the one you ran.                                                        |
| `parsing_schema_name`                      | The schema that parsed it, not necessarily the schema you connect as                                    | Privileges, statistics, and objects resolve against the parsing schema.                                                            |
| Binds                                      | The manifest of representative values, kept in a protected artifact                                     | The plan can change per bind value. A plan captured for `:dept_id = 42` may not be the plan for `9999`.                            |
| `plan_hash_value`                          | The plan fingerprint, when monitoring provides one                                                      | It tells you whether the shape changed. It is not a score.                                                                         |
| `con_id` and `con_id_reason`               | The container identity, or `N/A` with a documented reason                                               | An unqualified tuple is not a global result.                                                                                       |
| `instance_id` and `instance_scope_reason`  | The RAC instance, or `N/A` with `single_instance_vsql`                                                  | A single-instance lookup records `N/A`; a RAC capture uses `INST_ID`.                                                              |
| `session_instance_id`                      | The instance your session is actually connected to, read from `V$INSTANCE`                              | `DISPLAY_CURSOR` is instance-local. A mismatched instance is a stop.                                                               |
| Release and patch level                    | The exact database release and update level, and the optimizer feature setting in effect                | The same SQL text behaves differently across releases, and an optimizer switch changes plans under you.                            |
| Session parameters                         | The session parameters that shaped the parse, especially optimizer and `statistics_level`               | A parameter difference is a plan difference, and it is invisible in the plan itself.                                               |
| Service, client, consumer group            | The connect service, the client identifier, and the consumer group the session ran under                | Three sessions running the same SQL under three services are three different problems.                                             |
| Fetch shape                                | Whether all rows were fetched, the fetch array size, the result count, and where the client ran         | This is part of the measurement. A client that fetches 10 rows and a client that drains the result do not run the same experiment. |
| Bind names, types, and selectivity classes | Not just the values: the bind names, their types, and which class of selectivity each represents        | Type changes cause new child cursors, and a skewed class needs its own trial, not an average.                                      |
| Data and statistics timestamps             | When the data last changed materially, and when statistics were last gathered on the objects involved   | Half of "it got slow" is a statistics job you did not know ran.                                                                    |
| Concurrency level                          | The number of concurrent sessions competing during the observation                                      | A statement that wins alone can lose at 200 users, and the plan will not tell you that.                                            |
| Timestamp or window                        | UTC start and end for the observation                                                                   | Half of every "it was fast yesterday" story is a missing window.                                                                   |
| Owner                                      | The person who can approve and recover the change                                                       | If you cannot name them, you cannot ship anything.                                                                                 |

Two rows carry more than the table can hold. For `con_id`, an unqualified tuple is not a global result: in a multitenant database the same `sql_id` can exist in several containers.

For `instance_id`, a single-instance `V$SQL` lookup records `N/A`, while a multi-instance capture uses `GV$SQL.INST_ID AS instance_id`. The 19c `V$SQL` view does not expose `INSTANCE_NUMBER`.

Seven rows in the middle of this worksheet are the ones that explain a measurement nobody can repeat, and they are the rows most often skipped. The framing is simple: **without this context, two executions of the same statement are not comparable, and a comparison between them is arithmetic rather than evidence.** A different release, a different set of session parameters, a different service, a different fetch shape, a different bind type, different statistics timestamps, or a different number of concurrent sessions will each produce a different number, and none of those differences shows up in the plan.

**ILLUSTRATIVE — SQLcl or SQL\*Plus.** Requires the scoped `SELECT` or release-approved read access to `V$INSTANCE` described in the [setup page](/00-preface/). Expected output: one row containing the current instance number. This is an identity check, not a measurement.

```sql
SELECT INSTANCE_NUMBER AS session_instance_id
FROM V$INSTANCE;
```

The instance check is not optional. Before every `DISPLAY_CURSOR` call, connect through the exact service or instance recorded in your manifest, record `session_instance_id`, and stop if the instance scope is unknown or mismatched. In a pluggable-database (PDB) environment, record the container identity from the documented `CON_ID` field or the documented session fallback; if it cannot be supplied, record `N/A` with a reason rather than calling the tuple global.

The full identity query, the saved plan-artifact requirements, and the exact privilege set live in section 4 of the [V0 lab](/00-preface/02-how-to-prove-a-win/). Do not re-derive them here.

## 8. What a plan cannot tell you

A plan is evidence, not a verdict. It cannot tell you:

- Whether the results are the same. That is a [semantic fixture](/00-preface/02-how-to-prove-a-win/) comparison.
- Whether the change helped other statements. That is the regression workload.
- Whether the change costs more on writes. That is the write A/A floor and the two write thresholds.
- Whether the win is larger than ordinary variation. That is the [noise floor and the K-sample policy](/05-feedback-loop/02-noise-floor-and-repetition/).
- Whether the plan will still be there tomorrow. That is [stabilization](/01-proven-techniques/05-stabilize-and-ship-safely/).

If your conclusion needs one of those, the plan is your first artifact, not your last.

## 9. The junior's handoff

When you take this to a database administrator (DBA), site reliability engineer (SRE), or release owner, ask for these and do not improvise the rest.

**Ask for:**

- A service or connection to a non-production database, plus the schema owner and the `object_owner_schema` boundary.
- The scoped fixed-view access for cursor plans: `V$SQL`, `V$SQL_PLAN`, `V$SESSION`, `V$SQL_PLAN_STATISTICS_ALL`, and `V$INSTANCE` (or the release's documented read-only equivalent). Add `GV$SQL` when the capture spans RAC instances.
- Confirmation of release, update level, edition, options, and entitlement, so a documented feature is not mistaken for an available one.
- The names of `sts_owner`, `task_owner`, and the rollback approver.
- A writable output path for plans, reports, and separately extracted samples.

**Do not invent:**

- A SQL ID from memory or from a screenshot.
- A production bind value, or a "representative" value you made up.
- An instance identity you did not read.
- A runtime statistic that was not captured.
- A result. If the procedure did not run, the status is `NOT-VERIFIED`.

**ILLUSTRATIVE — result-status template, not a result.**

```text
Local result: NOT RUN
```

That single line is the honest artifact. It tells the next engineer exactly where the work stopped, and it costs one line to write.

## 10. Advanced / gated reference: ADDM and the window-summary tools

**Prerequisites before you use anything in this section:** a non-production target, an AWR/ASH snapshot interval and retention you have confirmed with the DBA, and an owner who has confirmed the release, edition, and entitlement for diagnostic features. In some editions these features carry licensing or option questions. Confirm them; do not assume.

ADDM, the Automatic Database Diagnostic Monitor, analyzes AWR data for a snapshot interval and returns **findings**. Its scope is a window, not a statement. It is the tool that tells you "this database was I/O bound in this interval" or points at a specific SQL ID worth investigating.

Three rules keep it useful and keep it from wasting your afternoon:

1. **A finding is triage, not proof.** ADDM says what it observed in a window. It does not say your proposed change will help. That is what the [V0 lab](/00-preface/02-how-to-prove-a-win/) is for.
2. **The window is the claim.** If you cannot name the interval, you do not have an ADDM finding, you have an anecdote.
3. **It names candidates, not causes.** When ADDM points at a SQL ID, that is your next input to sections 7 and 3 of this page, not a conclusion.

ADDM is a _monitoring and diagnosis_ reference, not a Core reading skill. If you are new to Oracle, read the Core band, sections 1 to 4, then the Practice band, sections 5 to 9, and come back here when you have a repeatable window. The same entitlement and release questions apply to AWR, ASH, and the diagnostic packs. The 19c source for this material is the [Database 2 Day + Performance Tuning Guide](https://docs.oracle.com/en/database/oracle/oracle-database/19/tdppt/automatic-database-performance-monitoring.html), [S04](https://docs.oracle.com/en/database/oracle/oracle-database/19/tdppt/automatic-database-performance-monitoring.html).

## Artifact

A target worksheet with statement tag, `sql_id`, `child_number`, `parsing_schema_name`, `con_id` and reason, `instance_id` and reason, `session_instance_id`, binds, and `plan_hash_value`; a saved executed plan using the canonical V0 field set, with the rows-examined and rows-returned counts labeled separately; and a named metric with a UTC window. That is the only valid starting point for any tuning change.

Every plan and number on this page is `SYNTHETIC`.

**Decision:** a plan names the work. It does not name the fix. Name the statement, the instance, the window, and the metric, then let the evidence choose the technique.
