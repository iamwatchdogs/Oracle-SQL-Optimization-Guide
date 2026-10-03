/*
 * Font preloads, as a browser discovers them.
 *
 * `test/integration/font-preload.test.mjs` proves which faces the built `<head>` asks the parser to fetch, by
 * reading the markup. That is the right level for a fact about a document, and it cannot say the thing that
 * matters: whether the face a reader is LOOKING AT was found by the parser or by the CSSOM after layout — two
 * states that are indistinguishable in a preload link and completely different to the reader.
 *
 * The discriminator is `ResourceTiming.initiatorType`, chosen because it is not a clock. A preload is resolved
 * by the HTML parser, before any stylesheet has been matched to an element, so Chromium and WebKit report
 * `"link"`; a face only a `@font-face` asks for is resolved after the CSSOM exists, so they report `"css"`.
 * Measured on this build before the change: the mono face at `startTime` 76 ms and `responseEnd` 112 ms on a
 * cold local load, against 25 ms and 31 ms for the trio, and under an emulated Slow 4G link (1.6 Mbps, 150 ms
 * RTT) its `responseEnd` was 1817 ms against 1365-1410 ms — a visible reflow of the running head on every
 * page. Gecko reports `"other"` for both, which is why three tests skip on Firefox, with the measured reason in
 * `reportsInitiator`.
 *
 * NOTHING HERE IS A TIMING ASSERTION. No deadline, no network idle, no byte rate, no race between a paint and
 * a threshold — the failure modes `critical-css.spec.mjs` and `code-block-css.spec.mjs` both rule out in their
 * headers: a spec that measures time reports on the machine it ran on.
 *
 * WHAT IS ASSERTED, in the order a reader wants it: (1) the first viewport paints in the three faces the design
 * system gives the chrome and each was found by a preload — the face set DISCOVERED per route from
 * `getComputedStyle` over every element whose box intersects the viewport, so the claim is about the first
 * screenful and not about this file's idea of it, and asserted first so a page which stopped rendering mono in
 * its header fails loudly instead of quietly having nothing to check; (2) no preload is spent on a face the
 * first viewport does not use; (3) the italic face still transfers and is no longer found by the parser — the
 * cost of the change, asserted rather than left in a comment; (4) the running head computes to the mono face,
 * that face has arrived, and it is inside the viewport — "no flash of the wrong family" as a settled state.
 *
 * `font-display: swap` is why (3) is a swap and not a disappearance, and the integration test asserts every face
 * still declares it: only a browser can see the swap and only the build can see the declaration.
 */
import { expect, test } from '@playwright/test';
import {
  COLD_LOADS,
  DESKTOP,
  EVERY_FACE,
  FIRST_VIEWPORT_FACES,
  MOBILE,
  coldLoad,
  preloadedFaces,
  readWordmark,
  reportsInitiator,
  requestFor,
  timeline,
  unaccountedFaces,
} from './support/fonts.mjs';

const GECKO_SKIP = 'Gecko reports `other` for every font request';

/**
 * The POSITIVE CONTROL: the first viewport paints in the three faces, and in nothing unaccounted for.
 *
 * A subset assertion on the remainder rather than set equality, because equality was the first draft and it
 * was wrong: it goes red on any route where the conclusion card clears the fold, and seven of the thirty-seven
 * do. Asserted before anything about preloads — a page painted entirely in fallbacks reports no faces at all.
 */
const assertFirstViewportFaces = (facts) => {
  for (const face of FIRST_VIEWPORT_FACES) {
    expect(
      facts.above.get(face),
      `${facts.where}: only ${facts.above.get(face) ?? 0} elements paint in ${face}`,
    ).toBeGreaterThan(1);
  }
  expect(
    unaccountedFaces(facts),
    `${facts.where} paints its first viewport in faces this spec does not account for`,
  ).toEqual([]);
};

/**
 * Every preload the head declares is well formed, and the browser fetched it — the PORTABLE half of test three.
 *
 * No engine telemetry, because a `<link rel="preload">` in `<head>` is resolved by the parser in every engine.
 * `crossorigin` is asserted because its absence is invisible in the markup and doubles the transfer: fonts are
 * always fetched in CORS mode, so a preload without it is fetched twice and the second copy arrives after
 * layout. Asserted here as well as in the integration test — the build emits it, and the browser honours it.
 */
