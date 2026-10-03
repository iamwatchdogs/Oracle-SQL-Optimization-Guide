/**
 * Give every root-relative link in the prose its deployment prefix.
 *
 * The notebook is published as a GitHub Pages *project* site, so the site lives
 * at `/Oracle-SQL-Optimization-Guide/`, not at `/`. Astro prefixes the assets it
 * generates — `_astro`, fonts, the canonical link — but it does not touch the
 * links a document writes. `](/04-recipes/02-before-after-with-spa/)` stays
 * exactly that in the built HTML, and on the deployed site it resolves to the
 * origin root, which has no notebook on it.
 *
 * There are 618 such links across the 37 documents. Editing them into the source
 * would be the wrong trade twice over. It would make every cross-reference carry
 * a deployment detail that is not part of the sentence, and it would mean the
 * next document added has to remember a rule nobody can see from reading it.
 * Prefixing at render time keeps the author writing `](/…)` and lets the
 * deployment change without touching a word of the book.
 *
 * ## What gets touched, and what does not
 *
 * Only a root-relative path: one leading slash, not two. `//example.com` is a
 * protocol-relative absolute URL and `#section` is a fragment within this page;
 * `https://` and `mailto:` are already whole. Leaving them alone is the only way
 * this can be safe to run over arbitrary prose — the corpus contains ordinary
 * links to Oracle's own documentation, and a mangled one is worse than a
 * prefixed one that would have worked.
 *
 * Idempotent, because the processor can be run more than once over the same
 * content and a second pass must not produce `/Oracle-…/Oracle-…/`.
 */

import { resolveBase } from './site.mjs';

/** The prefix, as the deployment spells it, normalised to a leading-only slash. */
const normaliseBase = (base) => {
  const trimmed = base.replace(/\/+$/u, '');
  if (trimmed === '' || trimmed === '/') {
    return '';
  }
  return trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
};

/**
 * Note that this is registered as the attacher itself, never called. Handing
 * unified the already-invoked transformer reads as a plugin too, so unified
 * calls it once more with no tree and the walk throws on `undefined` — a
 * failure that names neither this file nor the mistake.
 *
 * @param {object} [options]
 * @param {string} [options.base] the deployment prefix. Defaults to whatever
 *   this build is being made for, resolved when the processor is attached.
 */
export const rehypeBaseLinks =
  ({ base } = {}) =>
  (tree) => {
    const prefix = normaliseBase(base ?? resolveBase());
    if (prefix === '') {
      return;
    }
    visit(tree, 'element', (node) => {
      if (node.tagName !== 'a') {
        return;
      }
      const href = node.properties?.href;
      // Two slashes is protocol-relative; a single slash is the only case here.
      if (typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//')) {
        return;
      }
      if (href === prefix || href.startsWith(`${prefix}/`)) {
        return;
      }
      node.properties.href = `${prefix}${href}`;
    });
  };

/**
 * Depth-first walk. Small enough not to warrant a dependency, and the project
 * already treats the processor module as the place a transform lives.
 */
function visit(node, type, visitor) {
  if (node.type === type) {
    visitor(node);
  }
  for (const child of node.children ?? []) {
    visit(child, type, visitor);
  }
}
