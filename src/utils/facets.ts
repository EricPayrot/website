import type { CollectionEntry } from "astro:content";

/**
 * Facet dimensions live under each work’s `facets` frontmatter.
 * Start with `collections`; add more keys (e.g. `themes`) over time — schema uses passthrough.
 */
export type FacetDimension = "collections" | (string & {});

function facetRecord(entry: CollectionEntry<"works">): Record<string, unknown> {
  const raw = entry.data.facets;
  return raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
}

/** All values for one dimension (e.g. every collection slug on this work). */
export function getFacet(
  entry: CollectionEntry<"works">,
  dimension: FacetDimension,
): string[] {
  const rec = facetRecord(entry);
  const v = rec[dimension];
  if (!Array.isArray(v)) return [];
  return v.map((s) => String(s)).filter(Boolean);
}

export function workHasFacet(
  entry: CollectionEntry<"works">,
  dimension: FacetDimension,
  slug: string,
): boolean {
  return getFacet(entry, dimension).includes(slug);
}

/** Distinct facet slugs in use across published works, for building “smart album” routes. */
export function allFacetSlugs(
  entries: CollectionEntry<"works">[],
  dimension: FacetDimension,
): string[] {
  const seen = new Set<string>();
  for (const entry of entries) {
    if (entry.data.draft) continue;
    for (const s of getFacet(entry, dimension)) {
      seen.add(s);
    }
  }
  return [...seen].sort((a, b) => a.localeCompare(b));
}

export function filterWorksByFacet(
  entries: CollectionEntry<"works">[],
  dimension: FacetDimension,
  slug: string,
): CollectionEntry<"works">[] {
  return entries.filter(
    (e) => !e.data.draft && workHasFacet(e, dimension, slug),
  );
}
