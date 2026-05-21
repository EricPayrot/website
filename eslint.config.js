import js from "@eslint/js";
import astro from "eslint-plugin-astro";
import tseslint from "typescript-eslint";

export default tseslint.config(
  js.configs.recommended,
  ...astro.configs["flat/recommended"],
  ...tseslint.configs.recommended.map((config) => ({
    ...config,
    files: ["**/*.{ts,mts}"],
    ignores: ["**/*.astro"],
  })),
  {
    files: ["src/env.d.ts"],
    rules: {
      "@typescript-eslint/triple-slash-reference": "off",
    },
  },
  {
    ignores: ["dist/**", ".astro/**", "node_modules/**"],
  },
);
