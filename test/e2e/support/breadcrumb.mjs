/**
 * The breadcrumb trail's line count, and per item: whether it overflows the column,
 * and whether its separator shares a line box with the label it belongs to.
 */
export const breadcrumbShape = (page) =>
  page.evaluate(() => {
    const list = document.querySelector('nav[aria-label="Breadcrumb"] ol');
    /*
     * The line pitch is read from the trail's own computed `line-height` rather than
     * assumed. It was hard-coded at 22px, which happened to be right for a 13px
     * label at 1.65 leading and wrong for every reader who has changed their text
     * size — and wrong by enough that a one-row trail on a phone divided to 1 and a
     * two-row trail to 2 for reasons that had nothing to do with the wrapping.
     */
    const lineHeight = Number.parseFloat(getComputedStyle(list).lineHeight);

    return {
      lineHeight,
      lines: Math.round(list.getBoundingClientRect().height / lineHeight),
      items: [...list.children].map((item) => {
        const separator = item.querySelector('span[aria-hidden="true"]');
        const label = [...item.children].find((child) => child !== separator);

        return {
          text: item.textContent.replaceAll(/\s+/gu, ' ').trim().slice(0, 40),
          overflows: item.scrollWidth > item.clientWidth + 1,
          /*
           * The invariant, measured properly.
           *
           * This used to compare the separator's top to the ITEM's top, which is
           * true by construction — they are in the same box — so it returned `false`
           * for a row that was visibly broken, and the test passed on the defect it
           * was written to catch. The last crumb's label was a `display: block`
           * span, so its `/` sat alone on one line and the title on the next: a
           * 41.4px row for a 21.4px label, and this check said everything was fine.
           *
           * What has to be measured is the separator against the LABEL. Same line
           * box means the two boxes agree to a couple of pixels; a label pushed to
           * the next line is a full line box away, and 6px is comfortably between
           * the two.
           */
          separatorStranded:
            separator === null || label === undefined
              ? null
              : Math.abs(
                  separator.getBoundingClientRect().top - label.getBoundingClientRect().top,
                ) > 6,
        };
      }),
    };
  });

/**
 * The trail's box against the article's, and the h1's.
 *
 * The trail is a child of the reading COLUMN, so its natural cap is
 * `--width-reading-track` (46rem) while the h1 and the prose under it are capped at
 * `--measure` (70ch) — 70px wider, and ~101px and ~119px wider at the other two
 * measure steps. Left edges match and right edges do not, so a long title truncated
 * at an x nothing else on the page ever reached. The pager and the h2 rules already
 * keep one right edge; the trail has to keep it too.
 */
export const breadcrumbEdges = (page) =>
  page.evaluate(() => {
    const right = (selector) => {
      const element = document.querySelector(selector);
      return element === null ? null : Math.round(element.getBoundingClientRect().right);
    };
    return {
      article: right('article.prose'),
      h1: right('article.prose h1'),
      h2Rule: right('article.prose h2'),
      trail: right('nav[aria-label="Breadcrumb"]'),
    };
  });
