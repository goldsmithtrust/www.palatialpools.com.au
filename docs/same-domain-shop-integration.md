# Palatial Pools: same-domain shop integration

Prepared 30 October 2026, Melbourne. Status: repository proposal, not a production change.

## Decision

Keep the marketing application and existing Next.js store separate. Route the public shop through the marketing site's HTTPS edge at `https://palatialpools.com.au/shop`. Preserve the store's native `/shop` paths. Use a dedicated `/shop-static` Next asset prefix, explicit API routes and the existing embedded Stripe Payment Element.

Do not use an iframe, redirect customers to palatial.store, copy ecommerce into the marketing repository, or merge the separate catalogue application. A normal document navigation between applications is appropriate: the browser address and Palatial branding remain consistent. Navigation inside the shop retains Next.js client navigation.

Stage a second runtime of the SAME store code against the SAME commerce database. It is a release and origin boundary, not a second catalogue, payment system or stock ledger. Keep the existing standalone runtime for staff access and in-flight callbacks until migration is proven. Both processes need a combined database connection budget, shared product media and compatible migrations. They must not each run independent stock imports or scheduled side effects.

Examples below use the requested apex host. The repository currently advertises `www.palatialpools.com.au` in robots.txt. Verify the actual canonical host before creating OAuth and Stripe registrations. Use one chosen marketing origin consistently. If retaining www initially, substitute it in every public origin, discovery link and callback. Redirect the other host's SHOP GET routes to that origin before starting OAuth; do not redirect payment webhook POSTs. Do not combine this work with a wholesale migration of the marketing site's existing URLs.

## Evidence and limits

Inspected repository snapshots:

| Repository | Main commit | Role |
| --- | --- | --- |
| `goldsmithtrust/www.palatialpools.com.au` | `bacd0a5f5cf7afacda2214f516fbabbbfc065223` | Static marketing HTML, thin Next fallback, compiled homepage SPA |
| `goldsmithtrust/palatial.store` | `4503dcf171dd329e8cd598636341c84e8232465f` | Next 15 store, PostgreSQL integrations, embedded and hosted Stripe implementations, Google accounts and staff admin |
| `goldsmithtrust/palatial-store-catalogue` | `114b432fe25ed38a5b7cd7c2d8089cf2923dfca9` | Separate React/Express/tRPC catalogue, MySQL/Drizzle and Manus OAuth/Forge dependencies |

238 selected text files from the first two repositories were materialised and verified against their Git blob hashes before editing. These are source snapshots, not complete clones with production media or deployed state. The third repository's tree and README were examined to establish its separate architecture; its data ownership, active hosting and integration dependencies remain unverified. No writes are proposed to it. Do not import its database or activate it beside the Next store without separately establishing the authoritative product and order system.

The marketing configuration currently permanently redirects `/shop` and `/store`, including descendants, to palatial.store. Both repositories contain older instructions prohibiting shared routing. The proposal records the owner's 30 October instruction as superseding those specific restrictions while retaining separate code and commerce data ownership.

Live Nginx, DNS/CDN behaviour, systemd units, deployed commits, database contents, production credentials and Stripe/Google dashboard configuration were not accessed or verified. Repository runbooks identify a dedicated store droplet but do not prove the current traffic path. Do not install example Nginx files without inspecting the effective configuration.

## Public route ownership

| Public request | Owner and behaviour |
| --- | --- |
| `/`, service pages, suburb pages, guides and marketing tools | Existing marketing service |
| `/shop` and `/shop/**` | Store runtime, URI unchanged; no externally visible store-domain hop |
| `/store` | Temporary same-origin redirect to `/shop` during acceptance |
| `/store/<path>` | Same-origin redirect to `/shop/<path>`, preserving query parameters |
| `/shop-static/_next/static/**` | Store JS, CSS and Next font assets, isolated from marketing `/_next` |
| `/shop-static/_next/image` | Store image optimiser; pass the query string intact |
| `/shop-assets/**` | Public store images and product documents |
| `/api/shop/**` | Store APIs; staff/import prefixes explicitly denied at the marketing edge |
| `/api/auth/google`, `/api/auth/callback/google`, `/api/auth/callback`, `/api/auth/logout`, `/api/auth/me` | Exact store auth routes only, subject to ownership verification |
| `/api/analytics/collect` | Exact existing store analytics endpoint; verify no marketing conflict |
| `/api/stripe/webhook` | Compatibility webhook alias, proxied directly; never HTTP-redirected |
| `/shop/sitemap.xml` | Shop sitemap; marketing retains its root sitemap and robots.txt |
| `/shop/admin/**`, `/api/shop/admin/**`, `/api/shop/pooltrackr/**` | 404 at marketing edge; staff use the existing standalone admin origin |
| `/api/login`, `/api/health`, `/api/contact`, `/api/analyse-pool`, `/cms-api`, staff systems | Existing owners; do not proxy all `/api` to ecommerce |

