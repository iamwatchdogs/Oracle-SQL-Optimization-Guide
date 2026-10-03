import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';

const read = (relativePath) => readFile(new URL(relativePath, import.meta.url), 'utf8');
const layout = () => read('../../src/layouts/BaseLayout.astro');
const card = () => read('../../public/og-default.png');

/**
 * The social card and the structured data.
 *
 * The card was absent: the head declared `twitter:card="summary_large_image"`, which
 * promises a large image, and named no image at all. A link shared into a chat
 * window rendered as a bare URL, or as a card with nothing in it.
 */
test('a large card is declared, and there is an image to fill it', async () => {
  const head = await layout();
  const image = await card();

  /* The promise the type makes has to be kept. */
  expect(head).toContain('content="summary_large_image"');
  expect(head).toMatch(/property="og:image"/u);
  expect(image.length).toBeGreaterThan(1000);
});

test('the image is 1200x630, the size every card consumer expects', async () => {
  const buffer = await readFile(new URL('../../public/og-default.png', import.meta.url));
  const head = await layout();

  expect(buffer.subarray(0, 8).toString('hex')).toBe('89504e470d0a1a0a');
  expect(buffer.readUInt32BE(16)).toBe(1200);
  expect(buffer.readUInt32BE(20)).toBe(630);

  /* Declared as well as drawn: a consumer that lays out from the meta tags should
     not have to download the image to learn its shape. */
  expect(head).toContain('<meta property="og:image:width" content="1200" />');
  expect(head).toContain('<meta property="og:image:height" content="630" />');
  expect(head).toContain('<meta property="og:image:type" content="image/png" />');
});

test('the card image is built by joining, not by string concatenation', async () => {
  const head = await layout();

  /*
   * The third time this shape has appeared in this repo. A root-relative path
   * handed to `new URL` resolves against the origin and throws the prefix away —
   * the same trap as `page.goto('/x/')` and as the llms.txt links before they were
   * fixed. The assertion is on the joining, because a correct value that arrived
   * by accident would still be correct on the next deploy.
   */
  expect(head).toContain('const siteRoot = new URL(`${resolveBase()}/`, origin).href;');
  expect(head).not.toMatch(/new URL\('\//u);
});

test('the JSON-LD is a WebSite, and it does not claim a type it cannot support', async () => {
  const head = await layout();

  /*
   * `TechArticle` would want an author, a date and a word count, none of which the
   * corpus records. Inventing them is worse than not claiming the type: a
   * structured-data block that a validator rejects costs the whole page's
   * eligibility, not just the block's.
   */
  expect(head).toContain("'@type': 'WebSite'");
  expect(head).not.toMatch(/'(TechArticle|Article|Book)':/u);
  expect(head).toContain("'@context': 'https://schema.org'");
});

test('the JSON-LD is emitted as a script, not as text', async () => {
  const head = await layout();

  /* `set:html` with a JSON string: without it Astro would escape the quotes and
     the block would be invalid JSON to every consumer. */
  expect(head).toContain('type="application/ld+json"');
  expect(head).toContain('set:html={JSON.stringify(');
});

test('the sitemap and the agent index are declared in the head', async () => {
  const head = await layout();

  /*
   * The sitemap link is the documented discovery method and it matters more than
   * usual here: this is a project site, so robots.txt is served from a
   * subdirectory where RFC 9309 says a crawler will not look. Declaring it in the
   * head is the one route that does not depend on a file at the origin root.
   *
   * `rel="describedby"` is what the llms.txt v2 spec asks for, and the file it
   * names covers every URL under its path.
   */
  expect(head).toContain('<link rel="sitemap" type="application/xml"');
  expect(head).toContain('<link rel="describedby" type="text/markdown"');
});

test('og:description and the meta description cannot drift apart', async () => {
  const head = await layout();

  /*
   * Three consumers, one value: the meta description a reader and a crawler get,
   * the Open Graph one a chat app renders, and the Twitter one that some of them
   * read instead. All three are `metaDescription`, so there is no way for a card
   * to describe a page differently from the page.
   */
  expect([...head.matchAll(/content=\{metaDescription\}/gu)].length).toBe(3);
  expect(head).toContain('<meta name="description" content={metaDescription} />');
  expect(head).toContain('<meta property="og:description" content={metaDescription} />');
  expect(head).toContain('<meta name="twitter:description" content={metaDescription} />');
});

test('the card is generated from the same tokens as the rest of the design', async () => {
  const generator = await read('../../scripts/generate-og-card.mjs');
  const font = await read('../../scripts/bitmap-font.mjs');

  /* A hand-painted card is a set of brand colours that a theme change leaves
     behind — the same argument as the icon set. */
  expect(generator).toContain('global.css');
  expect(generator).toContain('SITE_ORIGIN');
  expect(generator).not.toMatch(/https?:\/\/[a-z]/u);

  /* The font is its own module because it is the bulk of the file and a
     different concern from the card. */
  expect(font).toContain('GLYPHS');
  expect(font).toContain('GLYPH_HEIGHT');
});
