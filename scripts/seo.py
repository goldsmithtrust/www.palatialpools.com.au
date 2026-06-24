"""
Auto-SEO generator for the Palatial Pools online store.

Given a product / category / page record, produce:
  - SEO title (within 60 chars, with brand + suburb context)
  - Meta description (within 160 chars, action-oriented, AU English)
  - Long-tail keyword list (suburb × intent × product variations)
  - JSON-LD blocks (Product, Offer, BreadcrumbList, FAQPage,
    AggregateRating where appropriate)
  - Internal cross-link suggestions (related products, related
    suburb pages, related blog posts)
  - Sitemap entries

The intent is that authoring a new product only requires the supplier
data — every SEO field that isn't manually set will be synthesised by
this module and look like a copywriter wrote it.
"""

from __future__ import annotations

import json
import re
import textwrap
from typing import Iterable

SITE_URL = "https://palatialpools.com.au"
BRAND = "Palatial Pools"

# Top suburbs we already rank for / want to rank for (mirrors
# directory layout in the repo).
SUBURBS = [
    "Melbourne", "Abbotsford", "Richmond", "Kew", "Hawthorn", "Camberwell",
    "Toorak", "South Yarra", "Balwyn", "Northcote", "Fitzroy", "Carlton",
    "Templestowe", "Doncaster", "Box Hill", "Bulleen", "Ivanhoe",
    "Heidelberg", "Eaglemont", "Rosanna", "Macleod", "Preston",
]

# Intent → wording variants the auto-keyword expander cycles through.
INTENT_TEMPLATES = [
    "{q} {suburb}",
    "{q} in {suburb}",
    "buy {q} {suburb}",
    "{q} delivery {suburb}",
    "{q} near {suburb}",
    "{q} for sale {suburb}",
]

CHAR_TITLE_MAX = 60
CHAR_DESC_MAX  = 160


def _truncate(s: str, limit: int) -> str:
    s = re.sub(r"\s+", " ", s).strip()
    if len(s) <= limit: return s
    cut = s[:limit].rsplit(" ", 1)[0]
    return cut.rstrip(",.;:– -") + "…"


# ───────────────────────── Title / description ─────────────────────────

def seo_title_for_product(p: dict, cat: dict) -> str:
    """SEO title pattern: `<name> | <category> in Melbourne | <brand>`."""
    if p.get("seo_title"): return p["seo_title"]
    pieces = [p["name"], cat["name"] + " in Melbourne", BRAND]
    full = " | ".join(pieces)
    return _truncate(full, CHAR_TITLE_MAX) if len(full) > CHAR_TITLE_MAX else full


def seo_description_for_product(p: dict, cat: dict) -> str:
    """Action-oriented meta description in Australian English."""
    if p.get("seo_description"): return p["seo_description"]
    short = (p.get("short") or "").rstrip(". ")
    pieces = [
        short,
        f"In stock at our Abbotsford shop; delivery across Melbourne.",
    ]
    if p.get("install", {}).get("available"):
        pieces.insert(1, "Optional licensed install.")
    full = " ".join(pieces)
    return _truncate(full, CHAR_DESC_MAX)


def seo_title_for_category(c: dict) -> str:
    return _truncate(
        f"{c['name']} in Melbourne | Buy Online | {BRAND}", CHAR_TITLE_MAX
    )


def seo_description_for_category(c: dict) -> str:
    base = c.get("blurb") or c.get("tagline") or ""
    return _truncate(
        f"Shop {c['name'].lower()} for your Melbourne pool. {base}", CHAR_DESC_MAX
    )


# ───────────────────────── Keyword expansion ─────────────────────────

def keyword_seeds_for_product(p: dict, cat: dict) -> list[str]:
    """Base seed terms an expander multiplies by suburb × intent."""
    seeds: list[str] = []
    name = p["name"]
    seeds.append(name.lower())
    seeds.append(f"{cat['name'].lower()}")
    if p.get("brand"): seeds.append(f"{p['brand'].lower()} {cat['slug']}")
    for f in p.get("keywords") or []: seeds.append(f.lower())
    # Common chemistry-customer searches
    if cat["slug"] == "chemicals":
        seeds += ["pool chemical delivery", "pool chemicals melbourne"]
    if cat["slug"] == "equipment":
        seeds += ["pool equipment supplier", "pool equipment install"]
    if cat["slug"] == "parts":
        seeds += ["pool spare parts", "pool repair parts"]
    return list(dict.fromkeys(seeds))


