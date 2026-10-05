# Oracle SQL Optimization for Junior Devs

A short, free book that shows how to prove an Oracle SQL speed win before you ship it.

**[Read the book](https://iamwatchdogs.github.io/Oracle-SQL-Optimization-Guide/)**

[![CI](https://github.com/iamwatchdogs/Oracle-SQL-Optimization-Guide/actions/workflows/ci.yml/badge.svg)](https://github.com/iamwatchdogs/Oracle-SQL-Optimization-Guide/actions/workflows/ci.yml)
[![Deploy](https://github.com/iamwatchdogs/Oracle-SQL-Optimization-Guide/actions/workflows/deploy.yml/badge.svg)](https://github.com/iamwatchdogs/Oracle-SQL-Optimization-Guide/actions/workflows/deploy.yml)
[![Bun](https://img.shields.io/badge/bun-1.4.2-black)](https://bun.sh)

[![Astro](https://img.shields.io/badge/astro-7.3.3-BC52FF.svg)](https://astro.build)
[![Tailwind](https://img.shields.io/badge/tailwind-4-38BDF8.svg)](https://tailwindcss.com)
[![TypeScript](https://img.shields.io/badge/typescript-6-3178C6.svg)](https://www.typescriptlang.org)
[![Vitest](https://img.shields.io/badge/vitest-5-BBCB47.svg)](https://vitest.dev)
[![Playwright](https://img.shields.io/badge/playwright-1.63-2EAD33.svg)](https://playwright.dev)

## About this book

The repository is named `Oracle-SQL-Optimization-Guide`. The book inside it answers one question: how do you know that a query got faster?

The book holds 68 catalog entries. 66 of the entries are techniques. Each technique states the symptom that it answers. Each entry carries a grade for the evidence behind it. No entry asks you to trust the author.

You do not need a database to read the book. The labs use a toy schema that you create yourself.

## What's inside

The book has 10 parts. Read them in order.

| Part              | Path                                    | What it establishes                                               |
| ----------------- | --------------------------------------- | ----------------------------------------------------------------- |
| Preface           | `contents/00-preface/`                  | What an evidence grade is, and how to prove a win                 |
| Proven techniques | `contents/01-proven-techniques/`        | Five chapters, grouped by the symptom that you see                |
| Papers            | `contents/02-papers-behind-recipes/`    | Which sources can license an Oracle claim, and which cannot       |
| Toolbox           | `contents/03-toolbox/`                  | The instrument that answers each question                         |
| Recipes           | `contents/04-recipes/`                  | Frozen input, one change, named trials, rehearsed rollback        |
| Feedback loop     | `contents/05-feedback-loop/`            | Noise floor, accept-or-rollback gate, and when to stop            |
| The OSS guide     | `contents/06-oss-guide/`                | How to vet an external tool before you trust its output           |
| Appendix sources  | `contents/07-appendix-sources/`         | The citation system, and how to survive version drift             |
| Bonus: batch API  | `contents/08-bonus-batch-api/`          | The Anthropic Message Batches API. This part is not about Oracle. |
| Bonus: AI harness | `contents/09-ai-harness-composability/` | AI harness tool composability. This part is not about Oracle.     |

Most paths hold one markdown file per chapter, plus an `index.md` file. Each bonus part is a single `index.md` file.

## How the book grades a claim

Three rules shape every page.

**Every claim carries a grade.** A technique is not a technique because the author repeated it. Each entry names what turns it into a hypothesis instead of a result.

**Nothing runs against a live database to be written.** The book ships prose and SQL that you run yourself. Each script is written to be read before it is run.

**A repository fact belongs to a date.** Oracle changes its behavior between releases. An external tool changes its license and its maintenance state between months. Where a claim depends on either one, the appendix dates it.

## For agents

The book publishes a machine-readable index at [`/llms.txt`](https://iamwatchdogs.github.io/Oracle-SQL-Optimization-Guide/llms.txt). The index lists every page of the book. The index groups the pages by part. Each page has a short description.

The source is one markdown file per page under [`contents/`](contents/). The route that builds the index is [`src/pages/llms.txt.ts`](src/pages/llms.txt.ts).

## Building the site locally

This section is for contributors. If you only read the book, stop at [the live URL](https://iamwatchdogs.github.io/Oracle-SQL-Optimization-Guide/).

Install these requirements first:

- [Bun](https://bun.sh) 1.4.2. The version is pinned in `packageManager` and in CI.
- Node.js. Node works, but every command on this page assumes Bun.

Then build the site:

```bash
git clone https://github.com/iamwatchdogs/Oracle-SQL-Optimization-Guide.git
cd Oracle-SQL-Optimization-Guide
bun install
bun run dev
```

The dev server answers at <http://localhost:4321>.

Install the git hooks, so that your commits run the same gates as CI:

```bash
bunx lefthook install
```

Install the browsers that the e2e suite drives. You only need to do this once:

```bash
bunx playwright install chromium firefox webkit
```

### Scripts

| Command            | What it runs                                          |
| ------------------ | ----------------------------------------------------- |
| `bun run dev`      | Astro dev server                                      |
| `bun run build`    | Production build into `dist/`                         |
| `bun run preview`  | Astro preview server                                  |
| `bun run quality`  | oxlint, prettier, `astro check`, tsgo                 |
| `bun run test`     | Vitest unit and integration suites                    |
| `bun run test:e2e` | Playwright against a fresh build, with its own server |
| `bun run verify`   | Quality, test, build, then the e2e suite              |
| `bun run icons`    | Regenerate the favicon set and the social card        |

### Project layout

| Path        | What lives there                                          |
| ----------- | --------------------------------------------------------- |
| `contents/` | The book: one markdown file per page, grouped by part     |
| `src/`      | Layouts, the markdown pipeline, and the page routes       |
| `public/`   | Static assets that the server sends as-is                 |
| `test/`     | Vitest unit and integration suites, plus Playwright e2e   |
| `scripts/`  | Asset generators for the favicons and the social card     |
| `docs/`     | Working notes. The rendered book is the finished artifact |

### Gates

Run these before you push:

```bash
bun run quality   # oxlint, prettier, astro check, tsgo
bun run test      # vitest, unit and integration
bun run verify    # all of the above, then a build, then the e2e suite
```

The e2e suite starts its own server against a fresh build. You do not need to start the dev server first.

### Generated assets

The favicon set and the social card are drawn from the design tokens. Regenerate them after you change a color:

```bash
bun run icons
```

The files are checked in. A normal build never rewrites a binary.

## Contributing

Read [`AGENTS.md`](AGENTS.md) first. It holds the repository rules that every change must follow.

Open an issue before you write code. Describe the symptom, not the fix. The maintainer assigns the issue to you.

Send one pull request for one issue. Name the branch after the issue.

Run `bun run verify` before you push.

## Deploying

GitHub Actions builds and publishes the site. See [`.github/workflows/ci.yml`](.github/workflows/ci.yml) and [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). A push to `main` starts the deploy workflow.

Two settings live on the repository. A maintainer sets both.

- **Settings → Pages → Build and deployment → Source: GitHub Actions.** The deploy job has no target without this setting.
- **Settings → Branches → Protect `main`.** Add `CI / verify` to the list of required checks.

The two workflows run separately on purpose. The deploy workflow needs `pages: write`. The CI workflow stays read-only. Branch protection makes sure that a push to `main` cannot skip the gates.

A project site is served from `/<repo>/` rather than from `/`. The build sets `base` for this reason. Links in the prose are prefixed at render time.

## Provenance

This repository contains the book. The Oracle documentation and the papers named in the appendix belong to other people.

The appendix records what each source allows you to claim. Read [`contents/07-appendix-sources/`](contents/07-appendix-sources/) before you quote a source.
