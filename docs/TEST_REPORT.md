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
