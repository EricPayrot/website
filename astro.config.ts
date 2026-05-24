import sitemap from "@astrojs/sitemap";
import { defineConfig } from "astro/config";
import { siteOrigin } from "./src/config/site";

const thanksPath = `${siteOrigin.replace(/\/$/, "")}/contact/thanks`;

export default defineConfig({
  site: siteOrigin,
  integrations: [
    sitemap({
      filter: (page) => page.replace(/\/$/, "") !== thanksPath,
    }),
  ],
  prefetch: {
    prefetchAll: true,
  },
});
