import { findById } from './dom.mjs';
import { reanchorAfterSettle } from './disclosure-reanchor.mjs';

/*
 * What following an in-page outline link does, which is not the same concern as
 * measuring which section is current. Split out of `reading-toc-controller.mjs`
 * for that reason, and because this module is the only caller of `reanchorAfterSettle`
 * from the outline.
 */

/*
 * ONE CLOSURE PER HEADING, registered on every anchor that points at it.
 *
 * Registration is NOT halved. `ReadingToc.astro` renders each heading twice and the
 * two anchors are `display:none` at complementary breakpoints — the rail is
 * `hidden lg:block` (ReadingToc.astro:36), the outline is `lg:hidden`
 * (ReadingToc.astro:79) — so exactly one of the pair is clickable at any viewport and
 * both need a handler, or panel-close dies at the other breakpoint. What is halved
 * is the closure count: 84 on the flagship page before, 42 after, where each of the
 * 84 used to capture its own `entry` and its own copy of the same id to do
 * identical work.
 *
 * Returns a disposer.
 *
 * `AbortController` is the tidiest way to unregister 84 listeners at once on the
 * flagship page, but it is a dependency, not a guarantee: when it is unavailable
 * `options` is `undefined` and the listeners had nothing to remove them. The
 * disposers are collected explicitly so `teardown` works either way — otherwise
 * every Astro navigation stacked another 84 handlers on a persistent panel, each
 * closing the mobile disclosure and re-anchoring against a stale document.
 */
export function closeMobileOnJump(entries, mobile, signal, windowRef, documentRef) {
  const handlers = [];

  for (const entry of entries) {
    const id = entry.id;
    const handler = () => {
      if (mobile?.open && windowRef.matchMedia?.('(max-width: 1023px)')?.matches) {
        mobile.open = false;
        reanchorAfterSettle({
          container: mobile,
          resolveTarget: () => findById(documentRef, id),
          windowRef,
        });
      }
    };
    for (const anchor of entry.links) {
      anchor.addEventListener?.('click', handler, signal ? { signal } : undefined);
      handlers.push([anchor, handler]);
    }
  }

  return () => {
    for (const [link, handler] of handlers) {
      link.removeEventListener?.('click', handler);
    }
    handlers.length = 0;
  };
}
