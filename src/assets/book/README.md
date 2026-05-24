# Book page assets

- **`hero`** (optional) — Banner at the top. Use one of these exact basenames **in this folder**: `hero.jpg`, `hero.jpeg`, `hero.png`, `hero.gif`, `hero.webp`, or `hero.svg`.
- **`pages/`** — One raster/SVG image per ordering step, sorted **numerically / alphabetically by filename**.

## Printer layout mirrored on-screen

Whole viewer uses **two A5 portrait pages side by side** (each **148 × 210 mm**, scaled proportionally):

| Spread | Meaning |
|--------|--------|
| First view | Only the **front cover**: full bleed on the **right** half; blank **left**. |
| After that | Typical spread: interior **picture frame on every printed page**. |

**Interior frame geometry** (every inside page):

- Frame size **114 × 151 mm** inside the paper.
- Frame top edge **24 mm** below top of sheet.
- **22 mm** from **spread centre (gutter)** to the inner vertical edge of the frame (toward gutter). Outer side margin becomes **148 − 22 − 114 = 12 mm** on that page.

So on the **left page** the frame starts **12 mm** from the **outer (left) edge**; on the **right page** it starts **22 mm** from the **gutter** — frames match in size and vertical position; only horizontal offset flips with binding.

**Cover** uses the **entire 148 × 210 mm** right page surface (`object-fit: cover`).

If `pages/` is empty, the site uses placeholder thumbnails so the flip preview still runs.
