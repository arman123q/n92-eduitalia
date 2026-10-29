-- =====================================================================
-- N92 Edu-Italia — Migration 002: table privileges (GRANTs)
-- Run ONCE in the Supabase SQL Editor, AFTER schema.sql.
--
-- Why: tables created through the SQL Editor do not always receive the
-- default API-role privileges. Without these GRANTs the REST API returns
-- PostgreSQL error 42501 ("permission denied") even though RLS policies
-- exist. These statements ONLY grant privileges — they create, change
-- and delete NO data, and Row Level Security continues to restrict
-- exactly which rows each role can see or modify.
-- Safe to re-run: GRANTs are idempotent.
-- =====================================================================

-- API roles may use the public schema.
grant usage on schema public to anon, authenticated;

-- Public website visitors (anon): read the public tables, submit leads.
-- RLS further limits reads to PUBLISHED rows only.
grant select on public.universities, public.courses, public.scholarships,
  public.faqs, public.calculator_settings, public.site_content to anon;
grant insert on public.leads to anon;

-- Signed-in administrators (authenticated): full data management.
-- RLS still applies (e.g. profiles remain readable only by their owner).
grant select, insert, update, delete on all tables in schema public to authenticated;

-- Future tables created in this project get the same admin privileges.
alter default privileges in schema public
  grant select, insert, update, delete on tables to authenticated;
