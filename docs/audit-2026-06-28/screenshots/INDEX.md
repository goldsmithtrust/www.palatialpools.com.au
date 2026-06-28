# Screenshot index — 28 June 2026 audit

All captures use `--no-sandbox` Google Chrome 148 headless via puppeteer-core against the local Next.js 16.2.6 dev server on `http://localhost:3000`. Desktop = 1440×900, mobile = 430×932 @ DPR 2 (iPhone 14 Pro-ish). Captures are above-the-fold (`fullPage: false`).

| Page | Local URL | Desktop | Mobile | Notes |
|------|-----------|---------|--------|-------|
| Homepage (no-JS baseline) | `/` | [home-noscript.desktop.png](home-noscript.desktop.png) | [home-noscript.mobile.png](home-noscript.mobile.png) | JS disabled; React SPA bundle hangs Chrome headless during `Page.captureScreenshot`. Page itself returns HTTP 200. |
| Contact | `/contact-palatial-pool-services/` | [contact.desktop.png](contact.desktop.png) | [contact.mobile.png](contact.mobile.png) | Formspree form renders. |
| FAQ | `/faq/` | [faq.desktop.png](faq.desktop.png) | [faq.mobile.png](faq.mobile.png) | |
| Testimonials | `/testimonials/` | [testimonials.desktop.png](testimonials.desktop.png) | [testimonials.mobile.png](testimonials.mobile.png) | |
| Privacy policy | `/privacy-policy/` | [privacy.desktop.png](privacy.desktop.png) | [privacy.mobile.png](privacy.mobile.png) | |
| Pool calculators | `/pool-calculators/` | [pool-calculators.desktop.png](pool-calculators.desktop.png) | [pool-calculators.mobile.png](pool-calculators.mobile.png) | 7-tab calc bundle. |
| Energy calculator | `/tools/energy-calculator/` | [energy-calculator.desktop.png](energy-calculator.desktop.png) | [energy-calculator.mobile.png](energy-calculator.mobile.png) | Chart.js. |
| Pool-cost calculator | `/tools/pool-cost-calculator/` | [pool-cost-calculator.desktop.png](pool-cost-calculator.desktop.png) | [pool-cost-calculator.mobile.png](pool-cost-calculator.mobile.png) | |
| Blog index | `/blog/` | [blog-index.desktop.png](blog-index.desktop.png) | [blog-index.mobile.png](blog-index.mobile.png) | |
| Suburb: Kew | `/kew-pool-service/` | [suburb-kew.desktop.png](suburb-kew.desktop.png) | [suburb-kew.mobile.png](suburb-kew.mobile.png) | |
| Suburb: Hawthorn | `/hawthorn-pool-servicing/` | [suburb-hawthorn.desktop.png](suburb-hawthorn.desktop.png) | [suburb-hawthorn.mobile.png](suburb-hawthorn.mobile.png) | |
| Melbourne services hub | `/melbourne-pool-services/` | [melbourne-services.desktop.png](melbourne-services.desktop.png) | [melbourne-services.mobile.png](melbourne-services.mobile.png) | |
| Cartridge finder | `/cartridge-finder/` | [cartridge-finder.desktop.png](cartridge-finder.desktop.png) | [cartridge-finder.mobile.png](cartridge-finder.mobile.png) | **Confirmed FIXED** vs May 2026. |
| Pool-volume calculator | `/pool-volume-calculator/` | [pool-volume-calculator.desktop.png](pool-volume-calculator.desktop.png) | [pool-volume-calculator.mobile.png](pool-volume-calculator.mobile.png) | Google Maps Places deprecation still applies. |
| Palatial Link | `/palatial-link/` | [palatial-link.desktop.png](palatial-link.desktop.png) | [palatial-link.mobile.png](palatial-link.mobile.png) | Customer portal marketing page. |
| Project gallery | `/palatial-project-gallery/` | [palatial-project-gallery.desktop.png](palatial-project-gallery.desktop.png) | [palatial-project-gallery.mobile.png](palatial-project-gallery.mobile.png) | |
| Pool Area Shield | `/pool-area-shield/` | [pool-area-shield.desktop.png](pool-area-shield.desktop.png) | [pool-area-shield.mobile.png](pool-area-shield.mobile.png) | |
| Pool diagnostics | `/pool-diagnostics/` | [pool-diagnostics.desktop.png](pool-diagnostics.desktop.png) | [pool-diagnostics.mobile.png](pool-diagnostics.mobile.png) | Photo-upload UI (backend-dependent). |
| Portal | `/portal/` | [portal.desktop.png](portal.desktop.png) | [portal.mobile.png](portal.mobile.png) | |
| Sitemap visual | `/sitemap-visual/` | [sitemap-visual.desktop.png](sitemap-visual.desktop.png) | [sitemap-visual.mobile.png](sitemap-visual.mobile.png) | |
| Guides index | `/guides/` | [guides-index.desktop.png](guides-index.desktop.png) | [guides-index.mobile.png](guides-index.mobile.png) | |
| Synapse marketing | `/synapse/` | [synapse.desktop.png](synapse.desktop.png) | [synapse.mobile.png](synapse.mobile.png) | Static marketing page only — live Synapse is on the VPS. |
| 404 baseline | `/__missing_path_for_audit__/` | [404.desktop.png](404.desktop.png) | [404.mobile.png](404.mobile.png) | Next.js default not-found. |
| `/shop` redirect | `/shop` | [shop-redirect.desktop.png](shop-redirect.desktop.png) | [shop-redirect.mobile.png](shop-redirect.mobile.png) | Final URL `https://palatial.store/`. |
