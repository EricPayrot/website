#!/usr/bin/env python3
"""
Import one artwork per spreadsheet row:
  • `publish` must be non-empty or the row is skipped
  • `file` stem → Markdown slug; symlink basename → `alt` + `page` (see README)
  • `path` → symlink target (original stays on disk)
  • `collections`, `colors`, … → YAML facets (comma-separated in the sheet)
  • Prefer a **CSV export** (`csv_path` in config.yaml or `--csv`) — no Google credentials.
  • Or read live via **Google Sheets API** (`spreadsheet_id` + credentials) if `csv_path` is unset.

See README.md in this folder.
"""

from __future__ import annotations

import argparse
import csv
import os
import re
import shutil
import sys
from pathlib import Path
from typing import Any

import yaml

try:
    from google.oauth2 import service_account
    from googleapiclient.disciscovery import build  # type: ignore[import-untyped]
except ImportError:  # pragma: no cover
    SCOPES: list[str] = []
else:
    SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

THIS_DIR = Path(__file__).resolve().parent

# Logical key → default Google Sheet header (row 1) string
DEFAULT_COLUMN_HEADERS: dict[str, str] = {
    "publish": "publish",
    "file": "file",
    "path": "path",
    "alt": "alt",
    "title": "title",
    "description": "description",
    "page": "page",
    "year": "year",
    "medium": "medium",
    "dimensions": "dimensions",
    "collections": "collections",
    "colors": "colors",
    "elements": "elements",
    "shapes": "shapes",
    "motion": "motion",
    "influences": "influences",
    # optional overrides (leave blank string in merged config to omit)
    "body": "",
    "keywords": "",
    "date": "",
    "og_image": "",
}

FACET_KEYS = (
    "collections",
    "colors",
    "elements",
    "shapes",
    "motion",
    "influences",
)

IMPORT_CATALOG_SOURCE = "spreadsheet-import"


def split_list_cell(cell: Any) -> list[str] | None:
    if cell is None or str(cell).strip() == "":
        return None
    parts = [p.strip() for p in re.split(r"[,;]", str(cell)) if p.strip()]
    return parts or None


def sanitize_slug(slug: str) -> str:
    s = slug.strip().lower()
    s = re.sub(r"[^\w\-]+", "-", s, flags=re.UNICODE)
    s = re.sub(r"-{2,}", "-", s).strip("-")
    if not s:
        raise ValueError("Empty slug after sanitisation")
    return s


def sanitize_facet_token(s: str) -> str:
    return sanitize_slug(s)


def human_from_filename(val: Path) -> str:
    stem = val.stem.replace("_", " ").replace("-", " ").strip()
    return stem.title() if stem else "Artwork"


def sanitize_image_filename_stem(name: str) -> str:
    s = name.strip()
    s = re.sub(r'[<>:"/\\|?*\x00-\x1f]', "", s)
    s = re.sub(r"\s+", " ", s)
    s = s.strip(" .")
    if not s:
        raise ValueError("empty image name after sanitisation")
    if len(s) > 200:
        s = s[:200].rstrip(" .")
    return s


def image_stem_from_alt_page(alt: str | None, page: str | None) -> str:
    alt_s = (alt or "").strip()
    page_s = (page or "").strip()
    if alt_s and page_s:
        combined = f"{alt_s} {page_s}"
    elif alt_s:
        combined = alt_s
    elif page_s:
        combined = page_s
    else:
        return ""
    return sanitize_image_filename_stem(combined)


def unique_image_basename(stem: str, ext: str, used: set[str]) -> str:
    """Build a basename from stem + ext; append a, b, c, … when names collide."""
    ext = ext or ".jpg"
    if not ext.startswith("."):
        ext = f".{ext}"

    def full(st: str, suffix: str = "") -> str:
        name = f"{st} {suffix}".strip() if suffix else st
        return f"{name}{ext}"

    candidate = full(stem)
    key = candidate.casefold()
    if key not in used:
        used.add(key)
        return candidate

    for code in range(ord("a"), ord("z") + 1):
        candidate = full(stem, chr(code))
        key = candidate.casefold()
        if key not in used:
            used.add(key)
            return candidate

    n = 2
    while True:
        candidate = full(stem, str(n))
        key = candidate.casefold()
        if key not in used:
            used.add(key)
            return candidate
        n += 1
        if n > 9999:
            raise ValueError(f"too many duplicate image names for stem {stem!r}")


