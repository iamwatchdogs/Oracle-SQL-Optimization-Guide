---
id: council-2026-09-26-validate-contents-junior-reader-and-theo-voice
type: council
date: 2026-09-26
mode: validate
flags: --deep --debate --explorers=3 --tier=quality --commit-ready
---

## Council Consensus: **FAIL**

**Target:** `contents/` — 37 Markdown files, ~116,000 words, titled _Oracle SQL Optimization for Junior Devs_
**Question:** Can a developer who knows only basic SQL understand this book? Is it written in Theo Browne's style?
**Rounds:** 2 (independent assessment + adversarial debate)
**Fidelity:** full — R2 ran on the same judge instances via session resume, so each judge retained its own R1 context
**Judges:** 3 runtime-native, named perspectives
**Explorers:** 9 (3 per judge, 12 agents total at the MAX_AGENTS cap)
**Coverage:** 37/37 files, 8,636 lines
**Quorum:** 3/3 judges in both rounds. No timeouts, no fallbacks.

### Verdicts

| Judge        | Perspective     |          R1 |              R2 | Shift                          |
| ------------ | --------------- | ----------: | --------------: | ------------------------------ |
| **NewHire**  | junior-reader   | WARN / HIGH | **FAIL** / HIGH | WARN → FAIL                    |
| **Voice**    | theo-voice      | WARN / HIGH |     WARN / HIGH | none (confirmed)               |
| **Accuracy** | oracle-accuracy | FAIL / HIGH |     FAIL / HIGH | none (confirmed, strengthened) |

**Consensus rule:** any FAIL → FAIL. 2 FAIL + 1 WARN in R2 → **FAIL**.

**Flip audit (R1→R2):** NewHire moved WARN→FAIL. This is a _legitimate_ flip, not anchoring. NewHire did not appeal to agreement — it independently re-verified the band of all six COMPARE_PLANS sites and established that four of six sit on pages the Core route sends the reader to, one of which (`04-recipes/02-before-after-with-spa.md:165`) is banded **Core** by its own file's table. That is a specific, checkable fact the R1 analysis had wrong, and it is the reason the flip happened. Accuracy independently reached the same band conclusion in R2. No weak flips.

Voice held WARN while the council moved to FAIL. Per its own R2 note, that is scoping, not obstruction: _"I am not voting to overturn the council's FAIL — I am scoping my own lane."_

---

## Direct answer to the two questions

### 1. Can a junior who knows basic SQL understand this?

**No — not from the front, and not by following the book's own instructions.**

You can absolutely learn the Oracle concepts. Filter-vs-access, `E-Rows` vs `A-Rows`, the index read/write trade, and clustering factor are all taught well, with real mechanisms and honest boundaries. That material is the best thing in the book and should survive untouched.

What defeats a beginner is page 1 and the routing:

- **`contents/index.md:113` defines `LOCAL RESULT` — the label the whole book exists to teach, the one that tells a reader whether a number is real — using 13 undefined Oracle dictionary fields.** Ten of the thirteen are never defined anywhere in the corpus: `sql_id`'s neighbours `con_id`, `con_id_reason`, `instance_id`, `instance_scope_reason`, `session_instance_id`, `plan_hash_value`, `object_owner_schema`, `task_owner`, `sts_owner`. `cursor` alone appears 125 times across 21 files and is never defined once.
- **The fix already exists in the book, on the wrong page.** `01-proven-techniques/index.md` opens with a four-word pre-jargon table (_"Four words appear everywhere in this chapter set, so here they are before any jargon"_). It sits four route stops in. Page 1 needs it; page 1 does not have it.
- **The Core band on the only runnable lab tells the reader not to run it.** `00-preface/02-how-to-prove-a-win.md:36`, inside the section the book bands as the beginner path, says _"Do not execute the numbered items in this section."_ The book's own Core contract at `01-proven-techniques/index.md:90` is _"A junior can read it and act on the output."_ A junior who obeys the band contract arrives at stop 3 with nothing to do.
- **`index.md:14` promises `Basic SQL: SELECT, JOIN, WHERE`.** By the book's own measure the real prerequisite is basic SQL **plus** Oracle's shared-SQL-area/cursor model **plus** a container/instance scoping model **plus** a bootstrap-confidence-interval vocabulary. The same file contradicts its own prerequisite 99 lines later.

