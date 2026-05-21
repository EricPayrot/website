import { siteUrl } from "../config/site";

/** Absolute URL for a site path (e.g. `/works/foo` → `https://example.com/works/foo`). */
export function absoluteUrl(path: string): string {
  const normalized = path.startsWith("/") ? path : `/${path}`;
  return new URL(normalized, siteUrl).href;
}