def ensure_symlink(asset_path: Path, source: Path) -> None:
    src = Path(source).expanduser().resolve()
    if not src.exists():
        raise FileNotFoundError(f"Source image does not exist: {src}")

    if asset_path.is_symlink() or asset_path.exists():
        asset_path.unlink()

    asset_path.symlink_to(src, target_is_directory=False)


def rel_image_from_work_md(slug: str, basename: str) -> str:
    return f"../../assets/works/sheet-linked/{slug}/{basename}"


def load_config(path: Path) -> dict[str, Any]:
    with path.open(encoding="utf-8") as f:
        cfg = yaml.safe_load(f)
    if not isinstance(cfg, dict):
        raise TypeError("config must be a mapping")
    return cfg


def resolve_repo_paths(cfg: dict[str, Any], config_file: Path) -> tuple[Path, Path]:
    repo = (config_file.parent / cfg.get("repo_root", "../../")).resolve()
    assets = repo / cfg.get("assets_subdirectory", "src/assets/works/sheet-linked")
    content_dir = repo / cfg.get("content_subdirectory", "src/content/works")
    return assets, content_dir


def normalize_header_row(row: list[Any]) -> dict[str, int]:
    mapping: dict[str, int] = {}
    for i, cell in enumerate(row):
        name = str(cell).strip()
        if name:
            mapping[name] = i
    return mapping


def pad_row(raw: list[Any], max_ix: int) -> list[str]:
    r = [("" if v is None else str(v)) for v in raw]
    while len(r) <= max_ix:
        r.append("")
    return r


def merged_headers(cfg_cols: dict[str, Any]) -> dict[str, str]:
    result = dict(DEFAULT_COLUMN_HEADERS)
    for k, v in cfg_cols.items():
        ks = str(k).strip()
        if not ks:
            continue
        vs = "" if v is None else str(v).strip()
        result[ks] = vs
    return result


def resolve_credentials(cfg: dict[str, Any]) -> Path:
    candidates: list[Path] = []
    env_val = os.environ.get("GOOGLE_APPLICATION_CREDENTIALS")
    if env_val:
        candidates.append(Path(env_val).expanduser().resolve())
    raw = cfg.get("credentials_path", "./credentials.json")
    p = Path(raw)
    cp = (p.expanduser().resolve() if p.is_absolute() else (THIS_DIR / p).resolve())
    candidates.append(cp)
    for c in candidates:
        if c.is_file():
            return c
    raise FileNotFoundError(
        "Missing Google credential JSON — credentials_path or GOOGLE_APPLICATION_CREDENTIALS"
    )


def sheet_rows_via_api(cfg: dict[str, Any]) -> list[list[Any]]:
    if not SCOPES:
        raise RuntimeError("pip install -r requirements.txt")

    sid = str(cfg["spreadsheet_id"]).strip()
    ra = str(cfg["range"]).strip()
    cred = resolve_credentials(cfg)
    credentials = service_account.Credentials.from_service_account_file(
        str(cred), scopes=SCOPES
    )
    svc = build("sheets", "v4", credentials=credentials, cache_discovery=False)
    result = svc.spreadsheets().values().get(spreadsheetId=sid, range=ra).execute()
    values = result.get("values") or []
    assert isinstance(values, list)
    return values


def sheet_rows_via_csv(csv_path: Path) -> list[list[Any]]:
    with csv_path.open(newline="", encoding="utf-8-sig") as f:
        rows = list(csv.reader(f))
    assert rows, "CSV is empty"
    return rows


def resolve_image_source(path_fragment: str) -> Path:
    p = Path(path_fragment.strip()).expanduser()
    if p.is_absolute():
        return p.resolve()
    return (Path.cwd() / p).resolve()


