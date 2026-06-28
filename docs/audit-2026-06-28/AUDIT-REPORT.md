# Palatial Pools Website — Audit Report

**Date:** 28 June 2026
**Branch audited:** `cursor/audit-status-c9e8` (from `main` @ `4f7b5f0`)
**Local environment:** Next.js 16.2.6 dev server on `http://localhost:3000`, Node 20.x
**Production sanity-check target:** `https://www.palatialpools.com.au/`
**Tooling:** curl, Puppeteer-core driving Google Chrome 148 headless, eslint, tsc, next build
**Previous audit reference:** `/AUDIT-REPORT.md` dated 15 May 2026

---

## Executive summary

| Area | Status | Δ vs 15 May 2026 audit |
|------|--------|------------------------|
| Build / lint / typecheck | PASS | unchanged |
| Homepage HTTP delivery | PASS (200, 12,813 B) | unchanged |
| Suburb / service landing pages (53 dirs, 89 sitemap entries) | PASS — sampled 10, all HTTP 200 | unchanged |
| Cartridge Finder (`/cartridge-finder/`) | **FIXED** — assets now resolved | was BROKEN |
| Sitemap hostname | **FIXED** — `https://www.palatialpools.com.au` | was `beta.` |
| `/technology` dead link (was 63 pages) | **FIXED** — 0 references in HTML | was BROKEN |
| `/services` dead link (was 3 pages) | **FIXED** — 0 references in HTML | was BROKEN |
| Five widely-referenced asset files (pp-nav.js, palatial-animations.css, palatial-chatbox.js, palatial-scroll-reveal.js, pp-mobile.css) | **CRITICAL — 404 in repo *and* production** | NEW / regression |
| `/careers` link still in React SPA bundle | OPEN | unchanged |
| E-commerce remnants in repo (`db/schema.sql`, `scripts/build_store.py`, `scripts/ingest_supplier.py`, `assets/store/*`, two `docs/shop-*.md`) | **NEW — contradicts `.cursorrules` "ABSOLUTE PROHIBITION"** | NEW finding |
| `/shop` and `/store` external redirects | PASS in this repo (Next.js `redirects()`); production serves a static "visit our shop" landing page that links out — both acceptable | unchanged |
| Headless screenshot of homepage React SPA | FAILS — renderer hangs on `Page.captureScreenshot`; HTML is fine, see "Notable observations" | NEW |
| `AGENTS.md` accuracy | Drift — file references `assets/pp-nav.js` and `assets/pp-fixes.js` as core scripts; only `pp-fixes.js` exists | NEW |

---

## Method

1. Created branch `cursor/audit-status-c9e8`, installed deps (`npm ci`), ran `next dev`.
2. Hit 59 representative URLs with `curl` (max-redirs 0) to confirm status codes and redirect targets.
3. Captured desktop (1440×900) and mobile (430×932, DPR 2) Puppeteer screenshots of 24 representative pages, recording per-page console errors and failed-request URLs into `docs/audit-2026-06-28/audit-data.json`.
4. Aggregated failed-request URLs across all captured pages to find systematic 404s.
5. Spot-checked production HTTP status for the homepage, a suburb page, `/cartridge-finder/`, `/shop`, and the five candidate 404 assets.
6. Ran `npm run lint`, `npm run typecheck`, `npm run build`.
7. Cross-referenced repo state against `.cursorrules` and `AGENTS.md`.

All 46 screenshots are saved under `docs/audit-2026-06-28/screenshots/`. Raw per-page data is in `docs/audit-2026-06-28/audit-data.json`.

---

## Critical findings

### C1. Five widely-referenced site-wide assets are 404 (in repo *and* production)

Every suburb / service / guide page references a shared "luxury" theme bundle via absolute paths under `/assets/`. None of these files exist in the repo (none have ever been committed — `git log` on each is empty), and a live `curl` to `https://www.palatialpools.com.au/assets/<file>` returns HTTP 404 (2,482 B nginx 404 body).

| Asset | Pages referencing | Repo status | Production HTTP |
|-------|-------------------|-------------|------------------|
| `/assets/pp-nav.js` | 73 | missing | 404 |
| `/assets/pp-mobile.css` | 73 | missing | 404 |
| `/assets/palatial-animations.css` | 77 | missing | 404 |
| `/assets/palatial-scroll-reveal.js` | 76 | missing | 404 |
| `/assets/palatial-chatbox.js` | 76 | missing | 404 |

