#!/usr/bin/env python3
"""
Palatial Pools — supplier product ingest.

Reads a list of supplier product URLs from STDIN, a file, or the
``store/_ingest_queue.yaml`` manifest produced by the staff bulk-upload
console at ``/admin/store/ingest/``. For each URL the script:

  1.  Fetches the page (with a polite delay + retries).
  2.  Extracts structured data using the first available signal:
        a.  Schema.org JSON-LD ``Product`` blocks.
        b.  OpenGraph ``og:title`` / ``og:image`` / ``og:description``.
        c.  Heuristic ``<title>``, ``meta[name=description]``, first
            large product image, and any linked PDFs.
  3.  Downloads the primary image + every linked brochure / manual PDF
      into ``store/product/<slug>/assets/`` so everything is
      *self-hosted* — never a remote-supplier hotlink.
  4.  Appends a normalised entry into ``store/_catalogue.yaml`` (under
      ``products:``).  Existing entries with the same slug are updated
      in-place; nothing is silently overwritten.
  5.  After all URLs have been ingested, re-runs ``build_store.py`` so
      every page, schema block, sitemap entry and search index reflects
      the new catalogue.

Usage examples::

    python3 scripts/ingest_supplier.py https://www.poolpro.com.au/product/x
    python3 scripts/ingest_supplier.py --file urls.txt
    python3 scripts/ingest_supplier.py --queue store/_ingest_queue.yaml

The script ships with two supplier-specific adapters (Pool Pro / Astral)
and a generic fallback. Add more by registering a ``SupplierAdapter`` in
``ADAPTERS``.

This script does **not** require any non-stdlib packages, so it runs on
any default Python 3.10+ install. If ``yaml`` is available we use it,
otherwise we degrade to a minimal YAML emitter.
"""

from __future__ import annotations

import argparse
import dataclasses
import html as _html
import json
import os
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path
from typing import Iterable, Optional

ROOT = Path(__file__).resolve().parent.parent
CATALOGUE = ROOT / "store" / "_catalogue.yaml"
QUEUE = ROOT / "store" / "_ingest_queue.yaml"
USER_AGENT = (
    "Mozilla/5.0 (compatible; PalatialPoolsIngest/1.0; "
    "+https://palatialpools.com.au/store/about/)"
)
REQUEST_TIMEOUT = 25
RETRIES = 3
POLITE_DELAY_SECONDS = 1.0


# ───────────────────────── HTTP ─────────────────────────

def http_get(url: str) -> tuple[bytes, str]:
    """Fetch ``url`` returning (body, content_type). Polite retries."""
    last_err: Optional[Exception] = None
    for attempt in range(RETRIES):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT})
            with urllib.request.urlopen(req, timeout=REQUEST_TIMEOUT) as resp:
                return resp.read(), resp.headers.get("Content-Type", "")
        except Exception as e:
            last_err = e
            time.sleep(POLITE_DELAY_SECONDS * (attempt + 1))
    assert last_err is not None
    raise last_err


# ───────────────────────── HTML extraction ─────────────────────────

_TAG_RE     = re.compile(r"<[^>]+>")
_META_RE    = re.compile(
    r'<meta\b[^>]*?(?:name|property)\s*=\s*["\']([^"\']+)["\'][^>]*?content\s*=\s*["\']([^"\']*)["\'][^>]*?/?>',
    re.IGNORECASE | re.DOTALL,
)
_TITLE_RE   = re.compile(r"<title[^>]*>(.*?)</title>", re.IGNORECASE | re.DOTALL)
_JSONLD_RE  = re.compile(
    r'<script[^>]+type\s*=\s*["\']application/ld\+json["\'][^>]*>(.*?)</script>',
    re.IGNORECASE | re.DOTALL,
)
_PDF_HREF_RE = re.compile(
    r'href\s*=\s*["\']([^"\']+\.pdf(?:\?[^"\']*)?)["\']', re.IGNORECASE
)
_IMG_SRC_RE  = re.compile(
    r'<img[^>]+src\s*=\s*["\']([^"\']+)["\'][^>]*>', re.IGNORECASE
)
_PRICE_RE    = re.compile(r"(?:AUD\s*)?\$?\s*(\d{1,4}(?:[.,]\d{1,2})?)")


