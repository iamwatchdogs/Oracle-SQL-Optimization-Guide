/*
 * WHICH SECTION IS CURRENT, from geometry alone.
 *
 * Split out of `reading-toc-controller.mjs` so the resolver's contract is stated
 * once: what it reads, and in what order. That order is the whole subject of this
 * module, because the properties it consults are not equal in cost — `scrollY` is
 * free, and `documentElement.scrollHeight` forces Blink to recalculate style and
 * lay out the entire document before it can answer, on a page whose article can
 * carry eight thousand elements.
 */

/*
 * Calling this on scroll (coalesced to one frame) fixes the old
 * IntersectionObserver-driven spy, which lagged a programmatic scroll by a frame
 * and, at the bottom of a page whose last heading sits below the band, silently
 * kept the FIRST section marked current. An explicit page-bottom case: at the end
 * of the document the last section is the current one, because that is the text
 * being read.
 */
export function resolveActiveId(entries, windowRef, documentRef) {
  if (entries.length === 0) {
    return null;
  }
  const viewportHeight = windowRef?.innerHeight ?? 0;
  const scrollTop = windowRef?.scrollY ?? 0;
  // Before the first heading the reader is at the start of the document, so the
  // first section is the current one even though it is nowhere near the band.
  //
  // Asked FIRST, and ahead of the `scrollHeight` read below, because that read is a
  // forced layout and this is the branch every cold load takes — a reader arrives at
  // the top. The page-bottom case genuinely needs the document height and still
  // gets it.
  if (scrollTop <= 2) {
    return entries[0].id;
  }
  const maxScroll = Math.max(0, (documentRef?.documentElement?.scrollHeight ?? 0) - viewportHeight);
  if (maxScroll > 0 && maxScroll - scrollTop <= 2) {
    return entries.at(-1).id;
  }
  const bandTop = viewportHeight * 0.15;
  const bandBottom = viewportHeight * 0.35;
  let inBand;
  let lastAbove;
  for (const entry of entries) {
    const rect = entry.section.getBoundingClientRect?.();
    if (!rect) {
      continue;
    }
    if (inBand === undefined && rect.top < bandBottom && rect.bottom > bandTop) {
      inBand = entry.id;
    }
    if (rect.top <= bandTop) {
      lastAbove = entry;
    }
  }
  // Nothing in the band and nothing above it: the reader is above the first
  // heading, so no section is current. Returning an id here would name a
  // section that has not been reached.
  return inBand ?? lastAbove?.id ?? null;
}

export function inputsChanged(lastInputs, scrollY, innerHeight, scrollHeight) {
  return (
    lastInputs === null ||
    lastInputs.scrollY !== scrollY ||
    lastInputs.innerHeight !== innerHeight ||
    lastInputs.scrollHeight !== scrollHeight
  );
}