**User-visible impact:**

- No universal navigation behaviour from `pp-nav.js` on 73 pages (suburbs, guides, several tools, calculators, etc.). Pages render their fallback inline navigation, so they are not "broken" per se, but the universal nav promised in `AGENTS.md` is not present anywhere except via `pp-fixes.js` (which patches only the React SPA homepage).
- No site-wide chat widget (`palatial-chatbox.js`) on those pages — the chat affordance is only present where its inline script is included or where the React SPA renders it.
- No `palatial-animations.css` styling and no scroll-reveal behaviour on the 76–77 pages that import them.
- Each affected page generates 4–5 network 404s on every load. In the captured sample, this produced 186 of the 207 total console errors.

**Recommended fix:** Decide whether these assets should ship from this repo (commit them to `assets/`) or whether the references should be removed/rewritten to point at the actual asset URL (e.g. a CDN). `AGENTS.md` lines 49–51 already imply `assets/pp-nav.js` is a first-class repo asset — that statement is currently false.

### C2. E-commerce code in repo contradicts `.cursorrules`

`.cursorrules` declares an "ABSOLUTE PROHIBITION — No e-commerce in this repo" and forbids cart / checkout / payment / shop modules. The following items are inconsistent with that rule:

- `db/schema.sql` — defines `shop_users`, `shop_addresses`, `account_role`, `order_status`, `payment_method_kind`, `fulfilment_method`, and related e-commerce tables.
- `scripts/build_store.py` — page-generator for storefront under `/store/`, references `store/_catalogue.yaml` (file no longer present, so the script can no longer run from the repo).
- `scripts/ingest_supplier.py` — supplier-product ingest pipeline that writes into the storefront, references `/admin/store/ingest/`.
- `assets/store/` — 152 KB of storefront UI (`catalog.js`, `store.js`, `store.css`, `products/*.svg`). Not referenced by any in-repo HTML (no `/store/` directory exists).
- `assets/main-nav-shop.js` — navigation script with in-store cart behaviour.
- `docs/shop-platform-build-blueprint.md`, `docs/shop-production-runbook.md` — design and deploy docs for a Next.js + Postgres + Stripe shop platform that the rules say must live at `palatial.store` only.

These artefacts are dead weight at best and a future-merge hazard at worst. Recommendation: remove them or move them to a separate repo. The runtime side of this rule is already enforced (the Next.js config redirects `/shop` and `/store` off-site).

### C3. Headless screenshot of the homepage React SPA hangs the renderer

Every other captured page (23 of 24) screenshot successfully. The homepage at `/` consistently times out at `Page.captureScreenshot` in headless Chrome 148, with or without third-party requests (fonts, analytics, weather, plausible, formspree, googleapis) blocked, with or without `prefers-reduced-motion`, in both `--headless` and `--headless=new` modes. Direct `google-chrome --screenshot` with `--virtual-time-budget=5000` also times out (exit 124).

- The page itself returns HTTP 200 and valid HTML in 12,813 bytes (size matches production within ~300 bytes).
- The React SPA bundle is `assets/index-DBPKiZmC.js` (720 KB).
- Loading with `setJavaScriptEnabled(false)` succeeds — see `home-noscript.{desktop,mobile}.png` for the HTML/CSS-only baseline.

This suggests the production SPA bundle keeps the compositor busy indefinitely under headless conditions (e.g. unthrottled rAF, infinite scroll-trigger, or perpetual layout work). In a real browser users will see the page render, but this is worth investigating because it also blocks any automated visual regression or Lighthouse run.

---

## Resolved findings from the May 2026 audit