The hedge apparatus has become a second, heavier curriculum than the SQL it protects: 327 evidence-label tokens (one every 20 lines), 21 load-bearing terms used but never defined, 13 named gates, and 4 prerequisite inversions including one causal self-contradiction.

**This is not new.** A prior council on 2026-09-25 also returned FAIL on the same corpus, listing 7 blockers (B-01…B-07), all pedagogical. The book was then rebuilt in two commits on 2026-09-26 (`26987d2`, `0f57cd5`). The pedagogical gaps narrowed. **The factual error below is new to this round** — the prior run explicitly placed release-existence checks such as _"whether `COMPARE_PLANS` or another named API exists in a particular release"_ **out of scope**, so it was never examined.

### 2. Is it written in Theo Browne's style?

**The voice architecture is Theo's. The teaching layer is missing, and the compliance layer won the argument in the places that matter.**

Credit where it is due, and this is not a small amount:

- **35 of 37 pages open on a verdict**, not on throat-clearing. `03-indexes-and-layout.md:8` — _"An index is a read shortcut with a write bill."_
- **Numbers over adjectives holds throughout**: 28.2 numeric tokens per 1,000 prose words, measured excluding tables and code.
- **Named villains, zero instances of "the industry."**
- **One real banned-phrase violation in 116,000 words**, across 16 core patterns. 11 of 37 files are completely clean.
- `04-let-oracle-rewrite.md:44` — _"The database would have refused. You will not."_ That is indistinguishable from the contract's own worked examples.
- The `**Decision:**` line is real writing, 37 times. `03-indexes-and-layout.md:335` — _"or you have not made a decision, you have made a change."_

The failures are structural, and no banned-word grep can see them:

- **The book is bimodal.** It alternates Theo's verdict voice with records-management prose _at paragraph granularity_. Block preambles, `**Reference and version note:**` lines, band tables, `Details that did not fit the table above` lists, and Artifact forms are a different genre. The decisive instance: the compliance register **defeats** the teaching voice at the book's single most important page — the V0 lab's Core band opens by forbidding execution.
- **B1 (the analogy ladder) runs on ~8% of pages.** Three analogies in 37 pages / 116,000 words. `playbooks/explain-concept.md` routes "explain to junior" here and makes B1 + B7 the _required_ behaviors.
- **B7 (war story) is zero**, and there is zero RARELY-tier output of any kind — no asides, no all-caps, no self-aware digression. 44 first-person tokens book-wide, all of them a reader checklist, a SQL alias (`I.INDEX_NAME`), or a form-field heading. **Zero authorial first person in 37 pages.**
- **The beginner's question is quoted verbatim exactly once** in the entire book, at `01-measure-first.md:133` — _"What do I investigate next?"_ §6 lists this as an ALWAYS rule for teaching.
- **A self-invented 378-token label overlay** occupies the structural slots where the analogy and the scar belong. No playbook in the contract sanctions it. Worst instance: `03-indexes-and-layout.md:137` is a five-sentence liability notice whose entire content is _"this number may be release-dependent and may be empty."_
- **The closer is templated 37/37** — `**Decision:**` plus `**Next required page:**` in all 37, plus a byte-identical `Source IDs and technique IDs resolve in…` line in 36. The best punchlines in the book are spent on their own scaffolding.

**Do not "fix" B7 by inventing war stories.** The contract's §8 and `SKILL.md:12` forbid fabricating anecdotes, and this corpus has no lived incidents. The book's refusal to invent a benchmark is its strongest asset under this contract. The available substitute is the reader-voice already sitting in its table cells.

---

## Consensus criticals (both judges, highest confidence)

### C-1 · The book's central release claim is false, and it cites the page that refutes it

**`contents/index.md:142`** · plus 5 restatements · `f-oa-001`, `f-jr-015`

The book asserts `DBMS_XPLAN.COMPARE_PLANS` is documented from 23ai onward and absent from 19c, under a heading the book itself frames as a refusal: _"What this book does not claim."_

