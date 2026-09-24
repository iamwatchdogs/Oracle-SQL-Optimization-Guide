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
  zone-c: '#9a958c'
  zone-d: '#8a857c'
  light-paper: '#f7f5f0'
  light-ink: '#1a1815'
  light-accent: '#2d4a9a'
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
- **Zone C** (`#9a958c`): C1/C2 chips (tools)
- **Zone D** (`#8a857c`): D chip (blogs — never proof alone)

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

Desktop interior: `280px` sticky TOC rail + centered reading column (`max-w-46rem`) inside `shell-wide` (80rem max). Home: full-bleed title block (hairline top/bottom) over a `52rem` contributions list, then centered `measure` prose.

Mobile: single column; TOC collapses to a disclosure above content; contributions stack full-width; title block stacks metadata below CTAs.

Spacing rhythm: 8px base. Title block padding `clamp(2.5rem, 6vw, 4.5rem)`. Section h2 margin-top 2.5em (more above than below heading).

Breakpoints: TOC rail appears at `lg` (1024px). Header nav links hide below `md`.

## Elevation & Depth

**Flat by default.** Depth is tonal: paper → raised → sunken. No card shadows on content surfaces. Expressive Code frames get a subtle shadow only in light mode (`0 1px 3px rgba(0,0,0,0.12)`).

Elevation is declared once — either a 1px border or a soft shadow, never both stacked as a ghost card.

### Shadow Vocabulary

- **Light-mode code frame** (`box-shadow: 0 1px 3px rgba(0,0,0,0.12)`): Expressive Code only, light theme.
- **Title-block entrance**: transform-only `translateY(10px→0)` 500ms ease-out — no opacity hold.

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

- **Header:** Sticky, paper/90 + blur, 1px rule bottom. Running-head wordmark left, Inter nav center (md+), theme toggle right.
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
- **Don't** animate content from opacity 0 — first paint is the resting state; motion is transform-only enhancement.
- **Don't** rewrite, reorder, or reword the frozen notebook content.