| # | May 2026 finding | June 2026 status |
|---|------------------|------------------|
| 1 | `/cartridge-finder/` blank page (asset paths wrong, missing `__manus__/debug-collector.js`) | FIXED. Asset paths now `/cartridge-finder/assets/...`. `cartridge-finder/__manus__/debug-collector.js` is present and returns 200. Page screenshot renders the full UI. |
| 2 | `/technology` link in 63 pages | FIXED. `grep -rl 'href="/technology'` over `*.html` returns 0 files. |
| 3 | `/services` link in 3 pages | FIXED. 0 files. |
| 4 | `/careers` link in homepage React SPA | OPEN. The substring `careers` is still present in `assets/index-DBPKiZmC.js`, but the route is not present in the repo. Rebuild the SPA or add the page. |
| 5 | Pool Volume Calculator — Google Maps Places deprecation | NOT RE-TESTED at API level (no API key locally). UI still loads HTTP 200, see `pool-volume-calculator.{desktop,mobile}.png`. Migration to the new Place class is still recommended. |
| 6–7 | Store SPA navigation / `history.pushState` wrappers | N/A — no in-repo store. The shop redirect lives in `next.config.mjs`. The five remaining `history.pushState` wrappers across `pp-fixes.js`, `weather-widget.js`, `pp-brand-fixes.js`, `tracker.js`, etc. are still present where those scripts ship. |
| 8 | Duplicate analytics pipelines | UNCHANGED. `assets/tracker.js` and `assets/pp-fixes.js`'s beacon function both still ship. |
| 9 | `flyio-homepage.html` references missing script | N/A — file not present in repo. |
| 10 | Sitemap uses `beta.` hostname | FIXED. `sitemap.xml` now uses `https://www.palatialpools.com.au` for all 89 `<loc>` entries. |

---

## Notable observations (lower severity)

- **Plausible analytics not configured.** The inline script in `index.html` calls `plausible('custom-pageview', ...)` but no `<script>` ever defines the real `window.plausible`; the queued events stay in the in-memory `q[]` and are never delivered. Either remove the inline call or load `plausible.js`.
- **Third-party host dependencies that hang locally.** Pages reference `https://pulse.palatialpools.com.au/api/public/track` (28 hits in the captured sample). Offline / sandboxed environments will see this fail. Consider an env-aware no-op shim in `tracker.js`.
- **Trailing-slash 308 redirects on every directory page.** Next.js dev server redirects `/faq/` → `/faq`, then serves `faq/index.html`. Production nginx behaves the opposite way. This is consistent and harmless for users (browsers follow the redirect) but means every directory URL costs an extra hop in dev.
- **AGENTS.md drift.** Lists `assets/pp-nav.js` as a homepage script. The file is missing (see C1). `pp-fixes.js` is the only homepage script of those listed that exists in the repo.
- **AGENTS.md `npm run lint` scope.** `eslint src` only lints the Next.js thin shell (3 files). 70+ legacy HTML pages and their inline scripts are not under any linter. Worth noting as scope, not a defect.
- **`assets/index-gold.js`, `assets/index-gold.css`, `assets/dustin-chat.js`** — present in repo, not referenced by any current HTML (grep returns 0 matches). Candidates for removal, matches May 2026 audit recommendation #6.
- **`public/shop-assets/`** — 2 sub-directories (`documents/`, `images/`) of shop-related media. Not referenced by anything in the repo (only the now-absent `/store` would have used them).

---

## Detailed HTTP route check

Sample of 59 paths probed with `curl --max-redirs 0`. All directory-style paths return 308 to the trailing-slash-removed form, which then serves the page. The table below shows the final result after following redirects.

| Path | Final status | Notes |
|------|--------------|-------|
| `/` | 200 | React SPA homepage |
| `/index.html` | 200 | Same content via legacy fallback |
| `/sitemap.xml` | 200 | 89 `<loc>` entries, hostname OK |
| `/robots.txt` | 200 | |
| `/404.html` | 200 | Static 404 body (2.4 KB) |
| `/contact-palatial-pool-services/` | 200 | |
| `/faq/`, `/testimonials/`, `/privacy-policy/` | 200 | |
| `/pool-calculators/`, `/tools/`, `/tools/energy-calculator/`, `/tools/pool-cost-calculator/` | 200 | |
| `/blog/` | 200 | |
| 10 sampled suburb pages (kew, hawthorn, richmond, south-yarra, toorak, camberwell, balwyn, melbourne-pool-services, melbourne-pool-maintenance, melbourne-pool-heating) | 200 | |
| `/cartridge-finder/` and its assets | 200 / 200 / 200 | **was broken in May 2026** |
| `/pool-volume-calculator/` | 200 | Maps API deprecation still applies |
| `/pool-area-shield/`, `/pool-diagnostics/`, `/portal/`, `/track/`, `/palatial-link/`, `/palatial-project-gallery/`, `/palatial-service-area/`, `/synapse/`, `/admin/`, `/private/`, `/access/`, `/guides/`, `/docs/`, `/system-map/`, `/sitemap-visual/` | 200 | |
| `/technology` | 404 | No HTML references it anymore |
| `/services` | 404 | No HTML references it anymore |
| `/careers` | 404 | Still referenced from React SPA bundle |
| `/shop` | 308 → `https://palatial.store` | dev server; production serves a "visit our shop" landing |
| `/store` | 308 → `https://palatial.store` | as above |
| `/favicon.{ico,svg}`, `/apple-touch-icon.png`, `/palatial-logo-full.png` | 200 | |
| `/assets/pp-fixes.js` | 200 | 55 KB |
| `/assets/pp-nav.js` | 404 | **see C1** |

