---
title: Let Oracle Rewrite
description: Usually do not hand-rewrite before measuring. Make the query eligible, read the transformation, prove the semantics.
order: 8
draft: false
---

Usually, do not hand-rewrite a query before you measure it.

Oracle has documented transformations for most of the shapes people hand-rewrite by hand. It applies them when the shape, the statistics, the cost, and the release line up. A hand-rewrite based on a blog post is a guess about a rule you have not read, applied to a plan you have not seen, on a workload you have not frozen.

Your job is narrower and more useful: make the query eligible, read the operation Oracle chose, prove the result still means the same thing, and measure the change.

> **Track:** Core, then Practice, then Advanced / gated
>
> **Prerequisites:** [Measure First](/01-proven-techniques/01-measure-first/) and the [V0 lab](/00-preface/02-how-to-prove-a-win/) for the semantic fixtures and the before/after comparison.
>
> **Evidence status:** Documented transformations with cited eligibility. Its blocks are labeled `ILLUSTRATIVE`, `SYNTHETIC`, `SKETCH`, or `PLACEHOLDER`; every result set, plan, and timing is `SYNTHETIC`. **No live Oracle database was available**, so no output here is a measurement.
>
> **Next required page:** [Stabilize and Ship Safely](/01-proven-techniques/05-stabilize-and-ship-safely/).

## How this page is banded

| Band                 | Sections    |
| -------------------- | ----------- |
| **Core**             | 1, 2        |
| **Practice**         | 3, 4, 9, 10 |
| **Recovery**         | none        |
| **Advanced / gated** | 5, 6, 7, 8  |

- **Core (1, 2):** read and act. The rule, and the semantics that break when you rewrite. Skipping these is how results change silently.
- **Practice (3, 4, 9, 10):** use on a real ticket. Two worked examples, the F1 to F6 contract, the reject list, and the junior's boundary.
- **Recovery (none):** a rejected rewrite usually leaves nothing to undo, because the point of the reject list is to reject before you apply. When a rewrite _has_ been applied, the recovery primitive belongs to the [V0 lab](/00-preface/02-how-to-prove-a-win/).
- **Advanced / gated (5, 6, 7, 8):** gated reference. The transformation catalog, the "a transformation is not a win" rule, MV rewrite, and release-specific features.

The Core path is short on purpose. If you take nothing else from this page, take sections 1 and 2, because they are the two things that protect your users from a wrong answer.

## 1. The rule, and why it exists

A spell checker only corrects a word when there is one obvious correction, and it still mangles the names it has never seen. That is the rule the optimizer works under, pointed at a query instead of a word. A hand-rewrite is the same edit typed with the checker switched off.

The optimizer rewrites your SQL when it can prove the rewrite preserves the result. "Proves" is doing a lot of work in that sentence, and the whole discipline of this page lives in the cases where that proof does not hold.

An optimizer that silently changed your result set would be unusable. So it refuses transforms whose preconditions do not obviously hold. That is why a query with an outer join, a `DISTINCT`, or an `OR` sometimes does not get the transformation you expected: the rewrite is not obviously safe, so it is not applied.

A hand-rewrite has no such guardrail. You can change a `NOT IN` into a `NOT EXISTS` and break the null case. You can add a predicate "pushdown" by hand and change which table the filter applies to first, which changes the result for outer joins. The database would have refused. You will not.

**So: the transformation list is a map of what the optimizer is allowed to do. It is not a checklist of rewrites to apply by hand.**

## 2. Semantics first: six things that break when you rewrite

Before any transformation, be able to state what your query's result contract is. These are where hand-rewrites go wrong. Each line names the fixture that guards it, and the one line with no fixture says so.

**NULLs** — guarded by F1. `NULL = NULL` is unknown, not true. `NOT IN` with a NULL in the subquery returns no rows at all. `NOT EXISTS` does not, because it tests for row existence rather than comparing to a value. This single difference is the most common way a "safe" rewrite changes results.