const assertPreloadsWellFormed = (facts) => {
  expect(facts.preloaded.length, `${facts.where} preloads no font at all`).toBe(
    FIRST_VIEWPORT_FACES.length,
  );
  for (const link of facts.preloaded) {
    expect(link.crossorigin, `${facts.where} preloads ${link.file} without crossorigin`).toBe(true);
    expect(
      facts.fetched.find((entry) => entry.file === link.file),
      `${facts.where} declares a preload for ${link.file} and the browser never fetched it`,
    ).toBeDefined();
  }
};

/**
 * Exactly the three faces above the fold are preloaded, and the site has no fifth face to hide.
 *
 * EXACT rather than bounded, because a bound permitting four link-initiated requests permits the pre-change
 * state. The italic face being above the fold on seven routes does not weaken that: it is `css`-initiated
 * there, so it is not in this list. And `EVERY_FACE` makes the count a statement about the whole font budget,
 * so a future `<Font>` cannot add a fifth and stay quiet.
 */
const assertOnlyUsedFacesArePreloaded = (facts) => {
  expect(
    preloadedFaces(facts),
    `${facts.where}: preloaded faces were ${preloadedFaces(facts).join(', ')} — timeline ${timeline(facts)}`,
  ).toEqual(FIRST_VIEWPORT_FACES);
  expect(
    [...new Set(facts.faceOfFile.values())].toSorted(),
    `${facts.where} declares faces this spec does not know about`,
  ).toEqual(EVERY_FACE);
};

/** The engine-specific half: the browser AGREED each `<link>` was a preload, not merely that it fetched. */
const assertPreloadsHonoured = (facts) => {
  for (const link of facts.preloaded) {
    expect(
      facts.fetched.find((entry) => entry.file === link.file)?.initiatorType,
      `${facts.where} declares a preload for ${link.file} and the browser did not use it as one`,
    ).toBe('link');
  }
};

/**
 * "Without a flash of the wrong family", as a settled state rather than as a moment.
 *
 * A FOIT/FOUT assertion would race a paint against a deadline. Instead: the wordmark COMPUTES to the mono
 * family, so it was never going to paint in Times, and that family is among the LOADED faces, so the fallback
 * was not what the reader saw. Position is asserted too — the integration tests infer "above the fold" from the
 * DOM and this is the only place in the suite that measures it.
 */
const assertWordmarkIsMono = (facts, wordmark) => {
  expect(wordmark, `${facts.where} has no running head`).not.toBeNull();
  expect(
    facts.above.get('mono|normal'),
    `${facts.where}: the running head is not among the faces the first viewport paints in`,
  ).toBeGreaterThan(1);
  expect(
    facts.loaded,
    `${facts.where}: the mono face the running head paints in never loaded (loaded: ${facts.loaded.join(', ')})`,
  ).toContain(`mono|${wordmark.style}`);
  expect(
    wordmark.family,
    `${facts.where}: the running head declares ${wordmark.family}, which does not lead with the mono face`,
  ).toMatch(/JetBrains Mono/u);
  expect(
    wordmark.top,
    `${facts.where}: the running head sits at y=${Math.round(wordmark.top)} in a ${wordmark.height}px viewport, so it is not above the fold`,
  ).toBeLessThan(wordmark.height);
};

/**
 * THE CLAIM: each face the first viewport paints in had its file found by the PARSER.
 *
 * Each face maps to exactly one transferred file through the document's own `@font-face` rules, and that
 * file's `initiatorType` is `link` rather than `css`. Before the change the mono face reported `css`, which is
 * what this reports.
 */
const assertFoundByTheParser = (facts) => {
  for (const face of FIRST_VIEWPORT_FACES) {
    const request = requestFor(facts, face);
    expect(
      request,
      `${facts.where}: ${face} is painted above the fold and was never transferred (transferred: ${timeline(facts)})`,
    ).toBeDefined();
    expect(
      request.initiatorType,
      `${facts.where}: ${face} was found by the ${request.initiatorType}, not by the parser — it has no preload (transferred: ${timeline(facts)})`,
    ).toBe('link');
  }
};

