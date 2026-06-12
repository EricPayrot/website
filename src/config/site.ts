/** Global site configuration — update `siteOrigin` and artist details for production. */
export const siteName = "Eric Payrot";

/** Canonical origin (no trailing slash). Must match `site` in `astro.config.ts`. */
export const siteOrigin = "https://www.ericpayrot.com";

export const siteUrl = new URL(siteOrigin);

export const socialLinks = [
  {
    name: "Instagram",
    href: "https://www.instagram.com/ericpayrot/",
    handle: "@ericpayrot",
  },
  {
    name: "Facebook",
    href: "https://www.facebook.com/epayrot",
    handle: "epayrot",
  },
] as const;

export const artist = {
  name: "Eric Payrot",
  /** Used in JSON-LD Person + copyright. */
  url: siteOrigin,
  /** SameAs links (optional): social profiles, gallery representation, etc. */
  sameAs: socialLinks.map((link) => link.href),
};

export const DEFAULT_DESCRIPTION =
  "Contemporary artist portfolio — paintings, works on paper, and selected projects.";