Do not set `basePath: '/shop'` on the existing store: its route tree already includes `src/app/shop`, which would produce `/shop/shop`. Next 15's asset-prefix support serves its prefixed static assets without the older pre-15 rewrite. Nginx `proxy_pass` must have NO URI suffix/trailing slash, preserving `/shop/...` and queries.

The draft does not route `/api/checkout/session` or `/api/shipping/quote` to the public store: the customer UI currently uses the embedded flow and its existing shipping helper. Do not activate the competing hosted Checkout implementation until its totals and fulfilment logic have been reconciled. Inventory real browser requests in staging before adding further APIs.

## Exact preparation included

### Marketing repository

- `next.config.mjs`: `SHOP_SAME_DOMAIN=1` removes external `/shop` redirects and changes `/store/:path*` to `/shop/:path*`. The default retains the existing routing for rollback. The edge, rather than Next rewrites, dispatches the store paths.
- `src/lib/shop-navigation.ts` plus root and legacy route changes: when enabled, append the navigation correction script to HTML served by the Next fallback.
- `assets/pp-shop-navigation.js`: converts known store-domain shop links to local `/shop` links, removes new-tab targets, preserves category paths, queries and fragments, and uses full document navigation when crossing applications. It observes rendered SPA navigation links and leaves external suppliers and staff links alone.
- `src/app/robots.txt/route.ts`: retains marketing robots rules and, when enabled, replaces the obsolete `/store/sitemap.xml` declaration with the selected public origin's `/shop/sitemap.xml`.
- `ops/nginx/shop-http.conf.example`, `shop-locations.conf.example`, `shop-proxy.conf.example`: explicit upstream, locations, trusted proxy headers, no shared response cache, private-route noindex headers and staff denials.
- Automated configuration and navigation tests, including the disabled rollback state.

The documented universal `assets/pp-nav.js` does not exist in the inspected marketing tree. The actual root HTML loads `pp-fixes.js` and a compiled SPA. This proposal therefore fixes the HTML routes that exist instead of pretending to edit a missing navigation source. If production Nginx directly serves HTML rather than using these Next routes, the injection will be bypassed: add the script to the deployed shared HTML/template build and regenerate/sample all page types before cutover. Do not patch minified bundles or rely on this client correction as the final source template fix.

### Store repository

- `next.config.mjs`: opt-in `assetPrefix: '/shop-static'` and `images.path: '/shop-static/_next/image'`; native shop paths remain unchanged.
- `config/security-headers.mjs`: one effective security policy with Stripe script, frame and connection hosts, including documented Link wallet hosts. `middleware.ts` only adds the canonical debug header; the conflicting config/middleware CSP pair is removed. Security headers also cover staff routes.
- Product seed image/document paths move to `/shop-assets`; `scripts/shop/prepare-zone-assets.mjs` copies ONLY the known public product SVGs, hero and available shop PDFs into `public/shop-assets` before build. Existing hero assets there remain in place. The new public placeholder is a small SVG.
- `ShopNav.tsx` and `ShopFooter.tsx`: same-tab normal links to `NEXT_PUBLIC_MAIN_SITE_URL`, including from the standalone staff runtime. Existing shop branding remains; a final visual comparison of header height, logo, colours and mobile controls is still required.
- `StripePaymentPanel.tsx`: corrects the return path to `/shop/order-confirmation/<orderNumber>`, matching the implemented route.
- Namespaced `palatial_store_session` and `palatial_store_csrf` cookies on the integrated runtime; original cookie names remain on the standalone runtime. Public auth rejects staff return paths. No cross-domain cookie copying or shared login with Palatial Link.
- The legacy `/api/shop/products` write endpoint now requires the existing database-checked admin authorisation; the main-domain proxy allows only catalogue GET/HEAD requests. Its prior POST handler had no authorisation check.
- `/api/shop/contact` aliases the existing store contact handler, and its form uses that path, preserving marketing `/api/contact`.
- Explicit home, category, product and utility canonicals; removal of the inherited root canonical; noindex on checkout/account/cart bridge. Order confirmation already declares noindex.
- `/shop/sitemap.xml` reads active products through the repository used by the product API. This is preparatory: public product rendering/pricing must be reconciled with that repository before launch.
- `ops/discovery/` contains a distinct, self-canonical palatial.store landing page, robots.txt and sitemap. `ops/nginx/discovery-locations.conf.example` serves those public files while leaving staff/API handlers intact, and redirects duplicate shop GET paths to the main-domain shop. It starts with temporary redirects for acceptance.
- Configuration tests and `scripts/shop/smoke-zone.mjs`, a read-only edge smoke check for staging.

