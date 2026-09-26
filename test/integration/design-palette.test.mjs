import { readFile } from 'node:fs/promises';
import { expect, test } from 'vitest';
import { normalizeHex, resolveToken } from '../../src/lib/css-cascade.mjs';
import { compileProjectStylesheet } from '../../src/lib/tailwind-compile.mjs';

const readRepoFile = (relativePath) =>
  readFile(new URL(`../../${relativePath}`, import.meta.url), 'utf8');

const designMarkdown = await readRepoFile('DESIGN.md');
const designMetadata = JSON.parse(await readRepoFile('.impeccable/design.json'));

const DARK_TOKENS = {
  paper: '--paper',
  'paper-raised': '--paper-raised',
  'paper-sunken': '--paper-sunken',
  ink: '--ink',
  'ink-muted': '--ink-muted',
  'ink-faint': '--ink-faint',
  rule: '--rule',
  'rule-strong': '--rule-strong',
  accent: '--accent',
  'accent-hover': '--accent-hover',
  'accent-ink': '--accent-ink',
  'zone-a': '--zone-a',
  'zone-b': '--zone-b',
  'zone-c': '--zone-c',
  'zone-d': '--zone-d',
};

const LIGHT_TOKENS = {
  'light-paper': '--paper',
  'light-paper-raised': '--paper-raised',
  'light-ink': '--ink',
  'light-accent': '--accent',
  'light-accent-hover': '--accent-hover',
};

const themeContext = (theme) => ({
  types: ['div'],
  classes: ['prose'],
  ancestors: [{ types: ['html'], attributes: { 'data-theme': theme } }],
});

const frontmatterColors = () =>
  Object.fromEntries(
    [...designMarkdown.matchAll(/^\s{2}([a-z-]+):\s*'(#[0-9a-f]{6})'/gmu)].map(([, key, value]) => [
      key,
      value,
    ]),
  );

const shipped = async (tokens, theme) => {
  const css = await compileProjectStylesheet();
  const context = themeContext(theme);

  return Object.fromEntries(
    Object.entries(tokens).map(([key, token]) => [
      key,
      normalizeHex(resolveToken(css, context, token)),
    ]),
  );
};

test('the frontmatter declares every shipped dark token colour', async () => {
  const colors = frontmatterColors();
  const dark = await shipped(DARK_TOKENS, 'dark');

  for (const [key, value] of Object.entries(dark)) {
    expect(value).not.toBeNull();
    expect(colors[key]).toBe(value);
  }
});

test('the frontmatter declares every shipped light token colour', async () => {
  const colors = frontmatterColors();
  const light = await shipped(LIGHT_TOKENS, 'light');

  for (const [key, value] of Object.entries(light)) {
    expect(value).not.toBeNull();
    expect(colors[key]).toBe(value);
  }
});

test('the light-raised and light-accent-hover tokens are present and shipped', async () => {
  const colors = frontmatterColors();
  const light = await shipped(LIGHT_TOKENS, 'light');

  expect(colors['light-paper-raised']).toBe('#fffefb');
  expect(colors['light-accent-hover']).toBe('#1e3a7a');
  expect(light['light-paper-raised']).toBe('#fffefb');
  expect(light['light-accent-hover']).toBe('#1e3a7a');
});

test('the light-paper ramp embeds the shipped light paper steps without degenerate steps', async () => {
  const ramp = designMetadata.extensions.colorMeta['light-paper'].tonalRamp;
  const light = await shipped({ paper: '--paper', raised: '--paper-raised' }, 'light');

  expect(ramp).toContain(light.paper);
  expect(ramp).toContain(light.raised);
  expect(ramp.filter((step) => step === '#ffffff')).toHaveLength(0);
  expect(new Set(ramp).size).toBe(ramp.length);
});

test('the accent ramp embeds every shipped dark and light accent step', async () => {
  const ramp = designMetadata.extensions.colorMeta.accent.tonalRamp;
  const dark = await shipped({ accent: '--accent', hover: '--accent-hover' }, 'dark');
  const light = await shipped({ accent: '--accent', hover: '--accent-hover' }, 'light');

  expect(ramp).toContain(dark.accent);
  expect(ramp).toContain(dark.hover);
  expect(ramp).toContain(light.accent);
  expect(ramp).toContain(light.hover);
  expect(light.hover).toBe('#1e3a7a');
});

test('no tonal ramp contains degenerate duplicate steps', () => {
  for (const [name, entry] of Object.entries(designMetadata.extensions.colorMeta)) {
    const ramp = entry.tonalRamp;
    const consecutive = ramp.filter((step, index) => index > 0 && step === ramp[index - 1]);

    expect(name).toBeTruthy();
    expect(ramp.length).toBeGreaterThanOrEqual(5);
    expect(new Set(ramp).size).toBe(ramp.length);
    expect(consecutive).toEqual([]);
  }
});

test('no pre-accessibility zone value survives in the metadata ramps', () => {
  const serialized = JSON.stringify(designMetadata);

  expect(serialized).not.toContain('#8a857c');
  for (const entry of Object.values(designMetadata.extensions.colorMeta)) {
    expect(entry.tonalRamp).not.toContain('#9a958c');
  }
});

test('the zone ramp ships the accessible steps in order', () => {
  const ramp = designMetadata.extensions.colorMeta['zone-a'].tonalRamp;

  expect(ramp[0]).toBe('#9e998f');
  expect(ramp[1]).toBe('#aaa59c');
  expect(ramp).toContain('#b8b3a9');
  expect(ramp).toContain('#e0dbd2');
});

test('the zone ramp embeds every shipped zone step', async () => {
  const css = await compileProjectStylesheet();
  const context = themeContext('dark');
  const ramp = designMetadata.extensions.colorMeta['zone-a'].tonalRamp;

  for (const token of ['--zone-a', '--zone-b', '--zone-c', '--zone-d']) {
    expect(ramp).toContain(normalizeHex(resolveToken(css, context, token)));
  }
});

test('grade chip zone colours match the shipped CSS tokens', async () => {
  const css = await compileProjectStylesheet();
  const context = themeContext('dark');
  const gradeChip = designMetadata.components.find((component) => component.name === 'Grade Chip');

  for (const [zone, letter] of [
    ['a', 'a'],
    ['b', 'b'],
    ['c', 'c'],
    ['d', 'd'],
  ]) {
    const shippedZone = normalizeHex(resolveToken(css, context, `--zone-${letter}`));
    expect(gradeChip.css).toContain(`.ds-grade-chip[data-zone="${zone}"]{color:${shippedZone}}`);
  }
});