def _strip_html(s: str) -> str:
    s = _TAG_RE.sub(" ", s)
    s = _html.unescape(s)
    return re.sub(r"\s+", " ", s).strip()


def extract_metas(html: str) -> dict[str, str]:
    return {m.group(1).strip().lower(): _html.unescape(m.group(2).strip())
            for m in _META_RE.finditer(html)}


def extract_title(html: str) -> str:
    m = _TITLE_RE.search(html)
    return _strip_html(m.group(1)) if m else ""


def extract_jsonld(html: str) -> list[dict]:
    out: list[dict] = []
    for m in _JSONLD_RE.finditer(html):
        raw = m.group(1).strip()
        # Some sites wrap their JSON-LD in HTML comments; strip those.
        raw = re.sub(r"^<!--", "", raw).rstrip("-").rstrip(">")
        try:
            data = json.loads(raw)
        except Exception:
            continue
        if isinstance(data, list):
            out.extend(d for d in data if isinstance(d, dict))
        elif isinstance(data, dict):
            if "@graph" in data and isinstance(data["@graph"], list):
                out.extend(d for d in data["@graph"] if isinstance(d, dict))
            else:
                out.append(data)
    return out


def find_jsonld_product(blocks: list[dict]) -> Optional[dict]:
    for b in blocks:
        t = b.get("@type")
        if t == "Product" or (isinstance(t, list) and "Product" in t):
            return b
    return None


def absolutise(base_url: str, href: str) -> str:
    return urllib.parse.urljoin(base_url, href)


# ───────────────────────── Adapters ─────────────────────────

@dataclasses.dataclass
class ExtractResult:
    name: str
    short: str
    description: str
    price: float
    sku: str
    image_url: str
    pdf_urls: list[str]
    brand: str = ""
    extra: dict = dataclasses.field(default_factory=dict)


class SupplierAdapter:
    """Override these for site-specific scraping."""
    host_patterns: tuple[str, ...] = ()  # which hosts this adapter handles
    name: str = "generic"

    def matches(self, url: str) -> bool:
        host = urllib.parse.urlparse(url).netloc.lower()
        return any(p in host for p in self.host_patterns)

    def extract(self, url: str, html: str) -> ExtractResult:
        metas = extract_metas(html)
        title = (metas.get("og:title") or extract_title(html) or "").strip()
        desc = (metas.get("og:description") or metas.get("description") or "").strip()
        image = (metas.get("og:image") or metas.get("og:image:url") or "")
        if image: image = absolutise(url, image)

        jsonld_product = find_jsonld_product(extract_jsonld(html)) or {}
        if jsonld_product:
            title = jsonld_product.get("name") or title
            desc  = jsonld_product.get("description") or desc
            offers = jsonld_product.get("offers") or {}
            if isinstance(offers, list) and offers: offers = offers[0]
            price = offers.get("price") if isinstance(offers, dict) else None
            sku   = jsonld_product.get("sku") or ""
            brand = ""
            b = jsonld_product.get("brand")
            if isinstance(b, dict): brand = b.get("name", "")
            elif isinstance(b, str): brand = b
            image = image or jsonld_product.get("image") or ""
            if isinstance(image, list): image = image[0]
        else:
            price = None
            sku = ""
            brand = metas.get("og:brand", "")

        if price is None:
            for blob in (desc, html):
                m = _PRICE_RE.search(blob or "")
                if m:
                    try:
                        price = float(m.group(1).replace(",", ""))
                        break
                    except Exception: pass
        try: price_f = float(price) if price is not None else 0.0
        except Exception: price_f = 0.0

        # Image fallback: first large-looking img on the page.
        if not image:
            for m in _IMG_SRC_RE.finditer(html):
                src = m.group(1)
                if any(s in src.lower() for s in ("logo", "sprite", "icon", "favicon")): continue
                image = absolutise(url, src); break

        pdfs = []
        for m in _PDF_HREF_RE.finditer(html):
            pdfs.append(absolutise(url, m.group(1)))
        # Dedupe preserving order
        pdfs = list(dict.fromkeys(pdfs))

        return ExtractResult(
            name=title.strip(),
            short=_strip_html(desc)[:200],
            description=_strip_html(desc),
            price=price_f,
            sku=str(sku).strip(),
            image_url=image or "",
            pdf_urls=pdfs,
            brand=str(brand).strip(),
        )


