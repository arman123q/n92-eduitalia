# N92 Edu-Italia — Full-System Diagnostic Audit

**Date:** 30 October 2026
**Scope:** Diagnostic audit only. No production database permissions were
changed, no records were created/modified/deleted in production, and no
release was deployed as part of this audit. Live checks used the public
(publishable) key in read-only mode, plus anonymous write attempts that
the database correctly rejected (no data created — verified afterwards).

---

## A. Root-cause report

### RC-1 — Phantom columns in admin save payloads (PROVEN; code fix ready, not yet deployed)

**Symptom:** "Save failed — the database rejected the change" on Student
Reviews, Important Notices, FAQs, Admission Rounds (record creation).

**Cause:** `components/admin/RecordsManager.tsx` `startNew()` seeded every
new record with generic defaults (`verificationStatus`, `academicYear`,
`lastVerified`), and `save()` sent the entire form state as the insert
payload. Tables that do not have those columns (testimonials, notices,
faqs, admission_rounds) therefore sent non-existent columns. PostgREST
rejects such writes before RLS is evaluated: **HTTP 400, code PGRST204**
("Could not find the 'verification_status' column of 'testimonials' in
the schema cache"); at SQL level the identical payload raises **42703**
(reproduced on a local PostgreSQL with the project's real DDL).
`lib/admin.ts` swallowed the error body and returned a bare boolean, so
the UI could only show the generic message — hiding the cause for weeks.

**Why some modules worked:** universities and courses tables genuinely
have those columns, so the same code path succeeded there.

**Fix (already written and tested locally):** defaults are seeded only
for schemas that declare those fields; save payloads are whitelisted to
the schema's declared fields + id; empty date/number values are sent as
NULL; admin writes now return the database's real error message and the
UI displays it. Verified through the real admin UI against a strict
PostgREST emulator (create/edit/publish/delete, 8/8) plus full
regressions. **Status: awaiting deployment — the live site still runs
the previous build, which is why production still shows this error.**

**Schema cross-check (this audit):** every admin form's field list was
diffed against the real DDL of all seven content tables
(schema.sql + migrations 004/007). Result: zero phantom fields in any
schema; the only table column not in a form is
`admission_rounds.university_id` (intentional — rounds are name-based).

### RC-2 — Admin sessions cannot be renewed (CODE-PROVEN defect; probable cause of the Universities/Edit failures)

`lib/admin.ts` `login()` stores only the Supabase **access token** and
discards the refresh token. Supabase access tokens expire (default 1
hour). After expiry: every admin read returns nothing, every write fails
with 401, and `currentUser()` returns null so the dashboard drops back
to the login screen. This defect affects **all** modules, matches the
reported "University Edit does not work / saves fail" pattern (an
existing-university edit sends a valid payload, so RC-1 cannot explain
it), and explains why failures seemed intermittent.
**Status at audit time: NOT YET FIXED.** Proposed repair: store the refresh token,
refresh transparently on 401/expiry, and re-check the session before
writes. Live confirmation requires the owner's session (see G).
**UPDATE (repair release, 30 Oct 2026): FIXED in code** — full session
(access + refresh token) stored at login; transparent single-flight
refresh before every admin operation, expiry read from the JWT exp
claim; verified end-to-end in scripts/functional-check-4.mjs (the
expired token is never sent to the database; admin calls carry the
fresh token). The same repair also stopped the public data layer
(lib/supabase.ts) from reusing an expired stored token for public reads
and lead inserts. Awaiting deployment + guided live session.

### RC-3 — Updates can report "success" while changing zero rows (CODE-PROVEN integrity risk)

`adminUpdate`/`adminDelete` use `Prefer: return=minimal`; PostgREST
returns HTTP 204 even when RLS silently matches zero rows. An edit can
therefore show success while nothing was saved. **Proposed repair:**
request `return=representation` and verify the affected row count,
erroring visibly when it is zero.
**UPDATE (repair release, 30 Oct 2026): FIXED in code** — all three
write helpers use return=representation and succeed only when ≥1 row
comes back; zero-row update/delete show explicit errors, behaviourally
verified in functional-check-4 (a simulated zero-row PATCH neither
reported success nor published the record). Awaiting deployment.

### RC-4 — Edit form opens off-screen on mobile (CODE-CONFIRMED UX defect)

The edit form renders **above** the records list. On a phone, tapping
Edit on a row far down the list appears to do nothing (the form opened
at the top of the page). This matches the original "Edit does not open"
report. **Proposed repair:** scroll the form into view when editing
starts, and label the panel clearly.
**UPDATE (repair release, 30 Oct 2026): FIXED in code** — the form
scrolls into view on open (verified at 390×844 in functional-check-4:
form top ≈ 96px after tapping Edit on the last row of a long list);
the panel already carried a visible "New/Edit" heading. Awaiting
deployment.

### Areas checked with NO defect found

- **Leads CRM:** patches use exact snake_case column names — valid.
- **Admission Rounds date/time:** Europe/Rome conversions use proper
  Intl-based two-pass DST handling (`lib/rounds.js`) — correct.
- **Courses CSV import:** builds records from a fixed column whitelist —
  valid; duplicates skipped, never overwritten.
- **Website Content / Calculator Settings:** write JSONB `draft` /
  `published` / `value` payloads — valid columns.
- **Media Manager:** uses the storage helpers against the `media`
  bucket; code is sound (live upload not verified — see G).
- **ID generation:** text ids are `<prefix>-<slug>` derived from the
  record name, with duplicate-slug collisions possible if two records
  share a name — the database then rejects with a primary-key error
  which, after the RC-1 error-surfacing fix, is shown explicitly.

---

## B. Module-by-module CRUD audit

Verification levels: **Live-read** = verified against production today
with the public key. **Code** = payload/logic audited against real DDL.
**Session** = requires the owner's authenticated session (NOT VERIFIED —
see G).

| Module | Create | Read | Update | Delete | Result |
|---|---|---|---|---|---|
| Dashboard | n/a | Code (counts via adminSelect); session-gated | n/a | n/a | Loads after login; counts NOT VERIFIED live (needs session) |
| Universities | Code ✓ (valid payload); live: RC-2 risk | Live-read ✓ (61 published) | Code ✓ valid payload; live fails under RC-2/RC-3 | Code ✓ | Repair RC-2 + RC-3, then session test |
| Courses | Code ✓ + CSV import ✓ | Live-read ✓ (30 published) | Code ✓ | Code ✓ | Same repair path as Universities |
| Scholarships | Code ✓ | Live-read ✓ (4 published) | Code ✓ | Code ✓ | Same repair path |
| Admission Rounds | Was broken (RC-1) — fix ready | Live-read ✓ (table live, 0 rows) | Code ✓ after fix | Code ✓ | Deploy fix, then session test |
| Important Notices | Was broken (RC-1) — fix ready | Live-read ✓ (table live, 0 rows) | Code ✓ after fix | Code ✓ | Deploy fix, then session test |
| FAQs | Was broken (RC-1) for creates — fix ready | Live-read ✓ (10 published) | Code ✓ | Code ✓ | Deploy fix, then session test |
| Student Reviews | Was broken (RC-1) — fix ready | Live-read ✓ (table live, 0 rows; anon sees only published+permitted) | Code ✓ after fix | Code ✓ | Deploy fix, then session test |
| Website Content | Code ✓ (draft→publish→rollback) | Live-read ✓ (published content served) | Code ✓ | n/a | Session test for publish flow |
| Calculator Settings | Code ✓ | Live-read ✓ | Code ✓ | n/a | Session test |
| Leads / Enquiries | Public submit: live-verified previously (201, persists) | Session-gated (anon correctly 401) | Code ✓ (valid columns) | Code ✓ | Session test |
| Media Library | Code ✓ (storage helpers) | Code ✓ | n/a | Code ✓ | Session test (upload) |
| Consultation Bookings | Public form code ✓ (writes to leads with consultation tag) | via Leads | via Leads | via Leads | Session test with Leads |

No module is marked "working" on the basis of page load alone; every
authenticated write path remains NOT VERIFIED until the guided live
session (section G) is completed.

---

## C. Database security report (live probes, 30 Oct 2026)

- Anonymous **INSERT into testimonials → HTTP 401, code 42501**
  ("permission denied for table testimonials"). Grants are least-privilege.
- Anonymous **PATCH on universities → HTTP 401, code 42501.** Same result.
- Anonymous read of `leads` → **HTTP 401** (private, as required).
- Anonymous reads return exactly the published sets: 61 universities,
  30 courses, 4 scholarships, 10 FAQs; testimonials/rounds/notices empty.
- No probe created or altered any data (testimonials re-checked empty).
- RLS is enabled on all tables (established in earlier verified
  batteries: core RLS 7/7, rounds/notices probes 6/6 — re-confirmed
  today by the anonymous-write rejections above).
- The publishable key is the only key in frontend code (public by
  design); earlier secret scan found no service-role/secret keys
  anywhere in the project or deliverables.
- Student Reviews rules are enforced by Migration 007's policies:
  public read requires published **and** permission-confirmed; writes
  are pinned to the admin account `sh10ad786@gmail.com` via the JWT
  email claim; any other authenticated user is read-only at most
  (behaviourally tested on PostgreSQL with three simulated identities,
  13/13). Whether the hardened policy version is the one live cannot be
  distinguished through the API — see G for the one-line read-only SQL
  check.
- Known, previously approved limitation: outside testimonials, admin
  authorization rests on the single-admin model (sign-ups OFF, one
  account). Role-based hardening for all tables remains mandatory
  before any second/staff account is created.

---

## D. Migration verification report (live, 30 Oct 2026)

| Migration | Content | Live status |
|---|---|---|
| 002 | API-role grants fix | Applied (verified by the original 7/7 RLS battery) |
| 003 | Least-privilege grants | Applied (battery re-run passed after it) |
| 004 | Admission rounds + notices tables | **Applied** — both tables live |
| 005 | 61-university directory | **Applied** — 61 published universities live |
| 006 | Courses 13 → 30 | **Applied** — 30 published courses live (newly confirmed in this audit) |
| 007 | Testimonials + owner-only writes | Table live, empty; public-read behaviour correct. Policy version: see G |

All table schemas match the application code (section A cross-check).
No migration was re-run during this audit. No duplicate-policy evidence
is visible through the API; the read-only policy listing in G settles
it definitively.

---

## E. Build and frontend test results

- Production build: PASSED (Next.js, TypeScript clean) for the current
  source, which includes the RC-1 fix.
- Unit tests 25/25; functional checks 45/45 and 30/30; admin save-flow
  checks 8/8; link audit PASSED (25 internal targets).
- Responsive audit: 144/144 (18 pages × 8 widths, 320–1440) on the
  current public build; the only changes since are admin-internal.
- Frontend features from the approved design pass (Lucide icons, hero
  contrast, reviews section + /reviews, journey timeline, consultation
  booking, company section, services/IELTS/refund/visa/accommodation
  pages) were browser-verified at delivery; branding, palette, logo and
  content preserved; nothing invented.

---

## F. Changes made during this audit

**None to production, the database, or the code.** This step was
diagnosis only, per the requested first action. The RC-1 fix predates
this audit (same day) and is packaged but not deployed.

## G. Not verified — and exactly what is needed

1. **All authenticated CRUD against production** (create/edit/publish/
   delete per module with a uniquely marked test record, confirmed in
   the database and removed afterwards; no fake testimonials, nothing
   test-published): requires the owner's actual admin session. Muse
   never receives the admin password. Route: a guided session — the
   owner signs in, Muse directs each click and verifies results live —
   after the repair release is deployed.
2. **The live JWT email claim:** the admin header shows "Signed in as
   <email>"; the owner can confirm at a glance that it reads
   sh10ad786@gmail.com. Independently verifiable in the same guided
   session.
3. **Which Migration 007 policy version is live** (hardened owner-only
   vs the earlier draft): run this single READ-ONLY query in the
   Supabase SQL Editor and share the result — it changes nothing:
   `select policyname, cmd, roles from pg_policies where tablename = 'testimonials' order by policyname;`
   Expected (hardened): three policies including
   "testimonials: owner admin full access".
   **RESOLVED 30 Oct 2026:** the owner ran the check — all three
   hardened policies are present in the live database.

## Proposed repair release (for approval before building)

1. RC-1 payload fix (done, tested — include).
2. RC-2 session repair: refresh-token storage + transparent refresh.
3. RC-3 update/delete row-count verification with real error display.
4. RC-4 edit-form scroll-into-view.
Then: deploy → guided live CRUD session per module → final ZIP +
updated report.