---

## Build / lint / typecheck

```
$ npm run lint
> eslint src
(no output, exit 0)

$ npm run typecheck
> tsc --noEmit
(no output, exit 0)

$ npm run build
…
✓ Compiled successfully in 1577ms
✓ Generating static pages using 3 workers (3/3) in 86ms
Route (app)
┌ ƒ /
├ ○ /_not-found
└ ƒ /[...legacy]
```

All three pass cleanly. A non-blocking turbopack warning recommends adding `/*turbopackIgnore: true*/` to dynamic imports in `src/app/[...legacy]/route.ts`; the same suppression already exists in `src/app/route.ts`.

---

## Console-error / failed-request aggregation

Across the 24 pages screenshot-captured (48 page loads, desktop + mobile), aggregated count of distinct failed network requests:

| # | URL |
|---|-----|
| 42 | `http://localhost:3000/assets/palatial-animations.css` |
| 40 | `http://localhost:3000/assets/palatial-chatbox.js` |
| 40 | `http://localhost:3000/assets/palatial-scroll-reveal.js` |
| 28 | `https://pulse.palatialpools.com.au/api/public/track` (DNS in this env) |
| 28 | `http://localhost:3000/assets/pp-mobile.css` |
| 28 | `http://localhost:3000/assets/pp-nav.js` |

Top console messages:

| # | Message |
|---|---------|
| 186 | `Failed to load resource: the server responded with a status of 404 (Not Found)` |
| 14 | `Failed to load resource: net::ERR_NAME_NOT_RESOLVED` |
| 7 | `Failed to load resource: the server responded with a status of 404 ()` |

i.e. 186 of 207 captured console errors stem directly from finding C1.

---

## Recommendations (priority order)

1. **Commit the five missing assets, or rewrite the references.** This is the highest-leverage fix in the repo today: it cleans 186 console errors on every page load and restores the universal navigation / chat / animation behaviour those pages were designed for.
2. **Decide on the e-commerce remnants.** Either delete `db/schema.sql`, `scripts/build_store.py`, `scripts/ingest_supplier.py`, `assets/store/`, `assets/main-nav-shop.js`, `public/shop-assets/`, `docs/shop-*.md`, and `assets/index-gold*` / `assets/dustin-chat.js` (matches the spirit of `.cursorrules`), or restate `.cursorrules` to permit them as historical references. As-is, they violate the project's own published constraints.
3. **Rebuild or patch the React SPA** so that `/careers` is no longer linked from the footer, and (separately) investigate the headless-render hang that prevents automated screenshots/Lighthouse.
4. **Migrate Google Maps Places API** in `/pool-volume-calculator/` — still on the deprecated `Autocomplete` class.
5. **Reconcile `AGENTS.md`** with the actual repo contents (notably the claim about `assets/pp-nav.js`).
6. **Either configure Plausible or remove the dead inline call** in `index.html`.
7. **Long-tail cleanup** — remove the duplicate analytics pipeline (`tracker.js` vs `pp-fixes.js` beacons) and consolidate the five remaining `history.pushState` wrappers.

---

## Artefacts

- `docs/audit-2026-06-28/AUDIT-REPORT.md` — this document.
- `docs/audit-2026-06-28/audit-data.json` — per-page Puppeteer capture data (status, console errors, failed requests).
- `docs/audit-2026-06-28/screenshots/*.png` — 46 PNGs, desktop + mobile pairs for 23 pages plus the homepage no-script baseline. See `screenshots/INDEX.md` for the gallery.
