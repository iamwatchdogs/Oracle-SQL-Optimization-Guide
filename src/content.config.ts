import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

const notebook = defineCollection({
  loader: glob({ base: './contents', pattern: '**/*.{md,mdx}' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    order: z.number().optional(),
    draft: z.boolean().default(false),
    /* Optional edition timestamps — wired into article OG tags when present. */
    date: z.string().optional(),
    updated: z.string().optional(),
  }),
});

export const collections = { notebook };
