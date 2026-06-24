#!/usr/bin/env python3
"""
Palatial Pools public asset sync manifest.

This script prepares a privacy-safe, deterministic JSON payload that a
downstream database importer can consume without scraping rendered pages.
It deliberately includes only public catalogue, document and seasonal
service metadata. Customer records, staff notes, route details and private
job methods are never emitted.
"""

from __future__ import annotations

import json
import re
from datetime import datetime, timezone
from pathlib import Path

import yaml  # type: ignore

ROOT = Path(__file__).resolve().parent.parent
CATALOGUE = ROOT / "store" / "_catalogue.yaml"
DATA_DIR = ROOT / "assets" / "data"
MANIFEST = DATA_DIR / "palatial-public-asset-sync.json"
CALENDAR = DATA_DIR / "palatial-service-calendar.json"
SITE_URL = "https://palatialpools.com.au"


PUBLIC_DOCS = [
    {
        "id": "predictive-pool-care-technical-brief",
        "title": "Predictive Pool Care Technical Brief",
        "html": "/documents/predictive-pool-care-technical-brief.html",
        "pdf": "/documents/predictive-pool-care-technical-brief.pdf",
        "audience": "public",
        "summary": "Explains the customer-facing intelligence model without exposing proprietary methods.",
    },
    {
        "id": "public-release-security-notes",
        "title": "Public Release Security Notes",
        "html": "/documents/palatial-public-release-security-notes.html",
        "pdf": "/documents/palatial-public-release-security-notes.pdf",
        "audience": "public",
        "summary": "Summarises privacy, security and publishing controls for public visitors.",
    },
]

SEASONAL_SERVICE_CALENDAR = [
    {
        "id": "spring-opening",
        "months": ["September", "October", "November"],
        "label": "Spring opening",
        "public_signal": "Algae, low sanitiser and dormant equipment are most common after winter.",
        "recommended_paths": ["/store/advisor/", "/tools/photo-diagnostics/", "/guides/green-pool-recovery/"],
        "job_types": ["green-pool-recovery", "water-test", "equipment-startup"],
    },
    {
        "id": "summer-stability",
        "months": ["December", "January", "February"],
        "label": "Summer stability",
        "public_signal": "Heat, UV and heavy bathing increase sanitiser demand and evaporation.",
        "recommended_paths": ["/store/chemicals/", "/store/pantry/", "/tools/chemical-dosage-calculator/"],
        "job_types": ["monthly-service", "chemical-balance", "pool-pantries"],
    },
    {
        "id": "autumn-equipment",
        "months": ["March", "April", "May"],
        "label": "Autumn equipment check",
        "public_signal": "Lower use makes it a good time to review filters, cells and pumps.",
        "recommended_paths": ["/store/fitment/", "/store/parts/", "/guides/pool-pump-guide/"],
        "job_types": ["filter-service", "chlorinator-cell-check", "pump-review"],
    },
    {
        "id": "winter-efficiency",
        "months": ["June", "July", "August"],
        "label": "Winter efficiency",
        "public_signal": "Reduced demand shifts attention to heating cost, leaks and circulation.",
        "recommended_paths": ["/tools/heating-cost-calculator/", "/melbourne-pool-heating/", "/melbourne-pool-spa-leak-detection/"],
        "job_types": ["heating-review", "leak-detection", "winter-balance"],
    },
]

PUBLIC_JOB_TYPE_SIGNALS = [
    {
        "id": "monthly-service",
        "display": "Regular pool servicing",
        "reflected_in": ["Palatial Link service history", "seasonal care calendar", "Pool Pantry prompts"],
        "privacy_level": "aggregated-job-type-only",
    },
    {
        "id": "water-test",
        "display": "Water testing and dosing",
        "reflected_in": ["Chemistry Advisor", "chemical shopping lists", "predictive care prompts"],
        "privacy_level": "customer-specific values stay inside Palatial Link",
    },
    {
        "id": "filter-service",
        "display": "Filter and media servicing",
        "reflected_in": ["Fitment Checker", "parts recommendations", "seasonal maintenance prompts"],
        "privacy_level": "aggregated-job-type-only",
    },
    {
        "id": "equipment-startup",
        "display": "Equipment startup and commissioning",
        "reflected_in": ["product fitment", "installation bundles", "calendar prompts"],
        "privacy_level": "aggregated-job-type-only",
    },
    {
        "id": "leak-detection",
        "display": "Leak detection",
        "reflected_in": ["service pages", "photo diagnostic triage", "winter efficiency prompts"],
        "privacy_level": "no property-specific evidence exposed",
    },
]


