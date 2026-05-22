import { defineCollection, z } from "astro:content";

/**
 * Faceted tags per work. `collections` drives `/collections/[slug]` pages.
 * Other dimensions (`colors`, `elements`, …) are stored for search/filter UIs later.
 */
const facetsSchema = z
  .object({
    collections: z.array(z.string()).default([]),
    colors: z.array(z.string()).default([]),
    elements: z.array(z.string()).default([]),
    shapes: z.array(z.string()).default([]),
    motion: z.array(z.string()).default([]),
    influences: z.array(z.string()).default([]),
  })
  .passthrough();

const works = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      facets: facetsSchema.optional(),
      year: z.union([z.number(), z.string()]).optional(),
      medium: z.string().optional(),
      dimensions: z.string().optional(),
      keywords: z.array(z.string()).optional(),
      /** Override default Open Graph / Twitter image for this work. */
      ogImage: image().optional(),
      draft: z.boolean().default(false),
      date: z.coerce.date().optional(),
      /** When true, eligible to appear in the home “featured” strip (still needs to be selected in the page query if you customize further). */
      featured: z.boolean().default(false),
      /** Set by tooling (e.g. tools/sheet-import) to distinguish generated files. */
      catalog_source: z.string().optional(),
      images: z
        .array(
          z.object({
            src: image(),
            alt: z.string().min(1),
            caption: z.string().optional(),
          }),
        )
        .min(1),
    }),
});

export const collections = { works };
