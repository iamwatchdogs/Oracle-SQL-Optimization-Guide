/*
 * Digit-safe element lookup.
 *
 * 205 of the 294 heading ids this project ships begin with a digit, so a bare
 * `#id` is an invalid selector that throws in every engine. `CSS.escape` is
 * Safari 10+, but the `?? id` fallback turned an unavailable `CSS.escape` into a
 * hard crash inside the `astro:page-load` listener. Fall back to a scan.
 *
 * This lives in its own module because two consumers need it — the scroll-spy
 * and the mobile jump re-anchor — and a second copy of "how do we safely find a
 * heading" is exactly the kind of thing that quietly diverges.
 */
function escapeId(id) {
  return globalThis.CSS?.escape?.(id) ?? id;
}

export function findById(documentRef, id) {
  try {
    return documentRef.querySelector?.(`#${escapeId(id)}`) ?? null;
  } catch {
    return (
      Array.prototype.find.call(
        documentRef.getElementsByTagName?.('*') ?? [],
        (element) => element.id === id,
      ) ?? null
    );
  }
}