def resolve_artwork_file(path_cell: str | None, file_cell: str | None) -> Path:
    """Return the filesystem path to one image file.

    `path` may be either the image file itself or its parent folder; if it is a
    folder, `file` must set the basename (matches common sheet layouts).
    """
    if not path_cell or not str(path_cell).strip():
        raise ValueError("missing path")
    resolved = resolve_image_source(str(path_cell))

    if resolved.is_file():
        return resolved

    if resolved.is_dir():
        fname = Path(str(file_cell or "").strip()).name
        if not fname:
            raise ValueError(
                f"path is a directory ({resolved}); fill the `file` column with "
                "the exact image filename (e.g. IMG_0340R.jpg)."
            )
        candidate = (resolved / fname).resolve()
        if not candidate.is_file():
            raise FileNotFoundError(f"not a file: {candidate} (path + file)")
        return candidate

    raise FileNotFoundError(f"path does not exist: {resolved}")


def symlink_basename(file_cell: str, resolved: Path) -> str:
    raw = Path(str(file_cell).strip()).name
    if raw:
        safe = re.sub(r"[^\w.\-]+", "_", raw, flags=re.UNICODE)
        if "." not in safe and resolved.suffix:
            safe = safe + resolved.suffix
        return safe or f"image{resolved.suffix or '.jpg'}"
    return f"01{resolved.suffix or '.jpg'}"


def clear_slug_asset_dir(slug_dir: Path) -> None:
    if not slug_dir.is_dir():
        return
    for entry in slug_dir.iterdir():
        if entry.is_symlink() or entry.is_file():
            entry.unlink()
        elif entry.is_dir():
            shutil.rmtree(entry)


def prepare_single_image(
    slug: str,
    *,
    path_cell: str | None,
    file_cell: str | None,
    alt_cell: str | None,
    page_cell: str | None,
    og_cell: str | None,
    assets_root: Path,
    used_image_basenames: set[str],
    dry_run: bool,
) -> tuple[list[dict[str, Any]], str | None]:
    resolved = resolve_artwork_file(path_cell, file_cell)

    slug_dir = assets_root / slug
    slug_dir.mkdir(parents=True, exist_ok=True)

    alt = alt_cell.strip() if alt_cell and alt_cell.strip() else ""
    if not alt:
        alt = human_from_filename(resolved)

    stem = image_stem_from_alt_page(alt_cell, page_cell)
    if not stem:
        fname = symlink_basename(str(file_cell or ""), resolved)
    else:
        fname = unique_image_basename(stem, resolved.suffix, used_image_basenames)

    symlink_dest = slug_dir / fname

    images = [{"src": rel_image_from_work_md(slug, fname), "alt": alt}]
    og_rel: str | None = None

    if not dry_run:
        clear_slug_asset_dir(slug_dir)
        ensure_symlink(symlink_dest, resolved)

    if og_cell and og_cell.strip():
        og_resolved = resolve_image_source(og_cell.strip())
        if og_resolved.is_dir():
            raise ValueError(
                f"og_image must be a file path, not a directory: {og_resolved}"
            )
        if not og_resolved.is_file():
            raise FileNotFoundError(f"og_image missing: {og_resolved}")
        og_name = "og" + (og_resolved.suffix or ".jpg")
        if not dry_run:
            ensure_symlink(slug_dir / og_name, og_resolved)
        og_rel = rel_image_from_work_md(slug, og_name)

    return images, og_rel


def build_facets_blocs(
    padded: list[str],
    hdr_cfg: dict[str, str],
    name_to_ix: dict[str, int],
) -> dict[str, list[str]] | None:
    out: dict[str, list[str]] = {}
    for fk in FACET_KEYS:
        hdr = hdr_cfg.get(fk, "").strip()
        if not hdr:
            continue
        cell = lookup(padded, name_to_ix, hdr)
        lst = split_list_cell(cell)
        if lst:
            out[fk] = [sanitize_facet_token(x) for x in lst]
    return out or None


