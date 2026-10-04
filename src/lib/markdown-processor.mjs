import { unified } from '@astrojs/markdown-remark';
import { remarkCitations, remarkMeasuredValues } from './remark-measured.mjs';
import { rehypeDisclosures } from './rehype-disclosures.mjs';
import { rehypeTableScroll } from './rehype-table-scroll.mjs';
import { rehypeTaskLabels } from './rehype-task-label.mjs';
import { rehypeCallouts } from './rehype-callouts.mjs';
import { rehypeBaseLinks } from './rehype-base-links.mjs';

export const remarkPlugins = [remarkMeasuredValues, remarkCitations];

export const rehypePlugins = [
  rehypeDisclosures,
  rehypeTableScroll,
  rehypeTaskLabels,
  /* After the task labels, so it can see the `.task-list-item` class they rely on
     being present — `rehypeTaskLabels` reads it rather than writes it, but the
     ordering states the dependency instead of leaving it to both being
     unconditional. */
  rehypeCallouts,
  /* Last, so it also sees links that arrived as raw HTML inside a disclosure
     subtree rather than as markdown-authored nodes. */
  rehypeBaseLinks,
];

export const markdownProcessor = unified({ remarkPlugins, rehypePlugins });
