---
version: 1
slug: 'src-pages-slug-astro'
primary_target: 'src/pages/[...slug].astro'
related_targets: []
---

# Surface brief — `src/pages/[...slug].astro` (catch-all: home + all notebook pages)

## Scope & visitor mode

- Mode: **Read**. Whole site via one catch-all route (`index` home + 36 interior pages) plus `404.astro`.
- Audience: junior-to-mid devs, self-paced; job = learn evidence-based Oracle SQL tuning and leave able to prove a win.
- Primary action: **Begin at Preface** from home; interior: continue linear reading with sticky section TOC + prev/next.
- Proof/content: real frontmatter titles, Claim/Example/Number structures, `[S##]` citations, grade chips A1–D, `**Keep this:**` takeaways.
- Constraints: content frozen (wording/citations/order); dark default + light/dark toggle; external deps (Tailwind v4, motion); must pass oxlint/prettier/astro check/tsgo/build.

## Direction contract

THESIS: A research preprint's scholarly apparatus made navigable — evidence grades, numbered contributions, and running heads replace the default docs-portal or blog-hero arrangement the category always ships.

OWN-WORLD: Near-black paper ground (dark default) with a stepped neutral zone ramp (A1–D as discrete scale tokens, not rainbow chips); one restrained ink accent for primary action and active wayfinding only; Source Serif 4 for body/display (scholarly reading), Inter for UI chrome only, JetBrains Mono for grades, `[S##]` IDs, and measured figures; hairline rules and title-block framing instead of cards; figure-caption treatment for SQL/plan samples; sticky section TOC as margin apparatus.

STORY: Visitor lands on a paper title-block (title, abstract pitch, nine numbered contributions), sees one solid "Begin at Preface" action, and understands this is graded evidence not a tip list; inside, they track section position via scroll-spy TOC, scan grade chips, and leave able to re-test a claim.

FIRST VIEWPORT: Full-bleed title block on dark ground — book title at display scale, one-sentence abstract, numbered list of the 9 sections as contributions, solid primary control "Begin at Preface" anchored in the block; no marketing hero metrics, no feature-card grid; running mono metadata (grade classes, entry count) as tabular figures in the block margin.

FORM: Academic preprint / VLDB-SIGMOD scholarly apparatus (grounded candidate 4 on the ordered list). Seed key: `c7347054`. Raises kept from declined challengers: **Zone ramp** (A1–D stepped neutral tokens), **Claim–proof** (home claims paired with visible proof lines), **Force annotation** (plan/SQL figures carry mono tabular measured values), **Cue states** (reading position as named deep-linkable state).

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance.

## Unresolved

- No catalog QUALITY BAR card URL for this grounded (non-challenger) direction; finish packet will note absence if none is found.
- Comp-led vs code-led: **code-led** (no image generation in this environment); ambition lives in FIRST VIEWPORT + signature interaction above.
