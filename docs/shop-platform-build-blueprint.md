# Palatial Pools Shop Platform Build Blueprint

## Current repo constraint

This repository is currently a mostly static HTML/CSS/JavaScript website with no root package manager, no Next.js application, no backend server, no database layer, and no Stripe integration. The existing `/store/` work is a static/progressive storefront shell, not a production ecommerce platform.

A production `/shop` platform with accounts, Stripe Elements, webhooks, PostgreSQL, admin CRUD, analytics, PoolTrackr ingestion, and protected staff access should be built as a separate application that is mounted behind `palatialpools.com.au/shop` by the production web server or reverse proxy.

## Required architecture

- Next.js App Router storefront at `/shop` with SSR/SSG for all category and product pages.
- Node.js API route layer for cart, checkout, accounts, admin, webhooks, discounts, shipping and ingestion jobs.
- PostgreSQL as the source of truth for products, variants, inventory, customers, orders, discounts and domain configuration.
- Stripe Payment Element integration with PaymentIntents, Payment Request Button, server-side webhook verification and restricted API keys.
- JWT/session authentication for customers and staff, with staff-only admin routes under `/shop/admin`.
- Admin product management with hazardous flags, image/PDF uploads, variants, stock, SEO fields and bulk import review workflow.
- Fulfilment rules for click and collect, Abbotsford pickup, national shipping, local delivery and pickup-only hazardous items.
- PoolTrackr ingestion worker using authenticated access to `https://api.poolpro.pooltrackr.com/api`.
- Image/document pipeline that downloads, optimises and hosts product imagery plus manuals, brochures and SDS PDFs locally/CDN-side.
- Domain configuration layer for future standalone domains while sharing products, admin, payment processing and customer accounts.

## External inputs required before implementation can be completed

- Stripe restricted API key, publishable key, webhook signing secret and live/test mode policy.
- PostgreSQL production database URL and migration/deployment target.
- PoolTrackr API authentication details and allowed data scope for the last 18 months of jobs/products.
- Production VPS or platform deployment details for a Node/Next service at `/shop`.
- Google OAuth credentials if Google sign-in is required at launch.
- Staff/admin auth policy and initial admin users.
- Authoritative shipping rules for hazardous chemicals, Australia Post API credentials if calculated shipping is preferred, and free-shipping threshold.
- Access to the DigitalOcean server asset directories for product PDFs, or an export of the relevant files.
- Confirmed exact pickup address to show in admin settings and customer order flows.

## Non-negotiable launch rules captured from the request

- No WooCommerce or WordPress.
- No adapter or PalatialLink hardware products in the shop catalogue.
- All prices in AUD including GST.
- ABN for invoices: `41 690 936 095`.
- Phone number: `03 4231 7665`.
- Checkout must support guest purchase without account creation before payment.
- Hazardous products must be pickup-only and use subtle product/card indicators.
- Product/category URLs must be clean and indexable, for example `/shop/pumps/neptune-eco-inverter-1-5hp`.
- No placeholder production content: product images, PDFs, Stripe, admin and checkout must be real before launch.

## Safe next implementation sequence

1. Create a new Next.js/PostgreSQL shop application alongside the static site or in a separate repository, with documented deployment path and rollback.
2. Define the database schema and migrations for products, variants, hazardous flags, orders, customers, discounts, settings and domain configs.
3. Build import tooling for PoolTrackr and admin-reviewed product enrichment before exposing products publicly.
4. Build storefront category/product pages with SSR/SSG and SEO schema.
5. Build cart and guest checkout with Stripe Payment Element plus non-card payment statuses.
6. Build `/shop/admin` CRUD and settings screens with protected access.
7. Run full end-to-end checkout tests in Stripe test mode, including webhooks and non-card flows.
8. Cut over `/shop` routing only after the Next.js service, secrets, database and monitoring are live.
