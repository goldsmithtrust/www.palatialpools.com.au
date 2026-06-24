#!/usr/bin/env python3
"""
Palatial Pools — Online Store page generator.

Reads the catalogue at ``store/_catalogue.yaml`` and renders a complete,
indexable HTML page for every storefront route under ``/store/`` plus
the five enterprise feature pages (Chemistry Advisor, Fitment Checker,
Pool Pantry, Trade Portal, Service+Supply bundles).

Auto-SEO is delegated to ``scripts/seo.py`` so titles, descriptions,
JSON-LD blocks, FAQ schema, internal cross-links and the sitemap are
generated deterministically from the catalogue.

This is a one-shot maintenance script. Re-run whenever the catalogue or
page copy changes::

    python3 scripts/build_store.py

Outputs are deterministic; commit the generated files to git.
"""

from __future__ import annotations

import html
import json
import re
import sys
import textwrap
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "scripts"))

import seo  # noqa: E402

try:
    import yaml  # type: ignore
except Exception:
    print("PyYAML required: pip install pyyaml", file=sys.stderr); raise

STORE = ROOT / "store"
SITE_URL = seo.SITE_URL

CATALOGUE_PATH = STORE / "_catalogue.yaml"


# ───────────────────────── Catalogue loading ─────────────────────────

def load_catalogue() -> tuple[list[dict], list[dict]]:
    with CATALOGUE_PATH.open("r", encoding="utf-8") as f:
        data = yaml.safe_load(f) or {}
    return data.get("categories", []), data.get("products", [])


# ───────────────────────── Helpers ─────────────────────────

def esc(s) -> str:
    return html.escape("" if s is None else str(s), quote=True)


def money(n) -> str:
    return "$" + f"{float(n):,.2f}"


CATEGORY_ICONS = {
    "chem": '<svg viewBox="0 0 24 24"><path d="M9 2h6"/><path d="M10 2v6L4.5 19a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 8V2"/><line x1="7" y1="14" x2="17" y2="14"/></svg>',
    "cpu":  '<svg viewBox="0 0 24 24"><rect x="4" y="4" width="16" height="16" rx="2"/><rect x="9" y="9" width="6" height="6"/><line x1="9" y1="2" x2="9" y2="4"/><line x1="15" y1="2" x2="15" y2="4"/><line x1="9" y1="20" x2="9" y2="22"/><line x1="15" y1="20" x2="15" y2="22"/><line x1="2" y1="9" x2="4" y2="9"/><line x1="2" y1="15" x2="4" y2="15"/><line x1="20" y1="9" x2="22" y2="9"/><line x1="20" y1="15" x2="22" y2="15"/></svg>',
    "tool": '<svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 1 1-5.7 5.7L3 18l3 3 6-6 .3-.3a4 4 0 0 1 5.4-5.4z"/></svg>',
    "cog":  '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09a1.65 1.65 0 0 0-1-1.51 1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7.04 4.29l.06.06A1.65 1.65 0 0 0 9 4.6h0A1.65 1.65 0 0 0 10 3.09V3a2 2 0 1 1 4 0v.09A1.65 1.65 0 0 0 15 4.6a1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.18.43.6.91 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>',
    "beaker": '<svg viewBox="0 0 24 24"><path d="M9 2v6L3.5 17.5a3 3 0 0 0 2.6 4.5h11.8a3 3 0 0 0 2.6-4.5L15 8V2"/><line x1="9" y1="2" x2="15" y2="2"/></svg>',
}


def media_html(p: dict, *, large: bool = False) -> str:
    """Render either a self-hosted image or the placeholder emoji tile."""
    img = p.get("image")
    if img and (img.startswith("/") or img.startswith("http")):
        return f'<img src="{esc(img)}" alt="{esc(p["name"])}" loading="lazy" />'
    return f'<span aria-hidden="true">{p.get("emoji", "📦")}</span>'


