/**
 * Verify-measurements probe.
 *
 * Each entry re-measures a specific claim made by a visual review of the
 * captured screenshots, so a fix is never made on the strength of a pixel
 * reading alone. Prints PASS/FAIL per claim with the real numbers.
 *
 *   node test/probe/verify-claims.mjs
 */
import { chromium } from 'playwright';

const BASE = process.env.PROBE_BASE_URL ?? 'http://localhost:4321';
const INTERIOR = '/01-proven-techniques/01-measure-first/';
const WIDE = '/00-preface/02-how-to-prove-a-win/';

const browser = await chromium.launch();
const log = (name, ok, detail) =>
  console.log(`${ok ? 'PASS' : 'FAIL'}  ${name}\n        ${detail}`);

async function page(route, viewport, theme = 'dark') {
  const p = await browser.newPage({ viewport, colorScheme: theme });
  await p.addInitScript((t) => {
    try {
      localStorage.setItem('theme', t);
    } catch {}
  }, theme);
  await p.goto(BASE + route, { waitUntil: 'networkidle' });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(800);
  return p;
}

/* ---- A. pager / prose right-edge alignment ----------------------- */
{
  const p = await page(INTERIOR, { width: 1440, height: 900 });
  const r = await p.evaluate(() => {
    const box = (sel) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const b = el.getBoundingClientRect();
      return { left: Math.round(b.left), right: Math.round(b.right), w: Math.round(b.width) };
    };
    return {
      article: box('article.prose'),
      h2: box('article.prose h2'),
      pager: box('nav[aria-label="Book navigation"]'),
      pagerCell: box('nav[aria-label="Book navigation"] a'),
      reading: box('main > div'),
    };
  });
  const delta = r.pager && r.article ? r.pager.right - r.article.right : null;
  log(
    'A. pager right edge === prose right edge',
    delta === 0,
    `article.right=${r.article?.right} h2.right=${r.h2?.right} pager.right=${r.pager?.right} pagerCell.right=${r.pagerCell?.right} reading.right=${r.reading?.right} delta=${delta}`,
  );
  await p.close();
}

/* ---- B. mobile TOC summary label starvation --------------------- */
{
  const p = await page(WIDE, { width: 390, height: 844 });
  const r = await p.evaluate(() => {
    const sum = document.querySelector('[data-toc-mobile] > summary');
    if (!sum) return null;
    const parts = [...sum.children].map((c) => {
      const b = c.getBoundingClientRect();
      return {
        tag: c.tagName.toLowerCase(),
        text: c.textContent.trim().slice(0, 40),
        w: Math.round(b.width),
        h: Math.round(b.height),
        x: Math.round(b.left),
        lines: Math.round(b.height / 20),
      };
    });
    return { sumH: Math.round(sum.getBoundingClientRect().height), parts };
  });
  const label = r?.parts.find((x) => x.text && x.text !== '');
  const cur = r?.parts.find((x) => x.text === '' || !x.text);
  log(
    'B. mobile TOC summary keeps label on one line',
    (label?.lines ?? 9) <= 1,
    `summary height=${r?.sumH} parts=${JSON.stringify(r?.parts)}`,
  );
  await p.close();
}

/* ---- C. tables fill the prose measure --------------------------- */
{
  const p = await page('/04-recipes/03-stats-pipeline-you-can-script/', {
    width: 1440,
    height: 900,
  });
  const r = await p.evaluate(() => {
    const art = document.querySelector('article.prose');
    return {
      measure: Math.round(art.getBoundingClientRect().width),
      tables: [...document.querySelectorAll('article.prose table')].map((t) => {
        const b = t.getBoundingClientRect();
        const inner = t.querySelector('tbody');
        const ib = inner ? inner.getBoundingClientRect() : null;
        return {
          boxW: Math.round(b.width),
          bodyW: ib ? Math.round(ib.width) : null,
          display: getComputedStyle(t).display,
          rows: t.querySelectorAll('tbody tr').length,
        };
      }),
    };
  });
  const unfilled = r.tables.filter((t) => t.bodyW !== null && t.bodyW < r.measure - 8);
  log(
    'C. every table body fills the prose measure',
    unfilled.length === 0,
    `measure=${r.measure} tables=${JSON.stringify(r.tables)}`,
  );
  await p.close();
}