def fm_dump(data: dict[str, Any]) -> str:
    order = [
        "title",
        "description",
        "page",
        "year",
        "medium",
        "dimensions",
        "keywords",
        "date",
        "facets",
        "catalog_source",
        "ogImage",
        "images",
    ]
    extras = sorted(k for k in data if k not in order)
    merged = {**{k: data[k] for k in order if k in data}, **{k: data[k] for k in extras}}
    dumped = yaml.safe_dump(
        merged,
        allow_unicode=True,
        default_flow_style=False,
        sort_keys=False,
        width=1024,
    )
    return f"---\n{dumped.rstrip()}\n---"


def coerce_year(val: Any) -> int | str | None:
    if val is None or str(val).strip() == "":
        return None
    s = str(val).strip()
    try:
        return int(float(s))
    except ValueError:
        return s


def lookup(row: list[str], name_to_ix: dict[str, int], hdr: str) -> str | None:
    if not hdr.strip():
        return None
    ix = name_to_ix.get(hdr.strip())
    if ix is None or ix >= len(row):
        return None
    cell = row[ix]
    s = cell.strip() if isinstance(cell, str) else str(cell).strip()
    return s if s else None


def resolve_csv_path(cfg_file: Path, cfg_root: dict[str, Any]) -> Path | None:
    raw = cfg_root.get("csv_path")
    if raw is None or not str(raw).strip():
        return None
    p = Path(str(raw).strip()).expanduser()
    if not p.is_absolute():
        p = (cfg_file.parent / p).resolve()
    else:
        p = p.resolve()
    return p


def frontmatter_catalog_source(md_path: Path) -> str | None:
    """Return catalog_source from YAML frontmatter, or None if unreadable."""
    try:
        text = md_path.read_text(encoding="utf-8")
    except OSError:
        return None
    if not text.startswith("---"):
        return None
    parts = text.split("---", 2)
    if len(parts) < 3:
        return None
    try:
        fm = yaml.safe_load(parts[1])
    except yaml.YAMLError:
        return None
    if not isinstance(fm, dict):
        return None
    raw = fm.get("catalog_source")
    return str(raw).strip() if raw is not None else None


def remove_import_asset_dir(assets_root: Path, slug: str) -> None:
    slug_dir = (assets_root / slug).resolve()
    root = assets_root.resolve()
    if slug_dir.parent != root:
        raise ValueError(f"refusing to remove path outside assets root: {slug_dir}")
    if not slug_dir.exists():
        return
    if slug_dir.is_symlink():
        slug_dir.unlink()
    elif slug_dir.is_dir():
        shutil.rmtree(slug_dir)
    else:
        slug_dir.unlink()


def prune_stale_imports(
    content_dir: Path,
    assets_root: Path,
    active_slugs: set[str],
    *,
    dry_run: bool,
) -> int:
    """Remove import-managed works (and symlinks) not in the current published set."""
    if not content_dir.is_dir():
        return 0

    removed = 0
    for md_path in sorted(content_dir.glob("*.md")):
        slug = md_path.stem
        if slug in active_slugs:
            continue
        if frontmatter_catalog_source(md_path) != IMPORT_CATALOG_SOURCE:
            continue

        asset_dir = assets_root / slug
        if dry_run:
            rel_md = md_path
            try:
                rel_md = md_path.relative_to(Path.cwd())
            except ValueError:
                pass
            asset_note = (
                f" + {asset_dir.relative_to(Path.cwd())}"
                if asset_dir.exists()
                else ""
            )
            print(f"[dry-run] prune → {rel_md}{asset_note}", file=sys.stderr)
        else:
            md_path.unlink()
            remove_import_asset_dir(assets_root, slug)
            print(f"[prune] removed {slug}", file=sys.stderr)
        removed += 1

    return removed


def build_rows(cfg: dict[str, Any]) -> list[list[Any]]:
    if cfg.get("__csv_override"):
        p = Path(cfg["__csv_override"]).expanduser().resolve()
        print(f"[info] CSV mode: {p}", file=sys.stderr)
        return sheet_rows_via_csv(p)
    print("[info] Google Sheets API mode", file=sys.stderr)
    return sheet_rows_via_api(cfg)


