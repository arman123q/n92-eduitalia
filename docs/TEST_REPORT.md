# N92 Edu-Italia — Test Report (updated 30 Oct 2026 — live database connected)

Status key: **PASSED** = executed and observed · **NOT TESTED** = not yet
executed (reason stated) · **FAILED** = executed and failed.
This report is updated after the database connection and deployment.
Items requiring the live Supabase project or a real browser cannot be
marked passed before then — a successful compile is not proof.

| # | Item (spec §20) | Status | Evidence / reason |
|---|---|---|---|
| 1 | Production build | PASSED | `npm run build` succeeds; 23 static routes exported |
| 2 | Public page navigation | NOT TESTED (browser) | All routes exist in the export and links use real routes; click-through needs a real browser (localhost unreachable from the test browser) — will be verified on the public deployment |
| 3 | Responsive desktop & mobile layout | NOT TESTED | Needs real-device/browser rendering after deployment |
| 4 | 3D hero appearance | NOT TESTED | Compile-verified only; visual check after public deployment |
| 5 | WebGL fallback | NOT TESTED (browser) | Fallback CSS/SVG scene is present in the exported HTML; live trigger test pending deployment |
| 6 | Reduced-motion behaviour | NOT TESTED (browser) | Code guards present (`prefers-reduced-motion` respected); live test pending |
| 7 | Eligibility form & results | PASSED (logic) | 10/10 unit tests on the rules engine + validation; in-browser interaction pending deployment check |
| 8 | University search & filters | NOT TESTED (browser) | Code complete against the data layer; seed-mode rendering verified in export |
| 9 | Course detail & comparison | NOT TESTED (browser) | Code complete (detail, shortlist, compare ≤3) |
| 10 | Scholarship search & official links | NOT TESTED (browser) | Links point to official sources in seed data |
| 11 | Cost calculator formulas | PASSED | 5/5 unit tests (annualisation, one-time costs, INR, scenarios) |
| 12 | Admin login & logout | NOT TESTED | Requires the live Supabase project (owner step) |
| 13 | Protected admin routes | PASSED (data layer) | Anon blocked from leads/audit/profiles/versions (HTTP 401); login rejects bad credentials (400); UI login flow itself NOT TESTED in a browser |
| 14 | Unauthorized access prevention | PASSED | 7/7 RLS probes live (see below); signup attempt rejected (422 signup_disabled) |
| 15 | University/course CRUD | NOT TESTED | Code complete; live check after connection |
| 16 | Scholarship CRUD | NOT TESTED | Code complete; live check after connection |
| 17 | Content editing & publishing | NOT TESTED | Code complete (draft → publish → rollback); live check after connection |
| 18 | Calculator settings persistence | NOT TESTED | Code complete; live check after connection |
| 19 | Lead form submission | PASSED | Live insert via the public path returns HTTP 201 (probe lead stored in Supabase); read-back inside the admin CRM is part of the admin-session checks |
| 20 | Lead persistence after reload | NOT TESTED (live DB) | Demo mode persists in the browser by design |
| 21 | Lead search, status updates, export | NOT TESTED | Code complete (CRM + CSV); live check after connection |
| 22 | Database Row Level Security | PASSED | 7/7 probes: published-only reads (10/13/4/10 records), drafts invisible, content insert blocked (401), lead insert allowed (201), leads + audit + profiles + versions unreadable to the public (401) |
| 23 | Error, empty & loading states | PASSED (code) | Implemented on all directories, calculator, forms, admin; visual check pending deployment |
| 24 | Environment configuration | PASSED | `.env.example` placeholders only; source secret scan clean (no service-role key, no real keys anywhere in the codebase) |
| 25 | Deployment readiness | PARTIAL | Static export is deploy-ready (Cloudflare Pages settings documented); deployment itself awaits the owner's accounts |

**Unit tests total: 15/15 PASSED** (eligibility engine 10, calculator 5).

**Live-database update (30 Oct 2026):** Supabase project connected
(`ymcvjghgyfipgwnsgfbj`), schema + grants migrations applied by the owner,
seed data live. RLS battery: **7/7 PASSED**. An initial failure
(PostgreSQL 42501 — missing table GRANTs) was diagnosed, fixed by
`migration_002_grants.sql`, and re-verified. A least-privilege tightening
(`migration_003_least_privilege.sql`) is proposed for owner approval.
Still NOT TESTED: admin-session operations (items 12, 15–18, 21 — they
require the owner's admin login, which is never shared; routes: a
temporary test-admin user, or guided owner clicks after deployment),
media upload (item in §12 scope), and all real-browser items (2–6, 8–10)
which will be verified on the public deployment.

**Post-Migration-003 re-verification (30 Oct 2026):** owner approved and
ran `migration_003_least_privilege.sql` (blanket authenticated grants
revoked; per-table least-privilege grants; audit_log append-only;
profiles select-only; anon untouched). Full battery re-run afterwards:
RLS probes **7/7 PASSED**; public reads unchanged (10/13/4/10 published,
0 drafts visible); leads/profiles/audit_log/content_versions all HTTP
401 to the public; lead submission still HTTP 201; auth settings still
disable_signup=true; wrong-password login 400; public signup 422.
Nothing regressed. Admin-session operations remain NOT TESTED for the
reason stated above.

---

## Update build — routing fix, admission rounds & notices (30 Oct 2026)

**Live-site audit (before fixing):** every tested URL on
https://n92-eduitalia.pages.dev/ returned HTTP 200, including the
Ca' Foscari query-detail URL and /admin/ (which 308-redirects from
/admin). The deployed JS contains the Supabase project ref, so the
build was configured. Root causes identified for the reported problems:
(1) detail pages existed ONLY as a single query-param page per section —
path-style slug URLs (the natural shareable form) had no file and hit
the host 404, and the in-page "not found" state reads as a 404;
(2) /admin is a client-rendered page whose first paint is
"Checking your session…" — the login form only appears after JS runs,
and there was no public Admin Login link anywhere on the site.

**Fixes implemented in this build:**
- Real static detail pages per record: /universities/<slug>,
  /courses/<slug>, /scholarships/<slug> generated for all seed records
  (61 + 13 + 4), dynamicParams=false; the query-param detail page is
  kept as a runtime fallback for database-only records; every internal
  card/detail link now uses lib/links.ts to pick the right form.
- scripts/check-links.mjs audits the production export: all 78 detail
  routes exist and every internal href resolves. PASSED.
- Footer gains "Admin Login" (/admin), "Admission Rounds & Deadlines"
  and "Important Notices" links; header nav gains "Admissions".
- Universities directory: compare-up-to-3 added (courses already had it).
- Migration 004 adds admission_rounds + notices (RLS published-read for
  anon, admin-only writes, least-privilege grants). Rounds status engine
  in lib/rounds.js (Europe/Rome conversions, unverified deadlines are
  never shown open/closed) with 10 new unit tests. Homepage ticker reads
  Supabase at runtime (no rebuild needed for publish/unpublish), red for
  urgent/closing-soon, pauses on hover, honours prefers-reduced-motion,
  honest empty state. Public /admissions and /notices pages. Admin gains
  "Admission Rounds & Deadlines" and "Important Notices" managers
  (create/edit/publish/unpublish/delete, snapshots + audit entries).
- Directory expanded from 10 to 61 institutions (51 added; official
  websites reachability-checked 2026-10-30: 48 confirmed live from our
  network, 3 canonical domains — uniupo.it, uniparthenope.it,
  uniroma2.it — unreachable from this network and flagged in their
  records). Programme-level facts for the new institutions remain
  needs-review; nothing was invented. Migration 005 inserts the same
  records into the live database (INSERT-only, idempotent).

**Results:** unit tests 25/25 PASSED (15 existing + 10 new). Production
build PASSED (103 static pages). Link audit PASSED. Local static-serve
smoke test: /universities/ca-foscari-university-of-venice/ 200,
/admissions/ 200, /notices/ 200, /admin/ 200.

**NOT TESTED (unchanged honesty rules):** the NEW deployment is not
live yet — all live-site items (new slug URLs in production, ticker
with real admin-published rounds, admin CRUD on the new tables) verify
only after (a) migrations 004 and 005 are run in Supabase and
(b) this build is deployed. Admin login/logout/reset remain for the
owner's guided session (Option B). scripts/test-rounds.mjs verifies
the new tables' RLS after migration 004 (7 checks).

---

## Mobile responsive release (30 Oct 2026)

**Real-browser verification:** Chrome for Testing 156 driven by
Playwright against the production export. scripts/responsive-check.mjs
loaded 12 pages (home, directories, Ca' Foscari detail, admissions,
notices, eligibility, calculator, contact, admin, FAQ) at 8 widths
(320/360/375/390/414/430/768/1280) = 96 combinations, measuring
document scrollWidth vs clientWidth and listing offenders.

**Result: 96/96 PASSED — zero horizontal overflow.** Screenshots at
360px and 390px (home + eligibility) were visually inspected.

**Root cause found by screenshot inspection:** Tailwind v4 puts the
`hidden` utility in a cascade layer, while the site's custom .btn-*
classes were unlayered and therefore won — so the header's
"Check My Eligibility" CTA rendered on mobile despite `hidden`,
overlapping the logo (visible in the owner's Android screenshot and in
our first Playwright screenshot). Fix: all custom component classes
moved into @layer components so utilities override them correctly.

