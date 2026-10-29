-- N92 Edu-Italia — leads table for a LATER stage (do not run yet).
-- Stage 3/4 runs in demo mode: no database is connected and the website
-- states this clearly. When the project reaches the lead-backend stage:
--   1. Create a free Supabase project for N92 Edu-Italia.
--   2. Run this file once in the SQL Editor.
--   3. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY
--      (see .env.example) and rebuild.
-- Security model: Row Level Security is ON. The public (anon) key may only
-- INSERT an enquiry. Nobody using the public key can read, update or delete
-- any lead. The site owner reviews leads in the Supabase dashboard
-- (Table Editor) while logged in as the project owner.

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  name text not null check (char_length(name) between 2 and 120),
  email text check (email is null or email ~ '^[^@\s]+@[^@\s]+\.[^@\s]+$'),
  whatsapp text check (whatsapp is null or char_length(whatsapp) <= 32),
  marketing_consent boolean not null default false,
  summary text check (summary is null or char_length(summary) <= 500),
  status text not null default 'new',
  internal_notes text
);

alter table public.leads enable row level security;

-- Insert-only for the public website key.
drop policy if exists "public can submit an enquiry" on public.leads;
create policy "public can submit an enquiry"
  on public.leads for insert
  to anon, authenticated
  with check (true);

-- No select/update/delete policies for anon or authenticated:
-- only the project owner (dashboard / service role) can read leads.
