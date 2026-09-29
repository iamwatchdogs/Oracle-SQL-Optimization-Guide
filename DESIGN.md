---
name: Oracle SQL Optimization Guidebook
description: Academic-preprint reading surface for evidence-graded Oracle SQL tuning — near-black paper, zone-ramp grade chips, scholarly serif.
colors:
  paper: '#0c0c0e'
  paper-raised: '#141417'
  paper-sunken: '#08080a'
  ink: '#ece8e0'
  ink-muted: '#a8a49c'
  ink-faint: '#9a958c'
  rule: '#2a2a2e'
  rule-strong: '#3a3a40'
  accent: '#8aa4ff'
  accent-hover: '#a3b8ff'
  accent-ink: '#0c0c0e'
  zone-a: '#e0dbd2'
  zone-b: '#b8b3a9'
  zone-c: '#aaa59c'
  zone-d: '#9e998f'
  light-paper: '#f7f5f0'
  light-paper-raised: '#fffefb'
  light-ink: '#1a1815'
  light-accent: '#2d4a9a'
  light-accent-hover: '#1e3a7a'
typography:
  display:
    fontFamily: 'Source Serif 4, Georgia, serif'
    fontSize: 'clamp(2.75rem, 6vw, 6rem)'
    fontWeight: 700
    lineHeight: 1.05
    letterSpacing: '-0.03em'
  title:
    fontFamily: 'Source Serif 4, Georgia, serif'
    fontSize: 'clamp(1.75rem, 3vw, 2.5rem)'
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: '-0.025em'
  headline:
    fontFamily: 'Source Serif 4, Georgia, serif'
    fontSize: 'clamp(1.35rem, 2vw, 1.75rem)'
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: '-0.02em'
  h3:
    fontFamily: 'Source Serif 4, Georgia, serif'
    fontSize: '1.25rem'
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: '-0.02em'
  body:
    fontFamily: 'Source Serif 4, Georgia, serif'
    fontSize: '1.125rem'
    fontWeight: 400
    lineHeight: 1.65
  abstract:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: 'clamp(1.05rem, 1.5vw, 1.25rem)'
    fontWeight: 400
    lineHeight: 1.6
  contribution:
    fontFamily: 'Source Serif 4, Georgia, serif'
    fontSize: '1.125rem'
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: '-0.01em'
  pager-title:
    fontFamily: 'Source Serif 4, Georgia, serif'
    fontSize: '1rem'
    fontWeight: 600
    lineHeight: 1.35
    letterSpacing: '-0.01em'
  label:
    fontFamily: 'Inter, system-ui, sans-serif'
    fontSize: '0.875rem'
    fontWeight: 500
    letterSpacing: 'normal'
  mono:
    fontFamily: 'JetBrains Mono, ui-monospace, monospace'
    fontSize: '0.8125rem'
    fontWeight: 400
    letterSpacing: '0.02em'
  running-head:
    fontFamily: 'JetBrains Mono, ui-monospace, monospace'
    fontSize: '0.6875rem'
    fontWeight: 400
    letterSpacing: '0.08em'
  grade-chip:
    fontFamily: 'JetBrains Mono, ui-monospace, monospace'
    fontSize: '0.6875rem'
    fontWeight: 600
    letterSpacing: '0.06em'
rounded:
  sm: '2px'
  scrollbar: '5px'
spacing:
  xs: '0.25rem'
  sm: '0.5rem'
  md: '1rem'
  lg: '1.5rem'
  xl: '2rem'
components:
  button-primary:
    backgroundColor: '{colors.accent}'
    textColor: '{colors.accent-ink}'
    rounded: '{rounded.sm}'
    padding: '14px 24px'
  button-primary-hover:
    backgroundColor: '{colors.accent-hover}'
    textColor: '{colors.accent-ink}'
    rounded: '{rounded.sm}'
    padding: '14px 24px'
  button-ghost:
    backgroundColor: 'transparent'
    textColor: '{colors.ink}'
    rounded: '{rounded.sm}'
    padding: '12px 20px'
  grade-chip:
    backgroundColor: 'rgba(236,232,224,0.06)'
    textColor: '{colors.zone-a}'
    rounded: '{rounded.sm}'
    padding: '4px 6px'
---

# Design System: Oracle SQL Optimization Guidebook

## Overview

**Creative North Star: "The Academic Preprint"**

A scholarly reading surface for junior developers learning evidence-graded Oracle SQL tuning. The world borrows the apparatus of a research preprint — title block, numbered contributions, running heads, zone-ramped evidence grades — and makes it navigable as a 37-page web book. Dark near-black paper is the default ground; light mode is a full palette swap, not a half-theme.

The build refuses the category defaults: no SaaS landing hero, no docs-portal card grid, no feature-metric strip. Structure comes from hairline rules, mono tabular metadata, and one solid accent for the primary path ("Begin at Preface").

**Key Characteristics:**

- Near-black paper (`#0c0c0e`) with stepped neutral zone ramp (A1–D) for evidence grades
- Source Serif 4 for all reading and display type; Inter for UI chrome only; JetBrains Mono for grades, citations, and measured figures
- One restrained ink accent (`#8aa4ff` dark / `#2d4a9a` light) for primary action and active wayfinding only
- Hairline title-block framing and rules instead of cards
- Sticky section TOC as margin apparatus (scroll-spy desktop, disclosure mobile)
- Force annotation: measured values (`E-Rows`, elapsed seconds) render as mono tabular inline figures