**Other mobile fixes:** compact header (smaller logo, tighter spacing;
CTAs live in the menu on mobile); hero headline uses clamp() sizing;
eligibility step indicator shows numbers + active label only on narrow
screens and wraps; eligibility card padding reduced on mobile; hero
grid children min-w-0; Guidance Assistant launcher becomes a compact
round button on mobile (panel already full-width-sheet under sm);
course/scholarship detail tables wrapped in local horizontal scroll;
global overflow-x: clip safety net + media max-width: 100%.

**Migrations status (live-checked 30 Oct 2026):** migration 004 NOT
applied (admission_rounds/notices tables do not exist yet — PGRST205);
migration 005 NOT applied (live directory still returns the original
10 published universities). Both files ship in supabase/ and are safe
to run once, in order 004 then 005.

**NOT TESTED:** the live website still serves the previous build —
mobile fix verification applies to this release's export; live
verification follows the owner's deployment. Admin login/CRUD remain
for the owner's guided session.

**Migration 005 correction (30 Oct 2026):** the first version of
migration_005 failed on the live database with ERROR 42703 —
it referenced scholarship_note / application_status / featured columns
that do not exist in the real universities table (the file had been
generated from the TypeScript type, not the table definition; owned as
our error). The corrected v2 uses only the table's actual columns
(scholarship text folded into admission_note) and was FULLY TESTED
before delivery on a local PostgreSQL 18.4 instance built from the
exact schema.sql DDL: original 10 seed rows loaded → migration applied
→ 61 rows; original-10 checksum identical before/after
(4619f6f1e07445b3842f7787a2a74194); no duplicate ids/slugs; all 61
published; second run changed nothing (idempotent).

---

## Security verification battery (30 Oct 2026, owner-requested, no changes made)

- Core RLS probes: **7/7 PASSED** (incl. published universities now **61
  rows** — corrected migration 005 confirmed applied).
- Rounds/notices probes: **6/6 PASSED** (migration 004 tables live;
  public reads published-only, inserts blocked 401).
- Anonymous PATCH/DELETE attempts against universities, courses,
  scholarships, faqs, site_content, calculator_settings: **all
  rejected** (401/400; zero writes succeeded).
- Auth settings: disable_signup = true (re-verified). Password-reset
  request for the owner's account accepted (HTTP 200) — a reset email
  was dispatched by this test; it changes nothing unless used.
- Secret scan: no service-role key, secret key or JWT anywhere in
  source or built JS. Only comments stating the key must never be used.
  The publishable key in the frontend is public-by-design and safe
  only because RLS holds (verified above).
- Policy review: content tables + leads grant full CRUD to ANY
  authenticated session by policy (single-admin design, accepted by
  owner); audit_log is append-only at grant level (migration 003);
  profiles is read-own/select-only; leads are insert-only for the
  public. Residual risk recorded: if a second auth user is ever
  created or sign-ups re-enabled, that user would gain full content
  control — role hardening required before staff accounts.