No database migration, payment charge, customer notification, live import, DNS update or production deployment is included.

## Proxy configuration and infrastructure

The complete proposed snippets are in the marketing draft. The key behaviour is:

```nginx
# http context: address must be verified before use
upstream palatial_shop { server 127.0.0.1:3101; keepalive 16; }

# inside the canonical marketing HTTPS server
location = /shop { include /etc/nginx/snippets/palatial-shop-proxy.conf; }
location ^~ /shop/ { include /etc/nginx/snippets/palatial-shop-proxy.conf; }
location ^~ /shop-static/ { include /etc/nginx/snippets/palatial-shop-proxy.conf; }
location ^~ /shop-assets/ { include /etc/nginx/snippets/palatial-shop-proxy.conf; }
```

The common snippet uses `proxy_pass http://palatial_shop;`, HTTP/1.1, an empty Connection header, and edge-owned Host, X-Forwarded-Host, X-Forwarded-Proto and client-IP headers. No HTML rewriting or `proxy_redirect` masking is used. Dynamic shop responses are `private, no-store` and shared proxy caching is disabled; optimise immutable hashed assets only after correct routing is proven. Never cache a Set-Cookie response or an RSC response as ordinary HTML.

`127.0.0.1:3101` is a proposed local listener or local end of a private authenticated tunnel. It is NOT the existing remote store. If the applications remain on separate droplets, establish the private transport first, firewall its destination, and confirm the correct app and port. Prefer private networking with encryption, or verified HTTPS to a dedicated origin. Do not point the edge at the public main domain or at a store URL that redirects back to the edge. Do not forward sessions over an unauthenticated public HTTP hop. No new droplet purchase is required by this design; evaluate the current hosts' resources first.

Use `nginx -T` and the service manager read-only to inventory active locations, upstreams, TLS termination, proxy/CDN caching, body limits, security headers and real-IP settings. Keep that inventory private. Check regex locations cannot override staff denials or image routing. Only trust forwarded client IPs from known edge addresses. The example overwrites incoming forwarding headers; real-IP/CDN trust configuration needs host-specific verification.

If production is a CDN/static host with no programmable edge, these Nginx snippets cannot be applied there. Route the same explicit paths with the host's supported reverse proxy or bring the marketing hostname behind the verified existing proxy; do not silently substitute an external redirect.

## Runtime configuration

Build and runtime values must agree. `NEXT_PUBLIC_*`, asset prefixes and prerendered metadata are baked into the build. Rebuild rather than changing only environment files.

| Variable | Public integrated build/runtime | Existing standalone staff runtime |
| --- | --- | --- |
| `SHOP_SAME_DOMAIN` | `1` | Unset or `0` |
| `NEXT_PUBLIC_SITE_URL` | `https://palatialpools.com.au` after canonical-host verification | `https://palatial.store` |
| `NEXT_PUBLIC_MAIN_SITE_URL` | Same selected marketing origin | Same selected marketing origin |
| `DATABASE_URL` | Existing authoritative PostgreSQL commerce DB | Same authoritative commerce DB |
| Stripe keys | Same merchant account; test keys only in staging | Retain current configuration |
| `STRIPE_WEBHOOK_SECRET` | Secret for the endpoint actually registered to this runtime | Retain its registered endpoint secret |
| Google client credentials | Client with the public callback allowlisted | Existing standalone callback remains allowlisted |
| JWT secret | Long secret configured for public runtime | Retain staff runtime secret; independent browser sessions |
| Public media | Same persistent catalogue assets, exposed at `/shop-assets` | Same media source; verify persistent storage ownership |

