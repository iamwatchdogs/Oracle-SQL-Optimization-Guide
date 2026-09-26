/**
 * PROBE — see ./README.md for what this found and which spec now guards it.
 * Diagnostic output only; not an assertion. Run: `bun test/probe/p1.mjs`
 */
import { readFile } from 'node:fs/promises';
const root = new URL('../../', import.meta.url).href;
const page = await readFile(root + 'src/pages/[...slug].astro', 'utf8');

const elementWith = (source, tag, needle) =>
  source.match(new RegExp(`<${tag}\\b[\\s\\S]*?${needle}[\\s\\S]*?</${tag}>`, 'u'))?.[0];

for (const text of ['Home', 'Full key', '← Book home', 'Source appendix']) {
  const m = elementWith(page, 'a', text);
  const startLine = page.slice(0, page.indexOf(m)).split('\n').length;
  console.log(
    `needle=${JSON.stringify(text)} matchSpanLines=${startLine}..${startLine + m.split('\n').length - 1} matchesFullKeyAnchor=${m.includes('underline-offset')}`,
  );
}

// Mutation test: strip min-h-6/min-w-6 from the "Full key" anchor ONLY.
const mutated = page.replace(
  'class="inline-flex min-h-6 min-w-6 items-center text-ui text-accent underline-offset-[0.2em] transition-colors hover:text-accent-hover"',
  'class="inline-flex items-center text-ui text-accent underline-offset-[0.2em] transition-colors hover:text-accent-hover"',
);
console.log(
  '\n--- after removing min-h-6/min-w-6 from BOTH "Full key" and "Source appendix" anchors ---',
);
for (const text of ['Full key', 'Source appendix']) {
  const m = elementWith(mutated, 'a', text);
  const passes =
    m.includes('inline-flex') &&
    m.includes('min-h-6') &&
    m.includes('min-w-6') &&
    m.includes('items-center');
  console.log(`needle=${JSON.stringify(text)} per-anchor assertions still pass? ${passes}`);
}
console.log(
  'min-h-6 count in mutated page:',
  (mutated.match(/min-h-6/gu) ?? []).length,
  '(test expects 5)',
);