**Duplicates** — guarded by F2. A `JOIN` can multiply rows. A `JOIN` followed by `DISTINCT` cannot. Whether a transformation preserves duplicates depends on whether the original had them and whether the rewrite removed them.

**Outer-join semantics** — guarded by F3. A `LEFT JOIN` keeps unmatched left rows with nulls on the right. If you move a filter from the `WHERE` clause into the `ON` clause, the filter stops removing null-extended rows, and the result gets _bigger_. If you move a filter from `ON` to `WHERE`, the result gets _smaller_. Oracle's predicate transformations respect this. A hand-edit does not know which you meant.

**Views** — **no fixture guards this.** A view is a stored query, not a table. Whether it is merged into the parent query or materialized as a separate step depends on its contents. Merging changes which table the filter can reach.

A view with aggregation, `DISTINCT`, set operations, or grouping cannot be merged in the simple way, and a hand-rewrite that assumes it was merged can be wrong.

**No F-fixture covers view merging.** If your rewrite touches a view, the F1 to F6 set does not protect you; add a view-specific check.

**Ordering and approximation** — guarded by F4 and F5. A transformation that reduces work but increases the number of rows returned has not necessarily helped. Fetching is work too, and `A-Rows` at the root tells you.

**Error contract** — guarded by F6. A rewrite can change _when_ a query fails, not just what it returns. Dividing by a bind of `0` must keep raising the same Oracle error; swallowing it into an empty result set is a changed contract, and a silent one.

One aside: all six breakages pass a code review, because a row-count check passes all six. Back to the fixtures.

## 3. Two examples, with expected results

Example A uses the canonical [V0 fixture](/00-preface/02-how-to-prove-a-win/) plus one explicitly synthetic department row, labeled as such. Example B uses only the canonical fixture. Every expected result on this page is `SYNTHETIC` and derived from the fixture definition, not from a run.

### Example A: `NOT IN` and the null trap, then what T-37 actually does

This example has two separate lessons, and they are easy to confuse. The first is about the SQL you write. The second is about the **subquery unnesting** transformation, catalog **T-37**. `NOT EXISTS` is not a transformation; it is a predicate you type. T-37 is the documented transformation the optimizer can apply to an eligible existence subquery, turning it into a semijoin or antijoin.

**A fixture note you need before the example works.** The canonical [V0 fixture](/00-preface/02-how-to-prove-a-win/) has three departments: `10` Platform, `42` Finance, `99` Support. All three have at least one employee, so **the V0 fixture contains no department with zero employees**. To show the no-match case, this example adds one clearly separate, explicitly synthetic row. It is additive teaching data: it does not change the canonical fixture's **definition**, but it does add a fourth row to the `departments` table in your lab schema, so after this page that table holds four rows where the V0 page said three. The V0 page's "three department rows" describes the fixture as defined, not your table as it stands after later pages — and if you re-run any V0 step, drop this row first so the counts match. The F1 to F6 contracts in section 4 are unaffected because they bind on `dept_id` and `:employee_id`, never on the synthetic department.

**SYNTHETIC — additional teaching row, not part of the canonical V0 fixture.** Run only in a disposable lab schema owned by `<object-owner-schema>`. Expected output: one added department row, committed. This block writes to the database, so it is not read-only and not `COPYABLE` for production. The canonical fixture is unchanged by this page; the `NOT IN`/`NOT EXISTS` contrast below depends on a department that has no employees, and the fixture has none without this row.

```sql
DEFINE object_owner_schema = <object-owner-schema>

INSERT INTO &object_owner_schema.departments (dept_id, dept_name)
VALUES (100, 'Field Operations');

COMMIT;
```

With `dept_id = 100` present, department `100` is a genuine no-match department: no employee row carries `dept_id = 100`.

**SYNTHETIC — the first query's expected result: zero rows.** **Owner boundary:** the object owner is `<object-owner-schema>`; this unqualified form requires that schema to be the current schema.