**It is documented in 19c.** Accuracy fetched the reference and confirmed: `COMPARE_PLANS` at **§224.5.1** with the full five-parameter signature, Table 224-3, and worked examples; `PLAN_OBJECT_LIST` at **§224.3.1**, whose stated purpose is _"to allow for a list of generic objects as input to the COMPARE_PLANS function"_; both listed in Table 224-2. Both are **absent from the 12.2** edition of the same page. The introduction release is **19c** — the book's own primary release.

NewHire independently verified the blast radius: **four of the six sites are Core or Practice on core-path pages**, one of them banded **Core** by its own file's table. Only `07-appendix-sources/01-how-citations-work.md:138` is genuinely Advanced/gated — and that is the worst place for it, because it is where the error is promoted from mistake into **method**: the section calls plan comparison _"the error in this book that has spread furthest"_ and builds the entire release-labelling lesson on it, while linking the refuting page as proof.

Two further sites make it worse. `01-measure-first.md:209` correctly describes `COMPARE_PLANS`' type enum, level enum, section enum, CLOB return, and plan sources — verified accurate against §224.5.1 — **four lines below** the claim that the function is not in that document. And the book inverts its own stated rule two sentences earlier: _"A later release extending an API is not the same as a later release introducing it."_

**Root cause, and it is diagnosable:** both the 19c and 26ai pages say in their Overview that _"The DBMS_XPLAN package supplies five table functions"_ — then list only the five **table** functions. `COMPARE_PLANS`, `DIFF_PLAN`, and `DISPLAY_PLAN` are plain functions, absent from that list, present only in the subprogram table. A skim of the Overview became a bolded rule on six pages.

### C-2 · The release map teaches a ladder between two names for one release

**`07-appendix-sources/02-version-drift-survival.md:44,47,48,49`** · `f-oa-002`

The map draws **23ai** and **26ai** as different releases with feature boundaries between them. 26ai _replaced_ 23ai; a customer moves by applying a release update. Verified operationally: `/23/tgsql/` returns `302 → /26/tgsql/`. **The book already knows this** — `05-stabilize-and-ship-safely.md:174` records the redirect correctly, contradicting its own release map. The book cannot be right about both.

### C-3 · A junior cannot survive page 1

**`contents/index.md:113`** · `f-jr-001`, `f-jr-003`, `f-jr-005`

`LOCAL RESULT` — the label that tells a reader whether a number is real — is written as a 20-field specification using 13 undefined Oracle dictionary terms. The 9-field identity tuple is simultaneously a page-1 mandate and a page-5 Practice-band table, with no minimum viable tier for a reader who only wants to run the lab.

### C-4 · The only runnable lab's Core band forbids running it

**`00-preface/02-how-to-prove-a-win.md:36`** · `f-jr-002`

_"Do not execute the numbered items in this section"_ — inside the section banded as the beginner path, on the page `index.md:74` and `:99` name as the core-path stop every database reader must complete. Compounded by `:42`: _"Section 11A … must finish before section 6"_, while §6 prints at line 557 and §11A at 967 — **inverted by 410 lines on a 1,641-line page**.

---

## Significant findings, deduplicated across judges

