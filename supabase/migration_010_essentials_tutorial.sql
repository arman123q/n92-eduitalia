-- =====================================================================
-- migration_010_essentials_tutorial.sql — "How to Use This Guide"
-- tutorial video configuration for Student Essentials.
-- FOR OWNER REVIEW — do not run until approved. Run BY THE OWNER in
-- the Supabase SQL Editor. Independent of migration_009 (which must
-- NOT be rerun); this adds ONE new, empty, single-row table.
--
-- The public page fetches the tutorial AT RUNTIME (anon key + RLS,
-- published rows only) so the owner can change the video without a
-- site redeployment. Writes use the same owner-pinned policy as
-- blog_posts / testimonials / essentials. The admin always uses the
-- fixed row id 'main'. No existing table, policy or row is touched.
-- =====================================================================

begin;

create table if not exists public.essentials_tutorial (
  id text primary key,
  video_url text not null default '',
  title text not null default '',
  description text not null default '',
  published boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists trg_essentials_tutorial_touch on public.essentials_tutorial;
create trigger trg_essentials_tutorial_touch before update on public.essentials_tutorial
  for each row execute function public.touch_updated_at();

alter table public.essentials_tutorial enable row level security;

drop policy if exists essentials_tutorial_public_read on public.essentials_tutorial;
create policy essentials_tutorial_public_read on public.essentials_tutorial
  for select to anon, authenticated using (published = true);

drop policy if exists essentials_tutorial_admin_write on public.essentials_tutorial;
create policy essentials_tutorial_admin_write on public.essentials_tutorial
  for all to authenticated
  using ((auth.jwt() ->> 'email') = 'sh10ad786@gmail.com')
  with check ((auth.jwt() ->> 'email') = 'sh10ad786@gmail.com');

revoke all on public.essentials_tutorial from anon, authenticated;
grant select on public.essentials_tutorial to anon, authenticated;
grant insert, update, delete on public.essentials_tutorial to authenticated;

commit;

-- Rollback (only if ever needed; drops ONLY this new table):
--   drop table if exists public.essentials_tutorial;