def process_rows(
    values: list[list[Any]],
    hdr_cfg: dict[str, str],
    assets_root: Path,
    content_dir: Path,
    *,
    dry_run: bool,
) -> int:
    if not values or not values[0]:
        print("Nothing to process (empty sheet).", file=sys.stderr)
        return 1

    name_to_ix = normalize_header_row([str(v or "").strip() for v in values[0]])

    def need_header(logical_key: str) -> str:
        h = hdr_cfg[logical_key].strip()
        if not h:
            raise KeyError(f'Missing "{logical_key}" column mapping (config columns.{logical_key})')
        return h

    publish_h = need_header("publish")
    path_h = need_header("path")
    alt_h = need_header("alt")
    file_h = need_header("file")
    title_h = need_header("title")

    needed = [publish_h, path_h, file_h, alt_h, title_h]
    for nh in needed:
        if nh not in name_to_ix:
            raise KeyError(
                f'Missing spreadsheet column "{nh}" in row 1. Known: {list(name_to_ix)}'
            )

    max_ix = max(name_to_ix.values())
    written = 0
    active_slugs: set[str] = set()
    slug_rows: dict[str, int] = {}
    used_image_basenames: set[str] = set()

    for ri, raw in enumerate(values[1:], start=2):
        padded = pad_row(raw or [], max_ix)
        publish_val = lookup(padded, name_to_ix, publish_h)

        # Only import when `publish` is non-empty (any marker is fine — x, yes, draft, …)
        if publish_val is None or str(publish_val).strip() == "":
            continue

        path_val = lookup(padded, name_to_ix, path_h)
        file_val = lookup(padded, name_to_ix, file_h)

        try:
            file_stem = Path(str(file_val or "").strip()).stem
            if not file_stem:
                stem_src = Path(str(path_val or "").strip()).stem
                if not stem_src:
                    raise ValueError("cannot derive slug — `file` and `path` are empty")
                file_stem = stem_src

            slug = sanitize_slug(file_stem)
        except ValueError:
            print(f"[warn] row {ri}: cannot produce slug → skip", file=sys.stderr)
            continue

        if slug in slug_rows:
            print(
                f"[warn] row {ri}: slug {slug!r} duplicated (also row {slug_rows[slug]}) "
                "— last writer wins.",
                file=sys.stderr,
            )
        slug_rows[slug] = ri
        active_slugs.add(slug)

        title = lookup(padded, name_to_ix, title_h)
        description = lookup(padded, name_to_ix, hdr_cfg["description"])

        alt_val = lookup(padded, name_to_ix, alt_h)

        body_hdr = hdr_cfg["body"].strip()
        body_txt = lookup(padded, name_to_ix, body_hdr) if body_hdr else None
        body_out = "" if body_txt is None else (body_txt.rstrip() + "\n")

        keywords = split_list_cell(
            lookup(padded, name_to_ix, hdr_cfg["keywords"])
            if hdr_cfg["keywords"].strip()
            else None
        )
        facets_bloc = build_facets_blocs(padded, hdr_cfg, name_to_ix)

        year = coerce_year(
            lookup(padded, name_to_ix, hdr_cfg["year"]) if hdr_cfg["year"].strip() else None
        )
        page = lookup(padded, name_to_ix, hdr_cfg["page"]) if hdr_cfg["page"].strip() else None
        medium = lookup(padded, name_to_ix, hdr_cfg["medium"]) if hdr_cfg["medium"].strip() else None
        dimensions_txt = (
            lookup(padded, name_to_ix, hdr_cfg["dimensions"]) if hdr_cfg["dimensions"].strip() else None
        )
        date_str = lookup(padded, name_to_ix, hdr_cfg["date"]) if hdr_cfg["date"].strip() else None
        og_cell = lookup(padded, name_to_ix, hdr_cfg["og_image"]) if hdr_cfg["og_image"].strip() else ""

        fm_title = title.strip() if title else slug
        fm_description = (
            description.strip() if description and description.strip() else "(No description)"
        )

        try:
            ogs = og_cell.strip() if og_cell else ""
            imgs, og_rel = prepare_single_image(
                slug,
                path_cell=path_val,
                file_cell=file_val,
                alt_cell=alt_val or "",
                page_cell=page,
                og_cell=ogs or None,
                assets_root=assets_root,
                used_image_basenames=used_image_basenames,
                dry_run=dry_run,
            )
        except Exception as exc:  # noqa: BLE001
            print(f"[error] row {ri} ({slug}): {exc}", file=sys.stderr)
            return 2

        fm: dict[str, Any] = {
            "title": fm_title,
            "description": fm_description,
            "catalog_source": "spreadsheet-import",
            "images": imgs,
        }
        if year is not None:
            fm["year"] = year
        if page:
            fm["page"] = page.strip()
        if medium:
            fm["medium"] = medium.strip()
        if dimensions_txt:
            fm["dimensions"] = dimensions_txt.strip()
        if keywords:
            fm["keywords"] = keywords
        if date_str:
            fm["date"] = date_str.strip()
        if facets_bloc:
            fm["facets"] = facets_bloc
        if og_rel:
            fm["ogImage"] = og_rel

        md_text = fm_dump(fm) + "\n\n" + body_out
        outfile = content_dir / f"{slug}.md"

        if dry_run:
            print(f"[dry-run] row {ri} → {outfile.relative_to(Path.cwd())} ({imgs[0]['src']})")
        else:
            content_dir.mkdir(parents=True, exist_ok=True)
            outfile.write_text(md_text.strip() + "\n", encoding="utf-8")
        written += 1

    pruned = prune_stale_imports(
        content_dir,
        assets_root,
        active_slugs,
        dry_run=dry_run,
    )

    write_msg = "[done] Would write" if dry_run else "[done] Wrote"
    prune_msg = "[done] Would prune" if dry_run else "[done] Pruned"
    print(f"{write_msg} {written} work Markdown file(s).")
    if pruned:
        print(f"{prune_msg} {pruned} stale import(s).")
    elif not dry_run:
        print("[done] No stale spreadsheet imports to remove.")

    if written == 0 and pruned == 0:
        print("[warn] No published rows imported and nothing pruned.", file=sys.stderr)
        return 1
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Import artwork rows from a CSV export (recommended) or Google Sheets.",
    )
    parser.add_argument("--config", type=Path, default=THIS_DIR / "config.yaml")
    parser.add_argument("--dry-run", action="store_true")
    parser.add_argument(
        "--csv",
        type=Path,
        default=None,
        metavar="PATH",
        help="Override csv_path from config / use this CSV file.",
    )

    ns = parser.parse_args()
    cfg_file = ns.config.expanduser().resolve()
    if not cfg_file.is_file():
        raise FileNotFoundError(cfg_file)

    cfg_data = load_config(cfg_file)
    hdr_src = cfg_data.get("columns")
    if not isinstance(hdr_src, dict):
        raise TypeError('config needs "columns" mapping')

    hdr_cfg = merged_headers({str(k): v for k, v in hdr_src.items()})

    csv_resolved: Path | None = None
    if ns.csv is not None:
        csv_resolved = ns.csv.expanduser().resolve()
    else:
        csv_resolved = resolve_csv_path(cfg_file, cfg_data)

    cfg_with_mode = dict(cfg_data)
    if csv_resolved is not None:
        if not csv_resolved.is_file():
            raise FileNotFoundError(f"CSV not found: {csv_resolved}")
        cfg_with_mode["__csv_override"] = str(csv_resolved)

    if not cfg_with_mode.get("__csv_override"):
        if not str(cfg_data.get("spreadsheet_id", "")).strip():
            raise ValueError(
                "Provide a CSV: set csv_path in config.yaml and copy config.example.yaml, "
                "or pass --csv /path/to/export.csv. "
                "For Google Sheets instead, set spreadsheet_id and credentials (see README)."
            )

    assets_root, content_dir = resolve_repo_paths(cfg_data, cfg_file)
    print("[info]", assets_root, "|", content_dir, file=sys.stderr)

    rows = build_rows(cfg_with_mode)
    return process_rows(rows, hdr_cfg, assets_root, content_dir, dry_run=ns.dry_run)


if __name__ == "__main__":
    sys.exit(main())