def expand_keywords(seeds: Iterable[str], *, max_terms: int = 40) -> list[str]:
    out: list[str] = []
    for seed in seeds:
        for suburb in SUBURBS[:6]:
            for tpl in INTENT_TEMPLATES[:3]:
                out.append(tpl.format(q=seed, suburb=suburb))
                if len(out) >= max_terms: return out
    return out


# ───────────────────────── FAQ synthesis ─────────────────────────

def auto_faqs(p: dict, cat: dict) -> list[dict]:
    """
    Synthesise 3–5 FAQ entries from the product's attributes.

    These are deterministic — the same product always produces the same
    FAQs. The goal is to give Google a FAQPage rich-snippet hook on
    every PDP without copywriter effort.
    """
    if p.get("faq"): return list(p["faq"])
    faqs: list[dict] = []
    name = p["name"]
    sku = p.get("sku", "")
    dose = p.get("specs", {}).get("Dose rate")
    suits = p.get("specs", {}).get("Suitable for")

    faqs.append({
        "q": f"Does the {name} come in stock at the Abbotsford shop?",
        "a": ("Yes — every online order for this item is fulfilled by our "
              "13A 328 Johnston St, Abbotsford shop. We confirm stock and "
              "delivery (or pickup) before any payment is taken."),
    })

    if dose:
        faqs.append({
            "q": f"What is the recommended dose for {name}?",
            "a": (f"Recommended dose: {dose}. For an exact prescription "
                  "tailored to your pool, bring a 250ml water sample into our "
                  "Abbotsford shop for a free 7-point professional test, or "
                  "use the Pool Chemistry Advisor on our store."),
        })

    if cat["slug"] == "chemicals":
        faqs.append({
            "q": f"Is the {name} suitable for salt-chlorinated pools?",
            "a": ("This product is compatible with salt and mineral "
                  "chlorinated pools. Check the spec sheet for the full "
                  "compatibility list — and call our team on 03 4231 POOL "
                  "if you'd like us to confirm before you order."),
        })

    if p.get("fits"):
        models = ", ".join(p["fits"][:4])
        faqs.append({
            "q": f"Which equipment does {name} fit?",
            "a": (f"Confirmed fitments include {models}. Use the Fitment "
                  "Checker on our store to confirm your specific model, or "
                  "send us your equipment model and we'll verify before you buy."),
        })

    if p.get("install", {}).get("available"):
        ins = p["install"]
        faqs.append({
            "q": "Can a Palatial Pools technician install this for me?",
            "a": (f"Yes. We can install this for ${ins.get('price')} "
                  f"({ins.get('duration', '60–90 min')}). Choose the "
                  "service + supply bundle on the product page and our office "
                  "will call to confirm a time."),
        })

    if suits:
        faqs.append({
            "q": f"What surfaces and pool types is {name} suitable for?",
            "a": f"{suits}. If you're unsure, we're happy to advise — call us on 03 4231 POOL.",
        })

    faqs.append({
        "q": "How fast is delivery across Melbourne metro?",
        "a": ("Most Melbourne metro deliveries arrive within 1–2 business "
              "days. Pickup from our Abbotsford shop is free and usually "
              "available the same day."),
    })

    # Cap to 6 to stay within Google's rich-snippet sweet spot.
    seen, out = set(), []
    for f in faqs:
        if f["q"] not in seen and len(out) < 6:
            seen.add(f["q"]); out.append(f)
    return out


# ───────────────────────── JSON-LD ─────────────────────────