```sql
SELECT dept_id,
       dept_name
FROM   departments
WHERE  dept_id NOT IN (SELECT dept_id FROM employees);
```

`NOT IN` tests whether a value is absent from a list. If the list contains a NULL, the comparison can never evaluate to true, so the whole query returns **zero rows**. Here the list comes from `employees`, and employee `6` has a NULL `dept_id`, so the list contains a NULL. That single NULL suppresses every row, including department `100`, which genuinely has no employees and genuinely should be returned.

**ILLUSTRATIVE — SQLcl or SQL\*Plus.** Requires `SELECT` on `departments` and `employees` in the lab schema, and the synthetic department `100` from the block above. No live output is supplied. **Owner boundary:** the object owner is `<object-owner-schema>`; this unqualified form requires that schema to be the current schema.

```sql
SELECT d.dept_id,
       d.dept_name
FROM   departments d
WHERE  NOT EXISTS (
  SELECT 1
  FROM   employees e
  WHERE  e.dept_id = d.dept_id
);
```

**SYNTHETIC — the second query's expected result: one row, `100`, `Field Operations`.**

`NOT EXISTS` tests whether a matching row exists, not whether a value is absent from a list. Employee `6`'s NULL `dept_id` is not a match for department `100`, so the NULL does not suppress anything. Department `100` has no matching employee, so it comes back. Departments `10`, `42`, and `99` all have employees, so they are correctly excluded.

**The null trap, stated precisely.** The two queries differ because `NOT IN` compares values and a NULL in the list makes every comparison unknown, while `NOT EXISTS` asks a yes-or-no question about row existence and never compares to a NULL. On this data the first query returns **nothing** and the second returns **department 100**. The first query is not "slower" or "faster"; it is **wrong for the question being asked**, and it looks right because it returns a clean empty set.

**These two queries do not return the same rows.** The first returns nothing; the second returns the departments with no matching employees. On this fixture that is a visible, checkable difference. Changing the predicate changed the answer, and no amount of measurement makes that a win.

**The transformation is the third thing, and it is the optimizer's choice, not yours.** The second query is _eligible_ for T-37, subquery unnesting. If the optimizer applies it, the plan shows `HASH JOIN ANTI` for the non-existence case, or `HASH JOIN SEMI` for an existence case, and the subquery disappears as a separate filter step.

That is documented behavior, and the eligibility rules decide whether it fires. Your hand-written `NOT EXISTS` does not force it; it only gives the optimizer something eligible to transform.

See the catalog row for T-37 in the transformation table in section 5, and the [19c Query Transformations chapter](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/query-transformations.html) for the eligibility rules. That chapter names the transformation but does not number it; the `T-37` label is this book's catalog identifier, and section 5 says so where the whole table is printed.

So the order matters: the predicate change is a **semantics** decision you make and must justify; T-37 is a **plan** outcome the optimizer may or may not give you; and the performance claim is a **measurement** you still owe. Reading `HASH JOIN ANTI` in a plan tells you the transformation fired. It does not tell you the result is correct, and it does not tell you the workload got faster.

### Example B: OR expansion and when not to use it

**ILLUSTRATIVE — SQLcl or SQL\*Plus.** Requires `SELECT` on `employees` in the lab schema. **Owner boundary:** the object owner is `<object-owner-schema>`; this unqualified form requires that schema to be the current schema.

```sql
SELECT employee_id,
       dept_id,
       salary
FROM   employees
WHERE  dept_id = :dept_id
   OR  salary > 200;
```

An `OR` between two different columns usually cannot be served by one index lookup. OR expansion, when the branches are eligible, evaluates each branch separately and combines the results, and the plan shows that as a `UNION ALL` step with one branch per disjunct. `CONCATENATION` is the name this operator had **before** Oracle Database 12c Release 2 (12.2); on 19c the optimizer uses `UNION ALL`, so a 19c plan will never print `CONCATENATION` for this transformation. [S24](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/query-transformations.html)

