import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import { resolveBase } from '../../src/lib/site.mjs';

const read = (relativePath) => readFile(new URL(relativePath, import.meta.url), 'utf8');
const readBinary = (name) => readFile(new URL(`../../public/${name}`, import.meta.url));

const layout = () => read('../../src/layouts/BaseLayout.astro');
const manifestRoute = () => read('../../src/pages/site.webmanifest.ts');
const generator = () => read('../../scripts/generate-icons.mjs');

/** PNG dimensions, read from the IHDR chunk rather than trusted from the filename. */
const pngSize = async (relativePath) => {
  const buffer = await readFile(new URL(relativePath, import.meta.url));
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    signature: buffer.subarray(0, 8).toString('hex'),
  };
};

const PNG_SIGNATURE = '89504e470d0a1a0a';

/**
 * The icon set, and the manifest that points at it.
 *
 * The favicon used to be an inline data URI of an emoji, with `public/favicon.svg`
 * shipped beside it and linked by nothing — an orphan that was also out of step
 * with the mark the header draws. These assertions are about the replacement
 * being coherent: the files exist, the sizes are real, and the head names them.
 */
test('every icon the head names is a file that will be built', async () => {
  const code = await layout();
  const base = resolveBase();

  /* `withBase` rather than a literal, or a build with a different base would
     point every page at an origin that has no icons on it. */
  const names = [
    'favicon.ico',
    'favicon.svg',
    'favicon-32x32.png',
    'favicon-16x16.png',
    'apple-touch-icon.png',
  ];

  for (const name of names) {
    expect(code, `head does not name ${name}`).toContain(`withBase('/${name}')`);
  }

  const files = await Promise.all(names.map((name) => readBinary(name)));
  expect(files.every((buffer) => buffer.length > 0)).toBe(true);

  expect(base).toBe('/Oracle-SQL-Optimization-Guide');
});

test('the ICO is requested before the SVG', async () => {
  const code = await layout();
  const ico = code.indexOf('rel="icon" href={withBase(\'/favicon.ico\')}');
  const svg = code.indexOf('rel="icon" type="image/svg+xml"');

  expect(ico).toBeGreaterThan(-1);
  expect(svg).toBeGreaterThan(-1);

  /* Safari and older desktop browsers ask for the ICO by name and take the first
     `rel="icon"` they can use. */
  expect(ico).toBeLessThan(svg);
});

test('each PNG is really the size its name claims', async () => {
  const claimed = [
    ['favicon-16x16.png', 16],
    ['favicon-32x32.png', 32],
    ['apple-touch-icon.png', 180],
    ['icon-192.png', 192],
    ['icon-512.png', 512],
  ];
  const images = await Promise.all(claimed.map((entry) => pngSize(`../../public/${entry[0]}`)));

  claimed.forEach(([name, size], index) => {
    expect(images[index].signature, `${name} is not a PNG`).toBe(PNG_SIGNATURE);
    expect(images[index].width, `${name} width`).toBe(size);
    expect(images[index].height, `${name} height`).toBe(size);
  });
});

test('the favicon is no longer an inline data URI', async () => {
  const code = await layout();

  /*
   * The thing being replaced. A data URI cannot be cached across pages, cannot be
   * a home-screen icon at 192px, and made every page re-parse the same SVG.
   */
  expect(code).not.toContain('data:image/svg+xml');
  expect(code).not.toMatch(/📖/u);
});

test('the manifest names the same icons the head does, with the prefix applied', async () => {
  const code = await manifestRoute();

  for (const name of [
    'favicon-16x16.png',
    'favicon-32x32.png',
    'apple-touch-icon.png',
    'icon-192.png',
    'icon-512.png',
  ]) {
    expect(code, `manifest does not name ${name}`).toContain(name);
  }

  /* Resolved through the base, not written as a rooted path. */
  expect(code).toContain('resolveBase');
  expect(code).toMatch(/`\$\{base\}\/\$\{name\}`/u);
});

test('the manifest is scoped to the book and starts at its front page', async () => {
  const code = await manifestRoute();

  /*
   * A shortcut that reopens whatever page the reader happened to be on when they
   * added it looks like a broken app. `id`, `start_url` and `scope` all point at
   * the book, which is also what stops two installs of the same shortcut
   * appearing as two different apps.
   */
  for (const key of ['id', 'start_url', 'scope']) {
    expect(code).toMatch(new RegExp(`${key}: `, 'u'));
  }
  expect(code).toContain('`${base}/`');
});

test('the theme colour agrees with the head and with the dark paper', async () => {
  const head = await layout();
  const manifest = await manifestRoute();
  const css = await read('../../src/styles/global.css');

  const paper = css.match(/^\s*--paper:\s*(#[0-9a-f]{6})\s*;/mu)?.[1];

  expect(paper).toBe('#0c0c0e');
  expect(head).toContain('<meta name="theme-color" content="#0c0c0e" />');
  expect(manifest).toContain("theme_color: '#0c0c0e'");

  /* Two copies of one value is exactly what the generator avoids — but the
     manifest is a route, not generated output, so the agreement is asserted. */
  expect(manifest).toContain("background_color: '#0c0c0e'");
});

test('the icons are generated from the stylesheet, not hand-painted', async () => {
  const code = await generator();

  /*
   * The reason this is a script. Three hard-coded PNGs are a set of brand
   * colours that a theme change silently leaves behind; reading `--paper` and
   * `--accent` out of the stylesheet means the icons follow the design.
   */
  expect(code).toContain('global.css');
  expect(code).toMatch(/--\(\[a-z-\]\+\)/u);
  expect(code).toContain('tokens.paper');
  expect(code).toContain('tokens.accent');
});

test('the generated SVG carries no hard-coded colour of its own', async () => {
  const svg = await read('../../public/favicon.svg');

  /* Only the two token values, and nothing else that looks like a hex colour. */
  const hex = [...svg.matchAll(/#[0-9a-f]{3,8}/gu)].map((match) => match[0].toLowerCase());

  expect(new Set(hex)).toEqual(new Set(['#0c0c0e', '#8aa4ff']));
  expect(svg).toContain('viewBox="0 0 100 100"');
});
