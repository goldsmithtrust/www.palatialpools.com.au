create extension if not exists pgcrypto;

create type account_role as enum ('customer', 'admin');
create type customer_segment as enum ('new', 'returning', 'vip', 'wholesale', 'trade');
create type order_status as enum ('draft', 'awaiting_payment', 'paid', 'processing', 'pickup_ready', 'shipped', 'completed', 'cancelled', 'refunded');
create type payment_method_kind as enum ('stripe_card', 'bank_transfer', 'cash_on_pickup', 'phone_card');
create type fulfilment_method as enum ('shipping_standard', 'shipping_express', 'click_collect', 'local_delivery');

create table if not exists shop_users (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  password_hash text,
  google_sub text unique,
  role account_role not null default 'customer',
  segment customer_segment not null default 'new',
  first_name text,
  last_name text,
  phone text,
  total_spend_cents integer not null default 0,
  order_count integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shop_addresses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references shop_users(id) on delete cascade,
  label text,
  line1 text not null,
  line2 text,
  suburb text not null,
  state text not null,
  postcode text not null,
  country text not null default 'AU',
  is_default boolean not null default false
);

create table if not exists shop_equipment_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references shop_users(id) on delete cascade,
  pool_volume_litres integer,
  postcode text,
  pool_type text,
  usage_pattern text,
  existing_equipment jsonb not null default '{}'::jsonb,
  special_requirements text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table if not exists shop_categories (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text not null,
  seo_title text,
  seo_description text,
  sort_order integer not null default 0
);

create table if not exists shop_products (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  category_slug text not null references shop_categories(slug),
  name text not null,
  brand text,
  sku text unique,
  description text not null,
  long_description text not null,
  price_cents integer,
  contact_for_price boolean not null default false,
  stock_status text not null default 'in_stock',
  stock_quantity integer,
  hazardous boolean not null default false,
  hazard_class text,
  pickup_only boolean not null default false,
  gst_included boolean not null default true,
  images jsonb not null default '[]'::jsonb,
  documents jsonb not null default '[]'::jsonb,
  variants jsonb not null default '[]'::jsonb,
  specs jsonb not null default '{}'::jsonb,
  seo_title text,
  seo_description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shop_wishlists (
  user_id uuid references shop_users(id) on delete cascade,
  product_id uuid references shop_products(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, product_id)
);

create table if not exists shop_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text unique not null,
  user_id uuid references shop_users(id),
  guest_email text,
  guest_phone text,
  status order_status not null default 'draft',
  payment_method payment_method_kind,
  payment_reference text,
  stripe_payment_intent_id text,
  fulfilment fulfilment_method not null,
  shipping_address jsonb,
  billing_address jsonb,
  subtotal_cents integer not null,
  discount_cents integer not null default 0,
  shipping_cents integer not null default 0,
  gst_cents integer not null,
  total_cents integer not null,
  hazardous_blocked_shipping boolean not null default false,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists shop_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references shop_orders(id) on delete cascade,
  product_id uuid references shop_products(id),
  product_slug text not null,
  name text not null,
  sku text,
  quantity integer not null,
  unit_price_cents integer not null,
  discount_cents integer not null default 0,
  hazardous boolean not null default false,
  pickup_only boolean not null default false
);

create table if not exists shop_discount_rules (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  code text unique,
  type text not null,
  value numeric not null,
  conditions jsonb not null default '{}'::jsonb,
  active boolean not null default true,
  starts_at timestamptz,
  ends_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists shop_settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists shop_import_batches (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  status text not null default 'draft',
  items jsonb not null default '[]'::jsonb,
  created_by uuid references shop_users(id),
  created_at timestamptz not null default now()
);

create index if not exists shop_products_category_idx on shop_products(category_slug);
create index if not exists shop_orders_status_idx on shop_orders(status);
create index if not exists shop_orders_user_idx on shop_orders(user_id);
