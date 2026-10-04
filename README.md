# Oracle SQL Optimization for Junior Devs

A short, evidence-graded book about proving an Oracle SQL performance win before
you ship it. No database required to read it; the labs are written to be run
against a toy schema you create yourself.

> Prove every speed win twice. A short book from 68 proven Oracle fixes, tools,
> and safe ship habits.

**Read it at** <https://iamwatchdogs.github.io/Oracle-SQL-Optimization-Guide/>

[![CI](https://github.com/iamwatchdogs/Oracle-SQL-Optimization-Guide/actions/workflows/ci.yml/badge.svg)](https://github.com/iamwatchdogs/Oracle-SQL-Optimization-Guide/actions/workflows/ci.yml)
[![Deploy](https://github.com/iamwatchdogs/Oracle-SQL-Optimization-Guide/actions/workflows/deploy.yml/badge.svg)](https://github.com/iamwatchdogs/Oracle-SQL-Optimization-Guide/actions/workflows/deploy.yml)
[![Bun](https://img.shields.io/badge/bun-1.4.2-black)](https://bun.sh)

---

## What is here

Eight parts, meant to be read in order, then an appendix on how every claim is
checked. Each part opens with a decision map rather than a list of tricks.

| Part                      | What it establishes                                                      |
| ------------------------- | ------------------------------------------------------------------------ |
| Preface                   | What an evidence grade is, and how to prove a win                        |
| Proven techniques         | Five fixes, each with the symptom it answers and the gate it sits behind |
| Papers behind the recipes | Which sources can license an Oracle claim, and which cannot              |
| Toolbox                   | The instrument that answers which question                               |
| Recipes                   | Frozen input, one change, named trials, rehearsed rollback               |
| The feedback loop         | Noise floor, accept-or-roll back gate, and when to stop                  |
| The OSS guide             | Vetting an external tool before trusting its output                      |
| Appendix                  | The citation system, and surviving version drift                         |

## Why it is built this way

**Every claim is graded.** A technique is not a technique because it is
repeated. Each one names what would make it a hypothesis rather than a result,
and the preface is the map for reading those grades.

**Nothing runs against a live database to be written.** The book ships prose and
SQL you run yourself. Every script is designed to be read before it is run.

**A repository fact belongs to a date.** Oracle's behaviour changes between
releases, and an external tool's licence and maintenance state change between
months. Where a claim depends on either, the appendix says so and dates it.

## For agents

The book publishes a machine-readable index at
[`/llms.txt`](https://iamwatchdogs.github.io/Oracle-SQL-Optimization-Guide/llms.txt) —
one entry per chapter, grouped by part, each with a sentence on what the page is
for. The source is one markdown file per page under [`contents/`](contents/).

## Building it locally

Requires [Bun](https://bun.sh) 1.4.2 (the version pinned in
`packageManager` and CI). Node also works, but every command below assumes Bun
and the lockfile is Bun's.

```sh
git clone https://github.com/iamwatchdogs/Oracle-SQL-Optimization-Guide.git
cd Oracle-SQL-Optimization-Guide
bun install
bun run dev          # http://localhost:4321
```

To make the pre-commit and pre-push hooks run the same gates you see in CI:

```sh
bunx lefthook install
```

`SITE_BASE` moves the deployment prefix. Leave it unset for GitHub Pages; set it
to `/` to build for a host that serves from the origin root.

```sh
SITE_BASE=/ bun run build
```

### Project layout

| Path        | What lives there                                          |
| ----------- | --------------------------------------------------------- |
| `contents/` | The book: one markdown file per page, grouped by part     |
| `src/`      | Layouts, the markdown/rehype pipeline, and page scripts   |
| `public/`   | Static assets served as-is                                |
| `test/`     | Vitest unit and integration suites, plus Playwright e2e   |
| `scripts/`  | Asset generators (favicons, the social card)              |
| `docs/`     | Working notes; the rendered book is the finished artifact |

### Scripts

| Command            | What it runs                                         |
| ------------------ | ---------------------------------------------------- |
| `bun run dev`      | Astro dev server                                     |
| `bun run build`    | Production build into `dist/`                        |
| `bun run quality`  | oxlint, prettier check, `astro check`, tsgo          |
| `bun run test`     | Vitest unit and integration suites                   |
| `bun run test:e2e` | Playwright against a fresh build (starts its server) |
| `bun run verify`   | All of the above, plus a build                       |
| `bun run icons`    | Regenerate the favicon set and social card           |

### Checks

```sh
bun run quality   # lint, format, astro check, tsgo
bun run test      # vitest — unit and integration
bun run verify    # all of the above, then a build, then the e2e suite
```

`bun run test:e2e` drives a real browser against a real build and starts its own
server, so it needs no running dev server.

### Generated assets

The favicon set and the social card are drawn from the design tokens, not
hand-painted. Regenerate them after changing a colour:

```sh
bun run icons
```

They are checked in rather than built, so a normal build never rewrites a binary.

## Deploying

GitHub Pages, through Actions — see [`.github/workflows/ci.yml`](.github/workflows/ci.yml)
and [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml). Push to `main`;
the deploy workflow builds, uploads the artifact and publishes it.

Two settings live on the repository rather than in the code, and neither is
optional:

- **Settings → Pages → Build and deployment → Source: GitHub Actions.** Without
  this the deploy job has nowhere to publish to.
- **Settings → Branches → Protect `main`**, with the `CI / verify` check required.
  The two workflows are separate on purpose — deploy needs `pages: write`, and CI
  should stay read-only — so a _direct push to `main`_ would otherwise publish
  without being checked. Branch protection is what closes that.

The one thing to know about a project site is that GitHub Pages serves it from
`/<repo>/` rather than `/`, which is why `base` is set in `astro.config.mjs` and
why every link in the prose is prefixed at render time rather than in the source.

## Licence and provenance

The book is the work; the Oracle documentation and the papers named in the
appendix are other people's. What each one licenses you to claim is recorded in
[`07-appendix-sources/`](contents/07-appendix-sources/).
