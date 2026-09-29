/*
 * Reading a page's zones as the browser resolves them.
 *
 * `zone-swap.mjs` records what the choreography DID. This reads what a page actually
 * covers, and the two answer different questions — which is the whole point, because the
 * defect this exists to catch was invisible to the first and fatal to the second.
 *
 * A `view-transition-name` on the wrong element is a choreography that runs perfectly. The
 * animation records arrive, the delays are right, the compositor is clean, and the page
 * still arrives under the departing one, because the element carrying the name was not the
 * element the reader was looking at.
 *
 * Both reads below walk `document.styleSheets` for the generated `view-transition-name`
 * rules, because Astro scopes a template's `transition:name` to a build-unique
 * `data-astro-transition-scope` id and writes the name in a rule keyed on that id — never as
 * an inline style. The element attribute carries an id and nothing else.
 */
import { EXIT_ORDER } from './zone-swap.mjs';
import { ZONE_OF_SOURCE } from './zone-lookup.mjs';

/**
 * The zone names the built page declares.
 *
 * A page with no zone rules at all is a failure of this reader rather than of the page, and
 * an empty result is indistinguishable from one. So a rule-shape check comes first: if the
 * selector is absent the build has not emitted scoped names and the names cannot be read
 * here, which is a different thing from there being none.
 */
export const readZoneNames = (page) =>
  page.evaluate(() => {
    const names = new Set();
    let scoped = 0;

    for (const sheet of document.styleSheets) {
      let rules;
      try {
        rules = sheet.cssRules;
      } catch {
        /* A cross-origin sheet. None is here, but the guard costs nothing and its absence
           would surface as a confusing TypeError rather than as a skipped sheet. */
        continue;
      }

      for (const rule of rules) {
        const name = /view-transition-name:\s*([\w-]+)\s*;/u.exec(rule.cssText ?? '');
        if (!name) {
          continue;
        }

        if (rule.selectorText?.includes('data-astro-transition-scope')) {
          scoped += 1;
        }
        names.add(name[1]);
      }
    }

    return { names: [...names], scoped };
  });

/**
 * How much of the first viewport each zone covers, as a share of the viewport's area.
 *
 * Sampled on a 20x12 grid rather than walked element by element. The question is "does a zone
 * cover the screen", and a grid answers it at 240 points for a page that can hold tens of
 * thousands of elements. What that costs in precision is irrelevant at the scale of the
 * failure it catches, where one zone covered 0% of the viewport's content and the whole
 * arrival was handled by the residual.
 *
 * The residual is what no zone covers: the header, the footer, the gutters, the background.
 * That residual is `root`, which is pinned at opacity 1 and therefore never appears to move.
 */
export const readViewportCoverage = (page) =>
  page.evaluate(`(() => {
    const COLUMNS = 20;
    const ROWS = 12;
    const cellWidth = window.innerWidth / COLUMNS;
    const cellHeight = window.innerHeight / ROWS;
    const seen = new Map();
    let total = 0;
    const zoneOf = ${ZONE_OF_SOURCE};

    for (let column = 0; column < COLUMNS; column += 1) {
      for (let row = 0; row < ROWS; row += 1) {
        const element = document.elementFromPoint(
          column * cellWidth + cellWidth / 2,
          row * cellHeight + cellHeight / 2,
        );
        if (!element) continue;

        total += 1;
        const zone = zoneOf(element);
        if (zone) seen.set(zone, (seen.get(zone) ?? 0) + 1);
      }
    }

    const share = (count) => (count / total) * 100;
    const covered = [...seen.values()].reduce((sum, count) => sum + count, 0);

    return {
      named: Object.fromEntries([...seen].map(([zone, count]) => [zone, share(count)])),
      coveredByZones: share(covered),
      coveredByRoot: share(total - covered),
    };
  })()`);

/**
 * The zone that paints an element, or null.
 *
 * The helper is interpolated into the body rather than passed as an argument, because
 * `page.evaluate` serialises its argument to JSON and a function does not survive that —
 * the same boundary that makes `zone-swap.mjs` install its helpers as page globals. Passing
 * the source string and rebuilding it with `new Function` is the alternative and it fails
 * under a CSP that forbids it, which is not a trade worth making for a test helper.
 */
export const readZoneName = (page, selector) =>
  page.evaluate(
    `(() => {
      const zoneOf = ${ZONE_OF_SOURCE};
      return zoneOf(document.querySelector(${JSON.stringify(selector)}));
    })()`,
  );

/** Whether an element sits inside a named zone at all. */
export const readIsInsideAZone = async (page, selector) =>
  (await readZoneName(page, selector)) !== null;

/** The zones a section page is expected to have, in page order. */
export const SECTION_ZONES = EXIT_ORDER;

/** The zones the home page is expected to have. */
export const HOME_ZONES = ['body-home', 'meta'];
