import { expect, test } from 'vitest';
import { parseCompiledStylesheet } from '../../test/support/css/css-cascade.mjs';
import { compileProjectStylesheet } from '../../test/support/css/tailwind-compile.mjs';

const compiled = compileProjectStylesheet();

/*
 * The framed panel's inline inset.
 *
 * Its own file because it is a two-element contract — the summary's padding and
 * the panel's — and the disclosure stylesheet tests were already at the file-size
 * cap. It is the only place the panel is allowed to carry padding at all: the
 * inner must rest at exactly zero, because the close animates the row to `0fr`
 * and any block padding there would leave a residual band.
 */
test('the framed panel insets to the summary and never below it', async () => {
  const stylesheet = parseCompiledStylesheet(await compiled);
  const summary = stylesheet.rules.find((rule) =>
    rule.selector.includes('details.disclosure > summary'),
  );
  const flow = stylesheet.rules.find((rule) =>
    rule.selector.includes('details.disclosure > .disclosure-flow'),
  );

  /* The summary has always been inset `0.9rem` and the panel was not, so the
     panel's first line sat 14.4px to the LEFT of the label it explains. The inset
     belongs on the panel's FRAME, so the inner declares no padding and the
     zero-height row stays exactly zero. */
  expect(summary?.declarations.get('padding')).toBe('.7rem .9rem');
  expect(flow?.declarations.get('padding-inline')).toBe('.9rem');
  expect(flow?.declarations.has('padding')).toBe(false);
  expect(flow?.declarations.has('padding-block')).toBe(false);
});
test('the framed panel insets to the summary and never below it', async () => {
  const stylesheet = parseCompiledStylesheet(await compiled);
  const summary = stylesheet.rules.find((rule) =>
    rule.selector.includes('details.disclosure > summary'),
  );
  const flow = stylesheet.rules.find((rule) =>
    rule.selector.includes('details.disclosure > .disclosure-flow'),
  );

  /* The summary has always been inset `0.9rem` and the panel was not, so the
     panel's first line sat 14.4px to the LEFT of the label it explains. The inset
     belongs on the panel's FRAME, so the inner declares no padding and the
     zero-height row stays exactly zero. */
  expect(summary?.declarations.get('padding')).toBe('.7rem .9rem');
  expect(flow?.declarations.get('padding-inline')).toBe('.9rem');
  expect(flow?.declarations.has('padding')).toBe(false);
  expect(flow?.declarations.has('padding-block')).toBe(false);
});
