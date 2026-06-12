import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import { siteOrigin } from "./src/config/site";

import cloudflare from "@astrojs/cloudflare";

export default defineConfig({
  site: siteOrigin,
  integrations: [sitemap()],

  prefetch: {
    prefetchAll: true,
  },

  adapter: cloudflare(),
});