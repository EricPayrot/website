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

/** GA4 measurement ID — public, embedded in page HTML at build time. */
export const gaMeasurementId = "G-B1RJGSEWEP";

/** Web3Forms access key — public, used in the contact form (domain-restricted on Web3Forms). */
export const web3formsAccessKey = "b23a199b-7071-4c54-b768-959a04472dc4";
