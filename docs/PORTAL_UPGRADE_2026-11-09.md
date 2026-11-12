# N92 Student Portal & Admin Upgrade — Delivery Notes (9 Nov 2026)

Enhancement of the existing, deployed Student Portal. No redesign, no
rebuild, nothing removed. Public signup and Google OAuth remain
DISABLED. Migration 013.1 was NOT re-run; no rollback was run; no live
database change was made by this package.

## Feature summary

### 1. Complete Student Profile in Admin (Student Profile Overview)
Admin → Student Portal → Manage now opens with a read-only
**Student Profile Overview** (sections A–H) fed by a per-student
`select=*` fetch of `student_profiles` plus the student's shortlist:
personal info, profile photo (+ upload date), passport information,
address, study preferences (incl. shortlisted universities/courses),
academic information, English proficiency, additional information.
Empty fields render **"Not provided"**. Fields the database does not
collect (gender, passport expiry, postal code, separate qualification/
institution/subject columns, separate IELTS/TOEFL scores) are NOT
invented — the real free-text fields (`education_history`,
`english_proficiency`) are shown as recorded.
**Passport number:** masked by default (`••••••` + last 2), revealed
only by the owner's deliberate Reveal click. The students LIST query
no longer selects `passport_number` at all; a server-side presence
filter (`passport_number=not.is.null`, returning only user ids) keeps
the completion percentage exact without the value leaving the DB.
**Refresh Profile** reloads the profile, all manage lists and the
student list, so student edits appear immediately.

### 2. Student profile photo upload — code complete, needs Migration 014
My Profile gains a photo section: circular preview, Upload/Change/
Remove, preview before upload, real progress bar, client-side
downscaling of oversized images, JPEG/PNG/WebP ≤ 3 MB validation.
Photos are stored in a NEW private bucket `student-avatars` at
`<user_id>/profile-photo` and shown only via signed URLs. The existing
buckets cannot be used safely (`media` is public; `student-documents`
is student-read-only), so **Migration 014 (in `docs/migration-014/`)
must be approved and run by the owner** before uploads activate;
until then the section shows a clear "being set up" message. Rig
tests of the exact SQL: **17/17 passed** (own-folder isolation,
pending gate, owner read, anon denied, idempotent, rollback clean).

### 3. Excel export (owner-only)
"Export Students to Excel (.xlsx)" + "Export filtered view" buttons
in Admin → Student Portal. Real .xlsx via the existing SheetJS
dependency: worksheet "N92 Students", 18 columns, formatted header,
autofilter, readable widths, registration dates as real Excel dates,
header row frozen (zip-level patch, best-effort with safe fallback —
SheetJS CE cannot emit frozen panes natively). Filtered export
respects the active status tab + search + completion filter.
**Never exported:** passport numbers, passwords, tokens (the column
set is fixed in code and covered by unit tests).

### 4. Student Login in the main menu + new login page
Header: "Student Login" (/student/login/) added as the seventh main
link (desktop bar + mobile menu). The 7-link bar initially overlapped
the CTA cluster by 47px at 1400px; the desktop bar only was tightened
(nav gap/font/padding, Eligibility CTA padding) and re-measured:
clearance +9/+29/+109/+109 px at 1400/1440/1600/1920, no overflow,
Functional Check 13 updated to the seven-link spec — ALL PASSED.
Homepage file itself is byte-identical (checksum-verified).
Login page: distinct **Sign In** card (email + password, show/hide,
Forgot password via Supabase recover — the reset link returns to this
page to set a new password), Google button kept for Google-registered
accounts, and a **Registration** information card (no form) explaining
that accounts are created and approved by the N92 team.

### 5. Improved student management
List rows now show avatar (signed URL or initials), name, email,
status, registration date, preferred intake, target degree, profile
completion chip + bar, and Manage. Filters: status tabs (kept),
profile complete/incomplete, and search by name/email/student ID.
Activation/suspension controls unchanged.

### 6. Profile completion indicator
Computed from the 16 real `student_profiles` fields
(`profileCompletion()` in `lib/student.ts`) — percentage, missing-field
list (shown in the Overview), and photo status reported separately.
Never blocks login.

## Changed files

Modified:
- `components/admin/StudentsManager.tsx` — Overview, refresh, list
  upgrades, search/filters, avatars, export buttons
- `components/Header.tsx` — Student Login link + desktop tightening
- `app/student/login/page.tsx` — Sign In / Forgot / Recovery / Registration
- `app/student/profile/page.tsx` — mounts the photo section
- `scripts/portal-stub.mjs`, `scripts/portal-check.mjs` — test scaffolding
  (richer fixture, avatar endpoints, deterministic arm timing, Q-checks)
- `scripts/functional-check-13.mjs` — seven-link header spec
- `tests/student-lib.test.mjs` — +8 unit tests (119 total)

New:
- `lib/students-export.ts` — export rows/filter/workbook/freeze patch
- `components/student/ProfilePhoto.tsx` — student photo UI
- `lib/student.ts` — appended only: completion helpers, avatar
  constants/validation/storage helpers, password login/reset/update
- `docs/PORTAL_UPGRADE_2026-11-09.md` (this file)
- `docs/migration-014/` — Migration 014 + rollback + verification + report
- `docs/portal-upgrade-screenshots/` — 6 screenshots

Unchanged (checksum-verified where tracked): homepage `app/page.tsx`,
`lib/admin.ts`, `lib/supabase.ts`, `components/CookieConsent.tsx`,
`app/admin/page.tsx`, all CMS/CRM code.

## Test results (all executed, 9 Nov 2026)

- Unit tests: **119/119 PASS** (`npm test`) — incl. completion maths,
  avatar validation, export rows (passport absence asserted), export
  filters, workbook validity + frozen header verified at XML level.
- Portal browser suite (stub backend): **31/31 PASS**, twice —
  P1–P11 (existing portal regression) + Q1–Q7 (overview content,
  passport masked→reveal, Refresh Profile, export buttons owner-only,
  completion indicator, header desktop/mobile + overflow, login page
  structure, photo section, non-owner export denial).
- Functional Check 13 (header): **ALL PASSED** (seven-link spec).
- Production build: **PASS — 144 static pages** (same count as before
  the upgrade), all 11 student routes exported.
- Internal link audit: **PASSED** (37 targets — the +1 is /student/login/).
- Migration 014 rig (local PostgreSQL): **17/17 PASS**.
- NOT tested live: photo upload/display over the real Supabase Storage
  API (requires Migration 014), the live Google/password flows against
  production data. Nothing was deployed.

## Remaining blocker

**Migration 014 approval** (owner): run
`docs/migration-014/Migration_014_Student_Avatars.sql` in the Supabase
SQL Editor, then the verification file, and share the output. Until
then every feature in this package works except photo upload/display,
which degrades gracefully. Deployment itself remains the owner's
GitHub Desktop → Cloudflare step, as before.