def shell(*, title: str, description: str, canonical_path: str, body: str,
          jsonld: list[str] | None = None, active: str | None = None,
          page_class: str = "") -> str:
    canonical = SITE_URL + canonical_path
    jsonld_blocks = "\n".join(
        f'<script type="application/ld+json">{block}</script>'
        for block in (jsonld or [])
    )
    subnav_items = [
        ("/store/", "All"),
        ("/store/chemicals/", "Chemicals"),
        ("/store/equipment/", "Equipment"),
        ("/store/accessories/", "Accessories"),
        ("/store/parts/", "Spare Parts"),
        ("/store/water-testing/", "Water Testing"),
        ("/store/advisor/", "Chemistry Advisor"),
        ("/store/fitment/", "Fitment Checker"),
        ("/store/pantry/", "Pool Pantry"),
        ("/store/trade/", "Trade"),
        ("/store/about/", "Delivery"),
    ]
    subnav_html = "\n      ".join(
        f'<a href="{href}"{" class=\"is-active\"" if active == href else ""}>{esc(label)}</a>'
        for href, label in subnav_items
    )

    return f"""<!doctype html>
<html lang="en-AU">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{esc(title)}</title>
  <meta name="description" content="{esc(description)}" />
  <meta name="robots" content="index, follow" />
  <link rel="canonical" href="{esc(canonical)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="{esc(title)}" />
  <meta property="og:description" content="{esc(description)}" />
  <meta property="og:url" content="{esc(canonical)}" />
  <meta property="og:site_name" content="Palatial Pools Store" />
  <meta property="og:locale" content="en_AU" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="{esc(title)}" />
  <meta name="twitter:description" content="{esc(description)}" />
  <meta name="theme-color" content="#0d0118" />
  <link rel="icon" type="image/x-icon" href="/favicon.ico" />
  <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
  <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16.png" />
  <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800&display=swap" rel="stylesheet" />
  <link rel="prefetch" href="/assets/data/palatial-public-asset-sync.json" as="fetch" />
  <link rel="stylesheet" href="/assets/store/store.css" />
  {jsonld_blocks}
</head>
<body>
  <div class="store-shell {esc(page_class)}">
    <header class="store-header">
      <a href="/store/" class="store-brand" aria-label="Palatial Store home">
        <span class="store-brand-mark" aria-hidden="true">P</span>
        <span><strong>Palatial Store</strong><small>By Palatial Pools</small></span>
      </a>
      <form class="store-search" data-store-search role="search" action="/store/search/" method="get">
        <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="search" name="q" placeholder="Search the catalogue…" aria-label="Search the catalogue" autocomplete="off" />
      </form>
      <div class="store-header-actions">
        <a href="/" class="store-back-link" aria-label="Back to main Palatial Pools site"><svg viewBox="0 0 24 24"><polyline points="15 18 9 12 15 6"/></svg> Main site</a>
        <a href="/store/account/" class="store-icon-btn" aria-label="Account"><svg viewBox="0 0 24 24"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 5-6 8-6s6.5 2 8 6"/></svg></a>
        <a href="/store/cart/" class="store-icon-btn" aria-label="Cart">
          <svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1.5"/><circle cx="18" cy="21" r="1.5"/><path d="M3 3h2l2.4 12.3a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 2-1.6L21 8H6"/></svg>
          <span class="badge" data-cart-badge hidden>0</span>
        </a>
      </div>
    </header>

    <nav class="store-subnav" aria-label="Shop categories">
      <div class="store-subnav-inner">
        {subnav_html}
      </div>
    </nav>

    <main class="store-main">
      <div class="store-page" data-store-content>
{body}
      </div>
    </main>

    <footer class="store-footer">
      <div class="store-footer-inner">
        <div>
          <h5>Palatial Pools</h5>
          <p style="color:rgba(241,245,249,0.55);max-width:280px">Melbourne's premium pool and spa service. Sanitisers, equipment, parts and on-site service across every Melbourne suburb.</p>
          <p style="margin-top:.6rem;color:rgba(241,245,249,0.7)"><a href="tel:+61342317665">03 4231 POOL</a></p>
        </div>
        <div>
          <h5>Shop</h5>
          <ul>
            <li><a href="/store/">All products</a></li>
            <li><a href="/store/chemicals/">Chemicals</a></li>
            <li><a href="/store/equipment/">Equipment</a></li>
            <li><a href="/store/accessories/">Accessories</a></li>
            <li><a href="/store/parts/">Spare Parts</a></li>
            <li><a href="/store/water-testing/">Water Testing</a></li>
          </ul>
        </div>
        <div>
          <h5>Tools</h5>
          <ul>
            <li><a href="/store/advisor/">Chemistry Advisor</a></li>
            <li><a href="/store/fitment/">Fitment Checker</a></li>
            <li><a href="/store/pantry/">Pool Pantry</a></li>
            <li><a href="/store/trade/">Trade Portal</a></li>
            <li><a href="/store/about/">Delivery &amp; service</a></li>
            <li><a href="/store/transparency/">Transparency notes</a></li>
          </ul>
        </div>
        <div>
          <h5>Account</h5>
          <ul>
            <li><a href="/store/account/">My orders</a></li>
            <li><a href="/store/cart/">Cart</a></li>
            <li><a href="/store/checkout/">Checkout</a></li>
          </ul>
        </div>
        <div class="footer-meta">
          <span>&copy; 2026 Palatial Pool Services Pty Ltd</span>
          <span>13A 328 Johnston St, Abbotsford VIC 3067 &middot; ABN 12 345 678 901</span>
        </div>
      </div>
    </footer>
  </div>

  <script src="/assets/store/catalog.js" defer></script>
  <script src="/assets/store/store.js" defer></script>
  <script src="/assets/palatial-chatbox.js" defer></script>
</body>
</html>
"""


# ───────────────────────── Renderers ─────────────────────────

def product_card_html(p: dict) -> str:
    stock_pill = (
        '<span class="pill pill-stock">In stock</span>' if p.get("stock") == "in"
        else '<span class="pill pill-low">Low stock</span>' if p.get("stock") == "low"
        else '<span class="pill pill-out">Out</span>'
    )
    tag_html = f'<span class="tag">{esc(p["tag"])}</span>' if p.get("tag") else ""
    return textwrap.dedent(f"""\
        <a class="product-card" href="/store/product/{p['slug']}/" data-product="{esc(p['slug'])}">
          <div class="product-card-media">
            {media_html(p)}
            {tag_html}
          </div>
          <div class="product-card-body">
            <span class="product-card-cat">{esc(p['category'].replace('-', ' '))}</span>
            <span class="product-card-name">{esc(p['name'])}</span>
            <span class="product-card-meta">{esc(p.get('short', ''))}</span>
            <div class="product-card-foot">
              <span class="product-card-price">{money(p['price'])} <small>{esc(p.get('unit', ''))}</small></span>
              {stock_pill}
            </div>
          </div>
        </a>""")


def category_tile_html(c: dict, products: list[dict]) -> str:
    count = len([p for p in products if p["category"] == c["slug"]])
    icon = CATEGORY_ICONS.get(c.get("icon", ""), CATEGORY_ICONS["chem"])
    return textwrap.dedent(f"""\
        <a class="cat-tile" href="/store/{c['slug']}/">
          <div class="ico" aria-hidden="true">{icon}</div>
          <h3>{esc(c['name'])}</h3>
          <p>{esc(c['tagline'])}</p>
          <span class="count">{count} product{'s' if count != 1 else ''}</span>
        </a>""")


def feature_row_html() -> str:
    return textwrap.dedent("""\
        <div class="feature-row">
          <a href="/store/advisor/">
            <span class="ico"><svg viewBox="0 0 24 24"><path d="M9 2v6L3.5 17.5a3 3 0 0 0 2.6 4.5h11.8a3 3 0 0 0 2.6-4.5L15 8V2"/></svg></span>
            <span><strong>Chemistry Advisor</strong><small>Enter your readings → get a dose list</small></span>
          </a>
          <a href="/store/fitment/">
            <span class="ico"><svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="3"/><path d="M2 12h4M18 12h4M12 2v4M12 18v4"/></svg></span>
            <span><strong>Fitment Checker</strong><small>Match parts to your equipment model</small></span>
          </a>
          <a href="/store/pantry/">
            <span class="ico"><svg viewBox="0 0 24 24"><path d="M3 7h18M5 7v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg></span>
            <span><strong>Pool Pantry</strong><small>Quarterly auto-replenish for consumables</small></span>
          </a>
          <a href="/store/trade/">
            <span class="ico"><svg viewBox="0 0 24 24"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></span>
            <span><strong>Trade Portal</strong><small>Pool techs & commercial accounts</small></span>
          </a>
        </div>
    """)


