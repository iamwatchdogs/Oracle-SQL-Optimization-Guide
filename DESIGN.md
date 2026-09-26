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
- **Body** (400, 1.125rem, lh 1.65, measure 68ch): Long-form prose; `hyphens: auto`.
- **Label** (Inter 500, 0.875rem): Buttons, nav, TOC, jargon summaries.
- **Mono / Meta** (JetBrains 400, 0.8125rem, tracking 0.02em, uppercase): Running heads, breadcrumbs, grade chips, tabular metadata.

**The Measure Rule.** Body prose never exceeds 68ch. Display never exceeds 6rem. Tracking never tighter than -0.04em.

## Layout

Desktop interior: `280px` sticky TOC rail + centered reading column (`max-w-reading`, 46rem) inside `w-shell-wide` (80rem max). Home: full-bleed title block (hairline top/bottom) over a `max-w-contributions` (52rem) list, then centered `max-w-measure` (68ch) prose.

Container widths are Tailwind utilities generated from `--width-shell` / `--width-shell-wide` and `--container-reading` / `--container-contributions` / `--container-measure`: `w-shell`, `w-shell-wide`, `max-w-reading`, `max-w-contributions`, `max-w-measure`.

Mobile: single column; TOC collapses to a disclosure above content; contributions stack full-width; title block stacks metadata below CTAs.

Spacing rhythm: 8px base. Title block padding `clamp(2.5rem, 6vw, 4.5rem)`. Section h2 margin-top 2.5em (more above than below heading).

Breakpoints: TOC rail appears at `lg` (1024px). Header nav links hide below `md`.

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

**Exactly two sanctioned opacity transitions, both 180ms.** Opacity is allowed in exactly two places, and both are feedback about _where you are_ — never about content arriving:

1. **Whole-page cross-fade** — the Astro `ClientRouter` route swap, `fade` at **180ms**.
2. **Loader state reveal** — the persistent route loader fading in/out, `transition-opacity` at **180ms**.

Both are **navigation or state feedback**: one reports that the document is being replaced, the other reports that a route is still preparing. Neither reveals content that is already on the page. **No prose, disclosure, or reading element may fade in** — that is content entrance, and it is forbidden.

- **Title-block entrance**: transform-only `translateY(10px→0)`, 500ms `cubic-bezier(0.22, 1, 0.36, 1)`, staggered by `rise-1` … `rise-4`. The resting state is the first painted state.
- **Page transitions — sanctioned opacity #1, whole-page cross-fade.** Route swaps use the built-in `fade` animation at **180ms**: a pure opacity cross-fade between the outgoing document and the incoming one. It is permitted because a route swap replaces the whole page rather than revealing content inside it. It is not a template for in-page motion — no element on a page may fade in from `opacity: 0`, and no separate opacity-0 entrance animation may be added alongside it.
- **Loader state reveal — sanctioned opacity #2, state feedback.** The persistent route loader toggles `opacity-0` ↔ `opacity-100` on `transition-opacity duration-[180ms]`, matching the 180ms reveal threshold. It is feedback about an in-flight navigation, not content entrance: it renders no prose and reveals nothing that is already readable.
- **Research Notes — native `<details>`/`<summary>`.** The disclosure icon rotates 0° → 45° (plus → ×) on a 280ms `transition-transform` with `cubic-bezier(0.22, 1, 0.36, 1)`. The panel opens and closes **symmetrically** through the `disclosure-flow` `grid-template-rows: 0fr → 1fr` transition — never a one-way reveal — and `details::details-content` uses `allow-discrete` so content stays rendered through the close transition.
- **Reduced motion overrides everything.** One `@media (prefers-reduced-motion: reduce)` block sets `animation: none !important` and `transition: none !important` on `*`, `*::before`, `*::after`, and `details::details-content`, and forces `scroll-behavior: auto`. Components additionally carry `motion-reduce:transition-none` / `motion-reduce:animate-none`. Both sanctioned opacity transitions are covered by the same block.

## Loading & Focus

- **Persistent skeleton.** A `transition:persist`-carried route loader lives outside the swapped page. It is invisible at rest (`opacity-0`, `pointer-events-none`) and reveals **only after 180ms of route preparation**, so fast navigations never flash it. Its `transition-opacity` is `duration-[180ms]`, matching the reveal threshold. It is `role="status" aria-live="polite"` with an `sr-only` "Loading requested page" message, and its three bars pulse on `bg-paper-raised` with `motion-reduce:animate-none`.
- **Cancellation.** Each navigation arms a 180ms timer on `astro:before-preparation`; an abort, an error, or a prevented default clears the timer, hides the loader, and drops `aria-busy`.
- **Busy marking.** `main` carries `aria-busy="true"` for the duration of the pending navigation and it is always removed on settle.
- **Focus handoff.** After a successful navigation `main#main` receives focus with `preventScroll: true`, so keyboard and screen-reader users land at the top of the new page without a scroll jump. The focus ring stays 2px accent at 2px offset.

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
- **Breadcrumb:** Mono uppercase meta above h1.
- **TOC:** Inter 14px; idle ink-muted; active accent text + accent-soft fill + 1px accent left border (≤1px per floor).
- **Prev/next:** Bordered pager cells, mono labels, serif titles; hover accent border + soft fill.

### Signature Components

- **Title block:** Full-bleed hairline-framed block — display title, abstract, primary CTA, mono metadata margin with grade chips.
- **Contributions list:** Numbered mono index rows with serif titles and sans proof lines; hover accent-soft wash.
- **Measured values:** `.measured` mono tabular spans for `E-Rows`, elapsed seconds, multipliers — force annotation without altering content wording.
- **Keep-this takeaway:** Whole-paragraph strong → accent-soft tint + hairline top/bottom + italic (no side stripe).

## Do's and Don'ts

### Do:

- **Do** keep the accent on one solid control and the active TOC state per viewport.
- **Do** render grades, citations, and measured numbers in JetBrains Mono with tabular figures.
- **Do** frame major regions with 1px hairlines and title-block rules, not cards.
- **Do** hold body measure at 68ch and display at max 6rem.
- **Do** theme browser surfaces (selection, caret, scrollbars, focus) from the palette tokens.
- **Do** ship dark as default with a complete light palette swap.

### Don't:

- **Don't** add kickers or eyebrows above headings (craft-floor ban).
- **Don't** use side accent stripes >1px on list items, callouts, or TOC rows.
- **Don't** put Unicode glyph icons where an authored SVG belongs (theme toggle, TOC caret).
- **Don't** introduce a second solid accent button or a hero-metric card grid.
- **Don't** add a box-shadow, a `--shadow-*` token, or a Tailwind `shadow-*` utility in any theme — depth is tonal.
- **Don't** reach for an animation library; page transitions, the disclosure, and the skeleton are native Astro plus Tailwind core.
- **Don't** animate prose, a disclosure, or any other reading element in from opacity 0 — first paint is the resting state and in-page motion is transform-only. Only two opacity transitions are sanctioned, both 180ms: the whole-page `ClientRouter` cross-fade and the persistent loader state reveal. Both are navigation or state feedback, never content entrance.
- **Don't** rewrite, reorder, or reword the frozen notebook content.