Do not copy production credentials into a PR, report or test fixture. Allow enough combined DB connections for both pools; each existing pool defaults to ten. Apply additive migrations once, not per process start. Existing generated/uploads media must survive release-directory rotation.

## Customer experiences and inventory rules

The following merchandising work is specified, not implemented in the foundation changes. It is required before calling the two-channel shop complete.

| Experience | Local second-hand and clearance | National purchases |
| --- | --- | --- |
| Entry | `/shop/local`, labelled “Second-hand & clearance in Abbotsford” | `/shop/national`, labelled “Shop Australia-wide” |
| Primary objective | Counter enquiries and physical visits | Eligible online orders |
| Products | Actual used pumps, main drain covers, cleaner parts and clearance stock | Approved new/clearance products with confirmed freight or collection rules |
| Main action | “Ask about this part” and “Visit the shop”; request model/photo/dimensions | Add to cart and embedded checkout |
| Product information | Actual photographs, tested/untested status, faults, inclusions, fitment, price/price-on-enquiry, quantity and availability timestamp | Price, variants, stock, dimensions/weight, postcode eligibility, dispatch information and freight quote |
| Fulfilment | Default enquiry/in-store inspection; click-and-collect only if deliberately enabled | Approved AU delivery methods or collection; installation-only products route to a quote |
| Measure | Enquiries, directions clicks and attributable counter sales | Completed paid orders, margin and fulfilment performance |

Do not categorise every pickup-only chemical as second-hand. Clearance status, item condition and sales channel are separate facts. Do not invent stock, testing history, discounts or availability. Do not promise an online hold until a reservation mechanism actually exists. Local CTA text should say availability needs confirmation before travel.

Use ONE product table with explicit merchandising fields. Proposed additive migration, to be reviewed and applied separately:

```sql
ALTER TABLE shop_products
  ADD COLUMN sales_channel text NOT NULL DEFAULT 'review_required'
    CHECK (sales_channel IN ('review_required','local_showroom','national')),
  ADD COLUMN item_condition text NOT NULL DEFAULT 'unverified'
    CHECK (item_condition IN ('unverified','new','used','refurbished')),
  ADD COLUMN clearance boolean NOT NULL DEFAULT false,
  ADD COLUMN purchase_mode text NOT NULL DEFAULT 'enquiry'
    CHECK (purchase_mode IN ('enquiry','online','installation_quote')),
  ADD COLUMN condition_notes text,
  ADD COLUMN availability_verified_at timestamptz;
```

Leave current rows `review_required` until audited. Add these fields to `Product`, `dbProductToProduct`, `upsertProduct`, admin validation/forms and imports. Imports must preserve reviewed merchandising decisions and must not automatically make imported stock saleable. Query the local page by `sales_channel='local_showroom'`; query the national page by `sales_channel='national'` and approved `purchase_mode`. Category membership stays independent. Store product URLs remain `/shop/<category>/<slug>` so an item's channel does not create duplicate detail pages.

For national orders, validate shipping addresses, AU postcode and freight eligibility SERVER-SIDE. A Melbourne postcode label is not an implemented delivery zone. Replace conflicting $150/$300 free-shipping claims and unverified flat rates with one approved policy. Reject unavailable fulfilment selections, hazardous/pickup-only delivery, unknown products/variants and insufficient stock. For mixed carts containing pickup-only products, offer collection for the whole cart or have the customer remove those items; implement a separate shipment feature only if explicitly designed.

Keep install-only equipment on enquiry/installation quotes rather than automatically putting all service equipment into national supply-only sales. This is consistent with Palatial's existing service positioning while allowing an explicitly approved retail range.

## Checkout and authentication release requirements

Reuse the existing embedded Payment Element. Browsing and the payment form remain on the marketing host. Bank authorisation/3DS or an enabled external payment method can temporarily show the bank/provider; do not promise that payment authentication can never leave the page. The corrected return URL brings the customer back to the marketing-host confirmation route.

The repository is not ready for unconditional live checkout merely because it builds:

