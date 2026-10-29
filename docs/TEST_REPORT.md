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