| ID                  | Finding                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | Where                                     | Judges                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------ |
| f-jr-007 / f-oa-014 | The index page teaches the **wrong causal model** for the estimate fix. `:104` says the index caused `E-Rows` to move 1,000→10 "while walking the index"; the page's own bold heading at `:101` says _"The index provided the access path; the statistics provided the estimate"_, and `:85` already says so. Three incompatible causal stories in three adjacent paragraphs.                                                                                                   | `03-indexes-and-layout.md:104`            | all 3 (converged on **significant**; Accuracy upgraded from minor) |
| f-oa-003            | Partition pruning: **right headline, wrong mechanism, wrong citation.** "Prunes, does not remove" is correct and worth teaching. But pruning is not parse-time-only (dynamic pruning covers binds, subqueries, star transformation), `PARTITION RANGE ALL`/`SUBQUERY` also exist, and a type conversion _converts static→dynamic_ rather than preventing it. Cited to `partition-concepts.html`, which contains **zero** occurrences of `PARTITION RANGE`, `PSTART` or `PSTOP`. | `03-indexes-and-layout.md:170,183,185`    | Accuracy                                                           |
| f-oa-004            | Three **false** link-availability statements. `07-appendix-sources/index.md:73` says "Ten rows in the ledger have no link" — the real count is **17**. `:81` says S27/S29/S33 "each carry a chapter URL" (all three are in the no-link set). `:83` says S93 "carries a URL" (it does not).                                                                                                                                                                                      | `07-appendix-sources/index.md:73,81,83`   | Accuracy                                                           |
| f-oa-005            | **S90 resolves to nothing** and underwrites the book's most-repeated negative claim — cited 6× for the no-pack-table policy, with no URL and no record anywhere. Same for S82 and S88.                                                                                                                                                                                                                                                                                          | 6 sites                                   | Accuracy                                                           |
| f-oa-006            | "67 PROVEN" is a **subtraction presented as a count**. 68 − 1 is asserted; the catalog table has no grade column; **52 of 68 entries have no name**. T-55 ("not covered") and T-42 ("not a separate intervention") are counted as techniques.                                                                                                                                                                                                                                   | `index.md:122`                            | Accuracy                                                           |
| f-oa-007            | **Forward dependency refutes the book's own claim.** `03-toolbox/03-load-test-without-prod.md:16` (order 33) declares a prerequisite at order 42. `index.md:93` claims the opposite. The reader sees both on one screen: an authored "Next: SPA" above an order-driven `rel="next"` reading "Next: Load Test".                                                                                                                                                                  | 3 files                                   | Accuracy                                                           |
| f-jr-008 / f-oa-015 | The canonical "win" is **arithmetically incoherent per row**. Before: 100,300 `buffer_gets` / 10,000 rows = 10.03 per row. After: 60,000 / 4 = **15,000 per row** — a ~1,495× inversion the book calls _"the same kind of synthetic magnitude"_ at `:129`. Its reconciliation at `:118-131` covers magnitude but never shape. The headline "work number moved 100,300 → 60,000" also understates the actual access change, which was 2,500× fewer rows examined.                | `03-indexes-and-layout.md:108,127-129`    | NewHire + Accuracy                                                 |
| f-jr-003            | `cursor` — **125 occurrences, 21 files, zero definitions.** The `sql_id` definition at `00-preface/index.md:41` depends on it.                                                                                                                                                                                                                                                                                                                                                  | 21 files                                  | NewHire                                                            |
| f-jr-004            | `MUTATING` is the book's **most-used** label (59) and is **absent from its own taxonomy** at `00-preface/02-how-to-prove-a-win.md:84-88`; defined 1,100 lines away at `05-feedback-loop/03:64`.                                                                                                                                                                                                                                                                                 | 2 sites                                   | NewHire + Voice                                                    |
| f-jr-010            | `REG-01`, `REG-02`, `REG-03` **gate the PASS verdict** at `:913` and their SQL is printed nowhere in the book.                                                                                                                                                                                                                                                                                                                                                                  | `00-preface/02-how-to-prove-a-win.md:913` | NewHire                                                            |
| f-jr-011            | `05-feedback-loop/` — the chapter that owns the central accept/reject decision — has **no stop** in either route table. 19 of 37 pages are named by no route table.                                                                                                                                                                                                                                                                                                             | `index.md:69,91-104`                      | NewHire                                                            |
| f-tv-004            | The 378-token self-invented label overlay sits between the reader and the rule.                                                                                                                                                                                                                                                                                                                                                                                                 | 35 files                                  | Voice                                                              |
| f-tv-001            | Bimodal register; the compliance register wins outright at the V0 lab.                                                                                                                                                                                                                                                                                                                                                                                                          | 37 files                                  | Voice                                                              |
| f-tv-002 / f-tv-003 | B1 ladder on ~8% of pages; B7 zero; beginner question quoted once.                                                                                                                                                                                                                                                                                                                                                                                                              | 37 files                                  | Voice                                                              |
| f-tv-005            | Closer templated 37/37.                                                                                                                                                                                                                                                                                                                                                                                                                                                         | 37 files                                  | Voice                                                              |