| Verified source issue | Required implementation before accepting orders |
| --- | --- |
| Public product pages, cart pricing and order creation call seeded `catalog.ts`; product APIs/admin can use PostgreSQL | Use one server-side product/variant repository for public rendering, cart quote, fulfilment, order items and payment totals. Return a server quote to the browser; do not use a bundled seed catalogue as checkout authority. DB-backed inactive/deleted products must not fall back to seeds. |
| PaymentIntent endpoint prices client-supplied items separately from persisted order totals | Load the authenticated customer's order, or a guest order using a signed opaque checkout token. Derive charge amount/currency only from its persisted, validated quote including freight, discounts and GST. Never trust an arbitrary supplied order ID or repriced client cart. |
| Embedded intent amount currently omits the separate order shipping charge | Make displayed order total, stored order total and Stripe amount exactly equal in cents. Include the selected approved freight charge; test each method. |
| Unknown products can price as zero, and persisted item prices do not consistently resolve variants | Reject unknown/unavailable SKUs and variants; store the exact approved product ID, variant/SKU and unit-price snapshot. |
| Repeated submission can create more orders/intents | Use an idempotent checkout key, persist one intent ID per order and return the existing intent for safe retries. Freeze or version the quote while paying; do not let a changed cart pay a stale intent. |
| No-DB order branch returns an apparent successful in-memory order | In production, fail checkout closed with 503 if the DB is absent/unhealthy. Do not create a PaymentIntent without a durable order. |
| Webhook event is inserted before order updates, outside a common transaction | Record/dedupe and apply state changes atomically, or explicitly resume failed/unprocessed events on retry. Validate merchant mode, currency, amount and intent/order association before marking paid. Do not treat an unpaid `checkout.session.completed` as payment success. |
| Current paid-stock decrement depends on product IDs that the storefront order insert does not populate | Populate product IDs and implement atomic reservation/stock handling. Two customers must not both purchase a one-off used pump. Release expired/failed reservations; avoid repeated decrement across duplicate success events. |
| Separate PaymentRequestButton has no paymentmethod handler | Use properly connected Payment Element wallet support or implement the complete wallet lifecycle. Do not display an apparently working standalone wallet button until verified on real supported devices. |
| Confirmation route exposes email and order details using a predictable order number | Require ownership or a signed opaque guest confirmation token. A redirect/query flag is not proof of payment. Show “payment processing” until verified DB/webhook state confirms success. Clear the cart only after the appropriate verified completion. |
| Bank transfer and phone/cash options are offered | Enable only approved operational methods. Bank details currently have placeholder defaults. Cash must be restricted to collection. Do not claim a reservation or dispatch before the corresponding stock/payment process exists. |

These are code findings, not claims that a production customer has been affected. No corrective DB/payment mutation was attempted in this review. Implement and test these as a bounded commerce-readiness change before activating the proxy for live sales. Avoid rewriting both payment systems at once.

Customer Google callback for the integrated runtime: `https://palatialpools.com.au/api/auth/callback/google`. Retain `https://palatial.store/api/auth/callback/google` for staff. Use the exact chosen canonical marketing host. Start and finish public OAuth on the same host so state/nonce/return cookies survive. Check consent denial, expired state, invalid state, logout and return paths. Validate the ID-token issuer, audience, signature and nonce as part of the existing OAuth hardening review; the inspected callback does not show nonce verification despite setting a nonce cookie.

Cookies stay host-only, HttpOnly, Secure in production, SameSite=Lax and Path=/ because both `/shop` and root-level auth APIs need them. Do not set Domain=palatial.store or proxy-rewrite cookies across unrelated domains. Namespacing avoids accidental collision with marketing systems; it does not make two applications on one origin a browser security boundary. Audit the main site's scripts before enabling payment/account pages. Existing store-origin localStorage carts and logins cannot be automatically read on the marketing origin. Expect a new cart/session; never add an unverified cross-domain cart/session transfer.

Keep same-origin API calls relative. Preserve the existing Origin checks/CSRF protection and enforce them on browser mutations as appropriate. A webhook uses its Stripe signature rather than browser CSRF; do not put a login challenge in its path. Do not broaden CORS to `*` or spoof the request Origin to make it pass.

## Stripe cutover

Use `https://palatialpools.com.au/api/shop/stripe/webhook` for the selected public endpoint. The existing `/api/stripe/webhook` alias remains directly routable for compatibility. Both use raw `request.text()` and signature verification; proxy the raw body and `Stripe-Signature` unchanged. Register the events actually handled, and preserve the snapshot event payload shape expected by `constructEvent`; changing to thin event delivery is a separate implementation.

