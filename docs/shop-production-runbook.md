# Shop Production Runbook

This document is the deployment hand-off for the custom Next.js `/shop`
implementation. It is intentionally operational: a deployer should be able to
connect real credentials, migrate the database, import products/assets and
validate the store without reading the entire codebase first.

## Implementation map

| Area | Files | Deployment relevance |
|---|---|---|
| Next.js runtime | `package.json`, `next.config.mjs`, `src/app/**` | Converts the repo to a Node/Next app and serves `/shop` plus legacy static fallback routes. |
| Storefront | `src/app/shop/**`, `src/components/shop/**` | Product/category pages, cart drawer, checkout, calculator, account entry, admin UI. |
| Product data | `src/lib/shop/catalog.ts`, `src/lib/shop/repository.ts` | Seed catalogue renders without DB; PostgreSQL overrides once `DATABASE_URL` is set. |
| Database | `db/schema.sql`, `scripts/shop/migrate.mjs`, `scripts/shop/seed.mjs` | Creates and seeds production tables. |
| Payments | `src/lib/shop/stripe.ts`, `src/components/shop/StripePaymentPanel.tsx`, `src/app/api/shop/checkout/payment-intent/route.ts`, `src/app/api/shop/stripe/webhook/route.ts` | Stripe Payment Element, wallet button, PaymentIntent creation and webhook status update. |
| Orders | `src/app/api/shop/orders/route.ts`, `src/lib/shop/pricing.ts`, `src/lib/shop/shipping.ts` | Guest/account order creation, hazardous shipping block, discounts and shipping options. |
| Admin | `src/app/shop/admin/**`, `src/app/api/shop/admin/**` | Product/admin screens, analytics, bulk import draft, asset/PDF ingestion. |
| PoolTrackr | `src/app/api/shop/pooltrackr/sync/route.ts`, `src/lib/shop/hazards.ts` | Imports product/job line items, ignores labour/services, classifies hazardous products and upserts catalogue. |
| Product assets | `public/shop-assets/**`, `src/app/api/shop/admin/assets/ingest/route.ts` | Downloads supplier/manufacturer media into local public paths; avoids production hotlinks. |
| Legacy site fallback | `src/app/route.ts`, `src/app/[...legacy]/route.ts` | Keeps existing static homepage and pages available under Next.js. |

## One-time deployment steps

1. Set the environment variables from `.env.example` in the production runtime.
2. Run `npm install`.
3. Run `npm run shop:migrate` to create PostgreSQL tables.
4. Run `npm run shop:seed` to seed the initial catalogue.
5. Run `npm run build`.
6. Run `npm run start` behind the production reverse proxy at `/shop`.
7. Configure Stripe webhooks to post to `https://palatialpools.com.au/api/shop/stripe/webhook`.
8. Run the post-deploy validation checklist in this document.

## Required live integrations

- Stripe: `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.
- PostgreSQL: `DATABASE_URL` and optional `DATABASE_SSL=false` for trusted private networks.
- PoolTrackr: `POOLTRACKR_API_KEY`, `POOLTRACKR_BASE_URL`, optional `POOLTRACKR_PRODUCTS_PATH`, `POOLTRACKR_JOBS_PATH`.
- Google OAuth: `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
- Australia Post: `AUSPOST_API_KEY` if moving from current zone rates to calculated rates.

## Environment variable matrix

| Variable | Required for launch | Used by | Notes |
|---|---:|---|---|
| `NEXT_PUBLIC_SITE_URL` | Yes | SEO, Stripe return URLs | Must be `https://palatialpools.com.au` in production. |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Yes for card checkout | Stripe Elements | Exposed to browser; use live publishable key. |
| `STRIPE_SECRET_KEY` | Yes for card checkout | PaymentIntent API | Prefer restricted key if compatible with PaymentIntent/webhook needs. |
| `STRIPE_WEBHOOK_SECRET` | Yes for live status updates | Webhook API | From Stripe Dashboard webhook endpoint. |
| `DATABASE_URL` | Yes for real admin/orders/products | Repository/order APIs | Without it the app renders seed data and returns in-memory order responses only. |
| `DATABASE_SSL` | Environment-specific | PostgreSQL client | Set `false` only on trusted private DB networks. |
| `JWT_SECRET` | Yes for accounts/admin | Auth routes | Use a long random secret. |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | If Google OAuth enabled | Google auth route | Callback must be allow-listed. |
| `POOLTRACKR_API_KEY` | Yes for PoolTrackr sync | PoolTrackr sync route | Read-only scope to product/job history is sufficient. |
| `POOLTRACKR_BASE_URL` | Yes for PoolTrackr sync | PoolTrackr sync route | Defaults to `https://api.poolpro.pooltrackr.com/api`. |
| `POOLTRACKR_PRODUCTS_PATH`, `POOLTRACKR_JOBS_PATH` | Optional | PoolTrackr sync route | Adjust if PoolTrackr endpoint names differ. |
| `AUSPOST_API_KEY` | Optional at launch | Future calculated shipping | Current implementation uses zone rates/free threshold. |
| `SHOP_PICKUP_ADDRESS` | Yes | Settings/admin copy | Use exact Abbotsford pickup address. |
| `SHOP_ABN` | Yes | Settings/invoices | `41 690 936 095`. |
| `SHOP_PHONE` | Yes | Phone payment copy | `03 4231 7665`. |

