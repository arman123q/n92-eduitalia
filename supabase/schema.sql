-- =====================================================================
-- N92 Edu-Italia — COMPLETE DATABASE SCHEMA (Final Master Specification)
-- Run ONCE in the Supabase SQL Editor for the N92 project, BEFORE seed.sql.
-- Safe to re-run: uses IF NOT EXISTS / DROP POLICY IF EXISTS guards.
--
-- Security model:
--   * Row Level Security ON for every table.
--   * anon (public website key): read PUBLISHED content only; insert leads
--     only; read calculator defaults. Nothing else.
--   * authenticated (the signed-in admin): full management access.
--   * The service-role key is NEVER used by the website.
--   * Public sign-ups must be switched OFF in Supabase Auth settings, and
--     the first admin is created manually in the dashboard.
-- =====================================================================

create extension if not exists pgcrypto;

-- ---------- updated_at helper ----------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end; $$;

-- ---------- profiles (admin users & roles) ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  role text not null default 'editor' check (role in ('owner', 'editor')),
  created_at timestamptz not null default now()
);

create or replace function public.handle_new_admin()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email) values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_admin();

-- ---------- site content (CMS sections, draft + published) ----------
create table if not exists public.site_content (
  key text primary key,
  title text not null,
  draft jsonb not null default '{}'::jsonb,
  published jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
drop trigger if exists trg_site_content_touch on public.site_content;
create trigger trg_site_content_touch before update on public.site_content
  for each row execute function public.touch_updated_at();

-- ---------- content versions (rollback snapshots) ----------
create table if not exists public.content_versions (
  id uuid primary key default gen_random_uuid(),
  entity text not null,
  entity_key text not null,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid
);

-- ---------- universities ----------
create table if not exists public.universities (
  id text primary key,
  slug text not null unique,
  name text not null,
  city text not null default '',
  region text not null default '',
  type text not null default 'Public',
  website text not null default '',
  application_url text not null default '',
  degree_levels text[] not null default '{}',
  subjects text[] not null default '{}',
  languages text[] not null default '{}',
  tuition_note text not null default 'Not verified',
  admission_note text not null default '',
  academic_year text not null default '2026/27',
  source_url text not null default '',
  last_verified date,
  verification_status text not null default 'needs-review'
    check (verification_status in ('verified', 'needs-review', 'expired')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_universities_status on public.universities (status);
drop trigger if exists trg_universities_touch on public.universities;
create trigger trg_universities_touch before update on public.universities
  for each row execute function public.touch_updated_at();

-- ---------- courses ----------
create table if not exists public.courses (
  id text primary key,
  slug text not null unique,
  name text not null,
  university_id text not null references public.universities (id) on delete cascade,
  level text not null default 'master',
  subject text not null default '',
  language text not null default 'english',
  duration_years numeric,
  credits int,
  requirements text not null default '',
  tuition_note text not null default 'Not verified',
  deadline_note text not null default 'Check the official programme page.',
  official_url text not null default '',
  academic_year text not null default '2026/27',
  source_url text not null default '',
  last_verified date,
  verification_status text not null default 'needs-review'
    check (verification_status in ('verified', 'needs-review', 'expired')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_courses_status on public.courses (status);
create index if not exists idx_courses_university on public.courses (university_id);
drop trigger if exists trg_courses_touch on public.courses;
create trigger trg_courses_touch before update on public.courses
  for each row execute function public.touch_updated_at();

-- ---------- scholarships ----------
create table if not exists public.scholarships (
  id text primary key,
  slug text not null unique,
  name text not null,
  provider text not null default '',
  kind text not null default 'other',
  academic_year text not null default '2026/27',
  geographic_eligibility text not null default '',
  student_eligibility text not null default '',
  degree_levels text[] not null default '{}',
  requirements text not null default '',
  documents text[] not null default '{}',
  procedure text not null default '',
  opens_note text not null default '',
  closes_note text not null default '',
  benefits text not null default '',
  official_url text not null default '',
  source_url text not null default '',
  last_verified date,
  verification_status text not null default 'needs-review'
    check (verification_status in ('verified', 'needs-review', 'expired')),
  status text not null default 'draft' check (status in ('draft', 'published')),
  admin_notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists idx_scholarships_status on public.scholarships (status);
drop trigger if exists trg_scholarships_touch on public.scholarships;
create trigger trg_scholarships_touch before update on public.scholarships
  for each row execute function public.touch_updated_at();

-- ---------- calculator settings (single row) ----------
create table if not exists public.calculator_settings (
  id int primary key check (id = 1),
  value jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid
);
drop trigger if exists trg_calc_touch on public.calculator_settings;
create trigger trg_calc_touch before update on public.calculator_settings
  for each row execute function public.touch_updated_at();

-- ---------- FAQs / counsellor knowledge ----------
create table if not exists public.faqs (
  id text primary key,
  category text not null default 'General',
  question text not null,
  answer text not null,
  source_url text,
  status text not null default 'draft' check (status in ('draft', 'published')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
drop trigger if exists trg_faqs_touch on public.faqs;
create trigger trg_faqs_touch before update on public.faqs
  for each row execute function public.touch_updated_at();

-- ---------- leads / enquiries (PRIVATE) ----------
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 120),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  whatsapp text check (whatsapp is null or char_length(whatsapp) <= 32),
  phone text check (phone is null or char_length(phone) <= 32),
  preferred_contact text,
  intake text,
  degree_level text,
  subject_interest text,
  budget_range text,
  summary text check (summary is null or char_length(summary) <= 1000),
  message text check (message is null or char_length(message) <= 2000),
  consent boolean not null default false,
  marketing_consent boolean not null default false,
  status text not null default 'new'
    check (status in ('new', 'contacted', 'follow-up', 'consultation-booked', 'closed')),
  assigned_to text,
  internal_notes text,
  follow_up_date date
);
create index if not exists idx_leads_status on public.leads (status);
create index if not exists idx_leads_created on public.leads (created_at desc);

-- ---------- audit log ----------
create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  actor uuid,
  action text not null,
  entity text not null,
  entity_id text,
  detail jsonb,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- ROW LEVEL SECURITY
-- =====================================================================
alter table public.profiles enable row level security;
alter table public.site_content enable row level security;
alter table public.content_versions enable row level security;
alter table public.universities enable row level security;
alter table public.courses enable row level security;
alter table public.scholarships enable row level security;
alter table public.calculator_settings enable row level security;
alter table public.faqs enable row level security;
alter table public.leads enable row level security;
alter table public.audit_log enable row level security;

-- profiles: a signed-in user can see only their own profile row.
drop policy if exists "profiles: read own" on public.profiles;
create policy "profiles: read own" on public.profiles
  for select to authenticated using (id = auth.uid());

-- Published content: public read.
drop policy if exists "universities: public read published" on public.universities;
create policy "universities: public read published" on public.universities
  for select to anon using (status = 'published');
drop policy if exists "courses: public read published" on public.courses;
create policy "courses: public read published" on public.courses
  for select to anon using (status = 'published');
drop policy if exists "scholarships: public read published" on public.scholarships;
create policy "scholarships: public read published" on public.scholarships
  for select to anon using (status = 'published');
drop policy if exists "faqs: public read published" on public.faqs;
create policy "faqs: public read published" on public.faqs
  for select to anon using (status = 'published');
drop policy if exists "site_content: public read published" on public.site_content;
create policy "site_content: public read published" on public.site_content
  for select to anon using (published is not null);
drop policy if exists "calculator: public read" on public.calculator_settings;
create policy "calculator: public read" on public.calculator_settings
  for select to anon, authenticated using (true);

-- Admin (authenticated): full management of content tables.
do $$
declare t text;
begin
  for t in select unnest(array['site_content','content_versions','universities','courses','scholarships','calculator_settings','faqs','audit_log'])
  loop
    execute format('drop policy if exists "admin: full access" on public.%I', t);
    execute format('create policy "admin: full access" on public.%I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

-- Leads: public may ONLY insert; only the admin may read/update/delete.
drop policy if exists "leads: public submit" on public.leads;
create policy "leads: public submit" on public.leads
  for insert to anon, authenticated with check (true);
drop policy if exists "leads: admin manage" on public.leads;
create policy "leads: admin manage" on public.leads
  for all to authenticated using (true) with check (true);

-- =====================================================================
-- STORAGE: media bucket (public read, admin write)
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('media', 'media', true)
on conflict (id) do nothing;

drop policy if exists "media: public read" on storage.objects;
create policy "media: public read" on storage.objects
  for select to anon, authenticated using (bucket_id = 'media');
drop policy if exists "media: admin write" on storage.objects;
create policy "media: admin write" on storage.objects
  for insert to authenticated with check (bucket_id = 'media');
drop policy if exists "media: admin update" on storage.objects;
create policy "media: admin update" on storage.objects
  for update to authenticated using (bucket_id = 'media') with check (bucket_id = 'media');
drop policy if exists "media: admin delete" on storage.objects;
create policy "media: admin delete" on storage.objects
  for delete to authenticated using (bucket_id = 'media');

-- =====================================================================
-- TABLE PRIVILEGES (added after the first live test — error 42501)
-- Tables created via the SQL Editor do not always receive default
-- API-role privileges. GRANTs only assign permissions; RLS above still
-- restricts which rows each role can access. Idempotent.
-- =====================================================================
grant usage on schema public to anon, authenticated;
grant select on public.universities, public.courses, public.scholarships,
  public.faqs, public.calculator_settings, public.site_content to anon;
grant insert on public.leads to anon;
grant select, insert, update, delete on all tables in schema public to authenticated;
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
