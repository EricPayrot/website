import { humanizeSlug } from "../utils/strings";

/**
 * Optional display titles for collection slugs (kebab-case keys from `facets.collections`).
 * If a slug is missing here, the UI falls back to {@link humanizeSlug}.
 */
export const collectionLabels: Partial<Record<string, string>> = {
  // Example:
  // "studio-samples": "Studio samples",
};

/** Resolved label for a collection facet slug. */
export function labelForCollectionSlug(slug: string): string {
  return collectionLabels[slug] ?? humanizeSlug(slug);
}