---

## Disagreements, with attribution

**D-1 · The A/A noise-floor figures.** NewHire (`f-jr-009`) reported two conflicting relative floors — 3.75% at `00-preface/02-how-to-prove-a-win.md:825` vs 9% at `05-feedback-loop/02-noise-floor-and-repetition.md:47` — with a "derivable" bar of 7%/11.25%. Accuracy **rejected this on arithmetic** and the rejection is correct: the feedback-loop table carries its own formula in the column header, `Margin max(2x floor, 5%)` and `Required improvement >= floor + margin`. For `buffer_gets` floor 3% → margin 6% → required 9%. For advisory `elapsed_time` floor 9% → margin 18% → required 27%. Exactly the printed values. The claimed 7%/11.25% does not follow.

**Council-lead adjudication:** not an error. The 3.75% is a _worked calculation_ on a specific synthetic control (`15 / 400`, explicitly labelled ILLUSTRATIVE); the 3%/9% are _declared placeholder inputs_, explicitly labelled _"not a measured floor"_. Different kinds of number, correctly labelled. **But** a junior reading page 4 then page 8 has no way to know that. **Downgraded significant → minor**: keep both, cross-reference them, do not change either value.

**D-2 · The 378-label overlay.** Voice reads a self-invented overlay as a **defect**. Accuracy reads the same overlay as **load-bearing** — a working A1–D source-class system — and disclosed that reading as possibly self-serving in its own favour. Both readings are coherent. Unresolved by design; it is a values call about how much apparatus a beginner can carry.

**D-3 · Explorer E6 phantom file.** Voice caught that `.agents/council/explorers/e6-register-analysis.md` **was never written to disk** — E6 returned its analysis in-message only. Voice refused to ratify a claim it could not read, then tested four of E6's statistics independently and found 2 reproduce exactly. **Council-lead note:** E6's register analysis therefore exists only in the session transcript. Its headline numbers are corroborated, but the report is unrecoverable from disk and E6 should be treated as unverified provenance. This is a process defect in this council run, not a finding about the book.

---

## What is correct and must not be broken

Verbatim-verified against primary Oracle sources. Do not touch these in remediation:

- **Index compression** — all 10 claims at `03-indexes-and-layout.md:211-220` traceable to 19c `admin/managing-indexes.html`, including both non-obvious **compatibility-level** floors (12.1.0 for `LOW`, 12.2.0 for `HIGH`), the bitmap/IOT restriction, and the single-column-unique `LOW` prohibition.
- **Parallel execution** — the "less than 30%" figure and the full four-item warning list verified against `vldbg/parallel-exec-intro.html`; correctly framed as a recommendation-context example, not a gate; "may reduce system performance" is in the source.
- **`V$SQL` has no `INSTANCE_NUMBER`** in 19c (full column list read); `GV$SQL.INST_ID` correct; `session_instance_id` from `V$INSTANCE` correct.
- **SPA raw-sample distinction** — grounded in documented `DISABLE_MULTI_EXEC` ("executed multiple times and runtime statistics are then averaged").
- **`ALLSTATS` / `LAST` / `GATHER_PLAN_STATISTICS` / `STATISTICS_LEVEL=ALL`**, and the `DISPLAY_CURSOR` privilege list.
- **The number reconciliation** at `03-indexes-and-layout.md:118-131` — genuinely better than most, and it names an owner.
- **The refusal to invent a benchmark.** `index.md:152` stating no Oracle instance was available is the right call under this contract.
- **The `PROVEN` definition** at `00-preface/01-why-evidence-grades.md:175` is genuinely tight, and `:179` ("The count does not upgrade a local claim for your database") is exactly the sentence that keeps the claim honest.
- **0 broken internal links** across 630 links; **0 frontmatter anomalies**; no duplicate `order`.
- **The evidence-label taxonomy itself** — the concept is right, and the mechanism works where someone built a table (the A1–D legend, F1–F6, the T-number map). The failures are the tokens' per-block density and the one out-of-taxonomy member.

---

## Recommended fix order

**Ship-blocking (do first):**

