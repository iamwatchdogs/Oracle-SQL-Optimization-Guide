/**
 * Design-token floors, read from the compiled stylesheet.
 *
 * Every value asserted here was measured in a browser against the real shipped
 * page, and every one of them is a contrast figure the design system depends on.
 * They are re-derived from the compiled CSS rather than pinned as literals, so a
 * palette edit that quietly drops a pair below its floor fails here instead of
 * shipping.
 */
import { expect, test } from 'vitest';
import { compileProjectStylesheet } from '../../test/support/css/tailwind-compile.mjs';
import {
  composite,
  contrast,
  normalizeHex,
  tokensForBothThemes,
} from '../support/design-tokens.mjs';

test('every text/ground pair clears 4.5:1 in both themes', async () => {
  const all = await tokensForBothThemes();
  for (const theme of ['dark', 'light']) {
    const tokens = all[theme];
    const paper = normalizeHex(tokens.paper);
    const raised = normalizeHex(tokens['paper-raised']);
    const pairs = [
      ['ink on paper', tokens.ink, paper],
      ['ink-muted on paper', tokens['ink-muted'], paper],
      ['ink-faint on paper', tokens['ink-faint'], paper],
      ['accent on paper', tokens.accent, paper],
      ['accent on paper-raised', tokens.accent, raised],
      ['ink-muted on paper-raised', tokens['ink-muted'], raised],
      ['accent-ink on accent', tokens['accent-ink'], tokens.accent],
      ['accent-ink on accent-hover', tokens['accent-ink'], tokens['accent-hover']],
      [
        'selected text on its own selection wash',
        composite(tokens['selection-fg'], paper),
        composite(tokens['selection-bg'], paper),
      ],
    ];

    for (const [label, foreground, background] of pairs) {
      const fg = normalizeHex(foreground);
      const bg = normalizeHex(background);
      expect(fg, `${theme}: ${label} did not resolve (${foreground})`).toBeTruthy();
      expect(bg, `${theme}: ${label} background did not resolve (${background})`).toBeTruthy();
      const ratio = contrast(fg, bg);
      expect(ratio, `${theme}: ${label} is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(4.5);
    }
  }
});

/* ---- 2. the zone ramp is a ramp, in both themes -------------------- */
test('each zone step is distinguishable from the one before it', async () => {
  /*
   * The ramp encodes evidence grade, so a step that is arithmetically present
   * but visually identical encodes nothing. This is why the light C/D pair was
   * re-checked: it measured 1.03:1, against 1.16-1.89 for every other step in the
   * system. It is left as documented in DESIGN.md, and this test is what records
   * WHY — see the note below — rather than silently tolerating the collapse.
   */
  const all = await tokensForBothThemes();
  for (const theme of ['dark', 'light']) {
    const tokens = all[theme];
    const paper = normalizeHex(tokens.paper);
    const chip = normalizeHex(composite(tokens['zone-chip-bg'], paper));

    for (const [from, to] of [
      ['zone-a', 'zone-b'],
      ['zone-b', 'zone-c'],
      ['zone-c', 'zone-d'],
    ]) {
      const step = contrast(normalizeHex(tokens[to]), normalizeHex(tokens[from]));

      if (theme === 'light' && from === 'zone-c') {
        /*
         * The light C/D step is 1.03:1 and CANNOT be opened.
         *
         * Both chips are 11px semibold, so both need 4.5:1 on the chip
         * background — and C already sits at 4.74:1. Every candidate that opens
         * the step to 1.2:1 or better drops below that floor, so the choice is
         * between a ramp that encodes nothing and text that fails AA. The
         * chips carry a visible `C1`/`C2`/`D` label, so colour is a redundant
         * channel and readability wins. Pinned here so the trade is explicit
         * and any future palette change has to argue against it.
         */
        expect(step, `light ${from}->${to} is ${step.toFixed(2)}:1`).toBeLessThan(1.1);
        continue;
      }

      expect(step, `${theme}: ${from} -> ${to} is ${step.toFixed(2)}:1`).toBeGreaterThan(1.1);
    }

    /* And every step stays readable on the chip background it sits on. */
    for (const zone of ['zone-a', 'zone-b', 'zone-c', 'zone-d']) {
      const ratio = contrast(normalizeHex(tokens[zone]), chip);
      expect(
        ratio,
        `${theme}: ${zone} on its chip is ${ratio.toFixed(2)}:1`,
      ).toBeGreaterThanOrEqual(4.5);
    }
  }
});

/* ---- 3. the scrollbar thumb is a control boundary ------------------ */
test('the scrollbar thumb clears the 3:1 non-text floor against its own track', async () => {
  const all = await tokensForBothThemes();
  for (const theme of ['dark', 'light']) {
    const tokens = all[theme];
    const ratio = contrast(
      normalizeHex(tokens['scrollbar-thumb']),
      normalizeHex(tokens['scrollbar-track']),
    );

    /*
     * `--rule-strong` was the value here, at 1.73:1 dark and 1.92:1 light. A
     * scrollbar thumb is a component boundary under WCAG 1.4.11 — unlike the
     * decorative hairlines it sits beside — and it was invisible at rest while
     * the hover state jumped straight past 3:1. An inverted affordance.
     */
    expect(ratio, `${theme}: scrollbar thumb is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
  }
});

/* ---- 4. the takeaway hairline is visible against its own tint ------- */
test('the takeaway hairline is not the same value as the tint it frames', async () => {
  const css = await compileProjectStylesheet();
  const stylesheet = css;

  /*
   * `--rule` against the composited `--accent-soft` measured 1.09:1 in dark and
   * 1.02:1 in light: the hairline the block is specified to carry was arithmetically
   * present and visually absent, leaving a borderless full-measure slab.
   */
  const usesStrongRule =
    /\.prose\s*>\s*p:has\(\s*>\s*strong:only-child\s*\)\s*\{[^}]*border-block:\s*1px solid var\(--rule-strong\)/u.test(
      stylesheet,
    );
  const usesWeakRule =
    /\.prose\s*>\s*p:has\(\s*>\s*strong:only-child\s*\)\s*\{[^}]*border-block:\s*1px solid var\(--rule\)/u.test(
      stylesheet,
    );

  expect(usesStrongRule).toBe(true);
  expect(usesWeakRule).toBe(false);
});

/* ---- 5. standard scrollbar properties are themed ------------------- */
test('the standard scrollbar properties are themed, not left to the UA', async () => {
  const css = await compileProjectStylesheet();

  expect(css).toMatch(/scrollbar-color:\s*var\(--scrollbar-thumb\)\s*var\(--scrollbar-track\)/u);
  expect(css).toMatch(/scrollbar-width:\s*auto/u);
});

/* ---- 6. the caret is themed on the root, not only on form controls -- */
test('the caret is themed from the palette on the root element', async () => {
  const css = await compileProjectStylesheet();

  expect(css).toMatch(/:where\(html\)\s*\{\s*caret-color:\s*var\(--accent\)/u);
});

/* ---- 7. font stacks fall back when the font pipeline is absent ---- */
test('every font stack carries its designed fallback', async () => {
  const css = await compileProjectStylesheet();

  for (const [token, fallback] of [
    ['--font-serif', 'Georgia, serif'],
    ['--font-sans', 'system-ui, sans-serif'],
    ['--font-mono', 'ui-monospace, monospace'],
  ]) {
    const declaration = new RegExp(
      `${token}:\\s*var\\([^)]*,\\s*[^)]*${fallback.replaceAll('.', '\\.')}[^)]*\\)`,
      'u',
    );
    expect(css, `${token} has no fallback`).toMatch(declaration);
  }
});
