# Import works from CSV (or Google Sheets)

Generates Astro content (`src/content/works/<slug>.md`) plus **symlinks** under `src/assets/works/sheet-linked/<slug>/`. Original pixels stay wherever `path` points.

## Recommended: CSV export (no Google API)

1. In Google Sheets use **File → Download → Comma-separated values (.csv)** (or export from whichever tool you use).
2. Save the file where you like (e.g. `tools/sheet-import/works-export.csv`).
3. Copy `config.example.yaml` → `config.yaml`.
4. Set **`csv_path`** to that filename (paths are relative to `config.yaml` unless absolute).
5. Keep the **first row** of the CSV aligned with **`columns`** in `config.yaml` (same headers as when you edited the sheet).

```bash
cd tools/sheet-import
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
# Minimal install if you skip Google Sheets entirely:
# pip install PyYAML

python import_works.py --dry-run
python import_works.py
```

Override path for one run without editing config:

```bash
python import_works.py --csv ~/Downloads/works-export.csv
```

Google Cloud, service accounts, and API keys are **not** needed for CSV mode.

---

## Columns (defaults)

One **row per artwork**, **one linked image**:

| Header in CSV / sheet | Behaviour |
|---|---|
| **`publish`** | Required gate: row is **skipped** when this cell is **empty**. Any non-empty marker (x, yes, draft,…) imports the row. |
| **`file`** | Source filename on disk (used with **`path`** when `path` is a folder). **Stem becomes the Markdown slug** (e.g. `Study-12.tif` → `study-12.md`). If `file` is empty but `path` is set, the slug comes from **`path`**’s basename stem. |
| **`path`** | Path to the image **file**, **or** the **folder** that contains it. If `path` is a folder, **`file`** must be the exact filename inside that folder (otherwise the symlink will point at the directory and thumbnails break). |
| **`alt`** | Image `alt` text (also used with **`page`** to name the symlink under `sheet-linked/<slug>/`). Fallback for `alt` is derived from the source filename if blank. |
| **`page`** | Page reference → frontmatter when filled; combined with **`alt`** as `alt + " " + page` for the symlink basename (e.g. `Coast study 25.jpg`). Duplicate names get a suffix (`a`, `b`, …). |
| **`title`** | Work title. |
| **`description`** | Short description → frontmatter (`(No description)` if blank). |
| **`year`**, **`medium`**, **`dimensions`** | Passed through when filled. |

Comma‑separated taxonomy (each token is normalised to a kebab slug in YAML facets):

**`collections`**, **`colors`**, **`elements`**, **`shapes`**, **`motion`**, **`influences`** — e.g. `red,blue` → `colors: [red, blue]`.

Collections still power `/collections/...` galleries; other dimensions are stored for future filtering UIs until you expose them.

## Optional columns

If you rename them or add mappings in **`config.yaml` → `columns`**, you can optionally wire:

- **`body`** — Markdown after frontmatter  
- **`keywords`**  
- **`date`** — passed as text (parsed by Astro/Zod coercion)  
- **`og_image`** — separate OG/Twitter raster if you track it outside `path`.

---

## Optional: Google Sheets API

Skip this if **`csv_path`** (or **`--csv`**) satisfies you.

1. Google Cloud → enable **Google Sheets API** → download service‑account JSON  
2. Share the spreadsheet (Viewer) with the service‑account **`client_email`**  
3. In **`config.yaml`**: remove **`csv_path`** or leave it unset, then set **`spreadsheet_id`**, **`range`**, and **`credentials_path`** (or `GOOGLE_APPLICATION_CREDENTIALS`)

```bash
python import_works.py --dry-run
python import_works.py
```

**Paths:** Relative `path` entries resolve relative to **`cwd`** when invoking the script. Prefer absolute paths if your assets live elsewhere.

**Windows:** file symlinks may need Developer Mode or admin rights.

**Duplicate filenames:** Rows that resolve to the same slug **overwrite** the previous Markdown + symlinks — a warning is printed.

## Pruning unpublished works

Each run syncs to the **`publish`** column:

- Rows with a **non-empty** `publish` cell are imported (or updated).
- Existing works with `catalog_source: spreadsheet-import` that are **not** in that published set are **removed** — both `src/content/works/<slug>.md` and `src/assets/works/sheet-linked/<slug>/`.
- Hand-written works (no `catalog_source: spreadsheet-import`) are never deleted.

Use `--dry-run` to see what would be written and pruned before changing files.