def render_home(categories, products) -> str:
    cat_tiles = "\n        ".join(category_tile_html(c, products) for c in categories)
    featured = [p for p in products if p.get("tag")] + [p for p in products if not p.get("tag")]
    featured_cards = "\n          ".join(product_card_html(p) for p in featured[:8])
    body = textwrap.dedent(f"""\
        <section class="page-hero">
          <div class="eyebrow">Palatial Store · Online</div>
          <h1>Easy pool chemicals and equipment online.</h1>
          <p>Chemicals, equipment, parts and water testing — supplied and supported by the same Melbourne team that services thousands of pools every season. Order for click and collect, national delivery, or pickup in store Abbotsford.</p>
          <div style="margin-top:1.25rem;display:flex;gap:.7rem;flex-wrap:wrap">
            <a class="btn btn-primary" href="/store/advisor/">Open Chemistry Advisor</a>
            <a class="btn btn-ghost" href="/store/about/">Delivery &amp; pickup</a>
          </div>
        </section>

        {feature_row_html()}

        <section class="intelligence-panel" data-intelligence-root aria-labelledby="store-intelligence-title">
          <div>
            <div class="eyebrow">Helpful prediction, privacy first</div>
            <h2 id="store-intelligence-title">This month, the store is tuned for seasonal pool care.</h2>
            <p>We use broad Melbourne seasonality and public catalogue metadata to surface the next useful page. No live chatbot, no behavioural profiling, and no customer history on public pages.</p>
          </div>
          <div class="intel-card">
            <span class="intel-label">Current focus</span>
            <strong>Seasonal water balance</strong>
            <p>Open the Chemistry Advisor, check common consumables or review fitment before buying parts.</p>
            <a href="/store/transparency/">Want to understand how this works?</a>
          </div>
        </section>

        <h2 class="section-title">Shop by category</h2>
        <div class="cat-grid">
        {cat_tiles}
        </div>

        <h2 class="section-title">Featured products <small>Picked by our service team</small></h2>
        <div class="product-grid">
          {featured_cards}
        </div>

        {seo.suburb_link_block_html()}
        """)
    bc = seo.jsonld_breadcrumbs([("Home", SITE_URL + "/"), ("Store", SITE_URL + "/store/")])
    store_ld = {
        "@context": "https://schema.org", "@type": "Store",
        "name": "Palatial Pools Store",
        "url": SITE_URL + "/store/",
        "telephone": "+61342317665",
        "image": SITE_URL + "/images/palatial-logo.png",
        "address": {"@type": "PostalAddress", "streetAddress": "13A 328 Johnston St",
                    "addressLocality": "Abbotsford", "addressRegion": "VIC",
                    "postalCode": "3067", "addressCountry": "AU"},
        "openingHours": "Mo-Fr 08:00-17:30, Sa 08:00-14:00",
        "priceRange": "$$", "areaServed": "Melbourne, Victoria",
    }
    return shell(
        title="Pool Chemicals & Equipment Online | Click & Collect Abbotsford | Palatial Pools Store",
        description="Shop pool chemicals, equipment, spare parts and water testing online from Palatial Pools. Click and collect from Abbotsford, local delivery or national shipping.",
        canonical_path="/store/",
        body=body,
        jsonld=seo.serialize_jsonld([store_ld, bc, seo.jsonld_itemlist(featured[:8])]),
        active="/store/",
    )


def render_category(c, products):
    cat_products = [p for p in products if p["category"] == c["slug"]]
    cards = "\n          ".join(product_card_html(p) for p in cat_products)
    body = textwrap.dedent(f"""\
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="/store/">Store</a>
          <span class="sep">›</span>
          <span class="current">{esc(c['name'])}</span>
        </nav>

        <section class="page-hero">
          <div class="eyebrow">{esc(c['name'])}</div>
          <h1>{esc(c['name'])} for Melbourne pools</h1>
          <p>{esc(c['blurb'])}</p>
        </section>

        <h2 class="section-title">{esc(c['name'])} <small>{len(cat_products)} product{'s' if len(cat_products) != 1 else ''}</small></h2>
        <div class="product-grid">
          {cards}
        </div>

        <section class="info-panel" style="margin-top:2.5rem">
          <h3>Not seeing what you need?</h3>
          <p>The shelves at our Abbotsford shop hold hundreds more lines than we list online. Call us on <a href="tel:+61342317665">03 4231 POOL</a> or <a href="mailto:[REDACTED]">email the team</a> with the make and model — we'll quote and confirm fitment before you commit to a purchase.</p>
        </section>

        {seo.suburb_link_block_html()}
        """)
    bc = seo.jsonld_breadcrumbs([
        ("Home", SITE_URL + "/"),
        ("Store", SITE_URL + "/store/"),
        (c["name"], SITE_URL + f"/store/{c['slug']}/"),
    ])
    coll = {"@context": "https://schema.org", "@type": "CollectionPage",
            "name": c["name"], "url": SITE_URL + f"/store/{c['slug']}/",
            "description": c.get("blurb", "")}
    return shell(
        title=seo.seo_title_for_category(c),
        description=seo.seo_description_for_category(c),
        canonical_path=f"/store/{c['slug']}/",
        body=body,
        jsonld=seo.serialize_jsonld([coll, bc, seo.jsonld_itemlist(cat_products)]),
        active=f"/store/{c['slug']}/",
    )


