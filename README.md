# www.palatialpools.com.au — Production Public Website

> **For Cursor agents and AI coding assistants: read this entire file before making any changes.**

---

## What This Repo Is

This is the **single source of truth** for the production public marketing website at [palatialpools.com.au](https://palatialpools.com.au). It contains the static files served directly by Nginx on the production server. There is no build step — changes to these files are deployed by copying them to the server web root.

This repo was created on 24 June 2026 as a clean snapshot of the working server version, after a user-directed reversal away from a previous development branch. **Do not reference or merge from any other repository.** This repo supersedes all prior versions.

---

## Server Details

| Property | Value |
|---|---|
| Server IP | `170.64.207.198` |
| Hostname | `palatial-link` |
| Web root | `/var/www/palatialpools` |
| Web server | Nginx (static file serving) |
| Domain | `palatialpools.com.au` / `www.palatialpools.com.au` |
| SSL | Let's Encrypt via Certbot |
| Nginx vhost | `/etc/nginx/sites-available/palatialpools` |

**Deploy method:** SSH as `root@170.64.207.198` (key auth), copy changed files to `/var/www/palatialpools/`, then run `systemctl reload nginx`.

---

## PRIORITY FIX ALREADY APPLIED — Admin Dashboard Overlay

### What was happening

The public homepage was displaying an **admin login dashboard** at the top of the screen, creating a full-screen purple/blue overlay that blocked the public marketing content. This was caused entirely by injected front-end code — **not** a server-side auth gate or Nginx middleware.

### Root cause (two components)

**1. Hardcoded admin bar in `index.html`**

A `<div class="palatial-staff-shortcuts">` block was injected at the bottom of `index.html`, just before `</body>`. It rendered a dark footer bar with an "Admin Dashboard" link pointing to `/admin`. This was the visible overlay element.

There was also an admin analytics `<script>` tag loading from `https://palatialpools.com.au/admin/api/analytics/script.js` in the `<head>`.

**2. Admin redirect wiring in `assets/pp-fixes.js`**

The `pp-fixes.js` helper script contained two functions that redirected users to admin routes:

- `transformPortalPage()` — wired the login form's `onsubmit` to redirect to `/admin`
- `fixPalatialLinkRedirect()` — patched `window.fetch` to redirect to `/admin/dashboard` after a successful `/auth/login` call

### Fix applied (24 June 2026)

Both components have been neutralised in this repo version:

- `index.html`: the `palatial-staff-shortcuts` div and the admin analytics script tag have been **removed entirely**.
- `assets/pp-fixes.js`: the `window.location.href = '/admin'` onsubmit redirect has been **commented out**, and `fixPalatialLinkRedirect()` has been given an **early `return`** at the top so it is a no-op.

### What must NEVER be re-introduced

- Any `palatial-staff-shortcuts` div or similar admin shortcut bar in `index.html`
- Any script tag loading from `/admin/api/...` in the public `index.html`
- Any `window.location.href` redirect to `/admin` or `/admin/dashboard` in any public-facing JS file
- Any auth gate, login wall, password prompt, or overlay on the homepage or any public route

**This is a PUBLIC marketing website. It must load directly with zero authentication requirements for all visitors.**

---

## What Does NOT Exist Here

- **`beta.palatialpools.com.au`** — this subdomain is dead. There is no DNS record for it. Do not reference it, do not create files for it, do not add Nginx vhosts for it.
- **Any backend or API server** — the site is 100% static files. The Nginx vhost includes a stub `/api/trpc/` location that returns empty JSON so the React SPA boots without errors, but there is no live backend.
- **Build pipeline** — there is no `npm run build` step. The `assets/index-DBPKiZmC.js` and `assets/index-uQZW5lly.css` are pre-built bundles. Do not attempt to rebuild them unless you have the full source project.

---

## Site Architecture

The site is a **React SPA** (Vite build) served as static files. Key files:

| File | Purpose |
|---|---|
| `index.html` | SPA entry point — the only HTML file served for all routes |
| `assets/index-DBPKiZmC.js` | Main React bundle (minified) |
| `assets/index-uQZW5lly.css` | Main stylesheet (minified) |
| `assets/pp-fixes.js` | Custom post-load JS patches (branding, UI tweaks) |
| `assets/pp-overrides.css` | Custom CSS overrides |
| `assets/tracker.js` | Analytics tracker |
| `assets/weather-widget.js` | Weather widget injection |
| `robots.txt` | SEO robots directives |
| `sitemap.xml` | XML sitemap |

All other directories (e.g. `leak-detection/`, `pool-heating/`, etc.) are static sub-pages with their own `index.html` files for SEO/direct-URL access.

---

## Working on This Repo

1. Make changes to files locally in this repo.
2. Test by opening the HTML files directly in a browser, or by running a local static server (`python3 -m http.server 8080`).
3. Deploy by copying changed files to `/var/www/palatialpools/` on the server via `scp` or `rsync`.
4. Reload Nginx: `ssh root@170.64.207.198 'systemctl reload nginx'`.
5. Commit and push changes to this repo (`main` branch) to keep it in sync with the server.

---

## History Note

This repo was initialised from a direct server snapshot on 24 June 2026 at the direction of the site owner. The previous development branch (in a separate repository) diverged from the live server state. This repo reflects the **actual production state** of the server at the time of creation, including the admin overlay fix described above. All future work should be based on this version.