## Colors

Restrained Read-mode palette: paper ground, ink text, one accent, stepped zone neutrals.

### Primary

- **Near-black Paper** (`#0c0c0e`): Default page ground (dark mode). Title block, reading surface, header.
- **Ink Accent** (`#8aa4ff` dark / `#2d4a9a` light): Primary button fill, active TOC state, prose links, focus rings. Never used as large surface or body text color.

### Neutral

- **Raised Paper** (`#141417`): Jargon expanders, inline code chips, blockquotes.
- **Ink** (`#ece8e0`): Body and heading text on dark (16:1 on paper).
- **Ink Muted** (`#a8a49c`): Secondary text, descriptions, TOC idle links (7.9:1).
- **Ink Faint** (`#9a958c`): Mono metadata, running heads, contribution numbers (6.6:1).
- **Rule** (`#2a2a2e`) / **Rule Strong** (`#3a3a40`): Hairline dividers and title-block edges.

### Zone Ramp (A1–D)

Stepped neutrals encoding evidence grade — not rainbow chips:

- **Zone A** (`#e0dbd2`): A1/A2 chips (Oracle docs/briefs)
- **Zone B** (`#b8b3a9`): B1/B2 chips (papers)
- **Zone C** (`#aaa59c`): C1/C2 chips (tools) — 7.98:1 on dark paper
- **Zone D** (`#9e998f`): D chip (blogs — never proof alone) — 6.89:1 on dark paper

Zones C and D were raised from `#9a958c` / `#8a857c` to clear 7:1 and 6.5:1 on dark paper. The shipped token values are the accessible ones; light mode re-steps them to `#6b665e` / `#6d685f`.

**The One Accent Rule.** The accent appears on at most one solid control per viewport and on the active wayfinding state. Its rarity marks the path.

### Light Mode

Full swap under `[data-theme='light']`: paper `#f7f5f0`, ink `#1a1815`, accent `#2d4a9a`, zones inverted to dark-on-light steps. Code blocks stay github-dark in both modes.

## Typography

**Display / Body Font:** Source Serif 4 (Georgia fallback) — scholarly reading voice  
**UI Font:** Inter (system-ui fallback) — chrome, buttons, TOC labels only  
**Mono Font:** JetBrains Mono (ui-monospace fallback) — grades, `[S##]` IDs, measured figures, metadata

**Character:** Serif carries the preprint; mono carries the evidence; sans never competes for display.

### Hierarchy

- **Display** (700, clamp 2.75–6rem, lh 1.05, tracking -0.03em): Home title block only.
- **Title** (600, clamp 1.75–2.5rem, lh 1.2, tracking -0.025em): Page h1 on interior routes.
- **Headline** (600, clamp 1.35–1.75rem): Section h2 with bottom hairline rule.
- **Body** (400, 1.125rem, lh 1.65, measure 70ch): Long-form prose; `hyphens: auto`.
- **Label** (Inter 500, 0.875rem): Buttons, nav, TOC, jargon summaries.
- **Mono / Meta** (JetBrains 400, 0.8125rem, tracking 0.02em, uppercase): Running heads, breadcrumbs, grade chips, tabular metadata.

**The Measure Rule.** Body prose never exceeds 70ch. Display never exceeds 6rem. Tracking never tighter than -0.04em.

## Layout

Desktop interior: `--width-toc-rail` (280px) sticky TOC rail + centered reading column (`max-w-reading`, `--width-reading-track` 46rem) inside `w-shell` (72rem max). Home: full-bleed title block (hairline top/bottom) over a `max-w-contributions` (52rem) list, then centered `max-w-measure` (`--measure`, 70ch) prose.

**Every column track in a title block or a reading surface is a fixed length, never content-sized.** The home page's metadata margin is `--width-title-meta` (27.5rem) and the interior rail is `--width-toc-rail`. Both were `auto` or a bare literal once, and both reflowed their whole page when a disclosure inside them opened: an `auto` track resolves to its own max-content width, and the evidence key's panel is 150.14px wider at its widest than the summary that closes it, so opening it handed 150px to the `1fr` column and re-wrapped the display title onto an extra line. A track measured in `rem` cannot move, so nothing that depends on it can either.

Container widths are Tailwind utilities generated from `--width-shell` / `--width-shell-wide` and `--container-reading` / `--container-contributions` / `--container-measure`: `w-shell`, `w-shell-wide`, `max-w-reading`, `max-w-contributions`, `max-w-measure`. `--container-reading` resolves through `var(--width-reading-track)` rather than naming a literal, so a reader's measure control has something to move.

**The two caps on the reading column, and which one binds.** `--width-reading-track` (46rem) is the column; `--measure` (70ch) is the text inside it. At every desktop size the measure is the smaller of the two, so a control that moves only the track does nothing visible. Both are reader-controlled and they move together.

Mobile: single column; TOC collapses to a disclosure above content; contributions stack full-width; title block stacks metadata below CTAs.