1. **Fix `COMPARE_PLANS` at the root, all six sites together.** Correct text: _"Both DBMS_XPLAN comparison functions are on the 19c primary path. `COMPARE_PLANS` was introduced in 19c (§224.5.1; it is absent from the 12.2 reference), and `DIFF_PLAN`'s signature changed between 12.2 and 19c, so the signature is what you release-check, not the name."_ Delete the _"a function you read about in a 26ai manual does not exist in your 19c instance"_ example — it teaches the reader to disregard the manual that is correct. **Correcting only the gated site leaves the Core path asserting the falsehood four times.** → `index.md:142`, `01-measure-first.md:205`, `03-toolbox/01:333`, `04-recipes/02:165`, `07-appendix-sources/01:138`, `07-appendix-sources/02:44`
2. **Collapse the 23ai/26ai release map to two rows** — 19c and 26ai — and state that 26ai replaced 23ai, citing the redirect the book already records at `05-stabilize-and-ship-safely.md:174`.
3. **Move the four-word pre-jargon table from `01-proven-techniques/index.md` to be stop 1**, and add `cursor` + the identity tuple's minimum viable tier. Cheapest single fix for C-3.
4. **Re-band the V0 lab** so the Core band contains something executable, or move the "do not execute" note out of Core. Fix the `:42` vs `:557`/`:967` print-order inversion.

**High value, low risk:**

5. Rewrite `03-indexes-and-layout.md:104` to match its own heading at `:101`. All three judges converged here.
6. Rescale the after-figure in the canonical plan pair so the per-row inversion is not left unstated, or add one clause saying the pair is shape-only.
7. Repoint the partition-pruning citation to `vldbg/partition-pruning.html`; add the static/dynamic sentence; change "type conversion can prevent pruning" to "converts static to dynamic."
8. Correct the three false statements in `07-appendix-sources/index.md:73,81,83` (10 → 17; drop or supply the S27/S29/S33 and S93 URLs). Attach a URL to S90, S82, S88, S92 or drop the markers.
9. Add a `| Grade |` column and names to the catalog table so 67 becomes a count; exclude T-42 and T-55 or say plainly that 68 includes two non-techniques.
10. Collapse the label overlay: state the convention once in the preface, delete ~300 of the 378 per-block tokens, keep a caveat only where it changes what the reader should do. **Keep `MUTATING` but add it to the taxonomy at `:84-88`.**
11. Delete `**Next required page:**` from ~33 pages, keeping it only at real branch points. Move the byte-identical Appendix line into the preface.
12. Fix the `order` values behind f-oa-007, or drop the second prerequisite on the load-test page — the page's own preceding line already says the comparison is conditional.

**If voice remediation is in scope (Voice's lane, WARN):**

13. One analogy per Core concept (B1), from the 8%-of-pages baseline.
14. Promote 8–12 existing reader-voice lines to quoted beginner questions at the head of their sections. The raw material is already in the book.
15. **Do not add first-person war stories.** §8 and `SKILL.md:12` forbid fabricating them, and this corpus has no lived incidents. A rewrite that adds a scar to satisfy B7 would be a Safety Rails violation and would make the book _less_ conformant.
16. **Do not soften hedges.** The book's refusal to fabricate is the asset.

---

## Council method notes

- **Config:** `--deep --debate --explorers=5 --tier=quality --commit-ready` was requested. `3 judges × (1 + 5) = 18` exceeds `MAX_AGENTS = 12`. Resolved with the user as **3 judges × 3 explorers = 12 (at cap)**, because the three named perspectives auto-escalate judge count to 3, which caps explorers at 3. `--tier=quality` is a valid alias for `--profile=quality`.
- **Fidelity: full.** R2 judges were resumed on their own sessions, not re-spawned, so no R1 truncation.
- **Explorer coverage:** 9 explorers across 3 lenses. Explorer provenance caveat in D-3.
- **Prior-round context:** 2026-09-25 council, same corpus, also FAIL with 7 pedagogical blockers. The book was rebuilt in two commits on 2026-09-26. This round's critical factual finding is new because the prior round scoped release-existence checks out explicitly.
- **Report written to `docs/council-log/` per `--commit-ready`.**