def load_catalogue() -> dict:
    with CATALOGUE.open("r", encoding="utf-8") as fh:
        return yaml.safe_load(fh) or {"categories": [], "products": []}


def product_asset(product: dict) -> dict:
    docs = [
        {
            "title": doc.get("title", ""),
            "kind": doc.get("kind", "pdf"),
            "file": doc.get("file", ""),
        }
        for doc in product.get("docs", []) or []
    ]
    return {
        "id": product["slug"],
        "sku": product.get("sku", ""),
        "name": product["name"],
        "category": product.get("category", ""),
        "brand": product.get("brand", ""),
        "public_url": f"/store/product/{product['slug']}/",
        "image": product.get("image", ""),
        "documents": docs,
        "stock_status": product.get("stock", "unknown"),
        "supports_auto_replenish": bool(product.get("subscribe")),
        "supports_install_bundle": bool(product.get("install", {}).get("available")),
        "database_targets": ["catalogue", "search_index", "fitment_index"]
        + (["replenishment_rules"] if product.get("subscribe") else [])
        + (["service_calendar"] if product.get("install", {}).get("available") else []),
    }


def category_asset(category: dict, products: list[dict]) -> dict:
    product_ids = sorted(p["slug"] for p in products if p.get("category") == category["slug"])
    return {
        "id": category["slug"],
        "name": category["name"],
        "public_url": f"/store/{category['slug']}/",
        "product_ids": product_ids,
        "summary": category.get("blurb", category.get("tagline", "")),
    }


def public_pages() -> list[dict]:
    pages = []
    for path in sorted(ROOT.glob("store/**/index.html")):
        rel = "/" + path.relative_to(ROOT).as_posix().replace("index.html", "")
        if "/store/product/" in rel:
            kind = "product"
        elif rel in {"/store/cart/", "/store/checkout/", "/store/order-confirmation/"}:
            kind = "transaction"
        else:
            kind = "storefront"
        pages.append({"url": rel, "kind": kind})
    return pages


def current_season_id(now: datetime) -> str:
    month_name = now.strftime("%B")
    for season in SEASONAL_SERVICE_CALENDAR:
        if month_name in season["months"]:
            return season["id"]
    return "summer-stability"


def build_manifest() -> dict:
    catalogue = load_catalogue()
    categories = catalogue.get("categories", [])
    products = catalogue.get("products", [])
    now = datetime.now(timezone.utc)
    generated = now.isoformat(timespec="seconds")

    return {
        "schema_version": "2026-05-public-asset-sync",
        "generated_at": generated,
        "site_url": SITE_URL,
        "privacy_model": {
            "scope": "public-safe static sync",
            "excludes": [
                "customer records",
                "staff-only job notes",
                "private route details",
                "supplier credentials",
                "proprietary scoring formulae",
            ],
        },
        "current_season": current_season_id(now),
        "database_targets": {
            "catalogue": "Products, categories, public docs and SEO URLs.",
            "calendar": "Seasonal service prompts and job-type reminders.",
            "intelligence": "Aggregated, public-safe signals for on-site recommendations.",
            "fitment": "Public product compatibility records only.",
        },
        "categories": [category_asset(c, products) for c in categories],
        "products": [product_asset(p) for p in products],
        "public_documents": PUBLIC_DOCS,
        "public_pages": public_pages(),
        "service_calendar": SEASONAL_SERVICE_CALENDAR,
        "job_type_signals": PUBLIC_JOB_TYPE_SIGNALS,
        "integrity": {
            "product_count": len(products),
            "category_count": len(categories),
            "document_count": len(PUBLIC_DOCS),
            "calendar_count": len(SEASONAL_SERVICE_CALENDAR),
        },
    }


def write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    text = json.dumps(data, ensure_ascii=False, indent=2, sort_keys=False)
    # Keep accidental double blank lines out of generated data.
    text = re.sub(r"\n{3,}", "\n\n", text)
    path.write_text(text + "\n", encoding="utf-8")


def main() -> None:
    manifest = build_manifest()
    write_json(MANIFEST, manifest)
    write_json(CALENDAR, {
        "schema_version": manifest["schema_version"],
        "generated_at": manifest["generated_at"],
        "current_season": manifest["current_season"],
        "service_calendar": manifest["service_calendar"],
        "job_type_signals": manifest["job_type_signals"],
    })
    print(f"wrote {MANIFEST.relative_to(ROOT)}")
    print(f"wrote {CALENDAR.relative_to(ROOT)}")
    print(
        "synced {product_count} products, {category_count} categories, "
        "{calendar_count} calendar windows".format(**manifest["integrity"])
    )


if __name__ == "__main__":
    main()