A newly created endpoint gets its OWN signing secret. The current app has one `STRIPE_WEBHOOK_SECRET` per runtime, so do not register multiple new endpoints with different secrets to the same runtime and assume either works. Either update the existing endpoint URL while retaining its configured secret, or use the separate public runtime with its new endpoint secret. Keep the original runtime processing its old endpoint during overlap, with common durable idempotency. Reconcile queued events before retiring it.

Register the selected marketing host as a Stripe payment-method domain in the appropriate test/live modes. Test Apple Pay, Google Pay and Link only where configured and supported. Keep both test/live secrets out of builds and repositories. Frontend publishable keys must match the server's Stripe account/mode. Provider callbacks and payment confirmation pages must not be cached, challenged by a bot page or blocked by the edge CSP.

## SEO arrangement

Make each main-domain shop/category/product URL self-canonical. Product JSON-LD Offer URLs, image URLs, Open Graph URLs, internal navigation and sitemap entries must agree. Only publish active, approved products that the public pages actually serve. Do not list accounts, cart bridges, checkout, confirmations, staff paths, internal search variations or filter-query permutations in sitemaps.

The new `/shop/sitemap.xml` uses the product API repository; final publication additionally needs the sales-channel approval filter and DB-backed detail pages above. Otherwise the sitemap could advertise products the current seeded pages cannot render. The store's existing root `src/app/sitemap.ts` is not the marketing sitemap and must not take over `/sitemap.xml` on the main domain.

Keep palatial.store indexable by serving its DISTINCT discovery homepage with a self-canonical `https://palatial.store/`. It discusses counter identification, used-part enquiries and visiting Abbotsford; it is not another copy of the transactional catalogue. Its sitemap initially contains just that homepage. Publish additional genuinely useful, distinct guides there only if separately commissioned; do not automatically mirror marketing guides.

After acceptance, redirect duplicate `palatial.store/shop/...` GET pages to the matching main-domain product/category path with 308. Do not redirect every old product to the shop homepage, and do not blanket-redirect the entire store domain because that would remove its independent discovery content. Retain staff and callback paths separately. Remove duplicate shop URLs from the store-domain sitemap. Aliases such as palatial.shop should resolve to the corresponding preferred content rather than become another indexable catalogue.

If duplicate storefront HTML must temporarily remain on both domains, emit the SAME main-domain canonical on each duplicate; do not let separate runtime defaults produce competing self-canonicals. Use that only as a transition. Do not combine a robots.txt crawl block with a canonical that Google needs to read. Private shop pages get noindex metadata and edge headers and remain outside sitemaps; robots rules are not access control.

Use both domain properties in Search Console. Submit each domain's own canonical sitemap. Inspect a home, category, product, local landing and national landing after release. Google selects its own canonical and index coverage; keeping a domain crawlable or listing it in a sitemap does not guarantee indexing or rankings. There is no sound promise that identical product pages will rank independently on both domains.

## Reversible implementation sequence

1. **Record production state, read-only.** Identify canonical host, exact edge/CDN, Nginx `-T`, active commits/services, listening ports, DB/migration state, media mounts, existing API owners, callbacks and deployment triggers. Back up configs and record immutable release IDs. Inspect headers privately; do not capture customer session tokens in evidence.
2. **Review the two drafts.** Leave the opt-in flag off in current production. The store repository's workflow is triggered by pushes to main or manual dispatch; do not merge a draft or invoke production deployment to test it.
3. **Complete commerce-readiness work.** Fix the listed product, pricing, order, webhook, guest access, inventory and fulfilment requirements. Implement `/shop/local`, `/shop/national`, reviewed admin fields and the two homepage entry points. Apply the proposed additive migration first to an isolated staging database. Populate test stock only.
4. **Build the staged releases.** Keep all public assets, run the asset-preparation step, build with the final public variables and install the public store service without changing the live edge. Use an isolated test database and Stripe test credentials in staging. Do not load live jobs/imports into it. Resolve the existing ESLint/build-check problem.
5. **Verify private routing.** Establish and test the actual upstream/tunnel. Install rendered example snippets into a staging vhost with its own TLS. Remove conflicting vhost-wide CSP and cache directives for the shop. Run `nginx -t` against the complete effective config before any reload.
6. **Test the full matrix below.** Resolve failures. Keep staging access restricted/noindex at the edge. Authenticated staging protection must exempt the signed Stripe test webhook; do not expose it through a blanket login redirect.
7. **Prepare production registrations.** Add the exact public Google redirect and Stripe payment-method domain; configure the chosen webhook endpoint/secret. Keep the existing runtime/endpoint valid during overlap. Prepare the distinct palatial.store discovery files but do not redirect its customers until the main-domain shop is ready.
8. **Cut over together.** Deploy the enabled marketing build and verified public store release, then atomically switch the validated edge locations and reload gracefully. Confirm staff/API denials, homepage, one real approved product, actual asset URLs and payment test evidence immediately. Never return a 200 marketing fallback as a failed shop page. On upstream failure, use a clear temporary unavailable response, not an automatic external-store redirect.
9. **Observe and finish SEO.** Check errors, payments, orders, reservation counts, callbacks and freight results. Purge exact old CDN redirects/cached HTML for `/shop` and `/store`. Previously cached browser 308s cannot be remotely erased; preserve the store origin during transition. Once acceptance is stable, publish the distinct discovery page and change temporary duplicate-content GET redirects to permanent 308s. Submit the correct sitemaps.
10. **Rollback if needed.** Restore the previous edge configuration and immutable marketing release, leaving store staff/webhook processing intact. Use the previous disabled build rather than merely editing an environment variable. Do not roll back the commerce database or delete newly accepted orders. Reconcile payments first. Preserve new assets and signing secrets needed for pending callbacks. Keep schema changes additive/backward-compatible; stop new sales rather than destructively undoing data. Delay permanent SEO redirects until this rollback path is proven, since browsers/search engines can retain them.