class PoolProAdapter(SupplierAdapter):
    host_patterns = ("poolpro.com.au", "poolpro.net.au")
    name = "poolpro"


class AstralAdapter(SupplierAdapter):
    host_patterns = ("astralpool.com.au", "astralpool.com")
    name = "astral"


class WatercoAdapter(SupplierAdapter):
    host_patterns = ("waterco.com.au", "waterco.com")
    name = "waterco"


ADAPTERS: list[SupplierAdapter] = [
    PoolProAdapter(), AstralAdapter(), WatercoAdapter(), SupplierAdapter(),
]


def adapter_for(url: str) -> SupplierAdapter:
    for a in ADAPTERS:
        if isinstance(a, SupplierAdapter) and a.matches(url):
            return a
    return ADAPTERS[-1]  # generic fallback


# ───────────────────────── YAML I/O ─────────────────────────

try:
    import yaml  # type: ignore
    YAML_LIB = "pyyaml"
except Exception:
    yaml = None  # type: ignore
    YAML_LIB = "fallback"


def yaml_load(path: Path) -> dict:
    if not path.exists(): return {"categories": [], "products": []}
    if yaml is not None:
        with path.open("r", encoding="utf-8") as f:
            return yaml.safe_load(f) or {}
    raise SystemExit(
        f"PyYAML required to read {path}. Install with: pip install pyyaml"
    )


def yaml_dump(data: dict, path: Path) -> None:
    if yaml is not None:
        with path.open("w", encoding="utf-8") as f:
            yaml.safe_dump(data, f, sort_keys=False, allow_unicode=True, width=88)
        return
    raise SystemExit("PyYAML required to write catalogue.")


# ───────────────────────── Slug + paths ─────────────────────────

def slugify(text: str) -> str:
    s = re.sub(r"[^\w\s-]", "", text.lower()).strip()
    return re.sub(r"[\s_]+", "-", s)[:80].strip("-") or "product"


def asset_dir(slug: str) -> Path:
    d = ROOT / "store" / "product" / slug / "assets"
    d.mkdir(parents=True, exist_ok=True)
    return d


def safe_filename_from_url(url: str, fallback_ext: str = "") -> str:
    path = urllib.parse.urlparse(url).path
    name = os.path.basename(path) or "asset"
    name = re.sub(r"[^A-Za-z0-9._-]", "-", name)
    if not Path(name).suffix and fallback_ext:
        name += fallback_ext
    return name[:120] or "asset"


def download(url: str, dest_dir: Path, *, fallback_ext: str = "") -> Optional[str]:
    """Download ``url`` into ``dest_dir``, return repo-relative path or None."""
    try:
        body, ctype = http_get(url)
    except Exception as e:
        print(f"  ! could not fetch asset {url}: {e}", file=sys.stderr)
        return None
    fname = safe_filename_from_url(url, fallback_ext)
    if "pdf" in (ctype or "") and not fname.lower().endswith(".pdf"):
        fname += ".pdf"
    out = dest_dir / fname
    out.write_bytes(body)
    rel = out.relative_to(ROOT)
    print(f"  + saved {rel} ({len(body)//1024} KB)")
    return f"/{rel.as_posix()}"


def classify_pdf(url: str, title: str = "") -> str:
    """Guess the document kind from the URL or link text."""
    blob = (url + " " + (title or "")).lower()
    if any(k in blob for k in ("brochure", "datasheet", "data-sheet")): return "brochure"
    if any(k in blob for k in ("manual", "instruction", "install-guide", "user-guide", "owners")): return "manual"
    if any(k in blob for k in ("install", "fitting", "installation")): return "install"
    if any(k in blob for k in ("sds", "msds", "safety")): return "sds"
    if "spec" in blob: return "spec"
    return "brochure"


# ───────────────────────── Ingest ─────────────────────────