Spacing rhythm: 8px base. Title block padding `clamp(2.5rem, 6vw, 4.5rem)`. Section h2 margin-top 2.5em (more above than below heading).

**Prose blocks are separated by one rhythm, and it is a length.** `--prose-rhythm` is `calc(var(--type-body) * 1.6)` on `:root`: 28.8px at the default size, against a 29.7px line box, so a paragraph break is almost exactly one blank line. It was `1.25em` per element, and `em` resolves against the element's OWN font-size — so a paragraph got 22.5px on 18px text and a code frame got 18px on its own 14.4px. The widest and heaviest block on the page was separated by LESS space than a paragraph got, and the rhythm disagreed with itself in four places at once. Declaring it as a length fixes both halves: a custom property's `em` is substituted where it is declared, so it resolves once and every consumer inherits the same distance whatever its own type is; and because it is built on `--type-body` it still moves with `--type-scale`, which is the one thing the `em` was getting right. A gap written in `rem` would have sat still while the type around it grew, and the page would get denser as a reader made it larger.

**Headings get more space than blocks, in descending order.** h2 `2.5em`, h3 `2em`, h4 `1.1 × the rhythm`, the rhythm. The h4 token was dead while it was written: the `>*+*` rule did not exclude `h4`, so at (0,3,6) against the plugin's (0,1,0) the sibling gap won and h4 measured 21.25px — the same as a plain block. Its own `1.5em` was 25.5px, which is _less_ than a paragraph break, so it is expressed against the rhythm instead, which also makes it impossible for a heading's leading to fall below a block's by editing one number.

Breakpoints: TOC rail appears at `lg` (1024px). Header nav links hide below `md`.

### Reader preferences

Three persisted choices, each one attribute on `<html>`, each written by the inline bootstrap in `BaseLayout.astro` before first paint and re-asserted by `src/lib/reading-prefs-controller.mjs` on `astro:after-swap`. The **default is the absence of the attribute**, not the default value, so a reader who never touched a control has no override in play and "back to default" is a real state rather than a fourth step.

| Attribute           | Values                      | What it moves                                                |
| ------------------- | --------------------------- | ------------------------------------------------------------ |
| `data-reading-text` | `0.9` · `1` · `1.1` · `1.2` | `--type-scale`, which multiplies every step in the type ramp |

| `data-reading-measure` | `60` · `70` · `75` | `--measure` in characters, and `--width-reading-track` with it |
| `data-reading-toc` | `collapsed` | the rail's grid track, its gutter, and the reading column's cap |

- **One scale for the whole ramp, and one place that opts out of it.** Every absolute `--type-*` step is `calc(<base> * var(--type-scale))`. A control that moved only `--type-body` grew the prose and left the headings, TOC labels, running heads and mono metadata exactly where they were, so the page came apart into two type systems the moment a reader touched it. `--type-citation` and `--type-annotation` are the two exceptions: they are `em`-relative already and must not be scaled twice.

**The home hero is that one place.** The reader's text size stops at the edge of the title block. The hero is a display composition — a display title, an abstract wrapped at `42ch`, a control, a metadata margin — and scaling it does not honour a reading preference so much as break an arrangement: the display title's cap is 6rem, and 1.2 turns that into 7.2rem, which re-wraps the abstract beneath it and hands the metadata margin a height it was never measured with. The prose and the contributions list, which is a separate `<section>` directly below, are reading material and scale normally.

**It takes re-declaring the ramp, not re-setting the multiplier, and the reason is a custom-property trap worth stating once.** A `var()` inside a custom property is substituted where that property is **declared**, not where it is used. The ramp is declared on `:root`, so `html[data-reading-text='1.2']` has already resolved `--type-display` to `calc(clamp(...) * 1.2)` by the time the hero inherits it — and a descendant re-setting `--type-scale: 1` changes nothing, because the inherited value no longer reads it. The five steps the hero renders (`--type-display`, `--type-abstract`, `--type-ui`, `--type-mono`, `--type-chip`) therefore each keep an authored `-base` twin, and `.hero-composition` re-declares all five against its own `--type-scale: 1`. That is a re-multiplication, not a second copy of the ramp: one authored value per step, and changing a base moves the hero with it.

- **The measure is reported in characters**, because that is the unit the stylesheet is written in and the number a reader of a 68-character book has a feel for.
- **The rail collapses its track, not its content.** Two tracks at both ends (`280px minmax(0,1fr)` ↔ `0px minmax(0,1fr)`) and the gutter with them; interpolating a two-track template to a single-track one is not a transition, it is a snap. The reading column is already `flex justify-center` inside that track, and the track is capped at the measure while the rail is shut, so the TEXT block — not merely the track — lands on the page's axis.
- **The rail is invisible to the tab order when shut.** `visibility: hidden` on the cell, delayed by 280ms so the links are present for as long as they have somewhere to be seen, and undelayed the instant the rail reopens. The control that brings it back is not in the cell at all — see the rail's control below.

## Elevation & Depth

**Flat by contract.** Depth is tonal: paper → raised → sunken. **No authored box-shadows exist in any theme** — dark, light, or code frames. Separation comes from 1px hairlines (`--rule` / `--rule-strong`) and tonal paper steps, never from blur or offset shadows.

Elevation is declared once: a 1px hairline or a tonal fill, never both stacked as a ghost card.

