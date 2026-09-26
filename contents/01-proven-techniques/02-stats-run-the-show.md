---
title: Stats Run the Show
description: Oracle does not optimize the table. It optimizes numbers. Basic statistics first, advanced features behind gates.
order: 6
draft: false
---

The plan estimated 1,000 rows. The statement returned 4. Investigate statistics.

That is the whole loop, and this page uses that one example throughout: the V0 toy statement with `:dept_id = 42`, where the canonical `before_01` plan carries `E-Rows 1,000` on the `TABLE ACCESS FULL` line and the correct answer is four rows, employees `3, 4, 7, 8`. When the estimate and the actual disagree by that kind of margin, the optimizer is not choosing badly. It is choosing correctly, based on information you did not give it.

> **Track:** Core, then Practice, then Advanced / gated, then Recovery
>
> **Prerequisites:** [Measure First](/01-proven-techniques/01-measure-first/) and a saved executed plan with `E-Rows` and `A-Rows` on the same line.
>
> **Evidence status:** Definitions and documented mechanisms are labeled. Its blocks are labeled `ILLUSTRATIVE`, `SYNTHETIC`, `SKETCH`, or `PLACEHOLDER`; the small worked example and every number are `SYNTHETIC`. **No live Oracle database was available**, so no output here is a measurement.
>
> **Next required page:** [Indexes and Layout](/01-proven-techniques/03-indexes-and-layout/).

## How this page is banded

| Band                 | Sections    |
| -------------------- | ----------- |
| **Core**             | 1, 2, 3     |
| **Practice**         | 4, 8, 9, 10 |
| **Advanced / gated** | 5, 6        |
| **Recovery**         | 7           |

- **Core (1, 2, 3):** read and act. Vocabulary, reading an estimate, and the five-rung fix ladder in first-use order.
- **Practice (4, 8, 9, 10):** use on a real ticket. The judgment calls, the precheck and rollback boundary, the handoff, and the stop list.
- **Advanced / gated (5, 6):** gated; read before you need it. Section 5 lists the heavier estimation rungs, section 6 is the pending-statistics workflow that makes a candidate testable.
- **Recovery (7):** banded separately, because it is not a tuning technique. Retention and restore is how you **undo** a statistics change, not how you improve an estimate.

The Core sections are the beginner path and they are not optional: the fix ladder is worthless if you cannot yet read the estimate it is supposed to fix.

The band table is ordered to match the page's numeric section order: Core covers 1 to 3, Practice starts at 4, Advanced / gated covers 5 and 6, and Recovery is section 7. Practice resumes at sections 8 to 10, which is why it appears in two ranges.

## 1. The vocabulary, in the order you will need it

Seven words. Learn them in this order, because each one is the answer to the previous one.

**Cost model.** The rule set Oracle uses to price a plan. It estimates how much work each option will cost, then picks the cheapest. It does not run anything to find out.

**Cardinality.** How many rows the optimizer thinks a step will produce. This is the number that goes wrong, and when it goes wrong, everything downstream goes wrong with it. Cardinality is the currency of plan choice: join order, join method, and access path are all decided by which side the optimizer believes is smaller.

**Statistics.** The collected data Oracle uses to compute cardinality: row counts, block counts, value distributions, column relationships, and more.

**Histogram.** A description of how a column's values are distributed. Without one, Oracle assumes a distribution it has not measured.

**Skew.** When values are not spread evenly. A column where 99% of rows are `0` and 1% are spread across a thousand values is skewed. A single average tells you nothing useful about that column.

**Correlation.** When two columns move together. If `city` determines `state`, then a predicate on `state` and a predicate on `city` are not independent facts. Statistics that treat them as independent will miscount.

**Bind sensitivity.** When a plan is good for one bind value and bad for another. The same SQL text with `:dept_id = 10` and `:dept_id = 9999` can need two different plans.

Those seven words are the vocabulary, not a work queue. Learn them in order and you can read a plan; the Core fix ladder in section 3 is what acts on them, and the Advanced / gated features in section 5 are the heavier rungs.

Section 6 is banded Advanced but is a **workflow** rather than a fix, because it is what makes a statistics candidate testable before you commit to it. Section 7 is a **recovery mechanism** rather than a tuning technique, which is why it carries its own band.

## 2. Read the estimate before you touch anything

