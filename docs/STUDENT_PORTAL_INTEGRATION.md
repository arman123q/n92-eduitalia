# N92 Student Portal — Security & Integration Delivery

**Date:** 9 November 2026 · **Status:** Implemented against the audited schema and Migration 013.1 · **Nothing deployed · Sign-ups OFF · Google OAuth NOT enabled**

## 0. About the "Starter ZIP" — read this first

The `N92_Student_Portal_Frontend_Starter` ZIP was **searched for again on 2026-11-09 (03:50 IST) across the whole workspace — it is not here** (no file in `~/workspace/user/files/`, the goal folder, or anywhere else; the same result as the earlier search). Nothing could be audited or merged from it, so the portal was **implemented directly in the repository** using your eight critical corrections as the acceptance criteria and the audited database contract (Queries 1–4 + Migration 013.1) as the only schema source. If you upload the ZIP later, I will diff its code against this implementation and reconcile — but no part of this package depends on it.

## 1. How each critical correction is satisfied

1. **Separate student/admin sessions.** The student layer (`lib/student.ts`) uses its own storage keys — `n92_student_token`, `n92_student_refresh`, `n92_student_user` — and never reads or writes `n92_admin_token/_refresh/_user`. The admin layer was not modified. Browser-verified both directions (test P1b: an existing admin session survives student flows byte-identical).
2. **Session lifecycle, one client architecture.** No second Supabase client exists — the site has none; both layers are REST transports over the single configuration in `lib/supabase.ts`, following the admin's proven pattern: JWT-expiry check, single-flight refresh via `/auth/v1/token?grant_type=refresh_token`, dead refresh token → session cleared, transient network error → session kept and retried, server sign-out via `/auth/v1/logout` (best-effort) + local clear, and invalid-session handling in `currentStudentUser()` (401/403 → cleared → login; other failures → explicit error state, session kept). Verified: P4 (invalid), P5 (expired → refreshed).
3. **account_status handled explicitly.** `StudentGate` fetches `profiles` **including account_status** with the profile: `pending` → pending-approval screen (with a "Check again" action), `active` → dashboard, `suspended` → blocked screen with a support route (contact page). Owners are routed to `/admin`. Verified: P1a, P2, P3.
4. **RLS is the boundary.** Every page queries with explicit `student_id`/`user_id` filters *and* relies on the database policies (013.1-tested: pending/suspended students receive no rows at all). Frontend checks shape UX only; nothing sensitive is decided client-side.
5. **Every response checked.** All reads/writes return discriminated results with the database's own error message; zero-row writes are errors (same RC-3 discipline as the admin layer). Student profile creation is checked like everything else. Verified: P7 (a forced 500 shows the exact database error, no silent failure).
6. **/admin/students identifies the caller by exact uid.** `StudentsManager` calls `/auth/v1/user`, takes that id, and loads `profiles?id=eq.<that id>` — there is no unfiltered or `limit=1` role lookup anywhere. Activation controls render only when that exact profile is the owner. Verified: P8b (request log asserted), P9 (non-owner refused).
7. **Only the pinned owner can activate/suspend — via the database.** The UI issues a plain `PATCH profiles?id=eq.<student>` with `{account_status}` through the existing admin REST layer; the database authorises it (owner-only policy + account_status-only column grant from 013.1). A non-owner attempt returns the zero-row error, shown in the UI. Verified at DB level in the 013.1 rig suite (N-series) and at request level in P8c.
8. **Duplicate profile creation / first-login race.** `ensureStudentProfile()` dedupes concurrent calls, and on a unique-violation (PostgreSQL 23505 / HTTP 409) re-fetches the row and treats it as success; any other failure is surfaced. Verified: P6 (stub forced exactly this sequence).

## 2. Changed files (1 modified, 15 new)

**Modified**
- `app/admin/page.tsx` — additive only: StudentsManager import, `"students"` view, "Student Portal" nav entry, one render line. Nothing else touched.