## Acceptance tests

| Area | Required acceptance evidence |
| --- | --- |
| Navigation | Desktop and mobile Shop links from homepage, suburb, tool and blog stay on the selected marketing origin and same tab. Logo/services return correctly. Back/forward, direct deep links, refresh, searches and fragments work. `/store/pumps?x=1` retains its destination/query. No `/shop/shop`. |
| Build assets | Parse real HTML/network requests; every shop chunk/font is under `/shop-static/_next/static`; every requested image/PDF exists and has the right MIME. Verify image optimiser queries. Marketing `/_next` still serves marketing. Test an old page open during a new release: retain prior hashed chunks. |
| Cart | Add/change/remove/reload; return from marketing to shop; test private browsing/storage denial. Confirm one-off and out-of-stock restrictions, DB price/variant edits and unknown SKU rejection. Do not claim old store-origin cart migration. |
| Local experience | Only approved actual local stock appears; no false “available” labels. Enquiry and directions work. Default used/untested listings cannot enter national checkout. Availability and contact details are verified. |
| National fulfilment | Valid AU delivery, invalid postcode/address, outside approved local zone, oversized freight, hazardous item, pickup-only item and mixed cart. The server rejects a forged disallowed fulfilment request. Installation-only items request a quote. |
| Card checkout | Stripe test success, decline, 3DS, cancel, timeout, double click, changed cart and network retry. Compare displayed/stored/charged cents including freight, discounts and GST. The return URL and all cookies use the selected marketing host. |
| Webhooks | Valid signature/raw body, invalid signature rejection, duplicate event, out-of-order events, DB failure followed by retry, pending asynchronous payment, refund, old endpoint overlap. One payment/stock transition only. Missing DB fails closed. |
| Guest/account privacy | Guessing another order number or supplying another order ID reveals no details and cannot pay/change it. Signed guest token expiry works. Customer A cannot access B's orders. Public staff/import routes and catalogue writes are denied; unauthenticated product mutation is rejected by the application as well. |
| Authentication | Guest checkout, Google customer login/logout, invalid/expired state, nonce, consent denial, standalone staff login, canonical-host redirect before OAuth. Cookies are host-only/Secure/HttpOnly/Lax, with no duplicate cookie-name collision. |
| Mobile | Real iPhone Safari and Android Chrome; 360/390/768px widths, keyboard open, rotation, cart drawer, mobile menu, focus/scroll restoration and pay controls. Confirm no horizontal overflow or hidden buttons. Test Apple Pay/Google Pay on eligible real devices and actual registered test domain. |
| Search indexing | 200 server-rendered approved product text, exactly one matching canonical, valid JSON-LD, canonical sitemap URLs, no private entries, discoverable robots sitemaps, private noindex, real product 404s. palatial.store root returns distinct 200 content; duplicate product GETs map to corresponding main URLs. Search Console live inspection after deployment. |
| Resilience | Stop staged shop upstream: marketing still works, shop responds unavailable without domain escape. Restore it. Test config rollback and pending webhook continuity. |