**When to want it:** each branch is independently selective and each has an access path, so the combined work is less than one broad scan.

**When to reject it:** one branch already has a good access path and the other branch is broad. Then expansion does two broad things instead of one, and the plan is worse. Read each branch in the plan and count the work, rather than assuming the transformation is an improvement.

**When to reject the hand-rewrite:** if you manually split the `OR` into a `UNION ALL` to force the shape. `UNION ALL` does not deduplicate; if the two branches can return the same row, you have changed the result. `UNION` deduplicates and costs more. The optimizer picks between them based on the shape. Your guess is worse than its guess, and if it is wrong it is silent.

## 4. Semantic fixture contract

Every transformation candidate is measured against a fixture contract, not against your memory of what the query used to return. F1 through F6 are the canonical V0 fixtures. This page restates them; it does not redefine them. Section 10 of the [V0 lab](/00-preface/02-how-to-prove-a-win/) is the owning definition, and if this table and that section ever disagree, that section wins.

**SYNTHETIC — the canonical V0 fixture contract. Expected behaviors are derived from the fixture definition, not from a run.**

| Fixture        | Input                                              | Expected behavior                                             | What a bad rewrite does                                                              |
| -------------- | -------------------------------------------------- | ------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| F1 null        | `:dept_id = NULL`                                  | Exactly employee `6`, with null department and null salary    | Turns `= NULL` into `IS NULL`, or changes the null branch behavior                   |
| F2 duplicates  | `:dept_id = 99`                                    | Two employee rows with ID `5`; do not deduplicate             | Adds `DISTINCT`, or uses `UNION` where `UNION ALL` was intended                      |
| F3 outer join  | `:employee_id = 9`                                 | One left row: employee `9`, department `77`, null `dept_name` | Moves a filter between `ON` and `WHERE`, so the null-extended row is kept or dropped |
| F4 ordering    | `:dept_id = 42` with `ORDER BY employee_id`        | IDs `3, 4, 7, 8` in exactly that order                        | Changes the sort, or drops the ordering clause                                       |
| F5 approximate | `:dept_id = 42` aggregate, `ROUND(AVG(salary), 2)` | `200.00` within the declared tolerance of `0.01`              | Substitutes an approximate function where an exact one is required                   |
| F6 error       | `:zero = 0` on `1 / :zero`                         | `ORA-01476`, divide by zero; capture the error class and code | Changes when the error is raised, or swallows it                                     |

Four of these deserve a note, because they are where hand-rewrites actually fail.

**F1 is not the same as a `NULL` bind on an equality predicate.** `dept_id = NULL` matches nothing. The F1 query is a specific two-branch fixture whose `:dept_id IS NULL` branch is what produces employee `6`. A rewrite that collapses those branches changes which rows exist.

**F3 is the outer-join trap.** Employee `9` has `dept_id = 77`, and there is no department `77`, so the left row survives with nulls on the right. That row only exists because the join is a `LEFT JOIN`. Move the filter from `ON` to `WHERE` and the null-extended row is filtered away. Move it from `WHERE` to `ON` and non-matching rows come back. Same SQL tokens, different results.

**F5 is a tolerance, not an equality.** The aggregate contract is `200.00 ± 0.01`. The point is not that both sides return exactly `200.00` forever; the point is that a candidate must not shift the value outside the declared tolerance. If you substitute an approximate function here, the fixture fails, and that is the correct outcome: an approximate answer is a different product decision, not a faster query.

**F6 is an error contract.** The expected error is `ORA-01476`, divide by zero. Capture the error code and message on both sides. A rewrite that turns a raised error into an empty result, or into a different error, has changed the contract.

