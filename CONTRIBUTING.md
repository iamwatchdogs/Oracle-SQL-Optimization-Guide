# Contributing

Thank you for your work on the book. This guide explains how to set the project up, and how to send a change.

## Before you start

Run the site once before you write code. Put the output in the pull request.

Open an issue before you write code. Describe the symptom, not the fix. The maintainer assigns the issue to you.

The maintainer closes a pull request that has no linked issue. Open the issue first, then open the pull request.

Look for the issues labeled `good first issue` or `help wanted`. These labels mark the work that a new contributor can own.

## Requirements

| Requirement           | Version                   |
| --------------------- | ------------------------- |
| [Bun](https://bun.sh) | 1.4.2                     |
| Node.js               | Any version that runs Bun |

The `packageManager` field and the CI workflow pin the version of Bun. Leave it unchanged in your branch.

## Set the project up

Fork the repository. Then clone your fork:

```bash
git clone https://github.com/<your-username>/Oracle-SQL-Optimization-Guide.git
cd Oracle-SQL-Optimization-Guide
bun install
```

Start the site:

```bash
bun run dev
```

The dev server answers at <http://localhost:4321>.

Install the git hooks. The pre-commit hook formats the files that you stage. The pre-push hook runs the gates that CI runs.

```bash
bunx lefthook install
```

Install the browsers that the e2e suite drives:

```bash
bunx playwright install chromium firefox webkit
```

## Make the change

Create a branch after the issue:

```bash
git checkout -b fix/short-description
```

### Add a page

The book lives in [`contents/`](contents/). Each part is one directory. Each page is one markdown file.

Name a page with a two-digit prefix, then a short name. Use one dash between the words, for example `03-indexes-and-layout.md`. The landing page of a part is `index.md`.

Add front matter. The schema is in [`src/content.config.ts`](src/content.config.ts).

```yaml
---
title: Why Evidence Grades Decide What You Trust
description: One sentence on what the page answers.
order: 2
draft: false
---
```

`title` is the only field that the build requires. `order` is one sequence for the whole book. Give your page a number that no other page uses.

Write one claim per page. State the grade of the evidence behind the claim.

Put the source in the body, next to the claim. Use an S-number link, for example `[S60](https://github.com/tobymao/sqlglot)`. The appendix explains the format.

### Change the site

Read [`AGENTS.md`](AGENTS.md) first. It holds the repository rules that every change follows.

## Run the gates

Run these before you push:

```bash
bun run verify
```

This command runs oxlint, prettier, `astro check`, tsgo, vitest, the build, and the Playwright suite.

Open a second terminal to keep the site open while you work:

```bash
bun run dev
```

## Send the pull request

Name the branch after the issue. Use lower case and short words.

Write the commit message in the Conventional Commits format. The repository prefers these types:

| Type       | Use it for                                 |
| ---------- | ------------------------------------------ |
| `fix`      | A correction to existing behaviour         |
| `perf`     | A change that makes something faster       |
| `feat`     | A new feature or a new part                |
| `docs`     | A change to the prose or the documentation |
| `refactor` | A change to the structure, without a fix   |
| `test`     | A change to a test                         |
| `chore`    | A maintenance task                         |
| `ci`       | A change to a workflow                     |
| `seo`      | A change to metadata or to indexing        |

No tool checks the commit message. Write the subject in lower case. Explain the reason for the change in the body.

Push the branch to your fork. Then open a pull request against `main`.

Link the issue in the pull request. The `CI / verify` check runs on every pull request.

## Get help

Open an issue if the setup fails. Include the command, the output, and your version of Bun.

Use the `question` label if you need direction before you start.

## License

Send your contribution under the [MIT License](LICENSE).
