# Facets (tags) for works

Works support **`facets`** in frontmatter: named dimensions as **lists** of slug-like tokens (`kebab-case` after normalisation).

## Dimensions

All of these are optional; omit the key entirely if unused.

| Key | Typical source | Routing today |
|---|---|---|
| **`collections`** | Curated grouping | **`/collections`**, **`/collections/<slug>`** smart galleries |
| **`colors`** | Taxonomy colours | Stored for future filtering only |
| **`elements`** | Content / motif tags | Stored for future filtering |
| **`shapes`** | Form language | Stored for future filtering |
| **`motion`** | Motion / kinetic labels | Stored for future filtering |
| **`influences`** | Influence / lineage tags | Stored for future filtering |

Bulk import maps comma-separated spreadsheet cells into arrays — see **`tools/sheet-import/README.md`**.

Collections example:

```yaml
facets:
  collections:
    - studio-samples
    - archive
  colors:
    - crimson
    - ultramarine
```

Display titles for **`collections`** (not other dimensions yet) default to humanized slugs. Override **`collections`** titles in [`src/config/facet-labels.ts`](../config/facet-labels.ts).

## Extensibility

[`src/content.config.ts`](../content.config.ts) declares the keys above plus **`.passthrough()`** — you may add bespoke keys temporarily; tighten the schema when a dimension stabilises.