### Shadow Vocabulary

The vocabulary is deliberately empty.

- **No `--shadow-*` token** is declared in the theme, so no `shadow-*` utility is generated or available.
- **No Tailwind shadow utility** is used anywhere — not the stock shadow scale, not `drop-shadow-*` filters, and no transition on the shadow property. A transition that targets `box-shadow` is banned even when inert.
- **Expressive Code frames are flat.** The frames plugin ships a default `.frame` drop shadow; it is suppressed at the source with `styleOverrides.frames.frameBoxShadowCssValue: 'none'` in `astro.config.mjs`, so no CSS override is needed and light mode gets no special case.
- **Typography kbd is flat.** `--tw-prose-kbd-shadows` resolves to `transparent`, so the plugin's `0 0 0 1px …, 0 3px 0 …` composition paints nothing.

## Motion

Motion is enhancement, never meaning. Four mechanisms, no animation library.

**Exactly one sanctioned opacity transition, the route swap's zone choreography.** Opacity is allowed in exactly one place, and it is feedback about _where you are_ — never about content arriving within a page:

1. **Route swap zones** — the Astro `ClientRouter` route swap, each named piece of the page leaving, pausing, and returning over **910ms** in total. See Route choreography.

It is **navigation feedback**: it reports that the document is being replaced. **No prose, disclosure, or reading element may fade in** — that is content entrance, and it is forbidden.

A second sanctioned opacity used to live here: the persistent route loader's `transition-opacity` reveal. The loader is gone, and with it the second exception. There is no loading state in this design.

