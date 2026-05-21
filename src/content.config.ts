import { defineCollection, z } from "astro:content";

const works = defineCollection({
  type: "content",
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
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
