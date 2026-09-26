/**
 * Accessible names, read the way the platform reads them.
 *
 * `textContent` is not an accessible name. Two shipped surfaces put decorative
 * glyphs in the DOM inside `aria-hidden="true"`:
 *
 *   - the pager arrows, `<span aria-hidden="true">←</span> Previous`
 *   - the reading TOC ordinals, `<span aria-hidden="true">01</span>Heading`
 *
 * Both are absent from the name a screen reader announces and present in
 * `textContent`, so `textContent` reports `"← Previous"` and `"01Heading"` for
 * controls that announce as `"Previous"` and `"Heading"`. Cloning the node and
 * dropping its `aria-hidden` subtrees reproduces the platform rule for a link
 * with no `aria-label`, which is what every one of these elements is.
 *
 * Whitespace is collapsed because the name is assembled across inline siblings:
 * the pager's label and its arrow are adjacent text nodes with no separator.
 *
 * The strip step is written out inline in each callback rather than hoisted into
 * a module function: an `evaluate` body is serialised and re-parsed in the
 * browser, so it closes over nothing.
 */

/** The accessible name of a single element. */
export function accessibleName(locator) {
  return locator.evaluate((el) => {
    const clone = el.cloneNode(true);
    for (const hidden of clone.querySelectorAll('[aria-hidden="true"]')) {
      hidden.remove();
    }
    return (clone.textContent ?? '').replaceAll(/\s+/gu, ' ').trim();
  });
}

/** The accessible name of every match, in document order. */
export function accessibleNames(locator) {
  return locator.evaluateAll((nodes) =>
    nodes.map((el) => {
      const clone = el.cloneNode(true);
      for (const hidden of clone.querySelectorAll('[aria-hidden="true"]')) {
        hidden.remove();
      }
      return (clone.textContent ?? '').replaceAll(/\s+/gu, ' ').trim();
    }),
  );
}