def render_product(p, categories, products):
    cat = next(c for c in categories if c["slug"] == p["category"])
    feature_html = "\n            ".join(f"<li>{esc(f)}</li>" for f in p.get("features", []))
    spec_html = "\n            ".join(
        f"<dt>{esc(k)}</dt><dd>{esc(v)}</dd>" for k, v in p.get("specs", {}).items()
    )
    stock_pill = (
        '<span class="pill pill-stock">In stock — Abbotsford</span>' if p.get("stock") == "in"
        else '<span class="pill pill-low">Low stock — call to confirm</span>' if p.get("stock") == "low"
        else '<span class="pill pill-out">Out of stock</span>'
    )
    related = seo.related_products(p, products, limit=4)
    related_cards = "\n          ".join(product_card_html(r) for r in related)

    # Brochures / manuals (self-hosted)
    docs_html = ""
    if p.get("docs"):
        docs_html = '<div class="pdp-docs">' + "".join(
            (f'<a class="pdp-doc" href="{esc(d["file"])}" target="_blank" rel="noopener">'
             f'<span class="pdp-doc-ico"><svg viewBox="0 0 24 24"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>'
             f'<span class="pdp-doc-meta"><strong>{esc(d["title"])}</strong>'
             f'<small>{esc(d.get("kind", "pdf").upper())} · PDF</small></span></a>')
            for d in p["docs"]
        ) + "</div>"

    # Subscribe (Pool Pantry)
    subscribe_html = ""
    if p.get("subscribe"):
        subscribe_html = textwrap.dedent(f"""\
            <div class="subscribe-card">
              <input type="checkbox" id="sub-{esc(p['slug'])}" data-subscribe="{esc(p['slug'])}" />
              <label for="sub-{esc(p['slug'])}">
                Add to <strong>Pool Pantry</strong> auto-replenish — every 3 months
                <span class="sub">Pause, skip or cancel anytime by contacting the Abbotsford team.</span>
              </label>
            </div>""")

    # Service + Supply bundle
    bundle_html = ""
    if p.get("install", {}).get("available"):
        ins = p["install"]
        bundle_html = textwrap.dedent(f"""\
            <div class="bundle-card">
              <span class="ico"><svg viewBox="0 0 24 24"><path d="M14.7 6.3a4 4 0 1 1-5.7 5.7L3 18l3 3 6-6 .3-.3a4 4 0 0 1 5.4-5.4z"/></svg></span>
              <div class="bundle-card-meta">
                <h4>Service + Supply bundle</h4>
                <p>Add a licensed Palatial Pools technician to install this — typical visit {esc(ins.get('duration', '60–90 min'))}, includes commissioning.</p>
              </div>
              <span class="bundle-card-price">+{money(ins.get('price', 0))}</span>
              <button class="btn btn-ghost btn-sm" data-add-bundle="{esc(p['slug'])}" type="button">Add bundle</button>
            </div>""")

    fits_html = ""
    if p.get("fits"):
        fits_html = '<section class="info-panel" style="margin-top:1.4rem"><h3>Confirmed fitments</h3><ul>' + \
            "".join(f"<li>{esc(m)}</li>" for m in p["fits"]) + \
            '</ul><p style="margin-top:.5rem;font-size:.82rem"><a href="/store/fitment/?part=' + \
            esc(p['slug']) + '">Open the Fitment Checker →</a></p></section>'

    body = textwrap.dedent(f"""\
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="/store/">Store</a>
          <span class="sep">›</span>
          <a href="/store/{cat['slug']}/">{esc(cat['name'])}</a>
          <span class="sep">›</span>
          <span class="current">{esc(p['name'])}</span>
        </nav>

        <article class="pdp-layout" data-product="{esc(p['slug'])}">
          <div class="pdp-media" aria-hidden="true">{media_html(p, large=True)}</div>
          <div class="pdp-info">
            <div class="pdp-cat">{esc(cat['name'])} · SKU {esc(p.get('sku', ''))}{(' · ' + esc(p['brand'])) if p.get('brand') else ''}</div>
            <h1>{esc(p['name'])}</h1>
            <div style="display:flex;gap:.5rem;flex-wrap:wrap;margin-top:.4rem">{stock_pill}{f'<span class="pill pill-new">{esc(p["tag"])}</span>' if p.get('tag') else ''}</div>
            <div class="pdp-price">{money(p['price'])} <small>{esc(p.get('unit', ''))}, incl. GST</small></div>
            <p class="pdp-description">{esc(p.get('description', ''))}</p>
            <ul class="pdp-features">
            {feature_html}
            </ul>
            <div class="pdp-actions">
              <div class="qty-stepper" data-qty-stepper>
                <button type="button" data-qty-dec aria-label="Decrease quantity">−</button>
                <span class="qty-value" data-qty-value>1</span>
                <button type="button" data-qty-inc aria-label="Increase quantity">+</button>
              </div>
              <button class="btn btn-primary" data-add-to-cart="{esc(p['slug'])}" type="button">
                <svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1.5"/><circle cx="18" cy="21" r="1.5"/><path d="M3 3h2l2.4 12.3a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 2-1.6L21 8H6"/></svg>
                Add to cart
              </button>
              <a class="btn btn-ghost" href="tel:+61342317665">Call to order</a>
            </div>
            {subscribe_html}
            {bundle_html}
            <p style="margin-top:1rem;font-size:.8rem;color:var(--text-soft);line-height:1.55">Prices shown include GST. Delivery is calculated when we confirm your order — pickup from our Abbotsford shop is always free.</p>
          </div>
        </article>

        <section class="pdp-specs">
          <h3>Specifications</h3>
          <dl>
            {spec_html}
          </dl>
        </section>

        {docs_html}
        {fits_html}
        """)

    if related:
        body += textwrap.dedent(f"""\

        <h2 class="section-title" style="margin-top:2.5rem">More in {esc(cat['name'])}</h2>
        <div class="product-grid">
          {related_cards}
        </div>
        """)

    body += "\n" + seo.suburb_link_block_html()

    # JSON-LD: Product, Breadcrumbs, FAQPage
    image_url = p.get("image")
    if image_url and image_url.startswith("/"): image_url = SITE_URL + image_url
    blocks = [
        seo.jsonld_product(p, cat, image_url),
        seo.jsonld_breadcrumbs([
            ("Home", SITE_URL + "/"),
            ("Store", SITE_URL + "/store/"),
            (cat["name"], SITE_URL + f"/store/{cat['slug']}/"),
            (p["name"], SITE_URL + f"/store/product/{p['slug']}/"),
        ]),
        seo.jsonld_faqpage(seo.auto_faqs(p, cat)),
    ]
    return shell(
        title=seo.seo_title_for_product(p, cat),
        description=seo.seo_description_for_product(p, cat),
        canonical_path=f"/store/product/{p['slug']}/",
        body=body,
        jsonld=seo.serialize_jsonld(blocks),
        active=f"/store/{cat['slug']}/",
    )


def render_cart():
    body = textwrap.dedent("""\
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="/store/">Store</a>
          <span class="sep">›</span>
          <span class="current">Cart</span>
        </nav>
        <h1 style="font-size:1.6rem;color:var(--text);margin-bottom:1rem">Your cart</h1>
        <div data-cart-root>
          <div class="cart-empty">
            <svg viewBox="0 0 24 24"><circle cx="9" cy="21" r="1.5"/><circle cx="18" cy="21" r="1.5"/><path d="M3 3h2l2.4 12.3a2 2 0 0 0 2 1.7h7.7a2 2 0 0 0 2-1.6L21 8H6"/></svg>
            <h3>Your cart is empty</h3>
            <p>Browse the categories to add pool chemicals, equipment or parts.</p>
            <div style="margin-top:1.25rem"><a href="/store/" class="btn btn-primary">Shop the catalogue</a></div>
          </div>
        </div>
        """)
    return shell(
        title="Cart | Palatial Pools Online Store",
        description="Review the products in your Palatial Pools cart before checkout.",
        canonical_path="/store/cart/",
        body=body,
    )