Automatic statistics collection is the default. Oracle's automatic maintenance task gathers statistics for objects it considers low-quality or stale, using preferences you can set per object. That is the boring work, and you should let it do the boring work before you intervene.

The first skill is reading, not fixing.

**Step one: look at the line.** Find the step in the executed plan where `E-Rows` diverges from the rows that step actually produced. That is your candidate line. Be careful which two numbers you are comparing: `A-Rows` on a leaf is rows **examined**, while the root row count is rows **returned**, and the estimate is a third number. The [measure-first page](/01-proven-techniques/01-measure-first/) separates the three; do the comparison against the same quantity on both sides.

**Step two: decide whether the estimate is actually wrong.** A gap is not automatically a defect. A line that estimates 10,000 and returns 10,500 is fine. The canonical V0 line, which estimates 1,000 and returns 4, is a different situation. The [measure-first page](/01-proven-techniques/01-measure-first/) explains why the plan is evidence and not a verdict; that boundary matters here too, because a divergence tells you where to look, not which fix wins.

**Step three: decide whether the statistic is stale.** A statistic gathered before a large data change describes a table that no longer exists. Check the last-analyzed timestamp against the last significant DML. If the object changed a lot and the statistics have not been regenerated, that is a stale statistic and it is the cheapest possible explanation.

**ILLUSTRATIVE — SQLcl or SQL\*Plus.** Requires the documented catalog access for the target object. Expected output shape: one row per statistic with its last-analyzed timestamp, a distinct-value count, and a histogram type. No live output is supplied here, and the privilege and view names are release-dependent.

```sql
SELECT column_name,
       num_distinct,
       low_value,
       high_value,
       last_analyzed,
       histogram
FROM   all_tab_cols
WHERE  owner = '<object-owner-schema>'
AND    table_name = 'EMPLOYEES'
ORDER  BY column_name;
```

If you cannot read the object statistics, ask the DBA. Do not infer staleness from the plan alone.

**SYNTHETIC — the canonical worked example, reused throughout this page.** The V0 toy fixture has 11 physical employee rows. Bind `:dept_id = 42` returns employees `3, 4, 7, 8`, so four rows. The canonical `before_01` plan, owned by [section 8 of the V0 lab](/00-preface/02-how-to-prove-a-win/) and shown on the [measure-first page](/01-proven-techniques/01-measure-first/), carries `E-Rows 1,000` on that line and `A-Rows 10,000` as rows examined. Why those magnitudes are invented rather than measured is owned by section 3 of [Indexes and Layout](/01-proven-techniques/03-indexes-and-layout/); read it once before quoting any of these numbers.

Three numbers, three jobs, and the gap between the estimate and the answer is the defect:

| Number             | What it is                                                          |
| ------------------ | ------------------------------------------------------------------- |
| `E-Rows 1,000`     | What the optimizer **predicted**. The statement actually returns 4. |
| `A-Rows 10,000`    | Rows **examined** by the scan, before the filter. Work, not output. |
| 4 rows at the root | Rows **returned** to the client. The answer.                        |

An estimate of 1,000 against a true 4 is what the optimizer produces when it has no usable per-value distribution for the column: it is applying a selectivity that is far too broad, and every downstream decision inherits that mistake. The teaching point is the shape, not the fixture: **the optimizer is not wrong about a plan; it is wrong about the data.**

The [index page](/01-proven-techniques/03-indexes-and-layout/) continues the same plan pair and shows what the estimate becomes once usable statistics exist: `E-Rows 10`, much closer to 4, but still not exact. That residual gap is normal. Cardinality is an estimate, and your job is to make it useful, not perfect.

**Separate hypothetical, not the fixture.** At production scale the same failure mode reads differently: "estimated 2% selectivity on a column that is actually 99.98% one value." That is a hypothetical shape for recognizing the pattern in a real system. It is not the V0 example, it was not measured, and it does not replace the canonical `:dept_id = 42` gap used everywhere else on this page.

## 3. The fix ladder, in first-use order

Work down this ladder. Each rung is a bigger intervention than the one above it, and each rung needs its own plan and metric comparison.

**1. Regenerate or refresh ordinary statistics.** The default fix. If the statistic is stale, regenerate it. This is the correct answer more often than anything else on this page.

