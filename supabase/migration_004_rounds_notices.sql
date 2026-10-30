-- =====================================================================
-- N92 Edu-Italia — Migration 004: Admission Rounds & Important Notices
-- Run ONCE in the Supabase SQL Editor, AFTER migrations 002 and 003.
-- Creates TWO new tables only. No existing table, policy or row is
-- modified or deleted. Safe to re-run (IF NOT EXISTS / policy guards).
--
-- Security model (same as the rest of the project):
--   * RLS enabled on both tables.
--   * anon (public): SELECT on published rows only. Grants are explicit
--     and least-privilege (no blanket grants are added).
--   * authenticated (the admin): full management via policy + grant.
--   * Deadlines are NEVER auto-invented: `deadline_verified` stays false
--     until the admin confirms the date against an official source.
-- =====================================================================

create table if not exists public.admission_rounds (
  id text primary key,
  university_id text references public.universities (id) on delete set null,
  university_name text not null,
  programme_name text,
  intake_year int,
  intake_semester text, -- Fall | Spring | Full Year
  round_name text not null default 'First Call'
    check (round_name in ('First Call', 'Second Call', 'Third Call', 'Custom Round')),
  custom_round_label text,
  opens_at timestamptz,
  deadline_at timestamptz,
  deadline_verified boolean not null default false,
  manual_status text
    check (manual_status is null or manual_status in ('results-published', 'awaiting-confirmation')),
  official_url text,
  source_url text,
  last_verified date,
  message text,
  pinned boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_rounds_status on public.admission_rounds (status);
create index if not exists idx_rounds_deadline on public.admission_rounds (deadline_at);
drop trigger if exists trg_rounds_touch on public.admission_rounds;
create trigger trg_rounds_touch before update on public.admission_rounds
  for each row execute function public.touch_updated_at();

create table if not exists public.notices (
  id text primary key,
  title text not null,
  message text not null default '',
  category text not null default 'University admission calls',
  priority text not null default 'normal'
    check (priority in ('low', 'normal', 'high', 'urgent')),
  starts_at timestamptz,
  ends_at timestamptz,
  source_url text,
  last_verified date,
  link_text text,
  link_url text,
  pinned boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_notices_status on public.notices (status);
drop trigger if exists trg_notices_touch on public.notices;
create trigger trg_notices_touch before update on public.notices
  for each row execute function public.touch_updated_at();

alter table public.admission_rounds enable row level security;
alter table public.notices enable row level security;

drop policy if exists "rounds: public read published" on public.admission_rounds;
create policy "rounds: public read published" on public.admission_rounds
  for select to anon using (status = 'published');
drop policy if exists "notices: public read published" on public.notices;
create policy "notices: public read published" on public.notices
  for select to anon using (status = 'published');
drop policy if exists "admin: full access" on public.admission_rounds;
create policy "admin: full access" on public.admission_rounds
  for all to authenticated using (true) with check (true);
drop policy if exists "admin: full access" on public.notices;
create policy "admin: full access" on public.notices
  for all to authenticated using (true) with check (true);

-- Least-privilege grants (consistent with migration 003).
grant select on public.admission_rounds, public.notices to anon;
grant select, insert, update, delete on public.admission_rounds, public.notices to authenticated;
