/**
 * PROBE — site-nav panel geometry at 390px.
 *
 * Run: `bun test/probe/probe-nav-panel.mjs` (needs the dev server on :4321).
 *
 * Origin: `test/e2e/navigation.spec.mjs` asserts the mobile site-nav panel is
 * wider than 200px and got 71.78. The panel is
 * `absolute right-0 … w-[min(22rem,calc(100vw_-_2rem))] max-[48rem]:fixed
 * max-[48rem]:left-4 max-[48rem]:right-4 max-[48rem]:w-auto`, so at 390px the
 * offsets alone imply 390 − 32 = 358. Something else is being measured.
 *
 * Promotion map: the resolved answer is asserted in
 * `test/e2e/site-nav.spec.mjs`.
 */
import { withPage, DEV_SERVER, MOBILE } from './harness.mjs';

const PANEL_SELECTOR = 'header details > div';

const result = await withPage(
  MOBILE,
  '/02-papers-behind-recipes/02-oracles-own-papers/',
  async (page) => {
    await page.locator('header details > summary').click();
    await page
      .waitForSelector(`${PANEL_SELECTOR}[data-open], header details[open] ${PANEL_SELECTOR}`, {
        state: 'attached',
      })
      .catch(() => {});
    await page.waitForTimeout(400);

    return page.evaluate(async (selector) => {
      /* Force the open state and measure inside ONE evaluate. A toggle click is
       not idempotent, and splitting open from measure lets the collapsed
       `grid-template-rows: 0fr` row (71.78px) be reported instead of the
       overlay. Waiting for the transition to finish before reading keeps the
       measurement off the animation. */
      document.querySelector('header details').setAttribute('open', '');
      await new Promise((resolve) => setTimeout(resolve, 450));

      /* A `position: fixed` element whose used `left` resolves against the
       * <details> rather than the viewport means an ancestor established a
       * containing block (transform / filter / backdrop-filter / contain /
       * will-change / content-visibility). Walk up and report the culprit. */
      const containingBlockCulprits = [];
      const panel = document.querySelector('header details > div');
      for (let el = document.querySelector('header details > div'); el; el = el.parentElement) {
        const s = getComputedStyle(el);
        // Only these establish a containing block for `position: fixed`.
        const props = {
          transform: s.transform,
          translate: s.translate,
          rotate: s.rotate,
          scale: s.scale,
          filter: s.filter,
          backdropFilter: s.backdropFilter,
          perspective: s.perspective,
          contain: s.contain,
          willChange: s.willChange,
        };
        const offending = Object.entries(props).filter(
          ([, v]) => v && v !== 'none' && v !== 'normal' && v !== 'auto',
        );
        if (offending.length > 0) {
          containingBlockCulprits.push({
            tag: el.tagName.toLowerCase(),
            cls: String(el.className || '').slice(0, 70),
            offending: Object.fromEntries(offending),
          });
        }
      }

      const details = document.querySelector('header details');
      const summary = details.querySelector('summary');
      const siblings = [...summary.parentElement.children].map((el) => ({
        tag: el.tagName.toLowerCase(),
        cls: String(el.className || '').slice(0, 90),
        rect: (() => {
          const r = el.getBoundingClientRect();
          return {
            left: +r.left.toFixed(2),
            right: +r.right.toFixed(2),
            width: +r.width.toFixed(2),
            height: +r.height.toFixed(2),
          };
        })(),
        position: getComputedStyle(el).position,
        width: getComputedStyle(el).width,
        left: getComputedStyle(el).left,
        right: getComputedStyle(el).right,
        display: getComputedStyle(el).display,
      }));
      return {
        containingBlockCulprits,
        fixedTest: {
          offsetParent: panel.offsetParent?.tagName.toLowerCase() ?? null,
          offsetParentCls: String(panel.offsetParent?.className ?? '').slice(0, 60),
          // Empirically: nudge `left` to 0 and see whether the box tracks the
          // viewport or the details.
          beforeLeft: +panel.getBoundingClientRect().left.toFixed(2),
        },
        /* Decisive: strip every property that could create a containing block and
         re-measure. If the width jumps to 358 the culprit is one of them. */
        isolationTest: (() => {
          const before = panel.getBoundingClientRect().width;
          const saved = [];
          for (const el of [panel, panel.parentElement, panel.closest('header'), document.body]) {
            saved.push([el, el.getAttribute('style')]);
          }
          for (const el of [panel.closest('header'), document.body, document.documentElement]) {
            el.style.setProperty('contain', 'none');
            el.style.setProperty('filter', 'none');
            el.style.setProperty('transform', 'none');
            el.style.setProperty('will-change', 'auto');
            el.style.setProperty('content-visibility', 'visible');
            el.style.setProperty('backdrop-filter', 'none');
          }
          const after = panel.getBoundingClientRect().width;
          for (const [el, style] of saved) {
            if (style === null) el.removeAttribute('style');
            else el.setAttribute('style', style);
          }
          return { before: +before.toFixed(2), after: +after.toFixed(2) };
        })(),
        /* And: does forcing `position: absolute` on the panel reproduce the
         details-relative geometry? */
        absoluteTest: (() => {
          const saved = panel.style.position;
          panel.style.position = 'absolute';
          const r = panel.getBoundingClientRect();
          const out = { width: +r.width.toFixed(2), left: +r.left.toFixed(2) };
          if (saved) panel.style.position = saved;
          else panel.style.removeProperty('position');
          return out;
        })(),
        computed: (() => {
          const d = getComputedStyle(details);
          const p = getComputedStyle(document.querySelector('header details > div'));
          return {
            viewportWidth: window.innerWidth,
            detailsPosition: d.position,
            panel: { position: p.position, left: p.left, right: p.right, width: p.width },
            max48Matches: window.matchMedia('(width < 48rem)').matches,
          };
        })(),
        open: details.hasAttribute('open'),
        summaryFollowingSibling: (() => {
          const next = summary.nextElementSibling;
          const r = next.getBoundingClientRect();
          return {
            tag: next.tagName.toLowerCase(),
            width: +r.width.toFixed(2),
            left: +r.left.toFixed(2),
          };
        })(),
        siblings,
      };
    }, PANEL_SELECTOR);
  },
);

console.log(JSON.stringify(result, null, 1));
console.log('\ndev server:', DEV_SERVER);
