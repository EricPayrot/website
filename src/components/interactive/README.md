# Interactive components

Use Astro **only on the routes that need them** via `client:visible`, `client:load`, or `client:idle`.
Pair each wrapper component with a small module under `src/scripts/interactions/` that exports `mount(root)` and returns `{ destroy() }` so listeners and animation frames are cleaned up when the island unmounts.

Avoid hydrating large page shells — keep the default HTML/CSS experience complete without JavaScript.