def render_checkout():
    body = textwrap.dedent("""\
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="/store/">Store</a>
          <span class="sep">›</span>
          <a href="/store/cart/">Cart</a>
          <span class="sep">›</span>
          <span class="current">Checkout</span>
        </nav>
        <h1 style="font-size:1.6rem;color:var(--text);margin-bottom:1rem">Checkout</h1>
        <div data-checkout-root>
          <div class="empty">
            <h3>Nothing to check out yet</h3>
            <p>Add a few items to your cart, then come back here to send your order to our team.</p>
            <div style="margin-top:1.25rem"><a href="/store/" class="btn btn-primary">Browse the store</a></div>
          </div>
        </div>
        """)
    return shell(
        title="Checkout | Palatial Pools Online Store",
        description="Send your Palatial Pools order to our Abbotsford team. We confirm price, stock and delivery before any payment is taken.",
        canonical_path="/store/checkout/",
        body=body,
    )


def render_order_confirmation():
    body = textwrap.dedent("""\
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="/store/">Store</a>
          <span class="sep">›</span>
          <span class="current">Order received</span>
        </nav>

        <section class="page-hero">
          <div class="eyebrow">Order received</div>
          <h1>Thanks — we'll be in touch shortly.</h1>
          <p>Your order has been sent to our Abbotsford team. We'll confirm stock, delivery and final pricing within one business day.</p>
        </section>

        <div class="split-2">
          <div class="info-panel">
            <h3>What happens next</h3>
            <ul>
              <li>Our team confirms each line item is in stock at our Abbotsford shop.</li>
              <li>We'll email a quote with delivery cost or a pickup time.</li>
              <li>Payment is processed only after you approve the quote — no surprises.</li>
              <li>For service / install items, our office will call to schedule a site visit.</li>
            </ul>
          </div>
          <div class="info-panel">
            <h3>Need to chase it up?</h3>
            <p>Call our shop on <a href="tel:+61342317665">03 4231 POOL</a> Mon–Fri 8am–5:30pm, or email <a href="mailto:[REDACTED]">[REDACTED]</a>.</p>
          </div>
        </div>

        <div style="margin-top:2rem;text-align:center">
          <a href="/store/" class="btn btn-primary">Keep shopping</a>
        </div>
        """)
    return shell(
        title="Order received | Palatial Pools Online Store",
        description="Thanks for ordering with Palatial Pools — we'll confirm stock, delivery and pricing shortly.",
        canonical_path="/store/order-confirmation/",
        body=body,
    )


def render_account():
    body = textwrap.dedent("""\
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="/store/">Store</a>
          <span class="sep">›</span>
          <span class="current">Account</span>
        </nav>

        <section class="page-hero">
          <div class="eyebrow">Customer accounts</div>
          <h1>Manage store orders and enquiries</h1>
          <p>Store customers can use this area to review order requests, checkout details and pickup or delivery updates as the online shop expands.</p>
          <div style="margin-top:1.25rem;display:flex;gap:.7rem;flex-wrap:wrap">
            <a class="btn btn-primary" href="/store/">Continue shopping</a>
            <a class="btn btn-ghost" href="/contact-palatial-pool-services/">Become a customer</a>
          </div>
        </section>

        <div class="split-2">
          <div class="info-panel">
            <h3>Online store orders</h3>
            <p>Online store orders are confirmed by email from <a href="mailto:[REDACTED]">[REDACTED]</a>. We don't store payment details in the browser — every order is reviewed by a human and quoted in writing before payment.</p>
          </div>
          <div class="info-panel">
            <h3>Service customers</h3>
            <p>For now, order requests are confirmed by our Abbotsford team before payment. We will expand this area as online account features come online.</p>
          </div>
        </div>
        """)
    return shell(
        title="Account | Palatial Pools Online Store",
        description="Manage your Palatial Pools store account and order requests.",
        canonical_path="/store/account/",
        body=body,
    )


def render_about():
    body = textwrap.dedent("""\
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="/store/">Store</a>
          <span class="sep">›</span>
          <span class="current">Delivery &amp; Service</span>
        </nav>

        <section class="page-hero">
          <div class="eyebrow">Delivery, returns &amp; warranty</div>
          <h1>How the Palatial Store works</h1>
          <p>Every online order is fulfilled by our Abbotsford shop — the same team servicing pools across Melbourne every day. Here's exactly what to expect.</p>
        </section>

        <div class="split-2">
          <div class="info-panel">
            <h3>Delivery across Melbourne</h3>
            <p>We deliver across all Melbourne metropolitan suburbs we already service — including Abbotsford, Richmond, Kew, Hawthorn, Camberwell, Toorak, South Yarra, Balwyn, Northcote and Fitzroy. Delivery is quoted after you submit your order so you only ever pay for the actual run.</p>
            <ul style="margin-top:.6rem">
              <li>Most metro deliveries within 1–2 business days.</li>
              <li>Chemicals are delivered in sealed buckets with handling instructions.</li>
              <li>Heavy items (pumps, filters, cells) can be paired with an install visit.</li>
            </ul>
          </div>
          <div class="info-panel">
            <h3>Pickup &mdash; Abbotsford shop</h3>
            <p>Pickup is always free from our shop at <strong>13A 328 Johnston St, Abbotsford VIC 3067</strong>. We'll email you when your order is ready — usually the same day.</p>
            <p style="margin-top:.5rem">Mon&ndash;Fri 8:00am&ndash;5:30pm &middot; Sat 8:00am&ndash;2:00pm.</p>
          </div>
          <div class="info-panel" id="returns">
            <h3>Returns &amp; warranty</h3>
            <ul>
              <li>Unopened chemicals can be returned within 14 days for a full refund.</li>
              <li>Equipment is covered by the manufacturer warranty; we handle warranty claims for you.</li>
              <li>Replacement cells, cartridges and parts are warranted against premature failure.</li>
              <li>If something doesn't fit — call us first, we'll usually have a swap on the shelf.</li>
            </ul>
          </div>
          <div class="info-panel">
            <h3>Pricing &amp; payment</h3>
            <p>Prices on the store include 10% GST. Submitting an order sends a quote request to our team — payment isn't taken until we've confirmed stock and delivery. We accept EFTPOS, Visa, Mastercard and direct deposit.</p>
          </div>
        </div>
        """)
    return shell(
        title="Delivery, returns & warranty | Palatial Pools Online Store",
        description="How the Palatial Pools online store works — Melbourne delivery, Abbotsford shop pickup, returns and warranty.",
        canonical_path="/store/about/",
        body=body,
        active="/store/about/",
    )