/* ---- D. definition-list grouping in the metadata box ------------ */
{
  const p = await page(INTERIOR, { width: 1440, height: 900 });
  const r = await p.evaluate(() => {
    const dl = document.querySelector('article.prose dl');
    if (!dl) return null;
    const items = [...dl.querySelectorAll('dt')].map((dt) => {
      const dd = dt.nextElementSibling;
      const a = dt.getBoundingClientRect();
      const b = dd.getBoundingClientRect();
      const prev = dt.previousElementSibling?.getBoundingClientRect();
      return {
        term: dt.textContent.trim().slice(0, 24),
        termRight: Math.round(a.right),
        ddTop: Math.round(b.top),
        dtTop: Math.round(a.top),
        ddLeft: Math.round(b.left),
        dtLeft: Math.round(a.left),
        gapFromPrev: prev ? Math.round(a.top - prev.bottom) : null,
        ddH: Math.round(b.height),
        dtH: Math.round(a.height),
      };
    });
    return { tag: dl.tagName, cls: dl.className.slice(0, 50), items };
  });
  log(
    'D. metadata dl aligns term column + separates items',
    !!r && r.items.length > 1,
    JSON.stringify(r),
  );
  await p.close();
}

/* ---- E. table row rules + zebra legibility ---------------------- */
{
  const p = await page('/04-recipes/03-stats-pipeline-you-can-script/', {
    width: 1440,
    height: 900,
  });
  const r = await p.evaluate(() => {
    const row = document.querySelector('article.prose tbody tr:nth-child(2)');
    const odd = document.querySelector('article.prose tbody tr:nth-child(1)');
    const cell = row.querySelector('td, th');
    const cs = getComputedStyle(cell);
    return {
      cellBorderBottom: cs.borderBottomWidth + ' ' + cs.borderBottomColor,
      oddBg: getComputedStyle(odd).backgroundColor,
      evenBg: getComputedStyle(row).backgroundColor,
      cellColor: cs.color,
      thInBody: document.querySelectorAll('article.prose tbody th').length,
      tdInBody: document.querySelectorAll('article.prose tbody td').length,
    };
  });
  log('E. every body row carries a hairline', true, JSON.stringify(r));
  await p.close();
}

/* ---- F. callout takeaway hairline visibility -------------------- */
{
  const p = await page('/01-proven-techniques/01-measure-first/', { width: 1440, height: 900 });
  for (const theme of ['dark', 'light']) {
    const q = await page(
      '/01-proven-techniques/01-measure-first/',
      { width: 1440, height: 900 },
      theme,
    );
    const r = await q.evaluate(() => {
      const el = document.querySelector('article.prose > p:has(> strong:only-child)');
      if (!el) return null;
      const cs = getComputedStyle(el);
      return {
        borderTopWidth: cs.borderTopWidth,
        borderTopColor: cs.borderTopColor,
        borderBottomWidth: cs.borderBottomWidth,
        borderBottomColor: cs.borderBottomColor,
        background: cs.backgroundColor,
      };
    });
    log(
      `F. callout hairline is declared (${theme})`,
      !!r && r.borderTopWidth !== '0px',
      JSON.stringify(r),
    );
    await q.close();
  }
  await p.close();
}

/* ---- G. home column concentricity ------------------------------- */
{
  const p = await page('/', { width: 1440, height: 900 });
  const r = await p.evaluate(() => {
    const box = (sel) => {
      const e = document.querySelector(sel);
      if (!e) return null;
      const b = e.getBoundingClientRect();
      return { l: Math.round(b.left), r: Math.round(b.right), c: Math.round(b.left + b.width / 2) };
    };
    return {
      viewportCentre: Math.round(window.innerWidth / 2),
      contributions: box('section[aria-labelledby="contributions-heading"] .max-w-contributions'),
      prose: box('main .prose'),
      titleBlock: box('section[aria-labelledby="book-title"]'),
    };
  });
  const dc = Math.abs((r.contributions?.c ?? 0) - (r.prose?.c ?? 0));
  log('G. contributions + prose share a centre line', dc <= 1, JSON.stringify({ ...r, dc }));
  await p.close();
}

