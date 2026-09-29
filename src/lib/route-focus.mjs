/**
 * The focus handoff across a client-side navigation.
 *
 * This is the whole of what the route loader's controller was doing that had
 * anything to do with the reader. A client-side swap destroys whatever had focus,
 * and focus then falls to `<body>` — so a keyboard user who activates a link ends
 * up at the top of the document with no indication that anything happened, and a
 * screen reader user is told nothing at all. Moving focus to the new `<main>`
 * is the fix, and `preventScroll: true` is what keeps it from fighting the
 * router's own scroll restoration, which runs before this does.
 *
 * It used to live inside the loader controller, which meant it was coupled to
 * three things that had nothing to do with it: a 180ms reveal gate, an 8000ms cap,
 * and `aria-busy` bookkeeping. Removing the loader removed all of that and would
 * have silently removed this too. Hence its own module, with nothing else in it.
 *
 * The flag is what distinguishes a client navigation from the first paint.
 * `astro:page-load` fires for both, and the initial load must NOT steal focus —
 * a reader who has tabbed into the page and then hits reload should not be yanked
 * back to the top of the document.
 */
export function createRouteFocusController(dependencies = {}) {
  const documentRef = dependencies.document ?? globalThis.document;
  let navigating = false;

  return {
    /** `astro:before-preparation` — a client navigation is starting. */
    begin() {
      navigating = true;
    },

    /**
     * `astro:page-load` — the navigation has landed.
     *
     * Runs after the router has restored scroll, so the handoff cannot fight it.
     * The flag is cleared on every call, including the initial one, so a stale
     * `true` left behind by an aborted navigation can never fire twice.
     */
    pageLoad() {
      const wasNavigating = navigating;
      navigating = false;
      if (!wasNavigating) {
        return;
      }
      documentRef?.querySelector?.('main#main')?.focus?.({ preventScroll: true });
    },
  };
}
