import { unified } from '@astrojs/markdown-remark';
import { remarkCitations, remarkMeasuredValues } from './remark-measured.mjs';
import { rehypeDisclosures } from './rehype-disclosures.mjs';
import { rehypeTableScroll } from './rehype-table-scroll.mjs';
import { rehypeTaskLabels } from './rehype-task-label.mjs';
import { rehypeBaseLinks } from './rehype-base-links.mjs';

export const remarkPlugins = [remarkMeasuredValues, remarkCitations];

export const rehypePlugins = [
  rehypeDisclosures,
  rehypeTableScroll,
  rehypeTaskLabels,
  /* Last, so it also sees links that arrived as raw HTML inside a disclosure
     subtree rather than as markdown-authored nodes. */
  rehypeBaseLinks,
];

export const markdownProcessor = unified({ remarkPlugins, rehypePlugins });
