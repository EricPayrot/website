import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import { siteOrigin } from "./src/config/site";

export default defineConfig({
  output: "static",
  site: siteOrigin,
  integrations: [sitemap()],
  prefetch: {
    prefetchAll: true,
  },
});
