import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import { unified } from '@astrojs/markdown-remark';
import {
  markdownProcessor,
  rehypePlugins,
  remarkPlugins,
} from '../../src/lib/markdown-processor.mjs';

const readSource = (relativePath) => readFile(new URL(relativePath, import.meta.url), 'utf8');

const readPackageJson = () =>
  readFile(new URL('../../package.json', import.meta.url), 'utf8').then(JSON.parse);

const captureTreeAfterProductionPlugins = () => {
  const captured = [];
  const capture = () => (tree) => {
    captured.push(tree);
  };

  return {
    captured,
    processor: unified({
      remarkPlugins,
      rehypePlugins: [...rehypePlugins, capture],
    }),
  };
};

const collectNodes = (node, predicate, found = []) => {
  if (predicate(node)) {
    found.push(node);
  }
  node.children?.forEach((child) => collectNodes(child, predicate, found));
  return found;
};

const renderWithProductionProcessor = async (markdown) => {
  const renderer = await markdownProcessor.createRenderer({});
  return (await renderer.render(markdown, {})).code;
};

test('processes raw disclosure HTML through the production processor', async () => {
  const code = await renderWithProductionProcessor(
    '<details><summary>Raw summary</summary><p>Raw body</p></details>',
  );

  expect(code).toContain('class="group"');
  expect(code).toContain('class="disclosure-content disclosure-flow"');
  expect(code).toContain('class="disclosure-content-inner disclosure-flow-inner"');
  expect(code).toContain('<p>Raw body</p>');
});

test('the production chain hands non-details raw HTML to Astro untouched', async () => {
  const { captured, processor } = captureTreeAfterProductionPlugins();
  const renderer = await processor.createRenderer({});
  await renderer.render('<div class="callout"><p>Plain</p></div>', {});

  expect(captured).toHaveLength(1);
  const rawNodes = collectNodes(captured[0], (node) => node.type === 'raw' || node.type === 'html');
  expect(rawNodes).toHaveLength(1);
  expect(rawNodes[0].value).toBe('<div class="callout"><p>Plain</p></div>');
  expect(collectNodes(captured[0], (node) => node.tagName === 'div')).toHaveLength(0);
});

test('the production chain hands details fragments over as parsed elements', async () => {
  const { captured, processor } = captureTreeAfterProductionPlugins();
  const renderer = await processor.createRenderer({});
  await renderer.render('<details><summary>Raw</summary><p>Body</p></details>', {});

  const detailsNodes = collectNodes(captured[0], (node) => node.tagName === 'details');
  expect(detailsNodes).toHaveLength(1);
  expect(detailsNodes[0].properties.className).toContain('group');
  expect(
    collectNodes(captured[0], (node) => node.type === 'raw' || node.type === 'html'),
  ).toHaveLength(0);
});

test('the project adds no second whole-document raw pass of its own', async () => {
  const [processorSource, disclosuresSource] = await Promise.all([
    readSource('../../src/lib/markdown-processor.mjs'),
    readSource('../../src/lib/rehype-disclosures.mjs'),
  ]);

  expect(processorSource).not.toContain('rehype-raw');
  expect(processorSource).not.toContain('rehypeRaw');
  expect(processorSource).not.toContain('hast-util-raw');
  expect(processorSource).toContain("from './rehype-disclosures.mjs'");
  expect(disclosuresSource).toContain("from 'hast-util-from-html'");
});

