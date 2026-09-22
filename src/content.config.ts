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
  }),
});

export const collections = { notebook };