def render_search():
    body = textwrap.dedent("""\
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="/store/">Store</a>
          <span class="sep">›</span>
          <span class="current">Search</span>
        </nav>
        <h1 style="font-size:1.6rem;color:var(--text);margin-bottom:1rem">Search the store</h1>
        <div data-search-root>
          <div class="empty">
            <h3>Type to search the catalogue</h3>
            <p>Try “chlorine”, “cartridge”, “pole” or “meter” in the search box above.</p>
          </div>
        </div>
        """)
    return shell(
        title="Search | Palatial Pools Online Store",
        description="Search the Palatial Pools online store for pool chemicals, equipment, parts and water testing products.",
        canonical_path="/store/search/",
        body=body,
    )


# ─────────────── Enterprise feature pages ───────────────

def render_advisor():
    body = textwrap.dedent("""\
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="/store/">Store</a>
          <span class="sep">›</span>
          <span class="current">Chemistry Advisor</span>
        </nav>

        <section class="page-hero">
          <div class="eyebrow">Smart Tool · Chemistry Advisor</div>
          <h1>Tell us your pool. We'll write the shopping list.</h1>
          <p>Enter your pool size, current readings and surface — our Advisor calculates the exact doses your pool needs and adds the right products to your cart in one click.</p>
        </section>

        <div class="wizard" data-advisor-root>
          <div class="wizard-step"><span class="n">1</span> Your pool</div>
          <div class="form-grid">
            <div class="field"><label for="adv-vol">Pool volume (litres)</label>
              <input id="adv-vol" name="vol" type="number" inputmode="numeric" placeholder="e.g. 45000" min="1000" max="200000" />
              <span class="hint">Use our <a href="/pool-volume-calculator/">volume calculator</a> if you're not sure.</span></div>
            <div class="field"><label for="adv-surface">Pool surface</label>
              <select id="adv-surface" name="surface">
                <option value="pebble">Pebble / aggregate</option>
                <option value="render">Render / quartzon</option>
                <option value="fibreglass">Fibreglass</option>
                <option value="vinyl">Vinyl liner</option>
                <option value="tile">Fully tiled</option>
              </select></div>
            <div class="field"><label for="adv-system">Sanitiser system</label>
              <select id="adv-system" name="system">
                <option value="chlorine">Manual / dosing chlorine</option>
                <option value="salt">Salt chlorinator</option>
                <option value="mineral">Mineral chlorinator</option>
              </select></div>
            <div class="field"><label for="adv-goal">Goal today</label>
              <select id="adv-goal" name="goal">
                <option value="balance">Routine weekly balance</option>
                <option value="shock">Shock dose (algae / green water)</option>
                <option value="open">Season opening</option>
                <option value="winterise">Season winterising</option>
              </select></div>
          </div>

          <div class="wizard-step" style="margin-top:1.4rem"><span class="n">2</span> Today's readings</div>
          <div class="form-grid">
            <div class="field"><label for="adv-fc">Free chlorine (ppm)</label><input id="adv-fc" type="number" step="0.1" placeholder="e.g. 1.5"></div>
            <div class="field"><label for="adv-ph">pH</label><input id="adv-ph" type="number" step="0.1" placeholder="e.g. 7.8"></div>
            <div class="field"><label for="adv-ta">Total alkalinity (ppm)</label><input id="adv-ta" type="number" placeholder="e.g. 120"></div>
            <div class="field"><label for="adv-salt">Salt (ppm)</label><input id="adv-salt" type="number" placeholder="e.g. 4200"></div>
          </div>

          <div style="margin-top:1.4rem;display:flex;gap:.6rem;flex-wrap:wrap">
            <button class="btn btn-primary" data-advisor-run type="button">Recommend products</button>
            <button class="btn btn-ghost" data-advisor-reset type="button">Reset</button>
          </div>

          <div data-advisor-result hidden></div>
        </div>

        <section class="info-panel" style="margin-top:2rem">
          <h3>Prefer a human-checked prescription?</h3>
          <p>Drop a 250ml water sample into our <a href="/shop/">Abbotsford shop</a> for a free 7-point professional test, or call <a href="tel:+61342317665">03 4231 POOL</a>. The Advisor uses conservative public formulae and keeps higher-risk recommendations human checked. <a href="/store/transparency/">Read the public transparency notes</a>.</p>
        </section>
        """)
    bc = seo.jsonld_breadcrumbs([
        ("Home", SITE_URL + "/"), ("Store", SITE_URL + "/store/"),
        ("Chemistry Advisor", SITE_URL + "/store/advisor/"),
    ])
    return shell(
        title="Pool Chemistry Advisor | Palatial Pools Online Store",
        description="Enter your pool size and water readings — Palatial Pools' Chemistry Advisor calculates the exact doses and adds the right products to your cart.",
        canonical_path="/store/advisor/",
        body=body,
        jsonld=seo.serialize_jsonld([bc]),
        active="/store/advisor/",
    )