test('the only project-added parse is a details-fragment parse, not a document pass', async () => {
  const disclosuresSource = await readSource('../../src/lib/rehype-disclosures.mjs');
  const fromHtmlCalls = [...disclosuresSource.matchAll(/fromHtml\(/gu)];

  expect(fromHtmlCalls).toHaveLength(2);
  for (const [index, call] of [...disclosuresSource.matchAll(/fromHtml\(([^\n]*)\)/gu)].entries()) {
    expect(call[1]).toContain('{ fragment: true }');
    expect(index).toBeLessThan(fromHtmlCalls.length);
  }
  expect(disclosuresSource).not.toMatch(/fromHtml\(\s*(?!child|node|sibling)/u);
});

test('rehype-raw is not a direct project dependency; hast-util-from-html is', async () => {
  const { dependencies = {}, devDependencies = {} } = await readPackageJson();

  expect(dependencies['rehype-raw']).toBeUndefined();
  expect(devDependencies['rehype-raw']).toBeUndefined();
  expect(dependencies['hast-util-raw']).toBeUndefined();
  expect(dependencies['hast-util-from-html']).toBe('2.0.3');
});

test("rehype-raw survives only as Astro's own transitive mandatory pass", async () => {
  const lockfile = await readSource('../../bun.lock');
  const directEntries = [...lockfile.matchAll(/^\s{4}"(rehype-raw)":\s*\["rehype-raw/gmu)];

  expect(lockfile).toContain('"rehype-raw"');
  expect(lockfile).toMatch(/"@astrojs\/markdown-remark":\s*\[[^\]]*"rehype-raw":\s*"\^7\.0\.0"/u);
  for (const entry of directEntries) {
    expect(entry[1]).toBe('rehype-raw');
  }
});

test('several raw details in one document are all expanded', async () => {
  const code = await renderWithProductionProcessor(
    [
      '<details><summary>One</summary><p>First</p></details>',
      '',
      'Prose between the notes.',
      '',
      '<details><summary>Two</summary><p>Second</p></details>',
    ].join('\n'),
  );

  expect(code.match(/class="group"/gu)).toHaveLength(2);
  expect(code.match(/class="disclosure-content disclosure-flow"/gu)).toHaveLength(2);
  expect(code).toContain('<summary>One</summary>');
  expect(code).toContain('<summary>Two</summary>');
  expect(code).toContain('Prose between the notes.');
});

test('raw details split across markdown blocks still become one disclosure', async () => {
  const code = await renderWithProductionProcessor(
    [
      '<details><summary>Isolated apply</summary>',
      '',
      'The target is a writable clone, or a controlled interim schema.',
      '',
      'The result is a bounded experiment.',
      '',
      '</details>',
      '',
      '**Verdict:** one candidate, one isolated target.',
    ].join('\n'),
  );

  expect(code.match(/<details/gu)).toHaveLength(1);
  expect(code.match(/class="group"/gu)).toHaveLength(1);
  expect(code).toContain('class="disclosure-content disclosure-flow"');
  expect(code).toContain('class="disclosure-content-inner disclosure-flow-inner"');
  expect(code).toContain('The target is a writable clone, or a controlled interim schema.');
  expect(code).toContain('The result is a bounded experiment.');
  expect(code).toContain('<strong>Verdict:</strong>');
  expect(code.match(/<\/details>/gu)).toHaveLength(1);
  expect(code.indexOf('</details>')).toBeLessThan(code.indexOf('<strong>Verdict:</strong>'));
});

test('Astro later raw passes are idempotent for expanded details', async () => {
  const source = '<details><summary>Raw</summary><p>Body</p></details>';
  const once = await renderWithProductionProcessor(source);
  const twice = await renderWithProductionProcessor(once);
  const thrice = await renderWithProductionProcessor(twice);

  expect(twice).toBe(once);
  expect(thrice).toBe(once);
  expect(once.match(/class="disclosure-content disclosure-flow"/gu)).toHaveLength(1);
  expect(once).not.toContain('&lt;details');
});

test('already parsed element details stay canonical through the processor', async () => {
  const code = await renderWithProductionProcessor(
    '<details class="group"><summary>Parsed</summary><div class="disclosure-content disclosure-flow"><div class="disclosure-content-inner disclosure-flow-inner"><p>Body</p></div></div></details>',
  );

  expect(code.match(/class="disclosure-content disclosure-flow"/gu)).toHaveLength(1);
  expect(code.match(/class="disclosure-content-inner disclosure-flow-inner"/gu)).toHaveLength(1);
  expect(code).toContain('<summary>Parsed</summary>');
});

test('animates the disclosure chevron with one authored SVG, not a CSS glyph', async () => {
  const [css, ...astroSources] = await Promise.all([
    readSource('../../src/styles/global.css'),
    readSource('../../src/layouts/BaseLayout.astro'),
    readSource('../../src/components/HomeTitleBlock.astro'),
    readSource('../../src/components/ReadingToc.astro'),
  ]);

  /*
   * The component used to draw its marker as two CSS pseudo-element bars
   * rotating from `+` to `x` (`summary::before` / `summary::after`). That glyph
   * was dead — it only existed under `.prose details`, matched by nothing on
   * any built page — and it duplicated the authored SVG chevron all three
   * components already ship. DESIGN.md also forbids substituting a glyph where
   * an authored SVG belongs. The sole rotation left in CSS is the closing-state
   * reset that stops the chevron mid-turn.
   */
  expect(css).not.toContain('summary::before');
  expect(css).not.toContain('summary::after');
  expect(css).not.toContain('transform: translateY(-50%)');
  expect(css).toMatch(
    /details\[data-disclosure-closing\] \.disclosure-icon \{[^}]*rotate: 0deg;/su,
  );

  for (const source of astroSources) {
    expect(source).toContain('group-open:rotate-45');
    expect(source).toContain('duration-[280ms]');
    expect(source).toContain('motion-reduce:transition-none');
    expect(source).not.toContain('group-open:rotate-90');
  }
});

test('defines shared disclosure flow and viewport fallback utilities', async () => {
  const css = await readSource('../../src/styles/global.css');

  expect(css).toContain('@utility disclosure-flow {');
  expect(css).toContain('@utility disclosure-flow-inner {');
  expect(css).toContain('max-height: calc(100vh - 6rem);');
  expect(css).toContain('max-height: calc(100dvh - 6rem);');
  expect(css).toContain('max-height: calc(100vh - 5rem);');
  expect(css).toContain('max-height: calc(100dvh - 5rem);');
  expect(css).toContain('max-height: calc(100vh - 8rem);');
  expect(css).toContain('max-height: calc(100dvh - 8rem);');
});

test('reuses disclosure flow utilities in every Astro disclosure', async () => {
  const sources = await Promise.all([
    readSource('../../src/layouts/BaseLayout.astro'),
    readSource('../../src/components/HomeTitleBlock.astro'),
    readSource('../../src/components/ReadingToc.astro'),
  ]);

  for (const source of sources) {
    expect(source).toContain('disclosure-flow');
    expect(source).toContain('disclosure-flow-inner');
    expect(source).not.toContain('grid grid-rows-[0fr]');
  }
});

test('renders the home primer as visible prose, not behind a disclosure wrapper', async () => {
  const page = await readSource('../../src/pages/[...slug].astro');
  const homeMain = page.slice(page.indexOf('<main'), page.indexOf('</main>'));

  expect(page).not.toContain('<details');
  expect(page).not.toContain('disclosure-flow');
  expect(page).not.toContain('Read the evidence primer');
  expect(page).not.toContain('Three claims · the path to a proven win');
  expect(homeMain).toMatch(
    /<div class=\{`mx-auto prose \$\{proseClass\} pt-8`\}>\s*<Content \/>\s*<\/div>/u,
  );
  expect(page).toMatch(/<article class=\{`prose \$\{proseClass\}`\}>[\s\S]*?<Content \/>/u);
});
