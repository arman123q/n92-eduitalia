-- =====================================================================
-- N92 Edu-Italia — Migration 003: least-privilege grants for `authenticated`
-- STATUS: VERIFIED & APPROVED BY OWNER (30 Oct 2026) — final version.
--
-- Why: migration 002 granted the admin role DML on ALL public tables
-- (present and future). RLS policies still gate every row, and public
-- sign-ups are OFF, so today's exposure is limited — but least-privilege
-- is safer: if a future table were ever created without RLS, or a policy
-- misconfigured, broad grants would leave nothing underneath to catch it.
--
-- What this does:
--   * Revokes the blanket grant + future-table default privileges.
--   * Grants full DML only where the admin app needs it.
--   * audit_log becomes append-only for the admin role (SELECT + INSERT;
--     no UPDATE/DELETE at the privilege layer, regardless of policies).
--   * profiles becomes SELECT-only (row policy already limits to own row).
--   * The anon (public) role is NOT touched — it is already minimal.
-- No data is created, changed or deleted. Safe to re-run.
-- =====================================================================

revoke select, insert, update, delete on all tables in schema public from authenticated;
alter default privileges in schema public
  revoke select, insert, update, delete on tables from authenticated;

-- Content & records the admin manages daily.
grant select, insert, update, delete on
  public.universities, public.courses, public.scholarships, public.faqs,
  public.site_content, public.content_versions, public.calculator_settings
  to authenticated;

-- Leads CRM: read, update (status/notes), delete (retention), insert.
grant select, insert, update, delete on public.leads to authenticated;

-- Audit log: append-only.
grant select, insert on public.audit_log to authenticated;

-- Profiles: read own row only (enforced again by its RLS policy).
grant select on public.profiles to authenticated;
