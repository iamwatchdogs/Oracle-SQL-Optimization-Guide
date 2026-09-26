import { unified } from '@astrojs/markdown-remark';
import remarkMath from 'remark-math';
import rehypeMathjax from 'rehype-mathjax';
import { remarkCitations, remarkMeasuredValues } from './remark-measured.mjs';
import { rehypeDisclosures } from './rehype-disclosures.mjs';

export const remarkPlugins = [remarkMath, remarkMeasuredValues, remarkCitations];

export const rehypePlugins = [rehypeMathjax, rehypeDisclosures];

export const markdownProcessor = unified({ remarkPlugins, rehypePlugins });