def render_fitment():
    body = textwrap.dedent("""\
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="/store/">Store</a>
          <span class="sep">›</span>
          <span class="current">Fitment Checker</span>
        </nav>

        <section class="page-hero">
          <div class="eyebrow">Smart Tool · Fitment Checker</div>
          <h1>The right part, first time.</h1>
          <p>Type your equipment make and model — we'll show only the parts confirmed to fit. No more wrong cartridges, wrong cells or wrong gaskets.</p>
        </section>

        <div class="wizard" data-fitment-root>
          <div class="wizard-step"><span class="n">1</span> Your equipment</div>
          <div class="form-grid">
            <div class="field"><label for="fit-brand">Brand</label>
              <select id="fit-brand">
                <option value="">Any brand</option>
                <option>Astral</option><option>Davey</option><option>Pentair</option>
                <option>Waterco</option><option>Zodiac</option><option>Hayward</option>
                <option>Hurlcon</option><option>Quiptron</option>
              </select></div>
            <div class="field"><label for="fit-model">Model number or family</label>
              <input id="fit-model" placeholder="e.g. eQuilibrium 25, MC25C, IC25, ZX100" />
              <span class="hint">Tip: the model is usually printed on the controller / housing.</span></div>
          </div>
          <div style="margin-top:1.2rem;display:flex;gap:.6rem;flex-wrap:wrap">
            <button class="btn btn-primary" data-fitment-run type="button">Find compatible parts</button>
            <button class="btn btn-ghost" data-fitment-reset type="button">Reset</button>
          </div>
          <div data-fitment-result hidden style="margin-top:1.4rem"></div>
        </div>

        <section class="info-panel" style="margin-top:2rem">
          <h3>Equipment too old to find a match?</h3>
          <p>Send a photo of the model plate to <a href="mailto:[REDACTED]">[REDACTED]</a> — we maintain a private fitments database from twenty years of Melbourne installs and can usually identify a replacement within an hour.</p>
        </section>
        """)
    bc = seo.jsonld_breadcrumbs([
        ("Home", SITE_URL + "/"), ("Store", SITE_URL + "/store/"),
        ("Fitment Checker", SITE_URL + "/store/fitment/"),
    ])
    return shell(
        title="Pool Equipment Fitment Checker | Palatial Pools Online Store",
        description="Enter your pool equipment make and model — Palatial Pools' Fitment Checker shows only the parts confirmed to fit.",
        canonical_path="/store/fitment/",
        body=body,
        jsonld=seo.serialize_jsonld([bc]),
        active="/store/fitment/",
    )


def render_pantry(products):
    pantry_items = [p for p in products if p.get("subscribe")]
    cards = "\n          ".join(product_card_html(p) for p in pantry_items)
    body = textwrap.dedent(f"""\
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="/store/">Store</a>
          <span class="sep">›</span>
          <span class="current">Pool Pantry</span>
        </nav>

        <section class="page-hero">
          <div class="eyebrow">Subscription · Pool Pantry</div>
          <h1>Never run out of the basics.</h1>
          <p>Quarterly auto-replenishment for chlorine, pH balancers, mineral salts and algaecide. Set it once and we deliver in line with your service visits. Pause, skip or cancel by contacting the Abbotsford team.</p>
          <div style="margin-top:1.25rem;display:flex;gap:.7rem;flex-wrap:wrap">
            <a class="btn btn-primary" href="#available">See what's on Pantry</a>
            <a class="btn btn-ghost" href="/store/about/">Delivery &amp; pickup</a>
          </div>
        </section>

        <div class="split-2">
          <div class="info-panel">
            <h3>How Pool Pantry works</h3>
            <ul>
              <li><strong>Pick your essentials.</strong> Tick the Pool Pantry box on any eligible product page.</li>
              <li><strong>We watch your pool.</strong> Service customers get dose-aware deliveries — we skip a shipment if your readings say you don't need it yet.</li>
              <li><strong>You stay in control.</strong> Pause, swap a product, or cancel through the Abbotsford team.</li>
              <li><strong>5% Pantry pricing.</strong> Subscribed items are 5% off the list price.</li>
            </ul>
          </div>
          <div class="info-panel">
            <h3>Why a real shop is the difference</h3>
            <p>Pool Pantry isn't a black-box subscription. Every order goes through the same Abbotsford counter our techs walk past every morning, so any anomaly — a bucket short, a manufacturer recall, a chemistry update — gets a human eye before it leaves the shop.</p>
          </div>
        </div>

        <h2 class="section-title" style="margin-top:2.5rem" id="available">Pool Pantry products <small>{len(pantry_items)} eligible</small></h2>
        <div class="product-grid">
          {cards}
        </div>
        """)
    bc = seo.jsonld_breadcrumbs([
        ("Home", SITE_URL + "/"), ("Store", SITE_URL + "/store/"),
        ("Pool Pantry", SITE_URL + "/store/pantry/"),
    ])
    return shell(
        title="Pool Pantry — Auto-replenish pool chemicals | Palatial Pools",
        description="Quarterly auto-replenishment for chlorine, pH balancers, salts and algaecide. 5% off Pantry pricing, with simple pause, skip or cancel requests.",
        canonical_path="/store/pantry/",
        body=body,
        jsonld=seo.serialize_jsonld([bc]),
        active="/store/pantry/",
    )


def render_trade():
    body = textwrap.dedent("""\
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="/store/">Store</a>
          <span class="sep">›</span>
          <span class="current">Trade Portal</span>
        </nav>

        <section class="page-hero">
          <div class="eyebrow">B2B · Trade Portal</div>
          <h1>Pool techs, builders, hotels &amp; strata.</h1>
          <p>Apply for a Palatial trade account and get tiered pricing, account billing, tax invoices on demand, and priority on stock that everyone else has to wait for.</p>
        </section>

        <div class="split-2">
          <div class="info-panel">
            <h3>Tier 1 · Pool Tech</h3>
            <ul>
              <li>5–10% off the consumer list price across chemicals and accessories.</li>
              <li>30-day account billing.</li>
              <li>Reserved stock during summer peak.</li>
              <li>White-labelled delivery (no Palatial signage on your customer doorstep).</li>
            </ul>
            <p style="margin-top:.5rem"><span class="pill pill-trade">Eligible: licensed pool techs &amp; builders</span></p>
          </div>
          <div class="info-panel">
            <h3>Tier 2 · Commercial &amp; Strata</h3>
            <ul>
              <li>10–18% off list price on bulk chemicals.</li>
              <li>Quarterly site assessments included.</li>
              <li>Documented chemical-handling SOP for your operations manual.</li>
              <li>Direct line to a dedicated account manager.</li>
            </ul>
            <p style="margin-top:.5rem"><span class="pill pill-trade">Eligible: hotels, gyms, schools, strata</span></p>
          </div>
        </div>

        <div class="wizard" style="margin-top:2rem" data-trade-form>
          <h2>Apply for a trade account</h2>
          <p class="lead">We approve most applications within one business day.</p>
          <div class="form-grid">
            <div class="field"><label for="t-biz">Business name</label><input id="t-biz" required></div>
            <div class="field"><label for="t-abn">ABN</label><input id="t-abn" placeholder="11 digits"></div>
            <div class="field"><label for="t-name">Contact name</label><input id="t-name" required></div>
            <div class="field"><label for="t-email">Email</label><input id="t-email" type="email" required></div>
            <div class="field"><label for="t-phone">Phone</label><input id="t-phone" type="tel" required></div>
            <div class="field"><label for="t-tier">Apply for tier</label>
              <select id="t-tier"><option value="tech">Tier 1 · Pool Tech</option><option value="comm">Tier 2 · Commercial &amp; Strata</option></select></div>
            <div class="field full"><label for="t-notes">Tell us about your work</label><textarea id="t-notes" rows="3" placeholder="Typical volume / pools serviced / clients you work with"></textarea></div>
          </div>
          <div style="margin-top:1.2rem;display:flex;gap:.6rem;flex-wrap:wrap">
            <button class="btn btn-primary" type="button" data-trade-submit>Submit application</button>
            <a class="btn btn-ghost" href="/palatial-link/">Existing customer? Sign in</a>
          </div>
        </div>
        """)
    bc = seo.jsonld_breadcrumbs([
        ("Home", SITE_URL + "/"), ("Store", SITE_URL + "/store/"),
        ("Trade Portal", SITE_URL + "/store/trade/"),
    ])
    return shell(
        title="Trade Portal | Wholesale pool supplies for pool techs & commercial | Palatial Pools",
        description="Apply for a Palatial Pools trade account — tiered pricing for pool techs, builders, hotels and strata. 30-day billing, reserved stock, priority delivery.",
        canonical_path="/store/trade/",
        body=body,
        jsonld=seo.serialize_jsonld([bc]),
        active="/store/trade/",
    )