**2. Add a histogram when the predicate is skewed.** A histogram tells Oracle how values are distributed. Use one when the predicate targets a skewed column and the documented criteria support it. `FOR COLUMNS SIZE AUTO` lets Oracle choose where appropriate. Forcing a histogram on every column adds maintenance cost and can make plans worse. Oracle's statistics guidance also describes a legacy height-balanced histogram type; whether to avoid it is a per-release policy question, so check the installed release's guidance rather than assuming a rule. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/)

**3. Add extended statistics when the selectivity lives in a relationship.** If two columns are correlated, a **column group** extended statistic can describe that relationship. If a predicate uses an expression such as `UPPER(city)`, an **expression statistic** can describe it. These are the two cases where the real selectivity cannot be seen one column at a time.

**4. Inspect plan directives when the workload keeps reporting missing statistics.** A SQL plan directive is a note Oracle leaves for itself when it hits a problem it can compensate for at runtime. Inspect `DBA_SQL_PLAN_DIRECTIVES` for the object, record why each directive exists, and check whether it was resolved. An unresolved directive tends to leave the optimizer compensating at runtime, and that compensation is paid at parse time. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/) Do not hide a permanent statistics gap behind sampling.

**5. Use dynamic sampling only when the information genuinely does not exist at parse time.** Dynamic sampling is a compensation mechanism, not a fix. It samples during hard parse, so repeated parse work can erase the benefit. Prefer a durable statistics fix.

**SKETCH — MUTATING — release-checked shape, not a copyable script.** The documented way to create a column group or an expression statistic is `DBMS_STATS.CREATE_EXTENDED_STATS(ownname, tabname, extension)`, where `extension` is a column group such as `(c1, c2)` or an expression such as `(c1 + c2)`. The 19c `DBMS_STATS` reference documents no `CREATE_COLUMN_STATS` subprogram, so this block does not print one.
Every argument below is a placeholder, which is what makes it a shape.

**ILLUSTRATIVE — the shape, with every argument a placeholder.** Fill in the owner, the table, and the real column group or expression before you run anything. The `AUTO_STAT_EXTENSIONS` preference that governs automatic creation, and the exact overload, are release-dependent; verify the installed release signature with the DBA. Expected output shape: the new extension's name.

```sql
SELECT DBMS_STATS.CREATE_EXTENDED_STATS(
  <ownname>,
  <tabname>,
  <column-group-or-expression>
) AS extension_name
FROM   dual;
```

The `EMPLOYEES` table in the V0 fixture carries no expression column, and the columns in it are not correlated in a way this page has measured, so the third argument has no honest value on that fixture. The block is a shape, not a runnable step against it. Do not paste it anywhere.

## 4. The three judgment calls that actually decide the outcome

These are the decisions that separate a statistics fix from a random mutation.

**Is the statistic stale, or is it describing a static distribution correctly?** A statistic that was accurate when gathered and whose data has not changed is not the problem. A statistic gathered before a bulk load is. Ask which one you are looking at before you gather.

**Is one number enough?** If the data changed, gather again. If the distribution is skewed and a histogram is not present, add one. If the selectivity depends on a relationship between two columns, or on an expression, single-column statistics cannot express it and you need extended statistics. These are three different answers, not three steps of the same answer.

**Will the change survive the next data load?** A statistic that fixes today's plan but is silently wrong again after tonight's load has moved the failure to tomorrow. That is what [stabilization](/01-proven-techniques/05-stabilize-and-ship-safely/) is for, and it is why the write path and the refresh path belong in the plan.

## 5. Gated features, with their prerequisites

Everything in this section is behind a gate. Read it. Do not paste it. The gate is stated per feature, not implied.

**Incremental statistics** (partitioned objects). _Prerequisite:_ the object is partitioned, and incremental gathering is enabled for it. _What it does:_ maintains global information from partition changes and synopses instead of rescanning the whole object. _Cost:_ global statistics are approximate between full gathers. _Owner:_ the DBA, because it changes a partition-level maintenance policy. [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/)

**Concurrent statistics gathering.** _What it does:_ splits a large gather into pieces. _Cost:_ it competes for CPU and I/O with everything else, including your application. _Required record:_ the plan outcome and the gathering cost, both. A statistics job that helps the plan and hurts the system has not helped.