**New — student layer & pages**
- `lib/student.ts` — student session + checked REST transport + audited domain types + profile resolution.
- `components/student/StudentGate.tsx` — session/status gate + portal shell + React context.
- `app/student/login/page.tsx` · `app/student/auth/callback/page.tsx` · `app/student/dashboard/page.tsx` · `app/student/profile/page.tsx` · `app/student/applications/page.tsx` · `app/student/documents/page.tsx` · `app/student/messages/page.tsx` · `app/student/deadlines/page.tsx` · `app/student/notifications/page.tsx` · `app/student/shortlist/page.tsx` · `app/student/payments/page.tsx`

**New — admin**
- `components/admin/StudentsManager.tsx` — owner student management (list/filter, activate/suspend, per-student applications, documents upload+review, messages, deadlines, payments, notifications).

**New — test scaffolding (not part of the site)**
- `scripts/portal-stub.mjs`, `scripts/portal-check.mjs`

**Untouched (verified by checksum):** `components/Header.tsx` (`34087a2c…`), `app/page.tsx` (`5967e0a1…`), `lib/admin.ts`, `lib/supabase.ts`, homepage, CMS, CRM, SEO, analytics, cookie consent, Three.js hero — all byte-identical.

## 3. Database schema → frontend mapping

| Route / screen | Table(s) | Operations (all RLS-checked) |
|---|---|---|
| Gate (all /student/*) | `profiles` (by exact auth uid) | read id/email/role/**account_status** |
| Dashboard | student_applications, student_deadlines, student_documents, student_messages, student_notifications | read own |
| Profile | `student_profiles` (by `user_id`) | read; create on first login (active only, race-safe); update own |
| Applications (+detail `?id=`) | student_applications, application_events, student_documents, student_deadlines | read own; update **student_notes only** |
| Documents | student_documents, document_requirements | read own + active requirements; signed-URL download (`student-documents` bucket) — **no upload/delete for students** |
| Messages | student_messages | read own thread; insert own (sender = self); update **is_read/read_at only** |
| Deadlines | student_deadlines | read own; update **is_completed only** |
| Notifications | student_notifications | read own; update **is_read/read_at only** |
| Shortlist | student_shortlists (+ public `universities` catalogue) | full CRUD on own rows; unique-violation shown plainly |
| Payments | student_payments | read own only — history, no gateway |
| /admin → Student Portal | profiles, student_profiles, student_applications, student_documents (+ storage), student_messages, student_deadlines, student_payments, student_notifications, audit_log | owner-only; activation = PATCH `profiles.account_status` |

## 4. Test results (all executed here; nothing claimed beyond this)

| Suite | Result |
|---|---|
| Existing unit tests (`npm test`) | **83 / 83 PASS** |
| Production build (`npm run build`, real env) | **PASS** — 144 static pages exported, all 11 /student routes + /admin present |
| Browser suite vs stub backend (`scripts/portal-check.mjs`, 12 assertions P1–P9) | **12 / 12 PASS** — pending/active/suspended screens, key separation, invalid-session clearing, refresh, profile race, error surfacing, owner-by-uid, activation PATCH, non-owner refusal |
| Database layer (Migration 013.1 rig suite, separate package) | **68 / 68 PASS** — RLS isolation, pending gate incl. storage, allowlist guards, owner pinning, rollback |
| Live Supabase | **NOT TESTED** — 013.1 is not yet run and sign-ups are OFF (see §6) |

One defect was found and fixed during this work: the login page computed the Google authorize URL during server prerender (`window is not defined`) — the build failed loudly, the URL is now computed client-side, and the rebuild passes.

## 5. Manual testing checklist (run AFTER §6 steps, with a test Google account)

**Pending student**
- [ ] Register via Google → land on "awaiting approval"; dashboard data never appears.
- [ ] Directly open /student/documents/ and /student/applications/ → still the pending screen.
- [ ] In /admin/students the account shows under **Pending**.

**Activation**
- [ ] Owner clicks **Activate** → success notice; student refreshes → dashboard opens.
- [ ] Confirm in Supabase: `profiles.account_status = 'active'` for that student only.

**Active student**
- [ ] Profile page: fill + save → values persist after reload; passport field visible only to self/owner.
- [ ] Applications: owner creates one → student sees it; student edits *Your notes* → saves; status stays counsellor-controlled.
- [ ] Documents: owner uploads a PDF → student sees it, downloads it (signed link); student has **no** upload/delete control.
- [ ] Messages: two-way exchange works; unread clears on view.
- [ ] Deadlines: tick complete → persists. Notifications: mark read → persists.
- [ ] Shortlist: add a university, add it again → friendly "already in your shortlist".
- [ ] Payments: owner adds a record → student sees it read-only.

**Suspended student**
- [ ] Owner suspends → student refresh shows "access is paused" with the support route; no data loads.
- [ ] Owner reactivates → access returns.

**Separation**
- [ ] In one browser: sign into /admin as owner, then open /student/login in another tab and sign in as a student — both sessions keep working independently; signing out of one does not disturb the other.

## 6. Go-live order (nothing here is live yet)

1. **Review + run Migration 013.1** in the Supabase SQL Editor, run the Verification SQL, share the output (V4/V8a/V8b/V9 especially). *The portal code reads `profiles.account_status` — it must not be deployed before 013.1 is live.*
2. Apply this package to the repo, push via GitHub Desktop, let Cloudflare build.
3. In Supabase → Authentication → Providers → Google: enable with your Google OAuth client ID/secret; add redirect URLs `https://n92-eduitalia.pages.dev/student/auth/callback/` (and the localhost one if you test locally). Keep **sign-ups enabled only at this point** — they stay OFF until now.
4. Run the §5 checklist with a test Google account before announcing the portal.

## 7. Not implemented / not tested — explicit list

- **The Starter ZIP was never received** — see §0. Nothing from it is in this package.
- **Application detail URL** is `/student/applications/?id=<uuid>`, not `/student/applications/[id]`: static export + Cloudflare Pages cannot serve unknown dynamic path segments (no file exists for an arbitrary id). The page also honours a path-style id if you later add a Cloudflare `_redirects` rewrite — that hosting change was **not** made silently; say the word and I'll add it as its own change.
- **Google OAuth is not enabled** (dashboard action, §6 step 3) and **sign-ups remain OFF** — per your instruction. The login button therefore cannot complete a real sign-in until step 3.
- **Live Supabase behaviour is NOT tested**: real Google sign-in, real storage signing, real RLS through the Data API — all pending the §6 sequence. DB behaviour is proven on the local rig only.
- **No "Student Portal" link was added to the public site header/menu** — the header is checksum-locked by your spec. Students enter via the direct `/student/login/` URL; if you want a menu entry, it is a separate approved header change.
- **Messages are a single thread per student** (that is what the audited schema models — one thread, sender distinguishes parties). No multi-conversation inbox, no attachments in messages.
- **Payments are history-only** — no gateway, no student-side creation (by design and by policy).
- **Email/push notifications are not sent** — notifications are in-portal records only.

---

## 8. REVIEW FIXES — 9 November 2026 (two independently identified issues)

**Changed files in this round: exactly two.** `lib/student.ts` (both fixes) and the new `tests/student-lib.test.mjs`. No database policies, grants, admin authentication (`lib/admin.ts`, checksummed unchanged), or unrelated components were touched. The delivered ZIP was verified byte-identical to the repository copy before the fixes were applied.

### Fix 1 — session refresh failure flow
*Before:* `ensureFreshStudentToken()` discarded the refresh result; on a transient network failure the expired access token was sent to `/auth/v1/user`, its inevitable 401 was treated as a dead session, and the student was signed out by a network blip.
*Now:* refresh has three explicit outcomes — `ok` / `dead` (the server definitively rejected the refresh token with HTTP 400/401 → session cleared, and only then) / `network` (no answer, a 5xx, or an unusable success body → session preserved untouched). `ensureFreshStudentToken()` returns the outcome; `currentStudentUser()` on `network` returns `{state:"error", retryable:true}` **without** making any request with the expired token, and never treats an expired token as authenticated. The gate's existing error screen ("Try again") is the retry path.

### Fix 2 — write response validation
*Before:* a success-status write response whose body was empty or malformed fell through a catch block to `{ok:true, rows:[]}` — an unconfirmed write reported as saved.
*Now:* every write in the layer requests `return=representation`, and `writeResult()` requires the response to parse as a JSON **array**; empty bodies and malformed/non-array payloads return the explicit error *"The database returned an unreadable response, so this change could NOT be confirmed as saved…"*; a valid empty array keeps the zero-row error; only a non-empty row array is success.

### Added tests — `tests/student-lib.test.mjs` (runs under the repo's `npm test`)
The real `lib/student.ts` is transpiled with the repo's TypeScript compiler and driven with scripted fetch/localStorage — **12 new tests, all PASS** (suite total now **95/95**):
- **R1** expired token + refresh network failure → retryable error, session preserved, `/auth/v1/user` never called.
- **R2** expired token + refresh HTTP 503 → same transient handling.
- **R3** expired token + refresh 400 (revoked) → session cleared, no verification attempt.
- **R4** expired token + successful refresh → new token stored and used for verification.
- **R5** valid token → no refresh attempted.
- **W1** insert, empty success body → explicit unconfirmed error. **W2** malformed JSON → same. **W3** non-array JSON → same. **W4** zero rows → zero-row error. **W5** valid rows → success with rows. **W6** update, empty body → same error (shared write path). **W7** server 403 → database message still surfaced.

### Regression after the fixes
- `npm test`: **95/95 PASS** (83 pre-existing + 12 new).
- Browser suite vs stub backend (portal-check): **12/12 PASS** — unchanged behaviour across pending/active/suspended/invalid/refresh/race/owner flows.
- Production build (real env): **PASS**, 144 static pages; `components/Header.tsx` and `app/page.tsx` checksums unchanged.
- Live Supabase: still **NOT TESTED**; nothing deployed; sign-ups and Google OAuth remain OFF.

---

## 9. REVIEW FIX ROUND 2 — 9 November 2026 (centralised auth preparation)

**Changed files in this round: exactly two.** `lib/student.ts` and `tests/student-lib.test.mjs`. Admin code, session keys, database policies and all other components untouched.

*Finding (correct):* the five data operations called `ensureFreshStudentToken()` but ignored its outcome, so an expired token + transient refresh failure could still be sent to PostgREST — the very path §8 closed for `currentStudentUser()` only.
*Fix:* a single `prepareStudentAuth()` now gates **studentSelect, studentInsert, studentUpdate, studentDelete and studentDocumentSignedUrl**:
- outcome `network` → the request is **not sent**; the operation returns `{ok:false, retryable:true, sessionExpired:false}` with the renewal-failure message; the session is preserved untouched.
- outcome `dead` → the request is **not sent**; `{ok:false, sessionExpired:true}` with "Your session has expired. Please sign in again." (the session was already cleared by the definitive rejection).
- `fresh` / `refreshed` / `proceed` → the existing request flow, unchanged.
`DbResult` (and the signed-URL result) carry the explicit `retryable` / `sessionExpired` flags; `ensureStudentProfile` and `fetchAccountProfile` inherit the behaviour through the operations they use.

### Added tests (10 new; suite total 105/105 PASS)
For **each** of SELECT, INSERT, UPDATE, DELETE and SIGNED_URL, with an expired access token:
- **A-<op> network:** refresh throws → result is the retryable error, **zero** PostgREST/storage requests recorded, session keys intact.
- **A-<op> revoked:** refresh returns 400 → result is the session-expired error, **zero** PostgREST/storage requests recorded, session cleared (only on this definitive rejection).

### Regression
`npm test` **105/105** · browser suite **12/12** · production build **PASS** (144 pages) · Header/homepage/admin checksums unchanged · live Supabase still NOT TESTED · nothing deployed · sign-ups/OAuth OFF.

---

## 10. REVIEW FIX ROUND 3 — 9 November 2026 (flag propagation through profile helpers)

**Changed files in this round: exactly three.** `lib/student.ts`, `components/student/StudentGate.tsx`, `tests/student-lib.test.mjs`. Admin authentication, session keys, database policies and all other portal code untouched.

*Finding (correct):* `fetchAccountProfile()` and `ensureStudentProfile()` reduced failures to `{ok:false, error}`, discarding the `retryable`/`sessionExpired` flags the operations now return — so the gate could not distinguish "try again" from "sign in again".
*Fix:*
- Both functions' failure types now carry `retryable?`/`sessionExpired?`, propagated on **every** failure path: initial SELECT failure, INSERT failure, and the duplicate-race re-fetch failure.
- In `ensureStudentProfile()`, an auth-preparation failure from the INSERT returns immediately with its flags — it is never tested against the duplicate-key pattern and never triggers the race refetch. Genuine 23505/409 recovery behaviour is unchanged (regression-tested, F6).
- UI callers checked: `StudentGate` (the caller of both helpers) now redirects to `/student/login/` on `sessionExpired` at both call sites — retrying a cleared session is pointless — while `retryable` failures use the existing error screen with its **Try again** action. The auth callback already defers status handling to the gate, so no change was needed there.

### Added tests (6 new; suite total 111/111 PASS)
- **F1/F2** `fetchAccountProfile` under refresh network failure / revoked token: flags propagate; zero PostgREST requests; session preserved (F1) / cleared (F2).
- **F3/F4** `ensureStudentProfile` under the same two conditions on the initial SELECT: flags propagate; zero PostgREST requests (no SELECT, no INSERT).
- **F5** renewal failure *during the INSERT* (refresh succeeds for the SELECT, dies for the INSERT): returned as retryable, exactly one PostgREST call recorded — the INSERT was gated and no duplicate-refetch was attempted.
- **F6** genuine duplicate race still recovers by refetch (behaviour unchanged).

### Regression
`npm test` **111/111** · browser suite **12/12** · production build **PASS** (144 pages) · Header/homepage/admin checksums unchanged · live Supabase still NOT TESTED · nothing deployed · sign-ups/OAuth OFF.

---

## 11. REVIEW FIX ROUND 4 — 9 November 2026 (refreshProfile failure handling)

**Changed files in this round: exactly four.** `components/student/StudentGate.tsx`, `app/student/profile/page.tsx`, plus test scaffolding `scripts/portal-stub.mjs` / `scripts/portal-check.mjs`. No admin code, session keys, database policies or unrelated pages touched. (`lib/student.ts` unchanged this round — the flags it returns were already correct.)

*Finding (correct):* the gate's `refreshProfile` callback handled only `again.ok`; a `sessionExpired` or `retryable` result from the post-save reload was silently dropped, and the profile page showed "Profile saved." regardless of the reload outcome.
*Fix:*
- `refreshProfile` now returns its outcome (`{ok, error?, retryable?, sessionExpired?}`) and acts on it: success → the existing in-place profile update, unchanged; `sessionExpired` → redirect to `/student/login/`; any other failure → the gate's error screen with the reload error (session preserved; the existing **Try again** flow re-runs the gate check and recovers).
- Profile page: "Profile saved." is shown only when the save **and** the reload both succeed. If the reload fails (and the gate has not already redirected), the page states plainly that the changes were saved but the latest details could not be reloaded, with the error.

### Added regression coverage (browser suite, no new auth architecture)
The stub gained an arming control that lets the refresh succeed for the save and then fail for the reload — the exact interleaving of this edge case:
- **P10a/P10b** — refresh returns HTTP 500 at reload time: the gate surfaces "could not be renewed", the student session is still in storage, and after disarming, **Try again** restores the profile page.
- **P11** — refresh returns 400 (revoked) at reload time: the gate redirects to `/student/login/` and the student session is cleared.

### Regression
Browser suite **15/15 PASS** (12 previous + 3 new) · `npm test` **111/111** · production build **PASS** (144 pages) · Header/homepage/admin checksums unchanged · live Supabase still NOT TESTED · nothing deployed · sign-ups/OAuth OFF.
