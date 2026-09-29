/**
 * PROBE — see ./README.md for what this found and which spec now guards it.
 * Diagnostic output only; not an assertion. Run: `bun test/probe/probe.mjs`
 */
import { chromium } from 'playwright';
const B = 'http://localhost:4321';
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 1280, height: 900 } });

// --- 1. TABLE: computed cell padding + code weight ---
await p.goto(`${B}/01-proven-techniques/01-measure-first/`, { waitUntil: 'networkidle' });
const t = await p.evaluate(() => {
  const tbl = document.querySelector('.prose table');
  if (!tbl) return { err: 'no table' };
  const th = tbl.querySelector('th'),
    td = tbl.querySelector('tbody td');
  const cs = (el) => {
    const s = getComputedStyle(el);
    return {
      pad: s.padding,
      padT: s.paddingTop,
      padL: s.paddingLeft,
      fs: s.fontSize,
      fw: s.fontWeight,
      ff: s.fontFamily.split(',')[0],
    };
  };
  return {
    display: getComputedStyle(tbl).display,
    overflowX: getComputedStyle(tbl).overflowX,
    wrapper: tbl.parentElement.tagName + '.' + tbl.parentElement.className,
    th: cs(th),
    thFirst: cs(tbl.querySelector('thead th:first-child')),
    thLast: cs(tbl.querySelector('thead th:last-child')),
    td: cs(td),
    tdFirst: cs(tbl.querySelector('tbody td:first-child')),
    tableWidth: tbl.getBoundingClientRect().width,
    scrollW: tbl.scrollWidth,
    clientW: tbl.clientWidth,
  };
});
console.log('=== TABLE (measure-first) ===');
console.log(JSON.stringify(t, null, 1));

const code = await p.evaluate(() => {
  const c = document.querySelector('.prose :not(pre) > code');
  if (!c) return null;
  const s = getComputedStyle(c);
  return { fw: s.fontWeight, fs: s.fontSize, text: c.textContent.slice(0, 30) };
});
console.log('inline code:', JSON.stringify(code));

// --- 2. Mobile overflow: which elements are widest ---
const p2 = await b.newPage({ viewport: { width: 390, height: 844 } });
await p2.goto(`${B}/00-preface/02-how-to-prove-a-win/`, { waitUntil: 'networkidle' });
const ov = await p2.evaluate(() => {
  const docW = document.documentElement.clientWidth;
  const out = [];
  for (const el of document.querySelectorAll('body *')) {
    const r = el.getBoundingClientRect();
    if (r.right > docW + 1 && r.width > 0) {
      out.push({
        tag: el.tagName,
        cls: (el.className || '').toString().slice(0, 70),
        right: Math.round(r.right),
        w: Math.round(r.width),
        text: (el.textContent || '').trim().slice(0, 30),
      });
    }
  }
  return {
    docW,
    scrollW: document.documentElement.scrollWidth,
    count: out.length,
    top: out.slice(0, 8),
  };
});
console.log('\n=== MOBILE OVERFLOW 390px ===');
console.log(JSON.stringify(ov, null, 1));

// --- 3. TOC truncation: is text clipped? ---
const p3 = await b.newPage({ viewport: { width: 1280, height: 900 } });
await p3.goto(`${B}/08-bonus-batch-api/`, { waitUntil: 'networkidle' });
const toc = await p3.evaluate(() => {
  const aside = document.querySelector('aside.toc-viewport');
  const links = [...aside.querySelectorAll('a[data-toc-link]')];
  const bad = links.map((a) => {
    const sp = a.querySelector('span.truncate');
    return {
      text: sp.textContent.slice(0, 44),
      linkW: Math.round(a.getBoundingClientRect().width),
      spanW: Math.round(sp.getBoundingClientRect().width),
      scrollW: sp.scrollWidth,
      overflow: sp.scrollWidth > Math.ceil(sp.clientWidth) + 1,
    };
  });
  return {
    asideClientW: aside.clientWidth,
    asideScrollW: aside.scrollWidth,
    overflowing: bad.filter((x) => x.overflow).length,
    total: bad.length,
    sample: bad.filter((x) => x.overflow).slice(0, 4),
  };
});
console.log('\n=== TOC truncation ===');
console.log(JSON.stringify(toc, null, 1));

// --- 4. Which details exist and where; do they have a .prose ancestor? ---
const p4 = await b.newPage();
await p4.goto(`${B}/`, { waitUntil: 'networkidle' });
const det = await p4.evaluate(() =>
  [...document.querySelectorAll('details')].map((d) => ({
    id: d.id || null,
    summary: d.querySelector('summary')?.textContent.trim().slice(0, 24),
    inProse: !!d.closest('.prose'),
    parentTag: d.parentElement.tagName,
    borderTop: getComputedStyle(d).borderTopWidth,
    summaryMinH: getComputedStyle(d.querySelector('summary')).minHeight,
    summaryPad: getComputedStyle(d.querySelector('summary')).padding,
  })),
);
console.log('\n=== <details> on home ===');
console.log(JSON.stringify(det, null, 1));

await b.close();
