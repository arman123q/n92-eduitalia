-- =====================================================================
-- migration_009_student_essentials.sql — Student Essentials tables
-- (checklist categories + items, products catalogue).
-- FOR OWNER REVIEW — do not run until approved. Run BY THE OWNER in
-- the Supabase SQL Editor, after migration_008.
--
-- Adds THREE new, empty tables. No existing table, policy, function
-- or row is modified. The existing trigger function
-- touch_updated_at() is only REFERENCED (never created or replaced).
--
-- Security model (identical to blog_posts / testimonials):
--   * Public (anon + any signed-in user): read PUBLISHED rows only.
--   * Writes: ONE policy per table pinned to the owner's admin
--     account by email in the JWT. Any other authenticated user is
--     read-only at most. No service-role key anywhere.
--   * Student lead data is not touched by this migration.
--
-- Products store marketplace offers and specs as jsonb arrays,
-- validated by the admin UI and rendered defensively by the site:
--   offers: [{ marketplace, marketplaceLabel, productUrl,
--              affiliateUrl, price, currency, lastVerifiedDate,
--              availability }]
--   specs:  [{ label, value }]
--   images: [url, ...]  (additional images; image_url is primary)
-- Prices are NEVER invented by the site: an offer without a price
-- or a verification date renders as "Check current price".
-- =====================================================================

begin;

create table if not exists public.checklist_categories (
  code text primary key,
  name text not null,
  intro text not null default '',
  pack_location text not null default '',
  display_order integer not null default 0,
  published boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.checklist_items (
  id text primary key,
  category_code text not null references public.checklist_categories(code) on delete restrict,
  name text not null,
  description text not null default '',
  note text not null default '',
  italy_status text not null default 'review'
    check (italy_status in ('applicable', 'review', 'not-applicable')),
  published boolean not null default false,
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists checklist_items_category_idx
  on public.checklist_items (category_code, display_order);

create table if not exists public.essential_products (
  id text primary key,
  name text not null,
  description text not null default '',
  category text not null default '',
  image_url text not null default '',
  images jsonb not null default '[]'::jsonb,
  specs jsonb not null default '[]'::jsonb,
  offers jsonb not null default '[]'::jsonb,
  status text not null default 'draft' check (status in ('draft', 'published')),
  display_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_checklist_categories_touch on public.checklist_categories;
create trigger trg_checklist_categories_touch before update on public.checklist_categories
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_checklist_items_touch on public.checklist_items;
create trigger trg_checklist_items_touch before update on public.checklist_items
  for each row execute function public.touch_updated_at();

drop trigger if exists trg_essential_products_touch on public.essential_products;
create trigger trg_essential_products_touch before update on public.essential_products
  for each row execute function public.touch_updated_at();

alter table public.checklist_categories enable row level security;
alter table public.checklist_items enable row level security;
alter table public.essential_products enable row level security;

drop policy if exists checklist_categories_public_read on public.checklist_categories;
create policy checklist_categories_public_read on public.checklist_categories
  for select to anon, authenticated using (published = true);

drop policy if exists checklist_categories_admin_write on public.checklist_categories;
create policy checklist_categories_admin_write on public.checklist_categories
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'sh10ad786@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'sh10ad786@gmail.com');

drop policy if exists checklist_items_public_read on public.checklist_items;
create policy checklist_items_public_read on public.checklist_items
  for select to anon, authenticated using (published = true);

drop policy if exists checklist_items_admin_write on public.checklist_items;
create policy checklist_items_admin_write on public.checklist_items
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'sh10ad786@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'sh10ad786@gmail.com');

drop policy if exists essential_products_public_read on public.essential_products;
create policy essential_products_public_read on public.essential_products
  for select to anon, authenticated using (status = 'published');

drop policy if exists essential_products_admin_write on public.essential_products;
create policy essential_products_admin_write on public.essential_products
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'sh10ad786@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'sh10ad786@gmail.com');

revoke all on public.checklist_categories from anon, authenticated;
revoke all on public.checklist_items from anon, authenticated;
revoke all on public.essential_products from anon, authenticated;
grant select on public.checklist_categories to anon, authenticated;
grant select on public.checklist_items to anon, authenticated;
grant select on public.essential_products to anon, authenticated;
grant insert, update, delete on public.checklist_categories to authenticated;
grant insert, update, delete on public.checklist_items to authenticated;
grant insert, update, delete on public.essential_products to authenticated;

commit;

-- Rollback (only if ever needed; drops ONLY these three new tables):
--   drop table if exists public.essential_products;
--   drop table if exists public.checklist_items;
--   drop table if exists public.checklist_categories;
