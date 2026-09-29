# Probes

Diagnostic scripts, not tests. Each one prints the **computed layout of a real
page** (or a dump of the **compiled stylesheet**) so a defect can be localised
before a spec exists to guard it. They exist because every real bug found in
this project was invisible to the type of assertion that was already in place.

Run them individually:

```sh
bun test/probe/probe.mjs
bun test/probe/p4.mjs
```

The browser probes talk to the **already-running dev server on
`http://localhost:4321`** (override with `PROBE_BASE_URL`). Nothing here starts
or stops a server, and nothing outside `test/` is written to.

**Do not delete a probe.** When a probe finds something, promote the _check_ to
a real spec (see the table), then leave the probe in place — it stays useful the
next time a layout number looks wrong.

## Promotion map

Every probe finding is now guarded by a real test.

| Probe                        | What it found                                                                                                                                                                                                                                                                                                              | Now guarded by                                                                                                                            |
| ---------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `probe.mjs`                  | Table cells shipped `padding: 7.875px 9px 9px 0px` — the plugin's zero-edge first/last-cell padding won the `utilities` cascade layer over the authored `components` rules. Inline `<code>` rendered `font-weight: 600`. TOC label overflowed its 280px rail. `<details>` summary padding was `0px`.                       | `test/e2e/tables.spec.mjs`, `test/integration/prose-cascade.test.mjs`, `test/e2e/reading-toc.spec.mjs`, `test/e2e/disclosure-ui.spec.mjs` |
| `probe2.mjs`                 | The 390px overflow chain. Isolated `.task-list-item` as the widest node.                                                                                                                                                                                                                                                   | `test/e2e/mobile-layout.spec.mjs`                                                                                                         |
| `probe3.mjs`                 | Route-by-route escaping-overflow sweep at 390px.                                                                                                                                                                                                                                                                           | `test/e2e/mobile-layout.spec.mjs`, `test/e2e/tables.spec.mjs`                                                                             |
| `probe4.mjs`                 | The narrow 391–430px overflow band.                                                                                                                                                                                                                                                                                        | `test/e2e/mobile-layout.spec.mjs`                                                                                                         |
| `probe5.mjs`                 | Table box metrics: `display`, `width`, `overflow-x`, `scrollWidth` vs `clientWidth`.                                                                                                                                                                                                                                       | `test/e2e/support/tables.mjs` → `test/e2e/tables.spec.mjs`                                                                                |
| `probe6.mjs`                 | `body` children `scrollWidth`; `mt-auto` on the footer inert because `body` was not a flex column.                                                                                                                                                                                                                         | `test/e2e/pager-and-404.spec.mjs` → "pushes the footer to the bottom of a short page"                                                     |
| `probe7.mjs`                 | Leaf-level overflow finder — narrowed 162 offenders to the single `li`/`code` that mattered.                                                                                                                                                                                                                               | `test/e2e/mobile-layout.spec.mjs` → `findEscapingOverflow`                                                                                |
| `probe8.mjs`                 | `.prose .task-list-item { display: flex }` promoted every inline run to a flex item, laying a sentence of eight `<code>` spans out as one 868px row.                                                                                                                                                                       | `test/e2e/mobile-layout.spec.mjs` → "renders a task-list item as wrapped prose, not a row of chips"                                       |
| `probe9.mjs`                 | `Range.getClientRects()` showed one 373px line box: a `/`-joined identifier chain that `overflow-wrap: anywhere` and `break-word` on the _chip_ both refuse to break. Only `break-word` inherited by the container fixes it.                                                                                               | `test/e2e/mobile-layout.spec.mjs` → "breaks a /-joined identifier chain"; `test/integration/prose-cascade.test.mjs`                       |
| `probe-collapse-samples.mjs` | The frame-sampled collapse curve. Was an e2e assertion; it asserted the last sampled frame landed on the finished state, which raced `transitioncancel` and flaked on every engine. The deterministic half of the claim (a declared 280ms transition + a settled `0px` row) is asserted in `test/e2e/disclosure.spec.mjs`. |
| `probe-header-height.mjs`    | Mobile header height closed vs open, and the panel's box. Found the 96px closed header (`basis-full` applied unconditionally) and the 905px open one.                                                                                                                                                                      |
| `probe-nav-panel.mjs`        | Site-nav panel geometry and the containing-block chain. Found that `position: fixed` inside a `<details>` resolves against the summary box, because `::details-content` implies `contain: layout paint size`.                                                                                                              |
| `probe-escaping.mjs`         | Which elements escape the viewport at 390px, with full ancestor chains. Used to confirm the mobile menu rewrite reached zero escapes on every route.                                                                                                                                                                       |
| `opencode-dbg.mjs`           | Tailwind preflight (`* { padding: 0 }`, base layer) reaches a disclosure inner — invisible until `css-selectors.mjs` learned to match comma-separated selector lists.                                                                                                                                                      | `test/integration/disclosure-native-fallback.test.mjs` → "the closed disclosure inner still rests at exactly zero padding"                |
| `p1.mjs`                     | `[...slug].astro` element inventory for hit-target auditing.                                                                                                                                                                                                                                                               | `test/integration/hit-targets.test.mjs`                                                                                                   |
| `p2.mjs`                     | Every compiled rule declaring `rotate` — proved the chevron uses the `rotate` property, not `transform`.                                                                                                                                                                                                                   | `test/e2e/disclosure-ui.spec.mjs` → chevron rotation test                                                                                 |
| `p3.mjs`                     | `.disclosure-icon` rule matching across `details` states.                                                                                                                                                                                                                                                                  | `test/integration/disclosure-css.test.mjs`                                                                                                |
| `p4.mjs`                     | `grid-template-rows` resolution for closed / open / closing flows.                                                                                                                                                                                                                                                         | `test/integration/disclosure-css.test.mjs`                                                                                                |
| `p5.mjs`                     | Which declarations reach a disclosure inner after the selector-matcher fix.                                                                                                                                                                                                                                                | `test/integration/disclosure-native-fallback.test.mjs`                                                                                    |
| `p6.mjs`                     | Every `transition-property` in the compiled sheet — used to find undocumented motion durations.                                                                                                                                                                                                                            | `test/integration/design-metadata.test.mjs`, `test/e2e/disclosure-ui.spec.mjs` → motion describe                                          |
| `p7.mjs`                     | Compiled rules keying off `[open]` without the `[data-disclosure-closing]` exemption.                                                                                                                                                                                                                                      | `test/integration/disclosure-css.test.mjs` → "no summary rule keys off the open state without exempting the closing state"                |

## Catalogues

- `p1.mjs` — `src/pages/[...slug].astro` link inventory
- `p2.mjs` — compiled `rotate` declarations
- `p3.mjs` — `.disclosure-icon` rule matching
- `p4.mjs` — `grid-template-rows` resolution
- `p5.mjs` — declarations reaching `.disclosure-content-inner`
- `p6.mjs` — compiled `transition-property` declarations
- `p7.mjs` — `[open]` rules missing the closing exemption
- `probe.mjs` — table cells, inline code, TOC truncation, `<details>` inventory
- `probe2.mjs` – `probe9.mjs` — the 390px overflow hunt, narrowing 162 offenders to one
- `probe-collapse-samples.mjs` — the frame-sampled collapse curve (diagnostic)
- `probe-header-height.mjs` — mobile/desktop header height and panel box, closed and open
- `probe-nav-panel.mjs` — site-nav panel geometry and its containing-block chain
- `probe-escaping.mjs` — what escapes the viewport at 390px, with ancestor chains
- `opencode-dbg.mjs` — the preflight reset reaching a disclosure inner