def render_transparency():
    body = textwrap.dedent("""\
        <nav class="crumbs" aria-label="Breadcrumb">
          <a href="/store/">Store</a>
          <span class="sep">›</span>
          <span class="current">Transparency</span>
        </nav>

        <section class="page-hero">
          <div class="eyebrow">Public transparency</div>
          <h1>Useful intelligence without exposing private methods.</h1>
          <p>Palatial Pools uses seasonal context, catalogue metadata and customer-approved analysis tools to reduce guesswork. These public notes explain the shape of the system without publishing trade secrets, customer records or internal operating methods.</p>
        </section>

        <div class="split-2">
          <article class="info-panel transparency-card">
            <span class="doc-type">Technical brief</span>
            <h3>Predictive Pool Care</h3>
            <p>How seasonal signals, public catalogue data and opt-in diagnostics become helpful next steps for customers.</p>
            <div class="doc-actions">
              <a class="btn btn-primary btn-sm" href="/documents/predictive-pool-care-technical-brief.html">Read accessible HTML</a>
              <a class="btn btn-ghost btn-sm" href="/documents/predictive-pool-care-technical-brief.pdf">Download PDF</a>
            </div>
          </article>
          <article class="info-panel transparency-card">
            <span class="doc-type">Release notes</span>
            <h3>Public Security Controls</h3>
            <p>A plain-English summary of the public release posture, privacy controls, security headers and publishing checklist.</p>
            <div class="doc-actions">
              <a class="btn btn-primary btn-sm" href="/documents/palatial-public-release-security-notes.html">Read accessible HTML</a>
              <a class="btn btn-ghost btn-sm" href="/documents/palatial-public-release-security-notes.pdf">Download PDF</a>
            </div>
          </article>
        </div>

        <section class="info-panel" style="margin-top:2rem">
          <h3>Boundaries we keep public</h3>
          <ul>
            <li>OpenAI-class analysis is limited to bounded diagnostic workflows such as chemistry, image or video interpretation.</li>
            <li>The public site does not provide a live AI chatbot.</li>
            <li>Customer history stays in authenticated Palatial Link and staff-only Synapse surfaces.</li>
            <li>Public documents avoid proprietary scoring formulae, supplier secrets and procedures that would be easy to copy or misuse.</li>
          </ul>
        </section>
        """)
    bc = seo.jsonld_breadcrumbs([
        ("Home", SITE_URL + "/"), ("Store", SITE_URL + "/store/"),
        ("Transparency", SITE_URL + "/store/transparency/"),
    ])
    return shell(
        title="Predictive Pool Care Transparency | Palatial Pools Store",
        description="Public transparency notes for Palatial Pools predictive pool care, security controls and privacy-safe analysis features.",
        canonical_path="/store/transparency/",
        body=body,
        jsonld=seo.serialize_jsonld([bc]),
    )


# ─────────────── Sitemap ───────────────

EXTRA_PAGES = [
    "/store/cart/", "/store/checkout/", "/store/order-confirmation/",
    "/store/account/", "/store/about/", "/store/search/",
    "/store/advisor/", "/store/fitment/", "/store/pantry/",
    "/store/trade/", "/store/transparency/",
]


def write_store_sitemap(categories, products):
    """Write a dedicated store sitemap (referenced from the main sitemap)."""
    rows = seo.sitemap_entries(products, categories, EXTRA_PAGES)
    body = (
        '<?xml version="1.0" encoding="UTF-8"?>\n'
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n'
        + "\n".join("  " + r for r in rows)
        + "\n</urlset>\n"
    )
    (STORE / "sitemap.xml").write_text(body, encoding="utf-8")


# ─────────────── Writer ───────────────

def write(rel: str, content: str) -> None:
    p = ROOT / rel
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")
    print(" wrote", rel)


def main():
    categories, products = load_catalogue()
    write("store/index.html", render_home(categories, products))
    for c in categories:
        write(f"store/{c['slug']}/index.html", render_category(c, products))
    for p in products:
        write(f"store/product/{p['slug']}/index.html",
              render_product(p, categories, products))
    write("store/cart/index.html", render_cart())
    write("store/checkout/index.html", render_checkout())
    write("store/order-confirmation/index.html", render_order_confirmation())
    write("store/account/index.html", render_account())
    write("store/about/index.html", render_about())
    write("store/search/index.html", render_search())
    write("store/advisor/index.html", render_advisor())
    write("store/fitment/index.html", render_fitment())
    write("store/pantry/index.html", render_pantry(products))
    write("store/trade/index.html", render_trade())
    write("store/transparency/index.html", render_transparency())

    write_store_sitemap(categories, products)
    print("\n✓ Generated", len(products), "products and store sitemap.")


if __name__ == "__main__":
    main()