- NOT TESTED: successful authenticated-session CRUD (awaits the
  owner's guided login session, Option B).

## Selected upgrades — course catalogue, IELTS, refund guarantee, visa & arrival services (30 Oct 2026)

Owner-selected upgrades only; no unrelated services added. Branding, palette
(#103F35 / #C7A05A / #FAF9F5), logo and all working features preserved.

### Course catalogue expansion (13 → 30)
- 17 new programmes, each verified on the university's official programme
  page on 2026-10-30 (Bachelor's ×6 incl. Bologna CLABE, Sapienza ACSAI,
  Turin Business & Management, Ca' Foscari Digital Management, Milan IPLE,
  Padova Psychological Science; Master's ×8 incl. Bicocca/Genoa/Pisa/Siena/
  Verona/Trieste data & engineering programmes; single-cycle Medicine ×2 —
  Pavia Harvey, Bologna; PhD ×3 — Trento IECS, Sapienza CS, Bologna DSC).
- 4 existing records upgraded to verified with real official programme
  URLs (Polimi CS&E, PoliTo Computer Engineering — language now
  English & Italian, Bologna AI, Trento Data Science). The other 9
  originals remain needs-review, unchanged. No fees, deadlines or
  requirements invented; unverified fields say so.
- New Academic-year filter added; all five filters (University, Subject,
  Degree level incl. new "Single-cycle Master's", Teaching language,
  Academic year) verified in a real browser (see below).
- Delivery to the live database is `supabase/migration_006_courses.sql`
  (INSERT-only for new rows + targeted UPDATEs for the 4 verified
  upgrades; no permission changes). PG-tested locally against the real
  schema.sql DDL with the exact pre-expansion data: 13 → 30 rows, the 9
  untouched originals byte-identical (md5), FK integrity OK, idempotent
  on re-run — ALL PASSED.

### New service pages + homepage sections
- /ielts-coaching/ — "IELTS Online Coaching — Prepare with Confidence.",
  all 7 owner-listed inclusions, explicit no-affiliation / no-guaranteed-
  band disclaimer, "Book Your Free Demo Class" enquiry form → leads.
- /refund-policy/ — "Your Visa. Our Commitment." + the owner's exact main
  statement and supporting text; covers/excludes exactly per the owner's
  rules (consultancy fees actually received only; tuition, visa fees, VFS,
  insurance, accommodation and other third-party costs excluded; one, two
  or all three instalments → 100% of fees actually received; unpaid
  instalments stop); refusal-evidence list and 3-step request procedure;
  the processing timeline is referred to the written refund agreement
  (no days invented). Three-instalment plan shown with the owner's stage
  titles/descriptions; no amounts, percentages or dates anywhere.
- /visa-support/ — "Your Italy Journey, Made Easier.", all 7 inclusions,
  guidance-only / no-guaranteed-approval statement, "Get Visa Assistance".
- /accommodation-support/ — "From Arrival to Settling In — We've Got You
  Covered.", all 7 inclusions incl. Codice Fiscale and Permesso di
  Soggiorno guidance, no availability promises, guidance vs government
  services distinguished, "Get Arrival Support".
- Homepage: Services Overview (all five offerings + eligibility card),
  IELTS band, refund-guarantee band with "Read Full Refund Policy" link.
  Footer gained the four service links.
- All service copy is admin-editable (Admin → Website Content: four new
  sections, prefilled with the approved wording; existing draft → publish
  flow is the authorised approval step). All enquiry forms use the
  existing leads system, tagged via subject_interest (no schema change).

### Admin course CSV import/export
- Courses manager: Export CSV (all catalogue fields) and Import CSV
  (quoted-CSV parser; validates university, level, language, verification
  and status values; duplicates by id/slug skipped, never overwritten;
  status defaults to draft; per-row error report; audit-logged).

### Test results
- Production build (compile + typecheck): PASSED.
- Unit tests: 25/25 PASSED.
- Functional browser checks (scripts/functional-check.mjs; real Chromium,
  production export, Supabase REST intercepted and answered from the new
  seed so the real page code ran against the 30-course catalogue):
  45/45 PASSED — catalogue count, each filter (Bachelor's 6, single-cycle
  2, PhD 3, Medicine 2, English & Italian 2, Bologna 4, year 2026/27 30),
  search + reset, homepage overview/bands, all four service pages'
  headlines/disclaimers/CTAs, IELTS enquiry end-to-end (success shown
  only after server confirmation; lead payload checked: subject_interest
  = "IELTS Online Coaching", consent recorded, no source column).
- Link audit: PASSED (61 universities, 30 courses, 4 scholarships,
  23 internal targets).
- Responsive audit: PASSED — 16 pages × 8 widths (320–1280), zero
  horizontal overflow, including the 4 new pages.
- NOT TESTED yet: the new build on the live site (awaits GitHub upload →
  Cloudflare auto-deploy); the live database still returns 13 courses
  until migration 006 is run; authenticated admin editing/CSV import
  against the live database (awaits the owner's guided admin session,
  Option B — same outstanding item as before).

## Visual polish, reviews & company contact upgrade (30 Oct 2026)

Owner-commissioned polish release. All existing functionality, data,
branding and RLS preserved. Builds on the selected-upgrades release
(courses 30, service pages) — that content is unchanged.

### Lucide icons (emoji removed)
- lucide-react added as a dependency. Every colourful emoji across the
  site replaced with consistent Lucide icons (forest green, stroke 1.8,
  champagne-gold chip accents): service cards (MessagesSquare,
  FolderCheck, House, GraduationCap, ShieldCheck), homepage trust strip
  (Landmark, GraduationCap, FolderCheck, Handshake), eligibility results
  (GraduationCap, TriangleAlert, Compass, Award, FolderCheck,
  CircleCheck, Zap), counsellor launcher (MessageCircle), location pins,
  shortlist hearts, menu toggle, pinned notices, external-link arrows
  (ArrowUpRight), back arrows (ArrowLeft), admin warning markers.
- Verified by code audit (zero emoji codepoints left outside
  typographic ✓/✕/→) and a browser check on the rendered homepage.

### Hero contrast
- Dark forest-green overlay added over the 3D Venice hero (uniform veil
  on mobile, directional gradient on desktop); headline now ivory
  (#FAF9F5) with the second line in light champagne gold (#E7D3A1),
  subtext ivory/90, secondary CTA restyled for dark backgrounds, subtle
  text shadow. The 3D scene remains visible; screenshots at 360px and
  1440px inspected — text fully readable, no overlap with the
  eligibility panel.
- scripts/hero-check.mjs: PASSED at all 8 required widths (320, 360,
  375, 390, 414, 768, 1024, 1440) — no overflow, headline inside the
  hero, no overlap with the form, computed headline colour ivory.

### Student reviews & testimonials (no invented data)
- New `testimonials` table arrives via supabase/migration_007_testimonials.sql
  (shown to the owner in full before use; he runs it). PG-tested locally:
  applies cleanly, CHECK constraints enforced, idempotent, and a
  behavioural RLS test proved anon can read ONLY published +
  permission-confirmed rows and cannot insert. The public-read policy
  itself requires permission_confirmed, and the frontend re-checks it —
  a testimonial cannot become public without recorded permission.
- The table starts EMPTY. No reviews, names, photos, counts or star
  ratings were invented anywhere. Homepage "Student Reviews" section
  shows featured published testimonials, or an honest empty state;
  /reviews/ lists all published testimonials with the 5 service-category
  filters and clearly labels the source (submitted to N92 with
  permission vs Google review). "Read Google Reviews" buttons link to
  the owner's Google listing (his share link). Direct Google review
  *import* is not possible without a paid Google Places API key, so the
  site links out instead — stated plainly to the owner.
- Admin: new "Student Reviews" section (add/edit/remove, photo URL via
  Media uploads, permission checkbox, featured flag, draft→publish
  approval) via the existing RecordsManager.
- Browser-tested with fixture rows inside the test harness only:
  permitted+featured testimonial renders on homepage and /reviews/;
  a published-but-not-permitted fixture is NEVER rendered.

### Company location & contact — IMPORTANT limitation
- The owner's Google share link (https://share.google/SMZxVZdUWDem9ucYB)
  could NOT be fully resolved from this environment: Google served its
  bot-check "sorry" page to both the browser agent and direct fetches.
  The redirect trace indicates the listing's knowledge-graph name is
  "Baksh Villa" — which does not match the consultancy name — so NO
  address, phone number or hours were taken from it, and nothing was
  invented. The owner has been asked to confirm the exact listing
  details.
- Built instead: Contact-page "Company location & contact" section and
  footer contact lines driven by Admin → Website Content → Company
  (business name, address, phone, email, hours, Maps/Directions/embed
  URLs — all editable). Maps, Directions and "Read Google Reviews"
  buttons work today via the owner's share link; address/phone/email/
  hours appear automatically once entered (empty fields are hidden,
  and an interactive map embed appears if an embed URL is added).

### Student Journey + consultation booking
- Homepage "Your Journey to Italy — Step by Step": the owner's 6 steps,
  horizontal timeline on desktop / vertical on mobile, decision-making
  disclaimer included; fully admin-editable (Website Content → Journey).
- New /book-consultation/: service select (admin-editable list), name,
  email, phone, preferred date/time, consent — submits to the existing
  leads system (subject_interest "Free Consultation — <service>",
  preferred time inside the message). Confirmation states clearly the
  chosen time is a request, not a confirmed appointment. CTAs added on
  the homepage (consultation band), contact page, footer and service
  pages. Privacy notes with Privacy/Refund/Terms links added beside
  the consultation, contact and service enquiry forms.

### Test results
- Production build (compile + typecheck): PASSED (126 static pages).
- Unit tests: 25/25 PASSED.
- Functional checks #1 (previous release): 45/45 PASSED (no regressions).
- Functional checks #2 (scripts/functional-check-2.mjs): 30/30 PASSED —
  hero colour, zero homepage emoji, journey steps + disclaimer,
  testimonial permission behaviour, reviews category filter,
  consultation lead payload + confirmation wording, contact location
  section, no invented address, privacy notes.
- Hero audit: 8/8 widths PASSED (above).
- Link audit: PASSED (61 universities, 30 courses, 4 scholarships,
  25 internal targets incl. /reviews/ and /book-consultation/).
- Responsive audit: 144/144 PASSED (18 pages × 8 widths, zero overflow).
- Migration 007 PostgreSQL test: ALL PASSED (see above).
- NOT TESTED yet: the new build live (awaits GitHub upload → Cloudflare);
  migration 007 against the live database (owner runs it — SQL supplied
  in full with this delivery); authenticated admin review management
  against the live database (awaits the owner's guided admin session,
  Option B — same outstanding item); the Google listing's address /
  phone / hours (blocked as described above, owner's confirmation
  requested).

## Addendum — Migration 007 hardened to owner-only writes (30 Oct 2026)

At the owner's request, the testimonials policies in migration_007 were
strengthened before deployment (the file was re-issued in full and
re-tested; the earlier draft's "admin: full access (any authenticated)"
policy is dropped by the file itself if ever present):
- anon SELECT: published AND permission_confirmed only (unchanged).
- authenticated SELECT: same published+permitted set — any other
  signed-in user is read-only at most.
- ONE write policy: FOR ALL to authenticated, gated on
  (auth.jwt() ->> 'email') = 'sh10ad786@gmail.com' — only the owner's
  actual Admin account can insert/update/delete/approve/publish.
Behavioural PG test (Supabase-style auth.jwt() stub via the
request.jwt.claims setting, three simulated identities): anon sees
only published+permitted and cannot insert; a different authenticated
user sees only published+permitted, INSERT raises an RLS error, and
UPDATE/DELETE silently affect 0 rows (verified unchanged afterwards);
the owner-admin identity sees all rows and full CRUD works. ALL 13
checks PASSED. Scope note: the identity pin applies to testimonials
only, exactly as requested; other tables keep the previously approved
single-admin model (sign-ups OFF) and the Admin Dashboard is
unaffected — the owner's session satisfies the new policy because he
signs in with that email.

## Root-cause fix — Admin save failures on tables without generic columns (30 Oct 2026)

Owner reported: Student Reviews form fails with "Save failed — the database
rejected the change" even with all fields corrected.

ROOT CAUSE (frontend bug, proven by reproduction — NOT RLS, NOT the JWT):
components/admin/RecordsManager.tsx startNew() seeded EVERY new record with
generic defaults verificationStatus/academicYear/lastVerified. save() then
spread the whole form state into the insert payload. Tables without those
columns (testimonials, notices, faqs, admission_rounds) therefore sent
non-existent columns; PostgREST rejects such writes before RLS is even
evaluated: HTTP 400, code PGRST204 ("Could not find the 'verification_status'
column of 'testimonials' in the schema cache"); at the SQL layer the same
payload errors 42703 column "verification_status" of relation "testimonials"
does not exist (reproduced on the local PostgreSQL rig with the exact
traced payload). lib/admin.ts swallowed the error body and returned a bare
boolean, so the UI could only show the generic message. Universities and
courses were unaffected because those tables genuinely have the columns —
the same defect explains the owner's earlier "Important Notices form showed
a database save failure" report. Verified live before fixing: the
testimonials table exists (migration 007 applied), anon read returns
HTTP 200 []; the clean payload (phantom keys removed) INSERT/UPDATE/DELETE
all succeed on the rig under the owner's admin identity claim, so
Migration 007's owner-only policies pass for his account.

FIX (frontend only; no database, RLS or policy changes):
- RecordsManager.startNew(): generic defaults are seeded only when the
  table's schema declares those fields.
- RecordsManager.save(): payload is whitelisted to the schema's declared
  fields + id; empty strings for date/datetime/number fields are sent as
  NULL instead of "".
- lib/admin.ts: adminInsert/adminUpdate/adminDelete now return
  { ok, error } with the database's own message; all callers updated
  (RecordsManager incl. CSV import, ContentEditor, CalcSettings, LeadsCRM).
  Any future rejection now displays the real Supabase error in the admin.

TESTS: scripts/functional-check-3.mjs drives the REAL admin UI (signed in
as the owner identity) against a strict PostgREST emulator that rejects
unknown columns with the exact PGRST204 error: CREATE (payload verified
phantom-free, valid text id, permission flag stored), EDIT, PUBLISH and
DELETE of a fixture record — 8/8 PASSED. Regressions: build PASSED, unit
25/25, functional #1 45/45, functional #2 30/30, link audit PASSED.
NOT TESTED: the live save with the owner's real browser session (his
credentials are never requested); after deploying this build, his first
real review save is the live confirmation — and if anything still
rejects, the admin will now show the exact database error to report.

## Repair release RC-1…RC-4 (30 Oct 2026, owner-approved after the full audit)

Builds on docs/FULL_AUDIT_2026-10-30.md. All fixes are frontend-only —
no database migration, no RLS/policy/grant change, no production data
touched. Migration 007's hardened policies were VERIFIED LIVE by the
owner on 30 Oct 2026 (pg_policies: all three expected policies present).

- RC-1 (phantom columns): previously fixed and re-verified here —
  payload whitelisting to schema fields + id, conditional new-record
  defaults, real error surfacing.
- RC-2 (session renewal): lib/admin.ts now stores the full session
  (access + refresh token) at login; ensureFreshToken() runs before
  every admin read/write/storage call and transparently renews an
  expired/expiring access token via the refresh grant (single-flight;
  a dead refresh token ends the session cleanly to the login screen;
  a transient network error keeps the session). Expiry is read from
  the JWT's own exp claim. Legacy sessions without a stored refresh
  token simply end at expiry as before — the next login is
  refresh-capable. Sub-finding fixed in the same change: the PUBLIC
  data layer (lib/supabase.ts authHeaders) previously reused whatever
  admin token sat in localStorage for public reads and lead inserts —
  an expired leftover token would have made PostgREST reject those
  requests. It now uses the stored token only while it is a JWT
  comfortably within validity, otherwise the publishable key.
- RC-3 (false success): adminInsert/adminUpdate/adminDelete now use
  Prefer: return=representation and report success only when at least
  one affected row comes back. Zero-row update/delete produce explicit
  errors ("No record was changed (0 rows updated)…" / "…deleted…")
  instead of a false success.
- RC-4 (mobile edit form): the RecordsManager form now scrolls into
  view when it opens (transition-only, not per keystroke) with a
  scroll margin; the form already carried a visible "New/Edit <record>"
  heading.

TESTS (this release):
- Build: PASSED (Next.js production, TypeScript clean, 126 pages).
- scripts/functional-check-4.mjs (new) — real admin UI against a
  Supabase-faithful emulator: expired-token session is refreshed
  exactly via the refresh grant; the expired token is NEVER sent to
  the database; admin-table calls carry the fresh token; zero-row
  PATCH shows the explicit error and does not publish; zero-row DELETE
  shows its error; healthy publish/delete still work; Edit on the
  last row of a long list scrolls the form into the viewport
  (top ≈ 96px at 390×844). 9/9 PASSED.
- Regressions: functional-check-3 (RC-1 admin save flow) 8/8;
  functional #1 45/45; functional #2 30/30; unit 25/25; link audit
  PASSED. Responsive suite re-run for this release (public layer
  touched): PASSED at all widths (18 pages × 8 widths).
- NOT VERIFIED (unchanged, by design): authenticated CRUD against the
  production database with the owner's real session, and the live JWT
  email — both are scheduled for the guided session AFTER the owner
  deploys this release. No claim is made that production admin CRUD
  has passed.

## Admission Rounds repair (30 Oct 2026) — manual_status 23514 + NOT VERIFIED display

Production error reported by the owner: saving a round with "Automatic
(from dates)" failed with 23514 (admission_rounds_manual_status_check),
and a round saved as Results Published still showed NOT VERIFIED publicly.

ROOT CAUSES (two distinct defects):
1. The Manual status select's "Automatic" option carries the value ""
   (empty string). When chosen, the form sent manual_status = "" — but
   the live constraint (retrieved verbatim from PostgreSQL:
   CHECK (manual_status IS NULL OR manual_status IN ('results-published',
   'awaiting-confirmation'))) allows only NULL for Automatic. "" → 23514.
2. lib/data.ts getAdmissionRounds()/getNotices() returned RAW snake_case
   rows, skipping the snakeToCamel mapping every other getter applies.
   computeRoundStatus reads manualStatus/deadlineVerified/opensAt/
   deadlineAt — all undefined — so every round fell through to
   "not-verified" publicly and manual statuses never displayed. (The
   same defect silently disabled notice display windows.)

FIXES (frontend only — NO migration; the constraint was not touched):
- components/admin/RecordsManager.tsx: a select whose schema declares
  a "" option now persists NULL for "" (principled: the schema itself
  declares the empty option as "no value"); plus an admission-rounds
  guard — deadline must be after the opening, blocked with a clear
  message before any request is sent.
- lib/data.ts: rounds and notices rows now pass through snakeToCamel.
- lib/rounds.js: status precedence made explicit per the owner's rule —
  unverified deadline → NOT VERIFIED regardless of manual status; manual
  override applies only when verified; otherwise dates calculate
  Upcoming/Open/Closing Soon/Closed. deadline_verified remains fully
  independent (setting a manual status never changes it — asserted in
  tests). Unit tests updated/extended (26/26).

TESTS:
- Real PostgreSQL (project's actual migration_004 DDL + RLS): exact
  constraint definition retrieved; "" insert reproduces 23514; all three
  manual statuses INSERT/UPDATE/persist as the admin identity; opens/
  deadline timestamps round-trip exactly; manual status never flips
  deadline_verified. ALL PASSED (~/workspace/pgtest/test-rounds-persistence.mjs).
- scripts/functional-check-5.mjs (new): REAL admin UI against an emulator
  enforcing the real CHECK — Automatic saves with manual_status NULL,
  Rome→UTC conversions exact (09:00 CET → 08:00Z; 23:59 → 22:59Z), both
  manual values save, edits cycle Automatic ↔ Results Published and
  persist after refresh, invalid date pair blocked with nothing sent;
  REAL /admissions page with snake_case fixtures — verified+Results →
  RESULTS PUBLISHED, unverified+Results → NOT VERIFIED, verified+Auto →
  OPEN, verified+Awaiting → AWAITING OFFICIAL CONFIRMATION,
  unverified+Auto → NOT VERIFIED. 15/15 PASSED.
- Regressions: build PASSED, unit 26/26, functional #1 45/45, #2 30/30,
  #3 8/8, #4 9/9, link audit PASSED.
- NOT VERIFIED: persistence against the PRODUCTION Supabase with the
  owner's real admin session (never available to Muse). After deploying
  this ZIP, the owner's first Automatic round save + the /admissions
  display are the live confirmation (also covered by the planned guided
  CRUD session). Existing production rounds: none exist (table verified
  empty), and no data was touched by this repair.

## Header logo replacement (31 Oct 2026, owner's new artwork)

Owner supplied a new cyan N92 logo (black-background JPG, 1254×1254) plus
a reference screenshot for size/placement. ONLY the header logo changed:
- public/logo-header.png (NEW asset): the supplied artwork with its black
  matte keyed out to transparency (soft alpha ramp + edge decontamination)
  and transparent margins trimmed; the artwork itself is pixel-identical —
  no redraw, stretch or crop of the mark; aspect preserved (720×598).
  The original JPG was NOT used raw because it would render as a black
  rectangle on the ivory header; the owner's reference shows the mark
  directly on ivory.
- components/Header.tsx: header <img> now uses /logo-header.png at
  h-16 (mobile) / sm:h-24 — renders 116×96 on desktop in a 121px header
  (reference: ~125px logo in a ~130px header at 1600px wide); the old
  white chip wrapper was removed (the reference shows the mark directly
  on the header); brand name/tagline kept beside it, set to nowrap so
  the name stays on one line as in the reference.
- public/logo.jpg is untouched — the FOOTER still uses it, as before.
Verified: build PASSED; unit 26/26; link audit PASSED; no horizontal
overflow at 10 widths × 3 pages; desktop + mobile header screenshots
inspected. Control check: the ORIGINAL header was rebuilt and measured —
the "Study in Italy" nav item wrapped to 3 lines there too (66px), so
that wrap is pre-existing container behaviour, not a regression.

## Header layout fix (31 Oct 2026, owner's production screenshot)

The owner deployed the logo build and reported overlap at his window
width: reproduced locally at 1024px — the brand <a> was min-w-0, so the
desktop nav (visible from lg) compressed over the brand text and the
tagline collided with the first nav item. Fixed in components/Header.tsx
ONLY (logo asset unchanged):
- Brand area is now flex-none; logo capped at h-14 / sm:h-16 / xl:h-20
  (96×80 on desktop) so it cannot push into the navigation.
- Beside-text is now just "N92" + tagline: the logo artwork already
  contains "Edu-Italia", so the duplicated wordmark text was removed
  (owner's requirement 3).
- Desktop nav moved to its own flex-1 area, links whitespace-nowrap,
  visible only from xl (1280px); below that the hamburger menu is used
  (button + panel breakpoints lg -> xl).
Verified by measurement at 1440/1280/1024/430/390: zero bounding-box
overlaps between logo, brand text, nav and CTAs; nav items single-line
(max li height 22px) at >=1280; hamburger present at <=1024; no
horizontal overflow. Build PASSED. Before/after screenshots delivered.

## Ticker resilience fix (31 Oct 2026)

Owner approved fixing the announcement ticker after his production
screenshot showed "NOT VERIFIED undefined — undefined". Diagnosis: the
live record itself is complete (University of Padua — First Call,
Fall 2027, deadline_verified=true, manual_status=results-published,
deadline_at NULL) — the screenshot's deployment was still rendering it
through the pre-repair raw snake_case mapping. Regardless, the ticker
is now hardened in components/Ticker.tsx ONLY:
- clean() guard: null/undefined/non-string/blank (and literal
  "undefined"/"null" strings) never reach the display.
- A round with neither university nor round name is hidden; a partial
  round shows only its valid parts (no dangling separators).
- Deadline segment: verified + valid date -> the date; unverified ->
  "Deadline not officially verified" (status logic unchanged);
  verified but dateless -> segment omitted instead of contradicting
  the verified flag. computeRoundStatus untouched.
- Notices: empty title+message hidden; partial shows what exists;
  empty category falls back to a "NOTICE" badge.
- scripts/functional-check-6.mjs (new): replays the REAL live payload
  + degraded + all-incomplete scenarios — 11/11 PASSED (Padua renders
  with RESULTS PUBLISHED badge; degraded records hidden/partial-clean;
  all-incomplete -> honest empty state). Build PASSED, unit 26/26,
  link audit PASSED. Desktop + mobile ticker screenshots delivered.
Note: the live Padua record has no deadline DATE (deadline_at NULL),
so the ticker shows no deadline segment; entering the date in Admin ->
Admission Rounds will display it. Record id mentions IUAV Venice
while the name is Padua — internal only, not displayed.

## Header right-side overflow fix (31 Oct 2026)

Owner's production screenshot showed the ghost CTA squeezed into a
tall pill ("Check / My / Eligibility") and Book Consultation cut off
at the right edge. Measured root cause (live DOM): the header row's
min-content is ~1386px (brand 342 + nav content 800 + CTA group 244,
plus row gaps) but the max-w-7xl container offers only 1232px inside —
the row never truly fit at xl; flex shrink hid it on some systems by
wrapping the ghost button's text, and wider font metrics pushed Book
Consultation off-screen on the owner's machine.
Fix (components/Header.tsx ONLY):
- Header container widened to max-w-[1600px].
- Full desktop bar (nav + both CTAs) now shows only from 1600px up,
  where it fits with ~55px slack; below 1600px the hamburger menu is
  used (owner's requirement 6). Book Consultation remains visible from
  640px up in hamburger mode too; both CTAs are also in the menu.
- CTA group is flex-none and both buttons are whitespace-nowrap, so
  they can never be squeezed or clipped again; nav is min-w-0 with
  gap-4.
- scripts/functional-check-7.mjs (new), real live ticker payload,
  owner's eight widths (1920/1809/1440/1280/1024/768/430/390):
  27/27 PASSED — no horizontal overflow anywhere, Book Consultation
  fully inside the viewport at every width >= 640, full nav single-line
  with content fitting its box at >= 1600, ghost button single-line,
  hamburger + complete menu below 1600. Build PASSED, unit 26/26,
  link audit PASSED.
Trade-off (disclosed to owner): at 1280-1599px the header now uses
the hamburger menu instead of the full nav bar — the only layout that
guarantees no clipping, per his requirement 6.

## Google AdSense verification script (31 Oct 2026)

Owner is connecting AdSense (publisher ca-pub-1129138042140372). The
script was added exactly once, in an explicit <head> block in
app/layout.tsx (the root layout — the global head for every route).
No other file, metadata, design or functionality changed; no ad units
were placed anywhere — this is the verification loader only.
Verified: production build PASSED; the exported HTML of home,
universities, eligibility and admin pages each contain exactly ONE
real <script async src="https://pagead2.googlesyndication.com/pagead/
js/adsbygoogle.js?client=ca-pub-1129138042140372" crossorigin=
"anonymous"> inside <head> (a second textual occurrence in the page
source is Next.js's inert flight-data copy, not another script tag).
Note: being the root layout, the script also loads on /admin — normal
for a global head tag and harmless for verification.
Delivered as N92_AdSense_layout_update.zip (app/layout.tsx only);
master POLISH ZIP refreshed to match.

## Google Analytics 4 integration (31 Oct 2026)

Added GA4 to the SAME <head> block in app/layout.tsx; the AdSense
script is untouched and still appears exactly once.
ID DISCREPANCY (flagged to owner): his message text stated
G-5QYEH4Q690, but the Google tag he pasted says G-5QYEH4Q69Q in both
places. The pasted tag's ID (G-5QYEH4Q69Q) was used, held in a single
GA_MEASUREMENT_ID constant at the top of layout.tsx — a one-line
change if the property's real ID ends in 690.
Consent: the site has NO cookie-consent banner/CMP (checked — only
lead-form consent checkboxes exist). GA4 was therefore integrated
with Google Consent Mode v2: 'consent' default sets ad_storage,
ad_user_data, ad_personalization and analytics_storage all to
'denied' BEFORE the config call, so GA sets no cookies unless a
future consent banner grants it. EEA-safe by default; full cookie-
based measurement begins only when a banner exists and grants.
Verified: build PASSED; exported home/universities/book-consultation
heads each contain exactly ONE gtag.js loader tag, ONE config call,
the consent-default block, and ONE AdSense tag.
Delivered as N92_GA4_layout_update.zip (app/layout.tsx only); master
POLISH ZIP refreshed to match.

## GDPR cookie consent banner (31 Oct 2026)

Owner confirmed the GA4 ID as G-5QYEH4Q69Q (the pasted-tag value) and
approved a proper consent banner. New components/CookieConsent.tsx
(ivory/forest/gold card, bottom-centre) with Accept All / Reject All /
Customize Preferences; categories: Necessary (always on, locked
switch), Analytics (GA4), Advertising (AdSense) — both OFF by default.
Choices push gtag('consent','update') for analytics_storage /
ad_storage / ad_user_data / ad_personalization, persist in
localStorage (n92_cookie_consent_v1) and are re-applied on every
visit. A footer "Cookie Settings" link (new components/
CookieSettingsLink.tsx, added to Footer.tsx next to Terms of Use)
reopens the panel via a window event. app/layout.tsx changes are
 limited to rendering <CookieConsent /> — the head (AdSense + GA4 +
denied defaults) is untouched: still exactly 1 GA loader + 1 AdSense
tag in the exported head. scripts/functional-check-8.mjs (new):
18/18 PASSED — default denied with no update before a choice;
Reject All stores + pushes all-denied and survives refresh; Accept
All grants all and persists across navigation; Customize saves
per-category (Necessary switch verified disabled+on); footer link
reopens and a changed preference pushes a fresh update; mobile
banner fits 390px with no overflow. Build PASSED, unit 26/26,
link audit PASSED. Desktop/customize/mobile screenshots delivered.

## GA4 consent timing fix (31 Oct 2026, owner-approved)

Implemented the approved fix — and the real-gtag audit exposed a
SECOND, deeper defect in the same component, also fixed:
(1) Timing race (known): the stored consent was re-applied by React
    after gtag.js had already fired the page_view as denied.
(2) NEW finding: CookieConsent's local gtag() helper pushed PLAIN
    ARRAYS into the dataLayer. Proven empirically with the real
    gtag.js: array pushes are silently IGNORED — the banner's consent
    updates never reached Google at all (window.gtag, which pushes an
    Arguments object, works). This also fully explains the original
    audit's scenario D.
Changes:
- app/layout.tsx: the head bootstrap now reads localStorage
  n92_cookie_consent_v1 BEFORE the consent 'default' call and seeds
  the default from the saved choice; new visitors stay fully denied.
- components/CookieConsent.tsx: all gtag calls now go through the
  real window.gtag defined by the bootstrap; on a save that grants
  Analytics (and only if this page did not already load granted), one
  make-up page_view event is sent right after the consent update
  (guarded to fire at most once per page view; a granted reload does
  not double-count — verified).
Verification (scripts/functional-check-9.mjs, REAL gtag.js +
intercepted collect requests): 15/15 PASSED — first visit page_view
gcs=G100; Accept All -> update then exactly one page_view gcs=G111;
returning visitor's FIRST page_view gcs=G111 with the head default
itself carrying the saved choice; Reject All stays G100 after
reload; custom analytics-only grants analytics only (update + seeded
default verified) with a non-G100 page_view; exactly one loader tag
and one config call. Regression: functional-check-8 18/18, unit
26/26, link audit PASSED, build PASSED, exported head still has
exactly 1 GA + 1 AdSense tag. NOT deployed by Muse — delivered as
N92_GA4_ConsentFix_update.zip (app/layout.tsx + CookieConsent.tsx).
Test-harness note: gtag batches hits after consent changes (multi-
second flush), and the sandbox-blocked AdSense request skews page
timing — check-9 polls for hits and stubs AdSense for determinism.

## ads.txt (3 Nov 2026)

Owner requested the AdSense ads.txt line for publisher pub-1129138042140372. Created public/ads.txt with exactly one line: google.com, pub-1129138042140372, DIRECT, f08c47fec0942fa0 (59 bytes incl. trailing newline). No existing ads.txt existed; nothing else changed (AdSense script, GA4, consent logic untouched). Build PASSED and out/ads.txt verified byte-identical to the source, so it will serve at /ads.txt after deployment. Delivered as N92_ads_txt.zip (public/ads.txt only). NOT live until the owner deploys.

## Footer logo unified with header mark (3 Nov 2026)

Owner request: footer still showed the old logo. components/Footer.tsx ONLY: the footer brand block now uses the same transparent public/logo-header.png as the header, at h-20 (renders 96x80 — the same footprint width as the old footer logo), and the white chip wrapper (rounded-xl bg-white) was removed so the mark sits directly on the dark forest background, where the cyan artwork is clearly visible. Aspect verified numerically: rendered ratio 1.204 = the asset native ratio (720/598) at both 1440 and 390 widths — no stretch or distortion. Nothing else changed (header, nav, footer links, contact, design untouched). Build PASSED; desktop + mobile footer screenshots delivered. The old public/logo.jpg remains in the project but is no longer displayed anywhere. Delivered as N92_FooterLogo_update.zip (components/Footer.tsx only); master POLISH ZIP refreshed.

## Favicon set from the official logo (3 Nov 2026)

Browser tabs showed a generic globe (no favicon existed). Generated from public/logo-header.png WITHOUT redrawing: a symbol-only square crop (arch + Italian flag + "92"; the Edu-Italia wordmark is excluded as unreadable at tab size) -> public/favicon.ico (16/32/48 embedded), public/favicon-32x32.png, public/favicon-16x16.png, public/apple-touch-icon.png (180x180, flattened onto black — the artwork native backdrop; iOS composites transparency over black anyway). app/layout.tsx metadata.icons now declares all four. Build PASSED; all four files verified in out/ at the web root, the exported <head> carries exactly the four icon link tags, and all four paths returned HTTP 200 with correct content types from the exported site. Header/footer logos, GA4, AdSense and consent untouched. Delivered as N92_Favicon_update.zip (4 new public/ files + app/layout.tsx); master POLISH ZIP refreshed.

## Sitemap created + robots.txt reference (3 Nov 2026)

/sitemap.xml returned the custom 404 because no sitemap existed anywhere (no app/sitemap.ts, no public/sitemap.xml — confirmed) and the live URL still 404s (verified by curl). Added app/sitemap.ts (force-static, Next metadata route) generating the sitemap from the SAME sources as the site itself: 24 static public routes + detail entries from data/seed.json using the same slugs as each sections generateStaticParams (61 universities, 30 courses, 4 scholarships) = 119 URLs on https://n92-eduitalia.pages.dev with trailing slashes and lastmod from lastVerified. Excluded: /admin, the query-param /detail fallback shells, and query strings. public/robots.txt: added the Sitemap: line and Disallow: /admin/ (rest unchanged). Build PASSED; verification: XML parses, every one of the 119 URLs maps to a real exported page (zero broken), out/robots.txt correct, /sitemap.xml serves HTTP 200 from the export. Delivered as N92_Sitemap_update.zip (app/sitemap.ts + public/robots.txt). NOT live until the owner deploys.

## Sitemap live investigation (3 Nov 2026, after owner deployment)

Owner deployed the sitemap ZIP and verified both live URLs in his browser; GSC still showed "Couldnt fetch / Unknown / 0 discovered". Evidence gathered by curl from this environment: GET /sitemap.xml -> 200 OK, Content-Type application/xml, Content-Length 15032 (== local build artifact size; bodies byte-identical, md5 c34fa54f42ed2e07baa899bcb10f9ada), no redirects, valid XML with all 119 URLs; browser UA, Googlebot desktop UA and Googlebot smartphone UA all received the identical 200 + body (no cf-mitigated challenge header, no 403/503); homepage control with Googlebot UA -> 200; robots.txt -> 200 text/plain with the Sitemap line. Headers (ETag + Cache-Control public, max-age=0, must-revalidate) are Cloudflare Pages STATIC-ASSET headers: sitemap.ts ran at build time; the live file is a plain static file, not a runtime route. Conclusion: nothing is wrong server-side now; the GSC failure dates from a fetch attempt made while the URL still 404d (pre-deployment state, verified by Muse before the fix) or during propagation, and GSC had not re-fetched. NO code change made. Smallest fix is GSC-side: delete + resubmit sitemap.xml to force a fresh fetch, and confirm the property is the URL-prefix property for https://n92-eduitalia.pages.dev/. Caveat given to owner: curl tests originate from this environments IP, not Googles crawler network — but spoofed-Googlebot-UA datacentre traffic is exactly what bot protection challenges, and it passed untouched.

## GSC fresh-failure investigation (3 Nov 2026) — no production change

Owner reported a FRESH GSC read (03/11/2026) still failing: "Sitemap could not be read", 0 discovered. Full Google-spec battery run against the LIVE file: no BOM (starts with <?xml), UTF-8 declared, root urlset in the exact sitemaps.org 0.9 namespace, 119 URLs (limit 50,000), 0 duplicates, all locs fully-qualified https on the property host with only safe chars (no escaping risks), max URL length 92 (limit 2048), 95 lastmod values all valid W3C datetime, none future-dated, only <loc>/<lastmod> elements used. Validated against the OFFICIAL sitemap.xsd from sitemaps.org: VALID. All 119 URLs fetched live with Googlebot UA: 119/119 HTTP 200, ZERO redirects. Brotli-compressed variant decompresses to the identical md5. A minimal 1-URL sitemap (prepared at ~/workspace/n92_minimal_test/sitemap.xml, same battery: valid) is structurally identical in envelope — no property of the production file differs from a known-valid minimal file. Conclusion: NO reproducible defect in the file or its serving; any production change would be speculative. Key observation given to owner: GSC shows the last-read DATE only (03/11) with no time, and the pre-deployment 404 attempt also occurred on 03/11 (deployment went live ~02:22-02:33 IST), so the displayed failed read cannot be distinguished from the pre-deployment attempt unless a post-resubmission read has actually been processed. Definitive Google-side test advised: URL Inspection -> Test live URL on the sitemap URL. Optional isolation experiment (owner approval required, NOT deployed): temporarily replace app/sitemap.ts generation with the prepared minimal public/sitemap.xml and resubmit — if Google reads the minimal but not the full file, content is implicated; if it also fails, the cause is conclusively Google/account-side.

## Minimal sitemap experiment PREPARED, not deployed (3 Nov 2026)

Context: owner ran GSC Live URL Test on /sitemap.xml — SUCCESS ("URL is available to Google / Page can be indexed") — yet the Sitemaps report still says "could not be read", 0 discovered. So Googles fetcher provably CAN fetch the production file from this domain; the failure is specific to the Sitemaps-report processing of the production entry/file. Controlled experiment prepared (owner-approved, NOT deployed): a one-URL sitemap served from a SEPARATE path so production is never touched — public/sitemap-test.xml (175 bytes, homepage only, same declaration/namespace; XSD-VALID). Local build with it present PASSED: out/sitemap-test.xml byte-identical and serves 200 application/xml; production out/sitemap.xml md5 UNCHANGED (c34fa54f42ed2e07baa899bcb10f9ada, 119 URLs). Delivered as N92_SitemapTest_minimal.zip (public/sitemap-test.xml only). The file was then REMOVED from the local project tree and the master POLISH ZIP deliberately NOT refreshed, so the experiment can never leak into a production deploy. Test protocol: owner uploads public/sitemap-test.xml, submits "sitemap-test.xml" in GSC. Outcomes: test succeeds -> production entry/file processing is the problem (next: delete + resubmit production entry; if still failing, bisect the full file); test also fails -> sitemap-subsystem/property-side issue, production file fully exonerated. Rollback: delete the file from GitHub + remove the GSC test entry; production sitemap.xml and app/sitemap.ts never change at any point.

## Discrepancy investigation: sitemap crawler vs inspection crawler (3 Nov 2026)

State: BOTH /sitemap.xml and the minimal /sitemap-test.xml report "Couldnt fetch" in the GSC Sitemaps report, while URL Inspection Live Test on /sitemap.xml succeeds. The minimal files failure EXONERATES CONTENT entirely (a 175-byte XSD-valid 1-URL file at a fresh path fails identically). Fresh evidence this round: both URLs return byte-identical responses to browser and Googlebot UAs (200, application/xml, correct Content-Length, same ETag, no redirects, no cf-mitigated); content-encoding negotiates correctly (identity/gzip/br all decompress to the same md5); cache headers are standard Pages (public, max-age=0, must-revalidate + ETag); robots.txt allows everything except /admin and references the sitemap; DNS (Google resolver) clean on A (CF anycast) and AAAA (CF v6 anycast), Status 0. On pages.dev there are NO owner-configurable Cloudflare security settings (Cloudflare operates the zone), so no site-side setting can treat Googles two crawlers differently. Researched Googles documented causes (Search Off the Record, via Search Engine Journal): Splitt — the error appears for valid, accessible, robots-linked sitemaps with "no technical reasons"; Mueller — the two operational reasons are crawl-capacity scheduling ("we didnt have time to actually fetch it... we would also position that as couldnt fetch") and crawl demand/perceived quality ("were just going to skip the sitemap file"). Every externally testable cause (robots block, wrong address, server error, redirect, encoding, DNS, UA-differential treatment) is ELIMINATED with evidence; surviving documented causes live inside Googles scheduling/account layers. NO production or security change made or justified. One safe next step given to owner: screenshot of the GSC Sitemaps report (property + both submitted URLs) and the Manual actions report — the only two account-side facts not yet directly evidenced. If clean: leave both sitemaps submitted and let Googles documented retry cycle run.

## Blog / Articles CMS (3 Nov 2026) — built, tested locally, NOT deployed by Muse

Owner-approved architecture: BUILD-TIME generation. The static export cannot create pages at runtime, so lib/blog.ts fetches PUBLISHED posts from Supabase during next build (publishable key + RLS) and app/blog/[slug] bakes real static pages with full SEO; publishing/unpublishing takes effect at the next successful deployment (documented in-product in the BlogManager banner and in lib/blog.ts). Snapshot fallback: on fetch failure the build uses data/blog-snapshot.json and logs a loud warning — a snapshot build may still contain a since-unpublished article; an unpublish is confirmed only by a successful-fetch deployment. DB: supabase/migration_008_blog.sql (owner runs it; Muse did NOT) — one new empty table blog_posts, RLS public-read-published-only + owner-pinned writes (sh10ad786@gmail.com, testimonials model), least-privilege grants, defensive CREATE OR REPLACE of touch_updated_at() with its identical body (existence verified in schema.sql + migration_007 beforehand). PG rig: 15/15 (three identities, trigger, unpublish invisibility, idempotent re-run). Dependencies added: @tiptap/react, @tiptap/pm, @tiptap/starter-kit, @tiptap/extension-image, @tiptap/extension-table (all v3.32.2) + dompurify 3.4.17 (sanitises content in the admin before save; render-time scrubHtml is defence-in-depth). Files: lib/blog.ts, lib/blog-shared.ts, data/blog-snapshot.json, app/blog/page.tsx, app/blog/[slug]/page.tsx, components/ArticleView.tsx, components/BlogList.tsx, components/RichTextEditor.tsx, components/admin/BlogManager.tsx, app/admin/page.tsx (one tab), app/sitemap.ts (blog index + articles), components/Footer.tsx (Blog link; header untouched per owner decision), app/globals.css (.article-body + .tiptap styles, additive only). Build bugs found BY TESTING and fixed: (1) cache:no-store in the build fetch makes Next abort prerendering as dynamic — removed, build fetch is memoised per build; (2) empty generateStaticParams fails output:export and dynamicParams:true is forbidden with export — solved with a reserved __no-articles sentinel page rendering the not-found state (never linked, never in sitemap; admin rejects that slug). VERIFIED: stub-REST build 21/21 + 15/15 re-check (listing, article HTML title/meta/canonical/OG/JSON-LD Article+Breadcrumb, h1 hierarchy, sitemap inclusion, draft excluded everywhere); fallback build (dead Supabase) PASSES with warning + empty blog; REAL-env build PASSES — live DB returns 404 for blog_posts until migration_008 is run, fallback engages exactly as designed; admin lifecycle functional-check-10 16/16 against a fake PostgREST backend (create in Tiptap with formatting preserved through DOMPurify, publish + auto date, preview fidelity, edit, unpublish, delete incl. the RC-3 zero-row delete semantics). NOT live-tested: real end-to-end awaits the owner running migration_008 + deploying; guided verification checklist delivered.

## Blog security fix (3 Nov 2026) — regex scrub REPLACED by DOMPurify allowlist

Code review (owner-relayed) rejected the regex-based scrubHtml. Fix: ONE shared sanitizer, lib/sanitize.js (new), built on DOMPurify via isomorphic-dompurify v4.6.0 (same code in browser + Node build), strict explicit ALLOWED_TAGS (blog formatting only — no svg/math/iframe/object/embed/form) + ALLOWED_ATTR (no on*, no style), ALLOW_DATA_ATTR false. Used at BOTH points: BlogManager save handler (save-time) and ArticleView render (public page + admin preview = identical output). URL policy: DOMPurify core rejects script schemes after normalisation; the stricter HTTPS/relative-only rule is enforced by an uponSanitizeAttribute hook dropping non-matching href/src — needed because (a) DOMPurify core ALLOWS data: sources on <img> (data:text/html survived in testing!) and (b) a custom ALLOWED_URI_REGEXP in DOMPurify 3.4.17 was caught by the new tests stripping unrelated allowlisted attributes (target/start/colspan) — the hook path avoids that defect; both findings are documented in the module. target=_blank links gain rel=noopener noreferrer via afterSanitizeAttributes. scrubHtml deleted from lib/blog-shared.ts; direct dompurify dependency replaced by isomorphic-dompurify. Tests: tests/blog-sanitize.test.mjs — 18 security tests (SVG onload, MathML, img onerror, mixed-case + entity-encoded + whitespace-obfuscated javascript:, vbscript:, data:text/html + data:image/svg+xml, protocol-relative, plain http, iframe/object/embed/form, handlers on legit tags, style attr, malformed nesting) + preservation battery + rel hook — npm test now 44/44. Render-time proof: stub build with a malicious PUBLISHED fixture produced body HTML with every payload neutralised (svg/onclick/javascript: href/data: src/iframe all gone) and legit formatting intact. functional-check-10 re-run 16/16 (save path uses the shared sanitizer). Real-env build PASSED. Also noted during testing: Next fetch Data Cache in .next persists across LOCAL builds (stale fixture data) — production unaffected (Cloudflare builds fresh); local verification builds should rm -rf .next when the data source changes. Delivered as N92_BlogSecurityFix.zip (7 files) + N92_BlogSecurityFix.diff. No schema change, no deployment, no SQL run.

## Final corrections (3 Nov 2026, owner-requested, pre-deployment)

(1) migration_008_blog.sql: the defensive CREATE OR REPLACE of touch_updated_at() was REMOVED at the owner's instruction — the function exists in production and the file now only references it from the blog_posts trigger; header comment updated to match. PG rig re-run against the production-faithful setup (function pre-created with its production body): 16/16, including pg_get_functiondef byte-identical before/after and the trigger still bumping updated_at. Static guards added in tests/migration-008.test.mjs (no create/alter/drop function; trigger reference + both policies present). (2) featuredImageUrl validated SEPARATELY via the shared URL policy (new isSafeImageUrl in lib/sanitize.js — HTTPS or safe relative only; http:/javascript:/data:/blob:/protocol-relative rejected): at SAVE time in BlogManager (blocking error, nothing stored), at the DATA layer in lib/blog.ts mapRow (unsafe values dropped before any surface sees them), and at RENDER in ArticleView, BlogList and the article page metadata (OG/Twitter/JSON-LD/related cards). The listing page additionally no longer serialises article bodies (card-shaped posts). Verification: npm test 50/50 (3 new URL-policy + 3 migration-static tests added); functional-check-10 extended with 5 featured-image checks — 21/21 (http:// and javascript: rejected at save, https saves, rejected rows never stored); stub build render gate 7/7 (an http:// featured URL on a published fixture appears NOWHERE — no figure, card, OG or page data — while an https image renders everywhere it should). Clean production build (rm -rf .next out) PASSED. Consolidated deliverable refreshed: N92_BlogCMS_FINAL.zip (20 files). Still NOT deployed; migration still owner-run.

## Consolidated blog release (3 Nov 2026) — nav + homepage section + listing polish

Owner reversed the earlier footer-only decision: Blog & Articles is now in the main header LINKS array (desktop + mobile). Adding the ninth link overflowed the 1600px full bar by a measured 19px at 1809/1920px (check-7 dropped to 25/27); fixed by tightening the desktop nav (gap-4 -> gap-2.5, font 0.92rem -> 0.9rem, ~28px headroom, comment updated with the measurements) — check-7 back to 27/27, breakpoint/CTAs/branding untouched. Homepage: new async server component components/LatestArticles.tsx ("Latest from N92", between Reviews and FAQ) — build-time fetchPublishedPosts, 3 latest published only, renders NOTHING when none (no dummy content), cards with gated featured image, gold category chip, date, excerpt, Read Article; View All -> /blog/. BlogList cards polished to the same design (gold chip overlay, h-48 image, hover lift, mt-auto read link); filters/links/empty states unchanged. Article CTA (BlogCta) included. Verification: stub build check-12 15/15 (nav desktop+mobile, homepage section published-only, listing), check-11 23/23, check-7 27/27, check-10 ALL, npm test 50/50, links PASSED; CLEAN real-env production build: the owner's live article appears in homepage Latest, /blog listing (empty state gone), its article page (with CTA) and the sitemap, 0 fallback warnings. Root cause of the "published article not appearing" issue confirmed operational, not code: the live Cloudflare build predated the publish (static baking); this consolidated ZIP + his GitHub Desktop push + Cloudflare build is the fix — live URLs to be verified after his deploy. Migration status: migration_008 already run by the owner; NO new migration in this release. Consolidated deliverable: N92_BlogCMS_FINAL.zip (26 files).

## Header navigation redesign (3 Nov 2026, owner spec)

The 1600px full-bar rule (31 Oct) left the desktop nav hidden at common widths like 1440px. Header.tsx rewritten to the owner's hierarchy: DESKTOP BAR from 1400px = logo + SIX main links (Study in Italy, Universities, Courses, Scholarships, Admissions, Blog & Articles) + Check My Eligibility + Book Consultation + Menu button. SIDE MENU (all widths, from the Menu button) = secondary links ONLY, in five groups (Planning: Cost Calculator/Visa Guide/Application Process; Updates: Admission Rounds & Deadlines -> /admissions/ (that page's own H1), Important Notices -> /notices/; About N92: About/Contact/Student Reviews/FAQ; Services: IELTS/Visa Support/Accommodation; Policies: Refund Policy/Privacy/Terms — labels match the footer's existing wording). Below 1400px the bar is logo + Book Consultation (now visible at ALL widths incl. 375px, per spec) + Menu, and the menu adds an Explore group with the six main links + both CTA buttons so nothing is unreachable. No route created/moved/deleted; branding unchanged. Verification: NEW functional-check-13 (61 checks) at the owner's exact widths 375/768/1024/1280/1440/1920 — zero overflow, zero overlap, desktop nav + both CTAs confirmed visible at 1440 and 1920, all menu groups/links/hrefs verified, navigation spot-checked (Blog, Cost Calculator). The old check-7 (1600px breakpoint spec) is superseded by check-13. Regression: check-12 15/15, check-11 23/23, check-10 ALL, npm test 50/50, links PASSED, clean production build PASSED. Consolidated ZIP refreshed to 27 files.

## Student Essentials (3 Nov 2026, owner spec)

New section, deliberately NOT on the homepage (app/page.tsx md5 unchanged, verified) and NOT in the desktop bar: "Student Essentials" -> /student-checklist/ added only to the side Menu Planning group. Public: /student-checklist/ interactive checklist (search, category filter, tick + progress (N/A items untickable + excluded), localStorage persistence, reset-with-confirm, print/PDF view, Review / Not-applicable badges, medicine informational notes) and /student-checklist/products/ catalogue (category filter, multi-image gallery, specs, multi-marketplace offers, rel=sponsored links, affiliate disclosure, price shown ONLY with a verification date else "Check current price"). Data: build-time Supabase fetch + snapshot fallback (same pattern as blog). Admin: new "Student Essentials" tab (ProductsAdmin: full CRUD, image upload via media bucket, specs/offers editors, publish/draft/order; ChecklistAdmin: items + categories CRUD with italy_status). Migration supabase/migration_009_student_essentials.sql (3 tables, owner-pinned writes, published-only public reads; PG rig 16/16; static tests 6/6) — DELIVERED FOR REVIEW, NOT RUN. Tests: npm 62/62, functional-check-14 (public, 29) ALL PASSED, functional-check-15 (admin lifecycle, 9) ALL PASSED, check-13 regression ALL PASSED, links PASSED, clean production build PASSED (fallback warning expected until 009 runs). CONTENT STATUS: Book1.ods was NOT found anywhere in the workspace — the shipped checklist snapshot is a 13-item TEST FIXTURE across his eleven categories (incl. his named I-20/SEVIS/Walmart/Brooklyn flags) so the whole system is testable; scripts/convert-checklist.py converts the real ODS to the snapshot (and the DB seed source) the moment the file is supplied, with count verification. Products start empty by design (owner adds real ones in admin).

## Student Essentials — REAL Book1.ods data (3 Nov 2026)

Owner supplied Book1.ods; scripts/convert-checklist.py rewritten as a column-aware parser (the hand-made sheet puts some item names in column B, numbers medicines in B, continuations in A). Extracted 217 items across the 11 real categories (A Document Checklist 25, B Medicine 21, C1 Kitchen Essentials 19, C2 Kitchen and Food 20, D Household/Hygiene 27, E1 Basic Essential Clothes 16, E2 Extra Apparel 34, F Electronic Gadgets 18, G Stationery 19, H Personal Stuff 2, J To buy in Brooklyn 16); 13 continuation rows attached as descriptions/category intro; 12 blank numbered rows skipped (counted, no content existed); duplicates preserved (Mirror x2, Sunglasses x2). Flags: 173 applicable, 42 review (all 21 medicines with the informational-only note + sheet prescription intro preserved; all 16 Brooklyn items with a buy-in-Italy note; US-pin adapters + spike-buster plug notes; 3 food items customs note), 2 not-applicable (I-20, SEVIS with explanations). Category pack locations from the sheet Status column are shown per category. Verified in a browser against the production build: 217 checkboxes, 2 disabled, progress denominator 215. Unit 62/62, check-14 re-passed. ZIP refreshed (22 files).

## Student Essentials FINAL (3 Nov 2026)

Reconciliation accepted by owner (217 items + 13 continuations = 230 audit rows; continuations preserved in descriptions). Pre-final fix: migration_009 amended BEFORE ever being run — checklist_categories gained intro + pack_location columns so the database can hold everything the snapshot holds (category intro note + sheet pack locations); lib DB mapping + ChecklistAdmin category form updated to match; rig re-run 16/16. NEW supabase/seed_009_checklist.sql generated from the converted snapshot (11 categories + 217 items, published, idempotent upserts) and PROVEN in the rig (counts + flags 173/42/2 + medicine notes + continuation text + idempotent re-run). Instruction-critical: migration + seed must be run back-to-back before any redeploy (an empty table would blank the public checklist). Final ZIP: N92_StudentEssentials_FINAL.zip (23 files). Six pre-delivery verifications all passed: ZIP snapshot 217/11 with all continuations; homepage md5 unchanged + not in ZIP; Student Essentials exactly once in Header (side menu only, not MAIN_LINKS); migration + seed attached separately, byte-identical to ZIP copies; Blog + Header work intact in overlapping files (supersets); live DB probe still 404 x3 — migration NOT run by Muse. Regression: tsc clean, npm 62/62, check-15 ALL PASSED, clean production build PASSED.

## Student Essentials Premium Redesign — 2026-11-03

Owner-approved redesign of /student-checklist/ per the supplied
reference image; plan approved verbatim before the build.

- Cinematic hero (components/EssentialsHero.tsx): real-time
  Three.js Venice Grand Canal sunset scene — gradient sky with
  the sun beside a domed skyline, palazzi with lit windows
  (front + canal faces), shader water with a sun-glint path and
  sparkle, an open suitcase with folded clothes, steel bottle,
  book stack, and six floating gold essential tiles (canvas-drawn
  glyphs). WebGL only >=1024px, no reduced-motion, working GL
  context; DPR capped 1.75; pauses off-screen/hidden tab;
  ResizeObserver sizing (a 0x0 canvas can never stick). Static
  fallback = public/images/essentials-hero.jpg, a toDataURL
  capture of the actual scene (recapture:
  scripts/capture-hero-still.mjs), used on mobile/low-power/
  reduced-motion/no-WebGL and as the loading poster. The
  fallback is never described as an animation.
- Dashboard v2 (components/ChecklistApp.tsx): 12 category cards
  (All Items + 11, short card labels only — full category names
  unchanged in headings) with live counts; three-column layout
  per the reference: accordion checklist (search, hide-packed
  toggle, per-category packed counts + pack locations, cream
  header bands), Recommended Student Essentials panel, progress
  rail (SVG ring, completed/remaining, Save / Download PDF /
  Reset) and the Italy Applicability legend. Progress keeps the
  v1 key/format (n92_checklist_v1, id array) — existing visitor
  progress is preserved. All 217 records, flags, descriptions
  (incl. continuations) untouched; N/A items untickable and
  excluded (denominator 215).
- Tutorial ("How to Use This Guide"): database-backed, edited
  WITHOUT redeployment (runtime fetch like the ticker).
  lib/video-url.js classifies URLs (YouTube watch/youtu.be/
  embed/shorts/live -> youtube-nocookie embed; HTTPS media
  files -> native <video>; other HTTPS -> external-link card;
  anything else rejected) — 5 unit tests. Public modal shows a
  polished empty state whenever no tutorial is published
  (including before migration_010 exists — verified live).
  Admin: Student Essentials -> Tutorial Video tab (URL, title,
  description, publish toggle, live preview, remove with
  confirm). Storage = migration_010_essentials_tutorial.sql
  (delivered separately, NOT run; public reads published-only,
  owner-pinned writes; PG-rig verified: applies cleanly, anon
  read/write rules, idempotent re-run).
- QA: functional-check-16 (redesign, stub build) ALL PASSED —
  hero/CTAs/scroll, cards+counts, accordion, ring progress,
  same-key persistence, save/reset, hide-packed, tutorial empty
  state, header unchanged, no overflow at 375/430/768/1024/
  1440/1920. functional-check-17 (admin lifecycle incl.
  tutorial CRUD + the public modal picking the tutorial up at
  runtime with NO rebuild) ALL PASSED. Production-build
  assertions (scripts/screenshot-premium.mjs) ALL PASSED — card
  counts exactly the owner's (217; 25/21/19/20/27/16/34/18/19/
  2/16), 217 checkboxes / exactly 2 disabled, 0/215 progress,
  products empty state, tutorial empty state against the LIVE
  project, mobile fallback still + 0 overflow. Regressions:
  check-13 (header) ALL PASSED, check-12 (blog) passed, check-15
  (admin) ALL PASSED; unit tests 67/67; tsc clean; clean
  production build passed.
- Two real defects found + fixed during QA: (1) a GLSL vec2
  swizzle bug (hash(cell.zy)) that broke the water shader —
  now cell.yx, plus first-pass lighting/composition fixes;
  (2) a 79px mobile overflow at 375px caused by a grid item's
  min-content (search row) — fixed with min-w-0 hardening on
  the grid children and the search field; per-element overflow
  scan is now clean.
- Untouched, checksum-verified: components/Header.tsx,
  app/page.tsx (homepage), Blog CMS, migration_009 + seed_009
  (not rerun), live DB records. check-14 (v1 UI) retired,
  superseded by check-16.

## Products Bulk Import (Excel/CSV) — 2026-11-03

Admin → Student Essentials → Products gains "Import Products
(Excel/CSV)" beside "New product" (components/admin/
ProductsImport.tsx + lib/import-products.js; SheetJS `xlsx`
added as a dependency, lazy-loaded only when an .xlsx file is
chosen). NO database migration was needed — every import field
already exists in essential_products — and no production data
was touched during implementation.

- Spreadsheet contract (template downloadable from the panel
  and shipped as docs/products-import-template.csv): name
  (the only required field), category, description,
  specifications ('Label: Value; …' or a JSON object), images
  (pipe/comma-separated HTTPS URLs; first = main image),
  status (blank/unrecognised = Draft), display_order, and up
  to 4 offer groups (offerN_marketplace / product_url /
  affiliate_url / price / currency / last_verified_date /
  availability). Unprefixed marketplace/price/… columns are
  accepted as offer 1.
- Validation: HTTPS-only URLs, real-number prices (₹/commas
  stripped), dates normalised from ISO or DD/MM/YYYY with real
  calendar checks, marketplace aliases (Amazon/Amazon India ->
  amazon-in; unknown stores become a labelled custom store with
  a warning), price-without-date warns (it will publicly show
  "Check current price"). Nothing is ever invented.
- Safety: rows whose name matches an existing product (any
  status) or an earlier file row are flagged Duplicate and
  excluded — existing products are never overwritten or
  deleted. Preview shows per-row errors/warnings and selection
  checkboxes; nothing is saved until Import is pressed; the
  import runs in small batches with a progress bar and per-row
  results, using the existing adminInsert + audit path (owner
  auth + RLS; no service-role key in the browser).
- Tests: 9 new unit tests (tests/products-import.test.mjs —
  CSV quoting/BOM/CRLF, full/minimal rows, error + warning
  matrix, duplicate detection, date/price edges, XLSX
  round-trip through the same normaliser); suite total 76/76.
  functional-check-18 ALL PASSED (fake backend seeded with a
  published Portronics-shaped fixture): button placement,
  template download, CSV preview (2 ready / duplicate flagged /
  name+price+date errors shown / nothing saved pre-import),
  batch import with correct stored values (price 1299, date
  normalised to 2026-11-02, 2 specs), the pre-existing product
  BYTE-IDENTICAL after import, and an XLSX workbook imported
  through the Excel path. check-17 (full admin lifecycle)
  re-passed on the same build; tsc clean; clean production
  build passed.
- Shipped for the owner's own trial: docs/
  products-import-sample.csv (2 clearly-labelled IMPORT TEST
  draft rows + 1 intentionally broken row that demonstrates
  the error UI).