def jsonld_product(p: dict, cat: dict, image_url: str | None) -> dict:
    avail = {
        "in":  "https://schema.org/InStock",
        "low": "https://schema.org/LimitedAvailability",
        "out": "https://schema.org/OutOfStock",
    }.get(p.get("stock", "in"), "https://schema.org/InStock")

    out: dict = {
        "@context": "https://schema.org",
        "@type": "Product",
        "name": p["name"],
        "sku": p.get("sku"),
        "description": p["description"].strip(),
        "category": cat["name"],
        "brand": {"@type": "Brand", "name": p.get("brand") or BRAND},
        "offers": {
            "@type": "Offer",
            "url": f"{SITE_URL}/store/product/{p['slug']}/",
            "priceCurrency": "AUD",
            "price": f"{float(p['price']):.2f}",
            "availability": avail,
            "seller": {"@type": "Organization", "name": "Palatial Pool Services"},
            "areaServed": {"@type": "City", "name": "Melbourne"},
        },
    }
    if image_url: out["image"] = image_url
    if p.get("specs"):
        out["additionalProperty"] = [
            {"@type": "PropertyValue", "name": k, "value": v}
            for k, v in p["specs"].items()
        ]
    return out


def jsonld_breadcrumbs(items: list[tuple[str, str]]) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        "itemListElement": [
            {"@type": "ListItem", "position": i + 1, "name": name, "item": url}
            for i, (name, url) in enumerate(items)
        ],
    }


def jsonld_faqpage(faqs: list[dict]) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": [
            {
                "@type": "Question",
                "name": f["q"],
                "acceptedAnswer": {"@type": "Answer", "text": f["a"]},
            }
            for f in faqs
        ],
    }


def jsonld_itemlist(products: list[dict]) -> dict:
    return {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "itemListElement": [
            {
                "@type": "ListItem",
                "position": i + 1,
                "url": f"{SITE_URL}/store/product/{p['slug']}/",
                "name": p["name"],
            }
            for i, p in enumerate(products)
        ],
    }


def serialize_jsonld(blocks: list[dict]) -> list[str]:
    return [json.dumps(b, ensure_ascii=False) for b in blocks]


# ───────────────────────── Internal links ─────────────────────────

def related_products(p: dict, all_products: list[dict], *, limit: int = 4) -> list[dict]:
    """Same-category first; if too few, also pull adjacent categories."""
    same = [r for r in all_products if r["category"] == p["category"] and r["slug"] != p["slug"]]
    out = same[:limit]
    if len(out) < limit:
        more = [r for r in all_products if r["category"] != p["category"]]
        out += more[: limit - len(out)]
    return out


def suburb_link_block_html(per_row: int = 6) -> str:
    """Renders a discreet suburb cross-link strip for any /store/ page."""
    pieces = []
    for s in SUBURBS[: per_row * 2]:
        slug = s.lower().replace(" ", "-")
        # Map suburb name → actual repo path. Many exist already.
        for tail in ("pool-service", "pool-servicing", "pool-maintenance", "pool-cleaning"):
            pieces.append(
                f'<a href="/{slug}-{tail}/" '
                f'style="font-size:.76rem;color:rgba(241,245,249,0.55);'
                f'padding:.35rem .7rem;border:1px solid rgba(0,196,204,0.18);'
                f'border-radius:999px;text-decoration:none">{s}</a>'
            )
            break
    return (
        '<section class="info-panel" style="margin-top:2rem">'
        '<h3>Local pool care — Melbourne suburbs we deliver and service</h3>'
        '<div style="display:flex;flex-wrap:wrap;gap:.4rem;margin-top:.6rem">' +
        "".join(pieces) +
        "</div></section>"
    )


# ───────────────────────── Sitemap ─────────────────────────

def sitemap_entries(products: list[dict], categories: list[dict],
                    extra_pages: list[str]) -> list[str]:
    today = ""  # changefreq is more useful than lastmod for autogen pages
    rows = []
    rows.append(f"<url><loc>{SITE_URL}/store/</loc><changefreq>weekly</changefreq><priority>0.9</priority></url>")
    for c in categories:
        rows.append(
            f"<url><loc>{SITE_URL}/store/{c['slug']}/</loc>"
            f"<changefreq>weekly</changefreq><priority>0.8</priority></url>"
        )
    for p in products:
        rows.append(
            f"<url><loc>{SITE_URL}/store/product/{p['slug']}/</loc>"
            f"<changefreq>monthly</changefreq><priority>0.7</priority></url>"
        )
    for path in extra_pages:
        rows.append(
            f"<url><loc>{SITE_URL}{path}</loc>"
            f"<changefreq>monthly</changefreq><priority>0.6</priority></url>"
        )
    return rows
