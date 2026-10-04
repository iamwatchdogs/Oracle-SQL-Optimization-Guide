/**
 * A control's own boundary, as opposed to the decorative hairlines beside it.
 *
 * Split into its own file because `design-tokens.test.mjs` is at the file-length
 * limit, and this asks a different question: not "is this palette pair above its
 * floor" but "which elements is this value for".
 */
import { expect, test } from 'vitest';
import { compileProjectStylesheet } from '../../test/support/css/tailwind-compile.mjs';
import { contrast, normalizeHex, tokensForBothThemes } from '../support/design-tokens.mjs';

test('a control border clears the 3:1 non-text floor, unlike the hairline beside it', async () => {
  const all = await tokensForBothThemes();
  for (const theme of ['dark', 'light']) {
    const tokens = all[theme];
    const ratio = contrast(normalizeHex(tokens['control-edge']), normalizeHex(tokens.paper));

    /*
     * `@layer base` sets `border-color: var(--rule)` on every element, so a control
     * that did not override it inherited a decorative hairline value: 1.73:1 dark,
     * 1.92:1 light. For a control the border is the boundary that identifies it —
     * take it away and there is no control — which is the case WCAG 1.4.11 covers,
     * where the table rules and code frames sitting next to it are not.
     *
     * A separate token rather than a repointed `--rule`, because `--rule` is
     * specified as a 1px hairline and keeps that value everywhere else.
     */
    expect(ratio, `${theme}: control edge is ${ratio.toFixed(2)}:1`).toBeGreaterThanOrEqual(3);
  }
});

test('the hairline is still a hairline, and still lower', async () => {
  const all = await tokensForBothThemes();
  for (const theme of ['dark', 'light']) {
    const tokens = all[theme];
    const paper = normalizeHex(tokens.paper);
    const hairline = contrast(normalizeHex(tokens.rule), paper);
    const edge = contrast(normalizeHex(tokens['control-edge']), paper);

    /*
     * The fix must not quietly flatten the two. A control boundary and a decorative
     * rule are different jobs, and if they ended up the same value the design would
     * have lost the distinction that motivated a separate token.
     */
    expect(edge, `${theme}: control edge must read stronger than the hairline`).toBeGreaterThan(
      hairline,
    );
  }
});

test('controls are the only elements the base layer re-borders', async () => {
  const stylesheet = await compileProjectStylesheet();

  /*
   * The attribute is matched with `["']` because the compiler normalises the
   * author's single quotes to double quotes, and a selector list is only worth
   * pinning if the test can survive the pipeline rewriting it.
   */
  const rule = new RegExp(
    String.raw`button,\s*summary,\s*input,\s*select,\s*textarea,\s*\[role=["']button["']\]\s*\{\s*border-color:\s*var\(--control-edge\)`,
    'u',
  ).test(stylesheet);
  expect(rule, 'the control-edge rule is missing or its selector list changed').toBe(true);

  /*
   * The rule is scoped away from `a` on purpose. An inline link is identified by
   * its text, so a border on one is a separator, and re-bounding every bordered
   * link in the prose would put a 1px box around running text. A button, a
   * `summary` or a form field has no text-only fallback.
   */
  const selectorList =
    /([^{}]*)\{\s*border-color:\s*var\(--control-edge\)/u.exec(stylesheet)?.[1] ?? '';
  expect(selectorList, 'a bare `a` in the control-edge selector list').not.toMatch(/\ba\b/u);
});
