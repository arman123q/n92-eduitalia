-- =====================================================================
-- N92 Edu-Italia — Migration 007: Student Testimonials & Reviews
-- Run ONCE in the Supabase SQL Editor, AFTER migrations 002 and 003.
--
-- WHAT THIS FILE DOES (complete list — nothing else):
--   1. Re-declares the existing helper function touch_updated_at()
--      with CREATE OR REPLACE and a body IDENTICAL to the one already
--      in your database from schema.sql. This changes nothing; it only
--      makes this file self-contained.
--   2. Creates ONE new table: public.testimonials (starts EMPTY —
--      no rows are inserted by this migration, ever).
--   3. Creates one index and one updated_at trigger on that new table.
--   4. Enables RLS on the new table and creates two policies on it.
--   5. Adds least-privilege grants on the new table only.
--
-- WHAT IT NEVER DOES:
--   * No existing table is created, altered or dropped.
--   * No existing row anywhere is inserted, updated or deleted.
--   * No existing policy or grant is changed.
--   * Safe to re-run: every statement is IF NOT EXISTS / CREATE OR
--     REPLACE / DROP ... IF EXISTS-guarded, so a second run is a no-op
--     and preserves any testimonials you have already added.
--
-- Security & honesty model (owner's exact requirements):
--   1. Public visitors (anon) can READ only reviews that are BOTH
--      published AND permission_confirmed.
--   2. ONLY the owner's actual Admin account — identified by the
--      email in its login token, sh10ad786@gmail.com — can add, edit,
--      approve, publish, unpublish or delete reviews.
--   3. Any OTHER authenticated user gets read-only access at most
--      (the same published + permission-confirmed rows the public
--      sees). They cannot insert, update or delete — enforced by the
--      policies below, not just by hiding buttons.
--   4. A review can never become publicly visible without the admin's
--      approval (status = 'published', settable only by the admin)
--      AND the student's confirmed permission (checked in the public
--      read policy itself).
--   * NO seed reviews: only genuine testimonials, added by the admin
--     with the student's permission, may ever appear on the website.
--   * This identity restriction applies to the testimonials table.
--     All other tables keep their existing, previously reviewed
--     policies — the Admin Dashboard is unaffected.
--
-- ROLLBACK: see the commented section at the very end of this file.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Helper function (already exists in your database — identical body)
-- ---------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ---------------------------------------------------------------------
-- 2. New table: testimonials (created EMPTY)
-- ---------------------------------------------------------------------
create table if not exists public.testimonials (
  id text primary key,
  display_name text not null,
  photo_url text,
  university_name text not null default '',
  programme text not null default '',
  country text not null default '',
  service_category text not null default 'university-admission'
    check (service_category in ('university-admission', 'visa-guidance', 'scholarship-assistance', 'ielts-coaching', 'accommodation-arrival')),
  review_text text not null default '',
  review_date date,
  source text not null default 'manual'
    check (source in ('manual', 'google')),
  permission_confirmed boolean not null default false,
  featured boolean not null default false,
  status text not null default 'draft'
    check (status in ('draft', 'published')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_testimonials_status on public.testimonials (status);
drop trigger if exists trg_testimonials_touch on public.testimonials;
create trigger trg_testimonials_touch before update on public.testimonials
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------
-- 3. Row Level Security + policies (new table only)
-- ---------------------------------------------------------------------
alter table public.testimonials enable row level security;

-- (1) Public visitors: read published + permission-confirmed only.
drop policy if exists "testimonials: public read published+permitted" on public.testimonials;
create policy "testimonials: public read published+permitted" on public.testimonials
  for select to anon using (status = 'published' and permission_confirmed);

-- (3) Any other signed-in user: the same read-only access, nothing more.
drop policy if exists "testimonials: signed-in read published+permitted" on public.testimonials;
create policy "testimonials: signed-in read published+permitted" on public.testimonials
  for select to authenticated using (status = 'published' and permission_confirmed);

-- (2) ONLY the owner's Admin account can write. The account is pinned
-- by the email claim inside its Supabase login token — a different
-- signed-in user fails this check on every INSERT/UPDATE/DELETE.
-- (Replaces the earlier "admin: full access" draft policy, which
-- allowed any authenticated session; drop it if a draft was ever run.)
drop policy if exists "admin: full access" on public.testimonials;
drop policy if exists "testimonials: owner admin full access" on public.testimonials;
create policy "testimonials: owner admin full access" on public.testimonials
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'sh10ad786@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'sh10ad786@gmail.com');

-- ---------------------------------------------------------------------
-- 4. Least-privilege grants (new table only; consistent with
--    migrations 003 and 004)
-- ---------------------------------------------------------------------
grant select on public.testimonials to anon;
grant select, insert, update, delete on public.testimonials to authenticated;

-- =====================================================================
-- ROLLBACK (only if you ever want to undo Migration 007 completely)
-- ---------------------------------------------------------------------
-- To roll back, copy the statements below (without the leading "-- ")
-- into the Supabase SQL Editor and run them. This removes ONLY the
-- testimonials table and everything attached to it. It does not touch
-- any other table or any other data. WARNING: rolling back deletes any
-- testimonials you have added to the table.
--
-- drop trigger if exists trg_testimonials_touch on public.testimonials;
-- drop policy if exists "testimonials: public read published+permitted" on public.testimonials;
-- drop policy if exists "testimonials: signed-in read published+permitted" on public.testimonials;
-- drop policy if exists "testimonials: owner admin full access" on public.testimonials;
-- drop table if exists public.testimonials;
--
-- (The touch_updated_at() function is shared by all tables and must
-- NOT be dropped.)
-- =====================================================================
