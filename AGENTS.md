# Palatial Pools Website — Agent Instructions

See `.cursorrules` for project overview, naming conventions, and critical rules.

## Cursor Cloud specific instructions

### Dev server

Marketing site: static HTML served through a thin Next.js legacy fallback.

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. The homepage is the pre-built React SPA in `index.html` + `assets/index-*.js`. Suburb pages, blog, FAQ, and tools are standalone HTML files via `[...legacy]/route.ts`.

`/shop` and `/store` redirect to `https://palatial.store` — there is no in-repo store.

### Lint / Test / Build

```bash
npm run lint
npm run typecheck
npm run build
```

No automated test runner. Validate key pages in a browser after edits.

### Do not add to this repo

E-commerce, cart, checkout, product catalogues, or shop API routes. Store lives at **palatial.store** only.

### VPS-only backends (not in this repo)

- `/api/login`, `/api/health` — Palatial Link authentication
- `/api/analyse-pool`, `/api/pool-diagnostics` — AI pool tools
- `/cms-api/` — Decap CMS / GrapesJS editor backend
- Live Synapse staff dashboard (VPS; `/synapse/` here is static marketing only)

### Homepage scripts

- `assets/pp-nav.js` — universal nav (Shop links externally to palatial.store; no cart)
- `assets/pp-fixes.js` — marketing patches for the React SPA homepage
- Do **not** re-add `pp-mobile-spa.js` (store tile injection) or homepage free-tools injection
