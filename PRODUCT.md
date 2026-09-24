# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Junior-to-mid developers reading self-paced to learn evidence-based Oracle SQL optimization. They read linearly, chapter by chapter, and leave able to apply the measure-first method to real tuning work.

## Product Purpose

A 37-page static guidebook/playbook that teaches Oracle SQL optimization through evidence-graded techniques (A1–D), measurement harnesses, recipes, papers, tooling, and a lab-notebook feedback loop. Success means a reader finishes chapters and can prove a win with before/after measurement instead of repeating rumors.

## Positioning

Trust runs, not rumors: every claim carries an evidence grade and provenance, and no advice depends on live-DB access the reader does not have. A neighboring guide could copy tips; it could not as easily copy the graded-evidence discipline that tells a junior which tips to trust.

## Operating Context

- Static Astro site, `bun` runtime/package manager, content collection `notebook` sourced from `contents/` (37 markdown files).
- Linear book order driven by frontmatter `order`; 9 sections; prev/next navigation crosses section boundaries.
- SQL rendered by `astro-expressive-code` (github-dark themes, wrap enabled); mermaid pinned dark; rehype-mathjax + remark-math wired (unused by current content).
- Recurring content atoms: opening rhetorical questions, 1–2 `<details>` jargon expanders per page, inline citation tags (`[T-04]`, `[S06]`), a bolded `**Keep this:**` takeaway ending every page, hand-written section link lists.
- Chapter lengths range ~249–1002 words; heaviest sections are proven-techniques, recipes, feedback-loop.

## Capabilities and Constraints

- This design pass: content frozen — all 37 pages' wording, citations, and linear order stay exactly as-is; layouts, navigation, TOC, and the presentation of that content on the home page may be rebuilt.
- Reading environment: dark by default with a light/dark toggle; dark code blocks already match either mode.
- Prefer external, maintained dependencies (Tailwind v4, established motion/typography libs) over hand-rolled CSS, animations, or transitions.
- Changes must pass pre-commit/pre-push checks: `oxlint`, `prettier --check`, `astro check`, `tsgo --noEmit`, `astro build`.
- Package manager and runtime are `bun`; do not introduce npm/yarn/pnpm workflows.

## Evidence on Hand

- Full content inventory: `contents/index.md` (home + master TOC) and 9 section trees under `contents/00-preface/` … `contents/08-bonus-batch-api/`.
- `astro.config.mjs` with integration order mermaid → expressive-code → mdx → sitemap; `site` still placeholder `https://example.com`.
- No PRODUCT/DESIGN/styling assets existed before this file; no fonts, no CSS, no layouts/ or components/.
- `.agents/prompts/main.prompt.md` contains design notes written for a different target project (CCDV-F); its file references are stale here and it is not a binding brand authority for this repo.
- `README.md` is empty.

## Product Principles

1. Content first: the design serves reading and comprehension; it never obscures or rewrites the material.
2. Evidence over rumor: the interface should feel measured and trustworthy, matching the book's grading discipline.
3. Linear book, jumpable structure: cover-to-cover reading stays the primary path, with wayfinding that supports recipe/toolbox lookup.
4. Prefer maintained external tooling over bespoke front-end machinery.

## Accessibility & Inclusion

- Body text contrast at least 4.5:1 in both color modes, targeting 7:1 for long-form reading.
- Dark is default but not mandatory: the toggle must reach a readable light mode, not a broken half-theme.
- Long reading sessions: measure, line-height, and heading rhythm tuned for sustained technical prose on desktop and mobile.
