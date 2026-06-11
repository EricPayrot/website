import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import { siteOrigin } from "./src/config/site";

export default defineConfig({
  site: siteOrigin,
  integrations: [sitemap()],
  prefetch: {
    prefetchAll: true,
  },
});