Prepared checks:

```bash
# marketing repository
node --test tests/*.test.mjs
npm run typecheck
SHOP_SAME_DOMAIN=1 NEXT_PUBLIC_SITE_URL=https://palatialpools.com.au npm run build

# store repository (complete source/media checkout)
npm ci --legacy-peer-deps
npm test
npm run typecheck
npm run test:shop-zone
SHOP_SAME_DOMAIN=1 NEXT_PUBLIC_SITE_URL=https://palatialpools.com.au npm run build
node scripts/shop/smoke-zone.mjs https://YOUR_STAGING_HOST
```

The smoke script performs read-only GET checks; it does not place an order or prove payment, mobile behaviour or Google indexing. Use a staging origin matching its built `NEXT_PUBLIC_SITE_URL`.

## Verification completed in this review

- Original store typecheck and 16 existing unit tests passed before edits.
- New effective-config and navigation suite: nine tests passed, covering both flag states, prefix/image paths, single Stripe-compatible CSP, query/path preservation and unchanged unrelated links.
- Store typecheck and the existing unit suite passed during implementation; final checks are recorded with the draft changes.
- Enabled marketing production build completed, with the existing broad legacy filesystem tracing warning.
- Enabled store Next production compilation/type generation completed. Its build reported a pre-existing ESLint configuration import error (`eslint-config-next/core-web-vitals`) while still producing output. This is not a clean required-check result; repair and rerun that check before release.
- The store build was invoked directly through Next on a selected text snapshot. The new full `npm run build` asset-copy step requires the complete public source/media checkout and was not end-to-end validated here.
- The HTTP security suite was attempted without its required running localhost service and could not execute (connection refused); it is not counted as passing. Run it against the isolated staging service before release.
- No Nginx binary, live proxy configuration, test database, Stripe credentials, Google client or real mobile-device payment session was available for end-to-end acceptance. No live checkout, mobile visual acceptance or Search Console index result is claimed.

## Primary sources

Repository evidence, pinned to inspected commits:

- [Marketing next.config.mjs](https://github.com/goldsmithtrust/www.palatialpools.com.au/blob/bacd0a5f5cf7afacda2214f516fbabbbfc065223/next.config.mjs)
- [Marketing architecture instructions](https://github.com/goldsmithtrust/www.palatialpools.com.au/blob/bacd0a5f5cf7afacda2214f516fbabbbfc065223/AGENTS.md)
- [Store production runbook](https://github.com/goldsmithtrust/palatial.store/blob/4503dcf171dd329e8cd598636341c84e8232465f/docs/shop-production-runbook.md)
- [Embedded payment endpoint](https://github.com/goldsmithtrust/palatial.store/blob/4503dcf171dd329e8cd598636341c84e8232465f/src/app/api/shop/checkout/payment-intent/route.ts)
- [Order creation](https://github.com/goldsmithtrust/palatial.store/blob/4503dcf171dd329e8cd598636341c84e8232465f/src/app/api/shop/orders/route.ts)
- [Stripe event processing](https://github.com/goldsmithtrust/palatial.store/blob/4503dcf171dd329e8cd598636341c84e8232465f/src/lib/stripe/webhooks.ts)
- [Separate catalogue architecture](https://github.com/goldsmithtrust/palatial-store-catalogue/blob/114b432fe25ed38a5b7cd7c2d8089cf2923dfca9/README.md)

Current vendor guidance reviewed:

- [Next.js 15 multi-zones](https://nextjs.org/docs/15/app/guides/multi-zones): independent apps on one domain, distinct asset prefix and plain links across zones.
- [Next.js assetPrefix](https://nextjs.org/docs/app/api-reference/config/next-config-js/assetPrefix): public-folder assets require separate path handling.
- [Nginx proxy_pass](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass): URI preservation and replacement semantics.
- [Stripe integration security and CSP](https://docs.stripe.com/security/guide): required script/frame/connect origins.
- [Stripe webhook guidance](https://docs.stripe.com/webhooks): signatures, raw body, endpoint configuration and delivery handling.
- [Stripe payment-method domains](https://docs.stripe.com/payments/payment-methods/pmd-registration): register the host used by embedded payment methods.
- [Google canonicalisation](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): align redirects, canonicals and sitemaps; indexing is not guaranteed.