## Product asset ingestion

Use `POST /api/shop/admin/assets/ingest` with JSON:

```json
{
  "productSlug": "neptune-eco-inverter-pump-1-5hp",
  "assets": [
    { "url": "https://supplier.example/product.jpg", "kind": "image" },
    { "url": "https://supplier.example/manual.pdf", "kind": "manual" },
    { "url": "https://supplier.example/sds.pdf", "kind": "sds" }
  ]
}
```

The route downloads files into `public/shop-assets/images/<productSlug>/` or `public/shop-assets/documents/<productSlug>/` and returns local URLs suitable for product records. Nothing should hotlink supplier PDFs or images in production.

After ingestion, copy the returned `href` values into the product record via
admin CRUD or SQL. Files under `public/shop-assets/` are served directly by
Next.js and can be CDN-cached. For production uploads on a multi-instance
deployment, mount this path on persistent shared storage or replace the write
target with object storage/CDN while preserving the same public URL shape.

## PoolTrackr import

Use `POST /api/shop/pooltrackr/sync` after credentials are set. The route requests products and job line items from the last 18 months, ignores services/labour/professional fees, classifies hazards, and upserts products into PostgreSQL.

The sync route is designed to be safe to run repeatedly:

- Product identity is based on SKU/name-derived slug.
- Services, labour, call-out fees and professional fees are ignored.
- Oxidisers and acids are flagged as hazardous and pickup-only.
- Products without clear sell price are marked contact-for-price.
- Database writes go through `upsertProduct()`.

If PoolTrackr endpoint names differ, set `POOLTRACKR_PRODUCTS_PATH` and
`POOLTRACKR_JOBS_PATH` rather than editing code.

## Stripe checkout

The checkout creates a local order first, then creates a Stripe PaymentIntent and renders the embedded Payment Element. Apple Pay / Google Pay appears through Stripe wallet support when available on the customer device.

Payment status continuity:

1. `/api/shop/orders` creates a local order.
2. `/api/shop/checkout/payment-intent` creates a PaymentIntent with `metadata.orderId`.
3. Customer confirms payment in the embedded Payment Element.
4. Stripe posts to `/api/shop/stripe/webhook`.
5. The webhook marks the order `paid` when `payment_intent.succeeded` arrives.

Non-card payment methods:

- Bank transfer creates an `awaiting_payment` order and uses the order number as reference.
- Cash on pickup creates an `awaiting_payment` order for in-store payment.
- Phone card displays the manual phone-payment instruction.

## Admin/backend route inventory

| Route | Purpose | Production behaviour once env vars are set |
|---|---|---|
| `GET /api/shop/products` | Product list | Reads PostgreSQL if configured, otherwise seed catalogue. |
| `POST /api/shop/products` | Product upsert | Writes PostgreSQL product records. |
| `GET /api/shop/products/[slug]` | Product detail | Reads PostgreSQL or seed fallback. |
| `DELETE /api/shop/products/[slug]` | Soft-delete product | Marks `active = false`. |
| `GET /api/shop/orders` | Admin order list | Reads PostgreSQL orders. |
| `POST /api/shop/orders` | Checkout order creation | Persists order and items transactionally when DB exists. |
| `POST /api/shop/checkout/payment-intent` | Stripe PaymentIntent | Requires `STRIPE_SECRET_KEY`. |
| `POST /api/shop/stripe/webhook` | Stripe status update | Requires `STRIPE_WEBHOOK_SECRET`. |
| `POST /api/shop/pooltrackr/sync` | PoolTrackr product import | Requires PoolTrackr API key and DB URL. |
| `POST /api/shop/admin/import` | Draft product enrichment | Produces review-ready import rows. |
| `POST /api/shop/admin/assets/ingest` | Download images/PDFs | Writes local public asset files. |
| `GET /api/shop/admin/analytics` | Admin dashboard metrics | Reads PostgreSQL revenue if configured. |

## Post-deploy validation checklist

Run these after setting production environment variables:

1. `npm run shop:migrate`
2. `npm run shop:seed`
3. `npm run build`
4. Load `/shop` and a product page.
5. Create a guest checkout order with a non-hazardous item and Stripe test/live test card according to environment.
6. Confirm Stripe webhook updates the order to `paid`.
7. Add a hazardous chemical and confirm delivery options are blocked unless Click & Collect is selected.
8. Run `POST /api/shop/pooltrackr/sync` and confirm imported products appear in `/shop/admin/products`.
9. Ingest one image and one PDF via `/api/shop/admin/assets/ingest`; confirm returned local URLs are reachable.
10. Confirm `/` still renders the legacy homepage through the Next fallback.

## Known deployment caveats

- The build currently emits a Turbopack tracing warning because the legacy fallback route intentionally reads existing static files from the repository. This is expected and does not block build output.
- Production manufacturer imagery/PDFs must be ingested or uploaded before launch-quality merchandising is complete.
- Admin screens render now, but production staff protection depends on setting `JWT_SECRET`, bootstrapping admin users and enforcing the chosen auth/session policy at the deployment edge or in route middleware.
