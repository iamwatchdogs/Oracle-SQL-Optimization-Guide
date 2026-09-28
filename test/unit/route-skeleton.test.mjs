/*
 * The rule that picks a skeleton's shape.
 *
 * This is the whole mechanism behind "the loader knows what is coming", and it
 * runs on every navigation before the loader is even visible — a wrong answer
 * puts the skeleton in the wrong place on the first frame the reader sees, which
 * is the defect this replaced.
 *
 * The URLs are the real ones the site links to. `trailingSlash: 'always'` means
 * the section indexes are `NN-section/` and the notebooks are
 * `NN-section/NN-notebook/`, and the test pins that assumption rather than
 * trusting it: if the routing config changes, these fail and the rule gets
 * re-examined, which is what should happen.
 */

import { describe, expect, test } from 'vitest';
import {
  DEFAULT_SKELETON,
  SKELETON_SHAPES,
  skeletonForPath,
} from '../../src/lib/route-skeleton.mjs';

const shape = (pathname) => skeletonForPath(pathname);

/* The real URLs the site links to, one row per page type. */
const SECTIONS = ['/00-preface/', '/01-proven-techniques/', '/02-papers-behind-recipes/'];
const NOTEBOOKS = [
  '/00-preface/01-why-evidence-grades/',
  '/01-proven-techniques/01-measure-first/',
  '/03-toolbox/01-measure-with-xplan-and-monitor/',
];

describe('skeletonForPath', () => {
  test('the home page is the hero', () => {
    expect(shape('/')).toBe('home');
    expect(shape('//')).toBe('home');
    /* `?q=xplan` alone is deliberately NOT here: resolved against a browser's
       current page it is that page, not the root, and a bare string with no path
       is the "cannot read this" case, which falls back — see below. */
  });

  test('a section index is a section', () => {
    for (const path of [...SECTIONS, '/07-appendix-sources/']) {
      expect(shape(path)).toBe('section');
    }
  });

  test('a notebook is a notebook', () => {
    for (const path of [...NOTEBOOKS, '/07-appendix-sources/01-how-citations-work/']) {
      expect(shape(path)).toBe('notebook');
    }
  });

  test('trailing slashes and query strings make no difference', () => {
    expect(shape('/01-proven-techniques')).toBe('section');
    expect(shape('/01-proven-techniques/01-measure-first')).toBe('notebook');
    expect(shape('/01-proven-techniques/?highlight=xplan')).toBe('section');
  });

  test('a hash link to a page is still a page', () => {
    expect(shape('/#evidence-key')).toBe('home');
    expect(shape('/00-preface/#how-grades-work')).toBe('section');
    expect(shape('/00-preface/01-why-evidence-grades/#evidence-key')).toBe('notebook');
  });

  test('404 is prose, not a list of notebooks', () => {
    /* One segment, so the segment count alone would call it a section index.
       It has no breadcrumb and no child pages; a list of notebooks is the
       further of the two from what it actually looks like. */
    expect(shape('/404')).toBe('notebook');
    expect(shape('/404.html')).toBe('notebook');
  });
});

describe('skeletonForPath — fallbacks', () => {
  test('a path that is not one of ours falls back to the most common shape', () => {
    /* Notebooks are the default because they are 25 of the book's 38 pages, so an
       unclassifiable destination is far more likely to be one than not. */
    expect(DEFAULT_SKELETON).toBe('notebook');
    expect(shape('/somewhere-else')).toBe(DEFAULT_SKELETON);
    expect(shape('/a/b/c/d/')).toBe('notebook');
    /* No pathname at all — a `URL`-shaped object the router never gave us. The
       fallback is the default shape, NOT the hero: answering "home" for an
       unreadable destination would put a display-size title block on whatever the
       reader was opening. */
    expect(shape({})).toBe(DEFAULT_SKELETON);
  });

  test('an empty pathname falls back rather than claiming to be the root', () => {
    expect(shape({ pathname: '' })).toBe(DEFAULT_SKELETON);
  });

  test('every answer is a shape the component ships', () => {
    for (const path of ['/', '/00-preface/', '/00-preface/01-why-evidence-grades/', '/nope']) {
      expect(SKELETON_SHAPES).toContain(shape(path));
    }
  });
});