Save the incumbent's answers _before_ the change, as canonical text or a client-generated result hash. Do not replace a result with a row count: a count can match while the rows differ. Then run the same six fixtures against the candidate. Any difference is a `PRELIMINARY_GATE_FAILURE`, which the [accept-or-rollback gate](/05-feedback-loop/03-accept-or-rollback-gate/) maps to `REJECT_CANDIDATE`. A missing fixture is `BLOCKED_PENDING_DECISION`, not a pass.

The naming pattern is `semantic-F<n>-<phase>.txt`, one pair per fixture. The summary artifact must carry `fixture_id`, phase (`incumbent` or `candidate`), bind manifest, expected status, actual status, result hash or canonical text path, and `PASS` or `FAIL` for each of the six.

The rule underneath all six: **the faster query that returns different rows is a defect.** A rewrite is not eligible for the performance claim until the fixtures pass.

## 5. The transformation reference

T-34 through T-44 is **10 transformations plus the T-42 mechanism note**. T-42 is not a fix you apply; it explains the cursor-duration temporary-table mechanism behind T-41. This is reference material, not a checklist. The Core work is sections 1 and 2 above; sections 3 and 4 are the Practice work you do on a real ticket.

**The T-numbers are this book's own catalog identifiers, not Oracle's.** Oracle's 19c [Query Transformations](https://docs.oracle.com/en/database/oracle/oracle-database/19/tgsql/query-transformations.html) chapter names these transformations in prose and orders them by topic; it does not number them, and there is no Oracle document in which `T-34` means OR expansion. The numbering comes from this book's research catalog, which assigns one identifier per catalog entry and groups them; the [catalog index](/01-proven-techniques/) owns the group boundaries and the [T-number map](/07-appendix-sources/01-how-citations-work/) is the resolution path for every T-ID.

| Catalog ID | Transformation                 | What to look for in the plan                     | Eligibility in one line                                                                 | Reference |
| ---------- | ------------------------------ | ------------------------------------------------ | --------------------------------------------------------------------------------------- | --------- |
| T-34       | OR expansion                   | A `UNION ALL` step, one branch per disjunct      | The `OR` branches are each independently indexable or narrow                            | S24       |
| T-35       | View merging                   | The view boundary is gone from the plan          | The view is a simple, mergeable query                                                   | S24       |
| T-36       | Predicate pushing              | The filter appears earlier in the block          | Pushing the predicate earlier does not change which rows survive, including outer joins | S24       |
| T-37       | Subquery unnesting             | `HASH JOIN SEMI` or `HASH JOIN ANTI`             | The subquery is an existence test the optimizer can turn into a join                    | S24       |
| T-38       | Star transformation            | `STAR TRANSFORMATION`                            | A star schema, adequate fact-table indexes, and the optimizer's configuration           | S24       |
| T-39       | Join factorization             | A repeated join factored across `UNION` branches | The same join appears in branches the optimizer can combine                             | S24       |
| T-40       | Table expansion                | `UNION ALL` mixing indexed and full-scan parts   | A predicate splits into an indexable part and a remainder                               | S24       |
| T-41       | Temporary-table transformation | An internal temporary row source appears         | The optimizer's internal criteria are met; you do not force this                        | S24       |
| T-42       | Mechanism note                 | Explains T-41; not a separate intervention       | Cursor-duration temporary tables; documented mechanism, not an action                   | S24       |
| T-43       | In-memory aggregation          | `VECTOR GROUP BY`                                | An eligible In-Memory columnar object; verify entitlement                               | S24       |
| T-44       | Approximate query processing   | An approved approximate function in the plan     | The product requirement accepts approximation                                           | S24       |

These are eligibility-driven. The optimizer applies them when the shape, statistics, cost, and release conditions line up. A transformation that did _not_ appear in the plan tells you the eligibility rules were not met; it does not tell you to add a hint.

The `S24` reference column is the 19c SQL Tuning Guide chapter that documents these transformations. It is a TOC-verified chapter record, so it is cited bare; the chapter URL is the one linked above.

## 6. A transformation in the plan is a starting point, not a win

The most important sentence on this page.