/**
 * Every cold load this spec makes, at `viewports`, handed to `visit` with the page's own facts.
 *
 * Written once so the route list cannot drift between four tests. The sequential awaits are the one lint
 * exception here and are deliberate: firing six cold loads at a static server at once would queue them behind
 * each other and change the request ordering these assertions are about.
 */
const forEachColdLoad = async (page, visit, viewports = [DESKTOP, MOBILE]) => {
  for (const { route, viewport } of COLD_LOADS) {
    if (!viewports.includes(viewport)) {
      continue;
    }
    // oxlint-disable-next-line no-await-in-loop -- cold loads, one at a time, on purpose
    await visit(await coldLoad(page, route, viewport));
  }
};

test.describe('cold load — the first viewport’s faces are found by the parser', () => {
  test('the three faces the first viewport paints in were all found by a preload', async ({
    page,
    browserName,
  }) => {
    /*
     * The defect this spec exists for, in the form only a browser can answer. JetBrains Mono is the running
     * head — the header wordmark and the `Section 02 / 09` counter, both inside a `sticky top-0` header — and
     * it was the one face with no preload, so Chromium discovered it from the CSSOM after layout.
     * `initiatorType` separates the two mechanisms with no clock involved.
     */
    test.skip(!reportsInitiator(browserName), GECKO_SKIP);

    await forEachColdLoad(page, (facts) => {
      assertFirstViewportFaces(facts);
      assertFoundByTheParser(facts);
    });
  });

  test('no preload is spent on a face the first viewport does not use', async ({
    page,
    browserName,
  }) => {
    /* The other side of the bijection, and the one with the largest file on it — see the helper. */
    test.skip(!reportsInitiator(browserName), GECKO_SKIP);

    await forEachColdLoad(page, assertOnlyUsedFacesArePreloaded);
  });

  test('every preload the head declares is well formed and the browser honours it', async ({
    page,
    browserName,
  }) => {
    /*
     * The head's own list, checked against what the browser did with it, on every route. The only test here
     * that runs on all four projects in full, because its well-formedness half needs no engine telemetry.
     */
    await forEachColdLoad(
      page,
      (facts) => {
        assertPreloadsWellFormed(facts);
        if (reportsInitiator(browserName)) {
          assertPreloadsHonoured(facts);
        }
      },
      [DESKTOP],
    );
  });
});

test.describe('cold load — the italic face is transferred, by the CSSOM', () => {
  test('the italic face still transfers, and no longer with preload priority', async ({
    page,
    browserName,
  }) => {
    /*
     * THE COST OF THE CHANGE, asserted rather than described, because a suite that only recorded what got
     * better would let this read as though nothing was traded.
     *
     * All 37 content pages render italic text — the prose `blockquote`, italic because
     * `@tailwindcss/typography` says so (`node_modules/@tailwindcss/typography/src/styles.js:1485-1489`), and
     * the `.prose > p:has( > strong:only-child)` card this stylesheet writes itself at
     * `src/styles/global.css:1202-1211` — so the italic file is transferred on every page whether or not it
     * is preloaded. What dropping the preload removes is the PARSER's early request for it: the file is now
     * found by the CSSOM after the document has been matched, which is what puts it behind the three faces a
     * reader is actually looking at.
     *
     * `initiatorType: "css"` is the assertion, and it is the exact inverse of the one above — which is why
     * both are here. Together they say: the three faces above the fold are found by the parser, and the
     * fourth is not. A change that dropped the `@font-face` instead of the preload would fail this on the
     * "still transfers" half, which is the failure that would be invisible in a performance report.
     */
    test.skip(!reportsInitiator(browserName), GECKO_SKIP);

    await forEachColdLoad(page, (facts) => {
      const italic = requestFor(facts, 'serif|italic');
      expect(
        italic,
        `${facts.where} never transferred the italic face (transferred: ${timeline(facts)}) — a page that renders italic text would never see it`,
      ).toBeDefined();
      expect(
        italic.initiatorType,
        `${facts.where}: the italic face is back on the critical path, found by the parser rather than the CSSOM`,
      ).toBe('css');
    });
  });

  test('the running head paints in the mono face, that face has arrived, and it is above the fold', async ({
    page,
  }) => {
    await forEachColdLoad(
      page,
      async (facts) => {
        assertWordmarkIsMono(facts, await readWordmark(page));
      },
      [MOBILE],
    );
  });
});
