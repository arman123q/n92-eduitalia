# N92 Edu-Italia — Implementation Plan (Final Master Specification)

Saved 2026-10-30. This plan implements the FINAL MASTER SPECIFICATION, which
supersedes all earlier stage instructions. Working Stage 3–5 functionality is
preserved; nothing is restarted from scratch.

## Phase 1 inspection result (verified 2026-10-30)

**Stack:** Next.js 15.5 + React 19 + TypeScript (static export), Tailwind CSS
v4, Three.js 0.170 (procedural hero), Playfair Display + Inter. Node 24.
Baseline: production build PASSES, unit tests 10/10 PASS.

**Backup:** `~/workspace/N92EduItalia_BACKUP_stage5_2026-10-30.zip` +
directory snapshot `~/workspace/n92-eduitalia-backup-stage5/`. The delivered
Stage 3–4 and Stage 5 ZIPs are untouched.

**Already complete:** brand design system; responsive shell (header/mobile
menu/footer, official-source links, disclaimers); homepage (hero + CSS/SVG
fallback scene, trust strip, Why-Italy, process, scholarships preview, FAQ,
contact band); Three.js cinematic hero (lazy chunk, reduced-motion/WebGL
fallbacks, pauses off-screen); full eligibility assessment (4 steps,
validation, progress, session persistence, transparent rules engine,
preliminary results, no invented probabilities); demo-mode lead form
(clearly labelled, browser-only); privacy page.

**Missing vs final spec:** 16 of 19 routes; database + auth; admin CMS;
university/course/scholarship directories + detail pages + compare; cost
calculator; counsellor UI; real lead capture + CRM; draft/publish workflow;
media uploads; terms page; custom 404; sitemap/robots; deployment.

## Architecture decisions

1. **Frontend stays a static export** (Cloudflare Pages). The live data layer
   is Supabase, read by the browser at runtime: public pages fetch *published*
   records with the public anon key under Row Level Security. Admin edits
   therefore go live **without a rebuild**. A bundled seed snapshot ships in
   the code for first paint and for the not-yet-connected state; whenever the
   database is not configured, the site labels its data/demo mode clearly
   (spec §19) and never claims leads are saved.
2. **Single-admin security model** (same proven pattern as IELTSwithKaif):
   Supabase Auth, sign-ups OFF, the owner creates the admin user in the
   Supabase dashboard. RLS: `anon` can read published rows only and insert
   leads only; `authenticated` (the admin) can manage content. A `profiles`
   table with a `role` column is included so multi-staff roles can be added
   later without a redesign. The service-role key is never used in the site.
3. **Tables:** `site_content` (key, draft JSON, published JSON, updated_at),
   `content_versions` (rollback snapshots), `universities`, `courses`,
   `scholarships`, `calculator_settings` (single settings row),
   `faqs`, `leads`, `audit_log`, `profiles`. Records carry `status`
   (draft/published), `source_url`, `last_verified`, `academic_year`,
   `verification_status`, `admin_notes` where the spec requires them.
4. **Media:** Supabase Storage bucket `media` — public read, authenticated
   write, image types only, size-capped by policy in the admin UI.
5. **Publishing workflow:** edit → save draft → preview (admin-only view) →
   publish (previous published snapshot copied to `content_versions` for
   rollback) → public site reads published only.
6. **Counsellor:** deterministic FAQ/knowledge search over admin-managed
   `faqs`, clearly labelled "Guidance Assistant — not an AI model", with
   official-source links and an honest "I don't know — ask us" fallback.
7. **Calculator:** pure calculation module (unit-tested) + defaults stored in
   `calculator_settings`, editable in admin; every figure labelled an
   estimate; EUR with an optional dated INR conversion input.

## Owner's manual steps (only these need Shad)

1. **Now:** create the N92 Supabase project (exact taps in the chat message)
   and send the Project URL + publishable/anon key (public-safe values).
2. **Phase 3 checkpoint:** paste-run the provided `schema.sql` in the
   Supabase SQL Editor; create the admin user (Authentication → Users) and
   switch OFF public sign-ups.
3. **Deploy stage:** upload to GitHub (proven web-upload route) → Cloudflare
   Pages, same as IELTSwithKaif; then the 3D hero and full site get a real
   public-browser verification.

## Honest limitations

- The 3D hero remains **NOT visually verified** until the site is publicly
  deployed (the agent browser cannot reach this machine's localhost).
- Free tiers (Supabase, Cloudflare) have quotas and can change; documented in
  the setup guide at delivery.
- Legal/GDPR texts are sensible templates, not legal advice.