When you see `HASH JOIN ANTI` or a `UNION ALL` step or `STAR TRANSFORMATION` in a plan, you have learned one thing: the optimizer applied a transformation. That is evidence about the plan's shape. It is not evidence that the statement got faster, that another statement in the workload did not get slower, or that the result is correct.

To turn a transformation into a performance claim you need all of:

1. The saved before and after plans for the exact statement identity.
2. The semantic fixtures, passed on both sides.
3. The full frozen workload measured on both sides, compared against the [noise floor](/05-feedback-loop/02-noise-floor-and-repetition/).
4. The write A/A floor and both write thresholds, locked from incumbent evidence before the candidate.
5. The regression comparison for every other statement in the workload.

[V0](/00-preface/02-how-to-prove-a-win/) runs all five. If you have only a plan with a transformation in it, you have item 1 and nothing else.

## 7. Materialized-view rewrite is a different thing

Materialized-view query rewrite belongs to [indexes and layout](/01-proven-techniques/03-indexes-and-layout/), not here. It is a _layout_ technique: it precomputes a result and substitutes it for a query at runtime. It is not one of the ten transformations above, and it carries the freshness trade rather than a semantics-preservation argument. If you are reaching for it because the plan shows repeated aggregation, that is a layout decision with a business owner attached.

## 8. Release-specific: the transpiler, and how to talk about any new feature

The automatic SQL Transpiler, documented for 26ai, can convert eligible PL/SQL constructs used inside a SQL statement into SQL expressions. It is not a general PL/SQL optimizer. Eligibility rules decide which constructs qualify, and non-eligible constructs stay on the normal PL/SQL path. Treat its presence in a plan as something to verify on the installed release, not something to predict. [S46](https://docs.oracle.com/en/database/oracle/oracle-database/26/nfcoa/oracle-ai-database-26ai-new-features-guide.pdf)

The general rule, which applies to every feature in the book: a 26ai guide documents features introduced across releases, so a feature appearing in that guide is not automatically a 26ai introduction, and a 19c environment cannot use a 26ai feature no matter what the guide lists. The release label belongs next to the behavior. Where the exact introduction release is unverified, say so. The [version drift page](/07-appendix-sources/02-version-drift-survival/) keeps the boundaries, and the [evidence chapter](/00-preface/01-why-evidence-grades/) grades the sources.

## 9. When to reject a rewrite

Reject the candidate, keep the incumbent, and record the reason when any of these is true:

- The hand-rewrite changes the null, duplicate, or outer-join behavior. Rejected on semantics, before any measurement.
- The transformation did not appear in the plan, so the eligibility rules were not met and the query is not in the shape you assumed.
- The plan changed but the measured workload did not clear the noise floor.
- The plan changed and one other statement in the workload regressed past the declared margin.
- The rewrite is faster for one bind value and slower for the skewed one. Check the bind manifest, not just the common case.
- The feature you need is not installed or not entitled on the target release.
- You cannot name the rollback. A rewrite to application SQL needs a code rollback and a deploy owner, not a DBA drop.

## 10. The junior's boundary

You can do these yourself: read a plan and name the transformation, write the semantic fixtures, compare the before and after result sets, write the reject reason.

You ask before doing these: changing application SQL that other teams deploy, anything that changes a view others depend on, and any rewrite you cannot roll back by reverting one file.

The [static checks page](/03-toolbox/04-static-checks-before-db-time/) is the right place for parse, lint, and behavior tests before the database gets involved. A rewrite you cannot parse and lint is not ready to be measured.

## Artifact

For each candidate: the transformation name from the plan, the saved before and after plans with `plan_hash_value`, the semantic fixture results on both sides, the workload metric delta against the noise floor, the write-cost result, the rollback, and a verdict. A transformation in a plan with no fixture comparison is a hypothesis.

Every result set and plan on this page is `SYNTHETIC`.

**Decision:** make the query eligible, read the transformation, pass the fixtures, then measure. In that order.
