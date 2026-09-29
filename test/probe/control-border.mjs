/**
 * Bounded probe: which rule actually paints each flagged control's border?
 *
 * `--control-edge` is declared in the base layer for `button, summary, input,
 * select, textarea, [role='button']`, but the sweep still reports the theme toggle
 * at 1.73:1. Either the toggle is not one of those elements, or a later rule wins
 * on specificity. This reports the element, its tag, every matching rule's winning
 * border colour and the resolved value, so the reason is a fact rather than a guess.
 */
import { chromium } from 'playwright';

const BASE = process.env.PROBE_BASE_URL ?? 'http://localhost:4400';
const ROUTE = '/01-proven-techniques/';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto(`${BASE}${ROUTE}`, { waitUntil: 'networkidle' });

const report = await page.evaluate(() => {
  const seen = [];
  for (const element of document.querySelectorAll(
    'button, summary, input, select, textarea, [role="button"], a',
  )) {
    if (element.closest('[aria-hidden="true"]')) continue;
    const style = getComputedStyle(element);
    for (const side of ['Top', 'Right', 'Bottom', 'Left']) {
      const width = Number.parseFloat(style[`border${side}Width`]);
      if (!(width >= 1)) continue;
      seen.push({
        tag: element.tagName.toLowerCase(),
        id: element.id || null,
        cls: String(element.className).slice(0, 44),
        side: side.toLowerCase(),
        color: style[`border${side}Color`],
      });
      break;
    }
  }
  return seen;
});

const controls = report.filter((row) => row.tag !== 'a');
console.log('non-anchor controls with a >=1px border:');
for (const row of controls) console.log(' ', JSON.stringify(row));
console.log('total anchors with a border:', report.filter((row) => row.tag === 'a').length);
await browser.close();