**High-frequency automatic collection.** _What it does:_ gathers more often for volatile objects. _Cost:_ more CPU, I/O, and maintenance-window pressure. _Gate:_ a targeted policy with a measured reason, not a blanket setting.

**Real-Time Statistics.** _What it does:_ keeps estimates closer to recent DML for tables that change between maintenance windows. _Boundary:_ the 19c SQL Tuning Guide, _Statistics Concepts_, is the record that documents it from 19c [S01](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/). The 26ai guide's table of contents notes regression models for real-time statistics, and that is the record that carries this detail [S02](https://docs.oracle.com/en/database/oracle/oracle-database/26/tgsql/index.html).
It is TOC-verified only, so treat the regression-model behavior as **unverified** and do not build a recommendation on it. _Gate:_ compare the estimate, the plan, and the cost on the actual workload before enabling it broadly.

**Optimizer Statistics Advisor.** _What it does:_ reviews statistics practices and can recommend actions. _What it does not do:_ decide for you. The output is a proposal. [S27], _Analyzing Statistics Using Optimizer Statistics Advisor_, a chapter of the 19c SQL Tuning Guide. That bibliography record is TOC-verified and carries no separate chapter URL, so the guide index is linked.

**Sample-size policy.** For large tables the documented choice is often a sample-size policy such as `AUTO_SAMPLE_SIZE` rather than `ESTIMATE_PERCENT => 100`. A full compute is still appropriate for a small, critical object. The choice belongs in the object record and in the V0 comparison, not in a habit. The estimating-versus-computing and sample-size guidance is what the 19c statistics best-practices brief and _Gathering Optimizer Statistics_ carry [S08](https://www.oracle.com/docs/tech/database/technical-brief-bp-for-stats-gather-19c.pdf) [S28].
The second is a TOC-verified chapter, so its guide link is not printed here, and `S09` is the statistics _concepts_ brief, which carries no sampling policy and is therefore not cited for this claim.
The documented sources describe the mechanism, not your data, and neither supplies a local speedup number.

## 6. Pending statistics: a staged test, not a publish button

This is the one statistics workflow worth memorizing, because it makes a statistics change reversible before you commit to it.

The mechanism: gather with `PUBLISH=FALSE`, and the new statistics are held pending rather than published. **Publishing is the commit point.** But gathering pending does not by itself make the optimizer use them. You have to say so explicitly, or you will measure the old statistics and report it as a pending test.
**ILLUSTRATIVE — MUTATING — PLACEHOLDER — SQLcl or SQL\*Plus, pending-statistics shape.** Requires the object owner or an authorized DBA role, plus the documented `DBMS_STATS` privileges for the target. Replace `<object-owner-schema>` with the owner-supplied value that matches the [V0 fixture contract](/00-preface/02-how-to-prove-a-win/), so the same `object_owner_schema` boundary is used on both the statistics calls and the V0 capture.

```sql
DEFINE object_owner_schema = <object-owner-schema>

EXEC DBMS_STATS.SET_TABLE_PREFS('&object_owner_schema', 'EMPLOYEES', 'PUBLISH', 'FALSE');
EXEC DBMS_STATS.GATHER_TABLE_STATS('&object_owner_schema', 'EMPLOYEES');
ALTER SESSION SET OPTIMIZER_USE_PENDING_STATISTICS = TRUE;
```

Two things make this safe and two things make it dangerous.

Safe: the gather is reversible before publication, and the change can be measured on the same frozen workload.

Dangerous: the `ALTER SESSION` line is a session-scoped mutation that only affects that session, and `PUBLISH` is a persistent preference on the object. If you publish and do not restore the preference, you have left a mutated object behind.

**Never run this on production.** It requires object-owner privileges, it changes optimizer behavior, and it publishes statistics that every session on that object will subsequently use. The junior's job is to request the DBA do it on a non-production target, or to do it themselves in a lab schema they own.

For the repeatable version of the workflow, use the SPA Optimizer Statistics path where the installed release supports it, then publish or discard based on the measured result. The canonical scripted version is [Stats Pipeline You Can Script](/04-recipes/03-stats-pipeline-you-can-script/). The current-state discipline and the publish/restore/discard decision are on the [accept-or-rollback gate](/05-feedback-loop/03-accept-or-rollback-gate/).

## 7. Recovery: retention and restore, the only undo that always exists

**This section is banded Recovery, not Advanced / gated and not Core.** It is not a tuning technique and it does not make any plan better. It exists so that a statistics change you already applied can be undone, and that is a different job from fixing an estimate. Read it before you publish, not after you regret publishing.

Statistics history is retained for a bounded period. If the setting is not long enough, your restore point expires.

**ILLUSTRATIVE — MUTATING — PLACEHOLDER — SQLcl or SQL\*Plus, retention and restore shape.** Requires the documented `DBMS_STATS` privileges and the applicable retention setting.
Reuse the same `<object-owner-schema>` placeholder as section 6 so the retention read, the gather, and the [V0 capture](/00-preface/02-how-to-prove-a-win/) all name one owner.
Expected output shape: the current `PUBLISH` preference, the retention in days, the history floor, and the restore anchor; then a restore back to a retained historical statistics set.
Verify the exact `RESTORE_TABLE_STATS` signature and its retention prerequisites on the installed release, and do not copy the call shape from another release.

Two form rules this block follows, and both are documented. `DBMS_STATS.GET_PREFS` takes the **preference name first**, so owner and table are passed by name here, in the same form the [stats pipeline recipe](/04-recipes/03-stats-pipeline-you-can-script/) uses.
History retention is not one of that function's preference names, so the retention and the floor are read with the dedicated `DBMS_STATS` functions instead.
And `as_of_timestamp` is typed `TIMESTAMP WITH TIME ZONE`, which a client string bind cannot supply, so the restore travels as the zone-qualified literal built from the anchor captured above — the same `+00:00` form the recipe prints.

**ILLUSTRATIVE — the retention, floor, anchor, and restore block.** Replace the literal with the `restore_anchor` your own capture produced, keeping the `+00:00` offset, and run it only in a session approved to restore published statistics.

```sql
DEFINE object_owner_schema = <object-owner-schema>

SELECT DBMS_STATS.GET_PREFS('PUBLISH',
                            ownname => '&object_owner_schema',
                            tabname => 'EMPLOYEES') AS publish_pref,
       DBMS_STATS.GET_STATS_HISTORY_RETENTION AS retention_days,
       TO_CHAR(SYS_EXTRACT_UTC(DBMS_STATS.GET_STATS_HISTORY_AVAILABILITY),
               'YYYY-MM-DD HH24:MI:SS.FF6') || ' +00:00' AS history_floor_utc,
       TO_CHAR(SYS_EXTRACT_UTC(SYSTIMESTAMP),
               'YYYY-MM-DD HH24:MI:SS.FF6') || ' +00:00' AS restore_anchor
FROM   dual;

EXEC DBMS_STATS.RESTORE_TABLE_STATS(
  ownname         => '&object_owner_schema',
  tabname         => 'EMPLOYEES',
  as_of_timestamp => TIMESTAMP '2026-09-26 09:45:00.000000 +00:00'
);
```

Capture the `restore_anchor` and `history_floor_utc` values in the run record before you gather anything, and replace the literal in the restore call with your own anchor while keeping the `+00:00` offset. An anchor older than the floor ends that restore, which is why both values are read in the same block.

**ILLUSTRATIVE — the restore is itself a change.** It replaces the object's current statistics with a retained historical set. It needs the same owner approval and the same before/after comparison as the gather you are undoing.

**Get the rollback before you need it.** If you cannot say what the restore path is, what the retention window is, and who can approve the restore, you are not ready to publish.

## 8. The full boundary, stated once

For any statistics change, record six things before you start, and verify all six before you declare it done.

1. **Identity.** The full statement identity tuple, so the record can be joined to the plan and the samples later. See section 9.
2. **Precheck.** What is the current `PUBLISH` value, the current retention, the current local-versus-inherited status of each preference, and the current statistics timestamp? Write them down. If a preference was inherited rather than local, the documented reset path is the documented `NULL` reset, not a hard-coded value, and you verify the effective result with `DBMS_STATS.GET_PREFS` afterward.
3. **Privilege and entitlement.** Which account performs the gather, which account publishes, and does the release support the feature you are using? Ask the DBA. Do not assume `CREATE INDEX`-style grants transfer to `DBMS_STATS`.
4. **Verification.** Did the plan change in the direction you predicted? Did the estimate move toward the actual? Did the regression workload stay inside its floor? A statistics change that improves one statement and wrecks another is not a win.
5. **Rollback.** Discard the pending statistics, or restore a retained historical set. Record which one you used and prove the postcondition.
6. **Owner.** The DBA publishes. The DBA or object owner restores. You do not run either against production on the strength of a page on the internet.

The [V0 lab](/00-preface/02-how-to-prove-a-win/) supplies the full sequence, including the write A/A floor and the two write thresholds that must be locked before any candidate is applied.

## 9. The junior's boundary

You can do these yourself, in a lab schema you own: read the statistics, read the plan, identify the estimate gap, name the candidate class.

You ask a DBA to do these: change any `PUBLISH` preference, gather statistics on a shared object, use the pending-statistics session switch on anything you do not own, publish, restore, or change retention.

### The identity tuple goes on the record

A statistics change is attributed to a statement, and a statement is identified by more than its text. Every decision record, handoff, and evidence row carries the full tuple. An unexplained `N/A` is a stop, not a convenience.

The full identity worksheet, the scoped privileges these fields require, and the instance check before any cursor display are on the [Measure First worksheet](/01-proven-techniques/01-measure-first/).
Every field listed there is required here.

The handoff is a sentence, not a script: here is the object, here is the exact statement identity, here is the estimate gap, here is the current preference values, here is the candidate, here is the rollback, here is who approves.

**SYNTHETIC — a decision record, not a result.**

```text
statement_identity:
  sql_id: <known-sql-id>
  child_number: <known-child-number>
  parsing_schema_name: <known-parsing-schema>
  con_id: <known-con-id>
  con_id_reason: <scope-reason-or-na>
  instance_id: <known-instance-id-or-na>
  instance_scope_reason: <single_instance_vsql-or-multi-instance-scope>
  session_instance_id: <read-from-v-instance>
plan_hash_value: <before-hash> -> <after-hash>
object: <object-owner-schema>.EMPLOYEES  (V0 fixture, object_owner_schema boundary)
estimate gap: E-Rows 1000 vs 4 rows returned on the TABLE ACCESS FULL line (V0 dept 42)
current PUBLISH: TRUE (local)
current statistics timestamp: recorded
candidate: regenerate statistics with publish=false, then test with pending statistics
rollback: discard pending, or restore retained historical statistics
approver: DBA (named)
status: NOT RUN
```

The identity block is not optional bookkeeping. A statistics change alters the plan for a **cursor**, and a cursor exists inside a specific container on a specific instance. A record that says only "the `employees` report got faster" cannot be joined to a plan, a sample, or a regression row by anyone who was not there.

The status line is equally important. If you did not run it, the record says `NOT RUN` and everyone downstream knows exactly where the work stopped.

## 10. When to stop

Stop and escalate rather than gathering again if:

- The estimate is right and the plan is still slow. Then the problem is not statistics. It is [access path or layout](/01-proven-techniques/03-indexes-and-layout/).
- Every fix works and the plan drifts again after a data load. Then the problem is [stabilization](/01-proven-techniques/05-stabilize-and-ship-safely/).
- The statistic you need requires a privilege you do not have, or a release feature that is not installed. Then the answer is `BLOCKED_PENDING_DECISION`, not a workaround.
- The result changes another statement's behavior. Then the candidate is a regression, and [the gate rejects it](/05-feedback-loop/03-accept-or-rollback-gate/).

## Artifact

A statistics decision record with: the full statement identity tuple (`sql_id`, `child_number`, `parsing_schema_name`, `con_id`, `con_id_reason`, `instance_id`, `instance_scope_reason`, `session_instance_id`), the `plan_hash_value` pair, the current preference values, the estimate gap, the candidate, the measured result, the restore command, and the approver. If any of those is missing, the candidate is `CANDIDATE/NOT-VERIFIED`.

Every example and number on this page is `SYNTHETIC` or `ILLUSTRATIVE`.

Source IDs and technique IDs resolve in [Appendix Sources](/07-appendix-sources/).

**Decision:** the optimizer is not making bad decisions. It is making decisions on the numbers you gave it. Give it better numbers before you ask for a better plan.

**Next required page:** [Indexes and Layout](/01-proven-techniques/03-indexes-and-layout/).