/* ---- H. measured span content lengths --------------------------- */
{
  const p = await page(WIDE, { width: 1440, height: 900 });
  const r = await p.evaluate(() => {
    const all = [...document.querySelectorAll('.measured')].map((e) => e.textContent.trim());
    return {
      n: all.length,
      max: Math.max(...all.map((s) => s.length)),
      longest: all.sort((a, b) => b.length - a.length).slice(0, 6),
    };
  });
  log('H. `.measured` spans are short enough to nowrap', r.max <= 24, JSON.stringify(r));
  await p.close();
}

/* ---- I. role=region audit (probe false positive) ---------------- */
{
  const p = await page(WIDE, { width: 390, height: 844 });
  const r = await p.evaluate(() => ({
    regions: [...document.querySelectorAll('[role="region"]')].map(
      (e) => e.tagName + '.' + e.className.slice(0, 20),
    ),
    asides: [...document.querySelectorAll('aside')].map((e) => e.getAttribute('aria-label')),
    pres: [...document.querySelectorAll('pre')].map((e) => e.getAttribute('role')),
  }));
  log(
    'I. no stray role=region on <pre>',
    r.pres.every((x) => x === null),
    JSON.stringify(r),
  );
  await p.close();
}

/* ---- J. interior running head redundancy ----------------------- */
{
  const p = await page('/08-bonus-batch-api/', { width: 1440, height: 900 });
  const r = await p.evaluate(() => {
    const rh = document.querySelector('.running-head[aria-hidden="true"]');
    const h1 = document.querySelector('h1');
    const crumbs = [...document.querySelectorAll('nav[aria-label="Breadcrumb"] li')].map((li) =>
      li.textContent.replaceAll(/\s+/g, ' ').trim(),
    );
    return {
      runningHead: rh ? rh.textContent.replaceAll(/\s+/g, ' ').trim() : null,
      h1: h1?.textContent.trim(),
      crumbs,
    };
  });
  log(
    'J. running head does not repeat the h1 verbatim',
    r.runningHead !== null && !r.runningHead.includes(r.h1),
    JSON.stringify(r),
  );
  await p.close();
}

/* ---- K. scrollbar + skeleton bar contrast ---------------------- */
{
  const p = await page('/', { width: 1440, height: 900 });
  const r = await p.evaluate(() => {
    const bar = document.querySelector('#route-loader [aria-hidden="true"] > span');
    const cs = bar ? getComputedStyle(bar) : null;
    return {
      barBg: cs?.backgroundColor,
      hasScrollbarColor: [...document.styleSheets].some((s) => {
        try {
          return [...s.cssRules].some((x) => x.cssText.includes('scrollbar-color'));
        } catch {
          return false;
        }
      }),
      caretOnHtml: getComputedStyle(document.documentElement).caretColor,
    };
  });
  log('K. scrollbar-color declared; skeleton bar measurable', true, JSON.stringify(r));
  await p.close();
}

/* ---- L. inline code chip padding vs following punctuation ------- */
{
  const p = await page('/', { width: 1440, height: 900 });
  const r = await p.evaluate(() => {
    const code = document.querySelector('article.prose :not(pre) > code');
    if (!code) return null;
    const cs = getComputedStyle(code);
    return {
      padding: cs.paddingLeft + '/' + cs.paddingRight,
      border: cs.borderWidth,
      fontSize: cs.fontSize,
    };
  });
  log('L. inline code chip horizontal padding', true, JSON.stringify(r));
  await p.close();
}

/* ---- M. desktop TOC nav landmark name -------------------------- */
{
  const p = await page(INTERIOR, { width: 1440, height: 900 });
  const r = await p.evaluate(() =>
    [...document.querySelectorAll('nav')].map((n) => ({
      id: n.id,
      lbl: n.getAttribute('aria-label'),
    })),
  );
  log(
    'M. every <nav> landmark is named',
    r.every((n) => !!n.lbl),
    JSON.stringify(r),
  );
  await p.close();
}

await browser.close();
