import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeMathjax from 'rehype-mathjax';
import { remarkCitations, remarkMeasuredValues } from './remark-measured.mjs';
import { rehypeDisclosures } from './rehype-disclosures.mjs';
import { rehypeTableScroll } from './rehype-table-scroll.mjs';
import { rehypeTaskLabels } from './rehype-task-label.mjs';
import { rehypeBaseLinks } from './rehype-base-links.mjs';

export const remarkPlugins = [remarkMath, remarkMeasuredValues, remarkCitations];

/* `rehypeTableScroll` runs after `rehypeMathjax` because MathJax serialises
   markup into the tree and a table can appear inside it; running last means
   every table the renderer produced is wrapped exactly once. */
export const rehypePlugins = [
  rehypeMathjax,
  rehypeDisclosures,
  rehypeTableScroll,
  rehypeTaskLabels,
  /* Last, so it also sees links that arrived as raw HTML inside a disclosure
     or a MathJax subtree rather than as markdown-authored nodes. */
  rehypeBaseLinks,
];

export const markdownProcessor = unified({ remarkPlugins, rehypePlugins });
