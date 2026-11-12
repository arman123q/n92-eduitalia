# N92 Edu-Italia — Installation & Deployment Instructions

This package is the COMPLETE source of the existing N92 Edu-Italia
website (including the Student Portal upgrade of 9 Nov 2026). It is
not a new project: deploy it over the existing GitHub repository and
the existing Cloudflare Pages project, with the existing Supabase
database. Do NOT create a new Cloudflare project or a new database.

## 1. Requirements

- **Node.js 22.22.2 or newer (22.x), or 24.15.0+, or 26+.** This is a
  hard requirement from the lockfile: `jsdom` 30.x and
  `isomorphic-dompurify` 4.6.0 (and their `@asamuzakjp/*` /
  `w3c-xmlserializer` dependencies) declare
  `engines: ^22.22.2 || ^24.15.0 || >=26.0.0`. An older Node 22
  (e.g. 22.16.0) is outside every allowed range and `npm ci` fails.
- The project root contains `.nvmrc` pinning **22.22.2** exactly.
  With nvm: `nvm install` then `nvm use` in the project root.
  Cloudflare Pages reads `.nvmrc` first (it does NOT read the
  `engines` field of package.json), so the existing Pages project
  will build with 22.22.2 on the next push with no dashboard change;
  the project's existing `NODE_VERSION=22` setting remains a valid
  fallback.
- npm (lockfile `package-lock.json` is included — use it as-is)

## 2. Dependencies

All dependencies are declared in `package.json` / `package-lock.json`
and installed with one command. **This upgrade added NO new
dependencies** — the Excel export uses `xlsx` (SheetJS), which was
already a dependency of the products importer.

```bash
npm ci
```

(`npm ci` installs exactly what the lockfile specifies — use it
instead of `npm install` for a reproducible clean install.)

Runtime dependencies (all in package.json): next ^15.1.6 (lockfile resolves 15.5.x), react/react-dom 19, three, xlsx, lucide-react, @tiptap (blog editor), isomorphic-dompurify.
Dev dependencies include typescript, tailwindcss v4, playwright-core
(test scaffolding only).

## 3. Environment variables

Create `.env.local` in the project root (it is intentionally NOT in
this ZIP — your existing local copy must be kept):

```
NEXT_PUBLIC_SUPABASE_URL=<your existing Supabase project URL>
NEXT_PUBLIC_SUPABASE_ANON_KEY=<your existing anon/publishable key>
```

These are the same two variables the live site already uses; nothing
new is required. The service-role key is never used by this codebase.

## 4. Build & test locally (optional verification)

```bash
npm test          # unit suite — expected: 118/118 pass
npm run build     # production build — expected: exit 0, static export in out/ (140 HTML pages)
```

Verified end-to-end from this package on 12 Nov 2026 — see
`docs/NODE_AND_BUILD_VERIFICATION.md` for the exact environment,
commands and results.

## 5. Deploy (existing route — owner performs this step)

1. Copy the contents of this package over your local `n92-eduitalia`
   clone (Replace/Overwrite when asked). Your `.env.local` is not in
   the ZIP, so it stays untouched.
2. GitHub Desktop → Current Repository: `n92-eduitalia` → review the
   changes → Commit to `main` → **Push origin**.
3. Cloudflare Pages (existing `n92-eduitalia` project) builds
   automatically from the push: build command `npm run build`,
   output `out`, environment variables already set — change nothing.
4. Verify live: /admin/ shows the Student Portal tab with the new
   student list; a student's Manage view shows the Profile Overview;
   the homepage header shows "Student Login".

## 6. Migration 014 (profile photos) — SEPARATE, APPROVAL-GATED

Photo upload/display activates only after Migration 014 is applied.
It was NOT executed with this package.

1. Supabase Dashboard → SQL Editor → paste
   `docs/migration-014/Migration_014_Student_Avatars.sql` → Run.
2. Run `docs/migration-014/Migration_014_Verification.sql` and check
   the expected results written above each query.
3. Rollback (only if ever needed):
   `docs/migration-014/Migration_014_Rollback.sql` — removes the
   bucket, its policies and any uploaded photos; nothing else.

## 7. What stays OFF by design

- Supabase public signup: OFF (accounts are created by the N92 team).
- Google OAuth provider: unchanged (enable only on the owner's
  explicit instruction, with redirect URLs, as a separate step).
- No database policy was changed by the frontend code in this package.
