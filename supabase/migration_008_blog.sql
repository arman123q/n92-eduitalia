-- =====================================================================
-- migration_008_blog.sql — Blog / Articles CMS table (owner-approved
-- 3 Nov 2026; to be run BY THE OWNER in the Supabase SQL Editor).
--
-- Adds ONE new, empty table: public.blog_posts. No existing table,
-- policy, function or row is modified. The shared trigger function
-- touch_updated_at() already exists in production (created by the
-- original schema and used by every existing table); per the
-- owner's instruction this migration deliberately does NOT create,
-- replace or otherwise modify it — the blog_posts trigger below
-- simply references the existing function.
--
-- Security model:
--   * Public (anon + any signed-in user): read PUBLISHED posts only.
--   * Writes (insert/update/delete, drafts included): ONE policy
--     pinned to the owner's admin account by email in the JWT —
--     the same owner-pinned model as testimonials (migration_007).
--     Any other authenticated user is read-only at most.
--   * Least-privilege GRANTs in the migration_003 style; the
--     publishable/anon key stays safe because RLS decides.
--   * No service-role key is used anywhere (and never in frontend code).
-- =====================================================================

begin;

create table if not exists public.blog_posts (
  id text primary key,
  slug text not null unique,
  title text not null,
  excerpt text not null default '',
  content_html text not null default '',
  seo_title text not null default '',
  meta_description text not null default '',
  focus_keyword text not null default '',
  featured_image_url text not null default '',
  image_alt text not null default '',
  author_name text not null default 'N92 Edu-Italia',
  category text not null default 'Study in Italy',
  tags text not null default '',
  published_date date,
  status text not null default 'draft'
    check (status in ('draft','published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists blog_posts_public_idx
  on public.blog_posts (status, published_date desc);

drop trigger if exists blog_posts_touch on public.blog_posts;
create trigger blog_posts_touch
  before update on public.blog_posts
  for each row execute function public.touch_updated_at();

alter table public.blog_posts enable row level security;

-- Public read: published articles only (drafts are invisible).
drop policy if exists blog_public_read on public.blog_posts;
create policy blog_public_read on public.blog_posts
  for select to anon, authenticated
  using (status = 'published');

-- Writes: only the owner's admin account (email pinned in the JWT),
-- covering drafts as well — the FOR ALL policy is also what lets the
-- owner SELECT drafts in the admin; everyone else stays read-only.
drop policy if exists blog_admin_write on public.blog_posts;
create policy blog_admin_write on public.blog_posts
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'sh10ad786@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'sh10ad786@gmail.com');

-- Least-privilege grants (migration_003 pattern).
revoke all on table public.blog_posts from anon, authenticated;
grant select on table public.blog_posts to anon;
grant select, insert, update, delete on table public.blog_posts to authenticated;

commit;

-- Rollback (only if ever needed; the table is new and starts empty —
-- this drops ONLY the blog table, never the shared function):
-- drop table if exists public.blog_posts;