- **Title-block entrance**: transform-only `translateY(10px→0)`, 500ms `cubic-bezier(0.22, 1, 0.36, 1)`, staggered by `rise-1` … `rise-4`. The resting state is the first painted state. It plays **once per document**, not once per arrival: `data-title-entrance` is set by the head bootstrap and cleared on the first completed `astro:page-load` that is not the initial load, so the router re-creating that markup cannot restart a 740ms stagger underneath a 910ms zone swap.
- **Page transitions — sanctioned opacity #1, the zone choreography.** A route swap is not one page dissolving into another. It is the page coming apart in pieces, pausing, and building itself back up, which is what a page change actually is: the reader can see the running head, the rail, the reading column and the pager leave separately, sit absent, and return separately. Each moves over **240ms**, staggered **45ms** apart, and only the two edges travel. It is not a template for in-page motion — no element on a page may fade in from `opacity: 0`, and no separate opacity-0 entrance animation may be added alongside it.
- **Route choreography: the page comes apart, holds, and builds itself back up in reverse.** The whole thing is two staggers and a pause:

  - the page is divided into named zones — `rh` (running head), `rail`, `body` (the reading column), `pager-prev`, `pager-next`, and `body-home` (the home page's whole first viewport) with `meta` (its metadata margin) nested inside. The heading is not a zone at all, on either variant;
  - each zone fades **240ms** out on `cubic-bezier(0.4, 0, 1, 1)`, staggered **45ms** apart in page order: running head first, pager cell last;
  - then a **70ms** dead beat, in which the page is genuinely blank — every zone's departing half has reached `opacity: 0` and no arriving half has begun;
  - then each zone fades back in on `cubic-bezier(0, 0, 0.2, 1)`, **45ms** apart, in the **reverse** of the order it left, beginning only once every departure has finished.

  The departure runs **0–420ms** and the arrival **490–910ms**, for **910ms** in total. The reverse order is the whole effect: a reader who watches the running head leave first and the pager cell leave last sees a page disassemble and then rebuild from the bottom, rather than two pages sliding past one another. The blank beat is equally load-bearing — it is what makes the swap register as a page changing rather than as pixels moving, and it is the one moment in the interface where nothing from the page is on screen.

  **A zone has to BE the thing it names.** `body-home` sat on the home page's `<main>` for a while, and that `<main>` is only the prose at y=1535 — the title block, the abstract, the primary control and the contents list are its _siblings_. 93.0% of the first viewport therefore fell into `root`, which is pinned opaque, and the home page painted at full strength from t=0 of a section→home swap, underneath a section page still coming apart. A section page never showed it, because a section's `<main>` _does_ hold its whole reading column: 80.3% named against home's 7.0%. The lesson is not about the home page, it is that **the same kind of element meant different things on the two pages** and nothing measured the difference. `route-transition-coverage.spec.mjs` now samples the first viewport on a grid and asserts that the dominant zone covers it, and that no page hands most of it to `root`.

  **The home page is the one place the ordering inverts.** `body-home` is the entire first viewport, so it leaves at 180ms — last, after the furniture has started moving — and arrives at 490ms — first, before a reader who has just landed on the book is left looking at an empty frame. A section page reads bottom-up because the pager cells are where the eye already is. The ordering exists to serve the reader's position; it is not a rule.

  **The top bar and footer keep their pixels throughout.** They are not zones and live in the `root` snapshot, so they are painted for the whole swap. The wordmark, the `Contents` trigger and the theme toggle stay legible and stay put, and a reader mid-navigation never loses their bearings — the blank beat reads as the page changing underneath stable furniture rather than as the interface failing. The running head is page state, not chrome, so it does leave.

  **Two variants, chosen by what the reader did and not by where they landed.** `data-nav` on `<html>` is written by the `astro:before-preparation` hook in `BaseLayout.astro`. They share the ladder, the beat and the furniture; they differ in exactly one declaration:

  - `jump` — home to a section, section to section, any link that is not a pager cell. The furniture scatters: the rail leaves leftward, the metadata margin rightward, the running head and the reading column dissolve where they are. The arrival is the reverse.
  - `pager` — the next/previous cell, read from `rel="prev"` / `rel="next"`. A deliberate step along a linear book, so the reading column **rises into place** from 36px above rather than resolving where it stands — the page arrives from slightly ahead of the reader rather than under their feet. The rail and pager cells still come in from their own edges, so the divergence survives. Same 910ms, same 70ms blank, same rhythm as a jump.

  The heading is not a zone on either variant. It lives inside the reading column, so naming it separately would snapshot the same pixels twice and float a ghost of the title above the column for the length of the swap.

  **Every keyframe states `mix-blend-mode: normal`.** The UA puts two animations on `::view-transition-old/new(root)` — the fade, and `-ua-mix-blend-mode-plus-lighter` — and Astro's `astroFadeIn`/`astroFadeOut` bake `plus-lighter` into their own keyframes as well, so the two snapshots are **added** rather than drawn over one another. Addition is correct only while the two opacities sum to 1, and in the dead beat they sum to **zero**. Under those frames the paper shows through, and this paper is `#0c0c0e`: the swaps that were here dimmed the page in the middle of every chapter change and brought it back. vtbag.dev documents the same case — with a dark ground plus-lighter does not merely fail to help, the combined frame renders darker than either snapshot — and w3c/csswg-drafts#9276 is still open on fixing it for dark schemes, so it will not be fixed for us. The arriving half is the one this matters most for, because it is the half whose opacity actually reaches zero.

  The `root` pseudo needs its own rule for the same reason: it is the one pseudo carrying the UA blend whether or not it has a keyframe, and it is the gutter between the named pieces. It is pinned to `normal` over a zero-duration animation.

  The declarations are the `animation` **shorthand**, not longhands — the opposite of the previous design, and the reason the keyframes are spelled out. The UA's `mix-blend-mode` animation is a _second_ animation on the same pseudo-element, and a longhand cannot reach a second animation, so only the shorthand kills it. `mix-blend-mode: normal` inside the keyframes states the property outright rather than merely un-animating it, so a UA applying it at a different specificity still loses.

  **The zone selectors are bare, and that is not a shortcut.** Astro writes its default per-zone animation inside `@layer astro`, and an ancestor-qualified `html[data-nav='jump'] ::view-transition-old(body)` does not match the view-transition pseudo tree at all — those pseudo-elements hang off the document element, not off `<html>`'s box, so an ancestor-qualified selector never reaches them. Such a rule parses, appears in the CSSOM with the right declared value, and never applies, and the swap silently runs Astro's plain 180ms fade. Unlayered, a bare `::view-transition-old(body)` outranks the layer outright. The variant then travels by inherited custom properties instead, which do reach the pseudo tree.

  **No zone geometry.** `animation: none` on `::view-transition-group(*)`. A shared-element group morphs from the old box to the new one, and on this site those boxes have nothing in common: the home `<main>` is the full shell width while an interior one is a reading column inside a two-track grid, and the h1 is 96px on one and 40px on the other. That morph is the page-assembles-itself artifact — the UA was moving and scaling the shared `page-title` snapshot on its own 250ms **linear** curve while the page it belonged to cross-faded on 180ms, a 70ms tail of title still in flight over a page that had already arrived.

  **The two ladders are derived, not typed.** Both are written as offsets from four numbers — `--zone-dur`, `--zone-stagger`, `--zone-beat` and the travel distances — and every arrival delay is an offset from `--zone-enter-base`, which is the last departure's end plus the beat. Retiming the swap is therefore one edit, and there is no way for the arrival to drift out of step with the departure. That is not tidiness: the two ladders were independent literal lists until a retime moved the departure and left the arrival behind, and the swap ran its arrival into the middle of its own departure.

  `prefers-reduced-motion: reduce` names the view-transition pseudo-elements explicitly, because `*` does not reach them. That block is redundant on the native path — `<ClientRouter />` ships its own `!important` rule over the same selectors, and has since Astro 3.6 — and load-bearing on the `fallback="animate"` path, which drives the same visual through `[data-astro-transition-scope]` elements on the live DOM instead. Authoring it in both places is what keeps the two paths from drifting.

  `z-index` does the paint-order flip, because the two snapshots are siblings inside `::view-transition-image-pair` and default to tree order, which paints the new one on top. Every departing half is 2 and every arriving half is 1, stated explicitly rather than inherited, so each zone is a draw of the leaving piece over the arriving one and the composite is an ordinary source-over against this paper however little of either half is showing.

  **The zone selectors are bare, and that is not a shortcut.** Astro writes its default per-zone animation inside `@layer astro`, and an ancestor-qualified `html[data-nav='jump'] ::view-transition-old(body)` does not match the view-transition pseudo tree at all — those pseudo-elements hang off the document element, not off `<html>`'s box, so an ancestor-qualified selector never reaches them. Such a rule parses, appears in the CSSOM with the right declared value, and never applies, and the swap silently runs Astro's plain 180ms fade. Unlayered, a bare `::view-transition-old(body)` outranks the layer outright. The variant then travels by inherited custom properties instead, which do reach the pseudo tree.

  **No zone geometry.** `animation: none` on `::view-transition-group(*)`. A shared-element group morphs from the old box to the new one, and on this site those boxes have nothing in common: the home `<main>` is the full shell width while an interior one is a reading column inside a two-track grid, and the h1 is 96px on one and 40px on the other. That morph is the page-assembles-itself artifact — the UA was moving and scaling the shared `page-title` snapshot on its own 250ms **linear** curve while the page it belonged to cross-faded on 180ms, a 70ms tail of title still in flight over a page that had already arrived.

  **910ms is a budget, not a preference.** The stagger is 240ms of work with 45ms between pieces, and the dead beat is what makes it read as a page changing rather than a flicker. The 70ms of silence is the single most load-bearing number in the block: without it the departure and the arrival overlap, the two ladders stop being two, and the page never actually goes empty.

  `prefers-reduced-motion: reduce` names the view-transition pseudo-elements explicitly, because `*` does not reach them. That block is redundant on the native path — `<ClientRouter />` ships its own `!important` rule over the same selectors, and has since Astro 3.6 — and load-bearing on the `fallback="animate"` path, which drives the same visual through `[data-astro-transition-scope]` elements on the live DOM instead. Authoring it in both places is what keeps the two paths from drifting.

- **The rail collapse.** `grid-template-columns` and `gap` over 280ms on the same ease-out, plus a `translate` on the rail's control and a 180° `transform` on its arrow. Transform and layout, no opacity.
- **The rail's control is one control, and it travels.** There were two — a button at the rail's right edge and an "edge tab" on the shell's left edge — and pressing the first put the second 232px away, under a cursor that had not moved, with the chevron swapping between two static glyphs. There is now one button, `position: fixed`, rendered outside the rail's cell so it outlives a track that clips to zero width. It slides from the rail's right edge into the gutter as the rail closes and the arrow rotates 180° on the way, so the press and its consequence are the same object moving. It is never hidden and never re-created, which is why there is one `aria-expanded` rather than two. `top` is the rail's own sticky offset, so the two line up whenever the rail is sticking; at the very top of a page the rail sits 19px lower and the control is above its label, in the empty stretch of the running head's row. Below `lg` it is `display: none` — a phone has a disclosure instead of a rail, and a fixed element with no paint should not be in the tab order.
- **Research Notes — native `<details>`/`<summary>`.** The disclosure icon rotates 0° → 45° (plus → ×) on a 280ms `transition-transform` with `cubic-bezier(0.22, 1, 0.36, 1)`. The panel opens and closes **symmetrically** through the `disclosure-flow` `grid-template-rows: 0fr → 1fr` transition — never a one-way reveal — and `details::details-content` uses `allow-discrete` so content stays rendered through the close transition.
- **The two header dropdowns dismiss themselves; the other two disclosures do not.** The section list and the reading preferences carry `data-dropdown`, and they close on a press outside them, on focus leaving them, and on Escape — Escape handing focus back to the trigger, because the alternative is to drop a keyboard reader at the top of a 40-link document. They close on the **shared animated path**, never by setting `open = false`: a native close skips the 280ms row collapse, skips the padding release, and leaves the scroll re-anchors in `disclosure-reanchor.mjs` with a panel that vanished rather than one that is on its way. The evidence key and the mobile outline ship the same `<details>`, the same `.disclosure-flow` and the same 280ms, and deliberately do **not** dismiss: the evidence key is read in place, and a mobile outline that closed when focus left it would close on every link inside it. Choosing a preference does **not** close the panel — a second choice has to be reachable without reopening.
- **A press on a control is never an outside press, and focus moving _within_ a panel is not focus leaving it.** The first is what keeps a preference reachable; the second is what keeps the controls reachable by keyboard at all, since tabbing from a summary to the stepper fires a real `focusout` with a `relatedTarget` inside the same panel. A press on a header summary belongs to the sibling rule in `reading-prefs-controller.mjs`, which closes the other header disclosure synchronously — two rules racing for one panel means one of them closes it natively and the animation is lost, so the dismissal rule stands back.
- **The disclosure has a 40ms delay, in both directions, and so does its glyph.** 280ms of travel with zero of latency is still a snap: the row is at full height on the frame the press is reported on, so the panel reads as having been removed rather than folded away, and a pointer that drifted a pixel out of the panel while the reader was reaching for a control is enough to trigger it. 40ms buys the travel a moment of lead-in and costs nothing legible — the delay is not perceived as lag below about 100ms, so this is a quarter of the way there. One variable (`--disclosure-delay`) feeds the row, the padding release and the `::details-content` slide, and one rule gives `.disclosure-icon` the same delay, because the icon and the row are the same motion and a delay on one of them alone is a desync that costs more to explain than it is worth.
- **Reduced motion overrides everything.** One `@media (prefers-reduced-motion: reduce)` block sets `animation: none !important` and `transition: none !important` on `*`, `*::before`, `*::after`, and `details::details-content`, and forces `scroll-behavior: auto`. Components additionally carry `motion-reduce:transition-none` / `motion-reduce:animate-none`. The route swap's zone choreography is covered by the same block, and by an explicit override on the view-transition pseudo-elements below.

## Loading & Focus

**There is no loading state.** A persistent route loader was removed: three pulsing bars, a 180ms reveal gate, an 8000ms cap, `aria-busy` bookkeeping, and an `event.loader` wrapper. It was 258 lines of controller and 95 of timer plumbing guarding three `<span>` elements. Two reasons it had to go, and neither is aesthetic.

The first is that it never fired. Prefetch is on with `prefetchAll: true`, so a chapter change usually resolves from cache well inside the 180ms gate, and the loader correctly stayed hidden. The affordance existed almost entirely for the case it handled worst — a cold navigation on a slow connection — and even then it drew three bars at `--rule-strong`, 1.73:1 on the paper, over the top of the content the reader was trying to read. It competed with the thing it was reporting on.

The second is that it was three infinite `animate-pulse` animations compositing on every page forever, which is why `global.css` carried an `animation-play-state: paused` rule to freeze them at rest, and why `test/e2e/support/settle.mjs` had to know about it. A loading state that costs a rule in the global stylesheet to keep the page quiescent is not a cheap loading state.

- **Focus handoff — the one thing that was worth keeping.** After a successful client navigation `main#main` receives focus with `preventScroll: true`, so keyboard and screen-reader users land at the top of the new page without a scroll jump. The focus ring stays 2px accent at 2px offset. This lived inside the loader controller and would have been deleted with it; it now has its own module, `src/lib/route-focus.mjs`, containing nothing else.

  The reason it matters: a client-side swap destroys whatever had focus, and focus then falls to `<body>`. A keyboard reader who activates a link is given no indication that anything happened, and a screen-reader user is told nothing at all. It is not motion, and it is not loading state — it is the page saying which page you are on.

  It runs on `astro:page-load`, after the router has restored scroll, so the handoff cannot fight scroll restoration. A flag set on `astro:before-preparation` distinguishes a client navigation from the first paint, because `astro:page-load` fires for both and the initial load must not steal focus from a reader who has tabbed into the page and then reloaded.

- **Route announcements are swept, not left to accumulate.** Astro appends an `aria-live="assertive"` announcer to `<body>` on every completed navigation and never removes it. The focus handoff already conveys the change, so the announcement is a duplicate at best and an unbounded DOM leak at worst. A deferred sweep removes it after each navigation.

## Shapes

Radius vocabulary is a single step: **2px** on buttons, chips, code frames, pager links, jargon boxes. No pills, no 12px+ cards. Corners are slightly softened so the preprint does not read as raw terminal, not so soft as to read as SaaS.

Borders are 1px hairlines (`--rule` / `--rule-strong`). Side accent stripes >1px are forbidden (craft floor).

## Components

### Buttons

- **Shape:** 2px radius.
- **Primary:** Accent fill, accent-ink text, Inter 600 14px, padding 14×24. One per viewport max.
- **Hover:** Accent hover + `translateY(-1px)`. Focus: 2px accent outline, 3px offset.
- **Ghost:** Transparent, 1px rule-strong border, ink text. Hover: accent border + text.

### Chips (Grade)

- **Style:** Mono 11px, 1px currentcolor border, zone tint background (`--zone-chip-bg`), data-zone `a|b|c|d` maps to zone token.
- **Use:** Home metadata margin only (A1 A2 B1 B2 C1 C2 D). Never decorative.

### Cards / Containers

No cards. Structure is hairline rules and title-block framing. Jargon `<details>` and blockquotes use raised-paper fill + 1px rule border.

### Inputs / Fields

No form fields in current surfaces. Focus ring: 2px accent, 2px offset, 2px radius.

### Navigation

- **Header:** Sticky, opaque paper (`bg-paper`, no blur and no alpha), 1px rule bottom. Running-head wordmark left, Inter nav center (md+), theme toggle right.

**The three header triggers are quiet at rest and box themselves on approach.** They sat at `--control-edge` permanently, which put three 3.23:1 boxes in a header that already has a hairline under it — four horizontal lines inside 48px — and made the least important thing on the page the loudest. The theme toggle was a second problem: `text-ink` beside two `text-ink-muted` summaries, so it was one step louder in ink than its own neighbours.

At rest a trigger is a word and a glyph, with `border-transparent`. WCAG 1.4.11 asks for 3:1 on the visual information _required_ to identify a control, and a boundary is not required where the control says what it is — "Contents", "Reading", "Theme" are all well past 4.5:1, which is the argument `--control-edge` itself makes about not borrowing the decorative hairline. The box returns on hover, on open and on `focus-visible`, always at `--control-edge`, and `border-transparent` keeps the 1px box model reserved so its arrival moves nothing. All three share one resting ink, which is a stronger property to hold than any one control's colour, and it is what `hit-targets.test.mjs` now asserts.

- **Breadcrumb:** Mono uppercase meta above h1 — one register for the whole trail, including the last crumb.

**The last crumb is the same type as the rest of the trail.** It was the only element out of register: Source Serif at Tailwind's raw `text-sm`, 14px, `normal-case`, in a trail that is mono, uppercase and scaled. So the separator sat on one line box — mono, `--type-mono`, leading 1.65, which moves with the reader's text size — and the title on another, and the gap between them ran from 1.45px at the default size to 5.74px at 120%. It was also `display: block`, which put the `/` alone on the line above its own title: a 41.4px row for a 21.4px label. It is now mono like the rest, `inline-block` so the title shares the separator's line box, and it carries `aria-current="page"` with `--ink` against the trail's `--ink-faint` for the "you are here" signal — a typographic difference inside one register rather than a change of typeface and case.

**The separator is INSIDE its label.** A label is an `inline-block`, which is an atomic inline-level box, so a label too long for the space left on the current line moves to the next one whole and a sibling separator is stranded at the head of the line above. One flex item does not prevent that; the break happens between two atomic boxes. The separator is the label's own first child, `aria-hidden` so it stays out of the link's accessible name, and the two cannot come apart.

**The trail is capped at the measure, measured in the body face.** It is a child of the reading COLUMN, so its natural cap was `--width-reading-track` (46rem) while the h1 and the prose under it are capped at `--measure` (70ch) — 70px wider, and ~101px and ~119px at the other two measure steps. Left edges matched and right edges did not, so a long title truncated at an x nothing else on the page reached. And `--measure` is `70ch`, which resolves against the element's OWN font: `@layer base` puts `nav { font-family: var(--font-sans) }` on every nav, so the trail measured 70 characters of Inter (794.88px) while the article measured 70 of Source Serif (666.54px) — a cap 128px too loose, which the 46rem parent then beat, so `max-w-measure` on the trail did nothing at all. The nav declares `font-serif` for that reason alone; no glyph on the trail is drawn in the body face.

- **TOC:** Inter 14px; idle ink-muted; active accent text + accent-soft fill + 1px accent left border (≤1px per floor). Its header is a row — label left, `pr-12` reserving the 44px the fixed control covers — so the label holds its place at whatever width the rail is at.
- **Reading preferences:** a header disclosure of two `fieldset` groups — text size (four steps, each an `A` at 1.5× the step it selects, so a 10% step is still visibly a step) and line measure (three steps, labelled in characters). It is `absolute` and right-anchored at **every** width, unlike the section list which goes in flow below `48rem`: this panel is 320px of whitespace, and in flow it made the header 402.3px tall on an 844px viewport. The measure steppers are labelled in characters because that is the unit the stylesheet is written in; the scale steppers are their own preview and need no icon set.
- **Prev/next:** Bordered pager cells, mono labels, serif titles; hover accent border + soft fill.

### Signature Components

- **Title block:** Full-bleed hairline-framed block — display title, abstract, primary CTA, mono metadata margin with grade chips.
- **Contributions list:** Numbered mono index rows with serif titles and sans proof lines; hover accent-soft wash.
- **Measured values:** `.measured` mono tabular spans for `E-Rows`, elapsed seconds, multipliers — force annotation without altering content wording.
- **Keep-this takeaway:** Whole-paragraph strong → accent-soft tint + hairline top/bottom + italic (no side stripe).
- **Panel inset:** the framed disclosure's summary and its panel are inset the same `0.9rem` inside the frame. The inset lives on the panel's FLOW, not on its inner, because the inner must rest at exactly zero padding for the `0fr` close to collapse to exactly zero.

## Do's and Don'ts

### Do:

- **Do** keep the accent on one solid control and the active TOC state per viewport.
- **Do** render grades, citations, and measured numbers in JetBrains Mono with tabular figures.
- **Do** frame major regions with 1px hairlines and title-block rules, not cards.
- **Do** hold body measure at 70ch and display at max 6rem.
- **Do** theme browser surfaces (selection, caret, scrollbars, focus) from the palette tokens.
- **Do** ship dark as default with a complete light palette swap.

### Don't:

- **Don't** add kickers or eyebrows above headings (craft-floor ban).
- **Don't** use side accent stripes >1px on list items, callouts, or TOC rows.
- **Don't** put Unicode glyph icons where an authored SVG belongs (theme toggle, TOC caret).
- **Don't** introduce a second solid accent button or a hero-metric card grid.
- **Don't** add a box-shadow, a `--shadow-*` token, or a Tailwind `shadow-*` utility in any theme — depth is tonal.
- **Don't** reach for an animation library; the route swap's view-transition pseudo-elements, the disclosure, and the rail collapse are native Astro plus Tailwind core.
- **Don't** animate prose, a disclosure, or any other reading element in from opacity 0 — first paint is the resting state and in-page motion is transform-only. Exactly one opacity transition is sanctioned: the `ClientRouter` route swap's zone choreography. It is navigation feedback, never content entrance.
- **Don't** size a title-block or reading-surface column track by its content. `auto` tracks are how a 150px disclosure reflows a whole page.
- **Don't** move only one cap of the reading column. The track and the measure bind independently and the measure is the one that shows.
- **Don't** scale part of the type ramp. Every absolute `--type-*` step multiplies by `--type-scale`; the two `em`-relative steps must not.
- **Don't** let a persistent overlay position itself from a magic number when the element it mirrors has a grid.
- **Don't** rewrite, reorder, or reword the frozen notebook content.
