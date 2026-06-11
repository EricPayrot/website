/** Global site configuration — update `siteOrigin` and artist details for production. */
export const siteName = "Eric Payrot";

/** Canonical origin (no trailing slash). Must match `site` in `astro.config.ts`. */
export const siteOrigin = "https://example.com";

export const siteUrl = new URL(siteOrigin);

export const artist = {
  name: "Your Name",
  /** Used in JSON-LD Person + copyright. */
  url: siteOrigin,
  /** SameAs links (optional): social profiles, gallery representation, etc. */
  sameAs: [] as string[],
};

export const DEFAULT_DESCRIPTION =
  "Contemporary artist portfolio — paintings, works on paper, and selected projects.";