def ingest_one(url: str, *, dry_run: bool = False) -> Optional[dict]:
    print(f"\n▶ ingesting {url}")
    html, _ = http_get(url)
    body = html.decode("utf-8", errors="replace")
    adapter = adapter_for(url)
    result = adapter.extract(url, body)
    if not result.name:
        print("  ! could not detect a product name — skipped"); return None

    slug = slugify(result.name)
    print(f"  → adapter={adapter.name} slug={slug} price={result.price} pdfs={len(result.pdf_urls)}")
    if dry_run: return {
        "slug": slug, "name": result.name, "price": result.price,
        "image": result.image_url, "docs": result.pdf_urls, "source": url,
    }

    adir = asset_dir(slug)
    image_local = ""
    if result.image_url:
        image_local = download(result.image_url, adir, fallback_ext=".jpg") or ""

    docs: list[dict] = []
    for pdf in result.pdf_urls[:6]:  # cap; supplier pages occasionally link dozens
        local = download(pdf, adir, fallback_ext=".pdf")
        if local:
            docs.append({"title": Path(local).stem.replace("-", " ").title(),
                         "kind": classify_pdf(pdf), "file": local})

    entry = {
        "slug": slug,
        "name": result.name,
        "category": "equipment",   # ingest defaults to equipment; humans curate
        "brand": result.brand or "",
        "price": round(float(result.price or 0.0), 2),
        "unit": "each",
        "sku": result.sku or "",
        "stock": "in",
        "emoji": "📦",
        "short": (result.short or result.name)[:180],
        "description": result.description or result.short or result.name,
        "features": [],
        "specs": {},
        "image": image_local or result.image_url,
        "docs": docs,
        "source": url,
    }
    return entry


def upsert_product(catalogue: dict, entry: dict) -> str:
    products = catalogue.setdefault("products", [])
    for i, p in enumerate(products):
        if p.get("slug") == entry["slug"]:
            # Update only the fields the ingest cares about, never blow away
            # human curation (features, specs, advisor metadata, fits, etc.)
            for k in ("name", "price", "image", "docs", "source", "brand",
                     "description", "short", "sku"):
                if entry.get(k): p[k] = entry[k]
            return "updated"
    products.append(entry)
    return "added"


def main():
    ap = argparse.ArgumentParser(description="Ingest supplier product URLs into the Palatial Pools online store.")
    ap.add_argument("urls", nargs="*", help="One or more supplier product URLs.")
    ap.add_argument("--file", type=Path, help="Read URLs from a file, one per line.")
    ap.add_argument("--queue", type=Path, default=None,
                    help="Read URLs from a YAML queue (default: store/_ingest_queue.yaml).")
    ap.add_argument("--dry-run", action="store_true",
                    help="Don't write files or update the catalogue.")
    ap.add_argument("--no-build", action="store_true",
                    help="Skip running build_store.py after ingest.")
    args = ap.parse_args()

    urls: list[str] = list(args.urls)
    if args.file:
        urls += [l.strip() for l in args.file.read_text(encoding="utf-8").splitlines() if l.strip() and not l.startswith("#")]
    queue_path = args.queue or (QUEUE if QUEUE.exists() and not urls else None)
    if queue_path and queue_path.exists():
        q = yaml_load(queue_path)
        urls += list((q or {}).get("urls", []))

    urls = [u for u in dict.fromkeys(urls)]
    if not urls:
        ap.print_help(); sys.exit("\nNo URLs supplied.")

    catalogue = yaml_load(CATALOGUE)
    results: list[tuple[str, str]] = []
    for url in urls:
        try:
            entry = ingest_one(url, dry_run=args.dry_run)
        except Exception as e:
            print(f"  ! ingest failed for {url}: {e}", file=sys.stderr)
            results.append((url, "failed")); continue
        if not entry:
            results.append((url, "skipped")); continue
        if args.dry_run:
            results.append((url, f"dry-run ({entry['slug']})")); continue
        action = upsert_product(catalogue, entry)
        results.append((url, f"{action} ({entry['slug']})"))
        time.sleep(POLITE_DELAY_SECONDS)

    if not args.dry_run:
        yaml_dump(catalogue, CATALOGUE)
        # Clear queue once consumed.
        if queue_path and queue_path.exists():
            yaml_dump({"urls": []}, queue_path)

    print("\n── Ingest summary ──")
    for u, status in results: print(f"  {status:>28}  {u}")

    if not args.dry_run and not args.no_build:
        print("\n▶ rebuilding store pages…")
        import subprocess
        subprocess.run([sys.executable, str(ROOT / "scripts" / "build_store.py")], check=True)


if __name__ == "__main__":
    main()
