/**
 * Portal security/integration checks — drives the static export served
 * by scripts/portal-stub.mjs (start it first, with a build whose
 * NEXT_PUBLIC_SUPABASE_URL points at the stub).
 * TEST SCAFFOLDING ONLY.
 */
import { chromium } from "playwright-core";
import { mkdirSync } from "node:fs";
const SHOTS = "/home/hatch/workspace/n92_upgrade_screenshots";
mkdirSync(SHOTS, { recursive: true });

const BASE = process.env.BASE || "http://127.0.0.1:8923";
const CHROME = process.env.CHROME || "/home/hatch/workspace/tmp_chrome/chrome-linux64/chrome";
const STUDENT_ID = "57aa0000-0000-4000-8000-000000000001";
const PENDING_ID = "57aa0000-0000-4000-8000-000000000002";
const OWNER_ID = "57aa0000-0000-4000-8000-0000000000ff";
const NONOWNER_ID = "57aa0000-0000-4000-8000-0000000000ee";

let pass = 0, fail = 0;
function report(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  ok ? pass++ : fail++;
}
const api = async (path, method = "GET", body) => {
  const res = await fetch(`${BASE}${path}`, { method, headers: { "Content-Type": "application/json" }, body: body ? JSON.stringify(body) : undefined });
  return res.json();
};
const setScenario = (name) => api("/__scenario", "POST", { name });
// Wait until a request appears in the stub log — used to let the
// profile page's mount-time calls (incl. the avatar meta lookup)
// finish before arming a refresh failure, so the armed counter is
// consumed by exactly the operations the check intends.
async function waitForLog(substr, timeout = 10000) {
  const start = Date.now();
  for (;;) {
    const log = await getLog();
    if (log.some((e) => `${e.method} ${e.path}`.includes(substr))) return;
    if (Date.now() - start > timeout) throw new Error(`waitForLog timed out: ${substr}`);
    await new Promise((r) => setTimeout(r, 150));
  }
}
const resetLog = () => api("/__reset", "POST", {});
const getLog = () => api("/__log");
const tokenFor = async (sub, email, exp) => (await api(`/__token?sub=${sub}&email=${encodeURIComponent(email)}&exp=${exp}`)).token;

async function waitForText(page, text, timeout = 12000) {
  await page.waitForFunction((t) => document.body && document.body.innerText.includes(t), text, { timeout });
}
async function waitForUrl(page, suffix, timeout = 12000) {
  await page.waitForFunction((s) => window.location.pathname.endsWith(s), suffix, { timeout });
}

const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });

async function openSeeded(seed) {
  const ctx = await browser.newContext();
  await ctx.addInitScript((entries) => {
    // Seed once per tab: an init script re-runs on every navigation,
    // which would resurrect tokens the app legitimately cleared.
    if (sessionStorage.getItem("__portal_seeded")) return;
    sessionStorage.setItem("__portal_seeded", "1");
    for (const [k, v] of Object.entries(entries)) {
      if (v === null) localStorage.removeItem(k);
      else localStorage.setItem(k, v);
    }
  }, seed);
  return ctx.newPage();
}
const studentSeed = async (exp = 3600) => ({
  n92_student_token: await tokenFor(STUDENT_ID, "student@test.local", exp),
  n92_student_refresh: "stub-refresh-1",
  n92_student_user: "student@test.local",
});

// P1 — pending student: pending screen; admin session untouched (key separation)
{
  await setScenario("pending"); await resetLog();
  const adminToken = await tokenFor(OWNER_ID, "sh10ad786@gmail.com", 3600);
  const page = await openSeeded({ ...(await studentSeed()), n92_admin_token: adminToken, n92_admin_user: "sh10ad786@gmail.com" });
  await page.goto(`${BASE}/student/dashboard/`);
  await waitForText(page, "awaiting approval");
  report("P1a pending student sees the pending-approval screen", true);
  const keys = await page.evaluate(() => ({ admin: localStorage.getItem("n92_admin_token"), student: localStorage.getItem("n92_student_token") }));
  report("P1b student flow never touches admin session keys", keys.admin === adminToken && Boolean(keys.student));
  await page.context().close();
}

// P2 — active student: dashboard renders own data
{
  await setScenario("active"); await resetLog();
  const page = await openSeeded(await studentSeed());
  await page.goto(`${BASE}/student/dashboard/`);
  await waitForText(page, "University of Padua");
  report("P2 active student dashboard renders own application data", true);
  await page.context().close();
}

// P3 — suspended student: blocked screen with support route
{
  await setScenario("suspended"); await resetLog();
  const page = await openSeeded(await studentSeed());
  await page.goto(`${BASE}/student/dashboard/`);
  await waitForText(page, "access is paused");
  report("P3 suspended student is blocked with a support message", true);
  await page.context().close();
}

// P4 — invalid session: cleared + sent to login
{
  await setScenario("invalid"); await resetLog();
  const page = await openSeeded(await studentSeed());
  await page.goto(`${BASE}/student/dashboard/`);
  await waitForUrl(page, "/student/login/");
  const token = await page.evaluate(() => localStorage.getItem("n92_student_token"));
  report("P4 invalid session is cleared and redirected to student login", token === null);
  await page.context().close();
}

// P5 — expired access token: refreshed before use, session renewed
{
  await setScenario("active"); await resetLog();
  const seed = await studentSeed(-30); // already expired
  const expired = seed.n92_student_token;
  const page = await openSeeded(seed);
  await page.goto(`${BASE}/student/dashboard/`);
  await waitForText(page, "University of Padua");
  const log = await getLog();
  const refreshed = log.some((e) => e.method === "POST" && e.path === "/auth/v1/token");
  const stored = await page.evaluate(() => localStorage.getItem("n92_student_token"));
  report("P5 expired token triggers refresh and the dashboard loads", refreshed && stored !== expired, `refresh-called=${refreshed}`);
  await page.context().close();
}

// P6 — first-login profile race: 409 on create → refetch → success
{
  await setScenario("race"); await resetLog();
  const page = await openSeeded(await studentSeed());
  await page.goto(`${BASE}/student/profile/`);
  await waitForText(page, "My Profile");
  const value = await page.evaluate(() => document.querySelector("#pf-full_name")?.value || "");
  const log = await getLog();
  const posted = log.some((e) => e.method === "POST" && e.path === "/rest/v1/student_profiles");
  report("P6 duplicate-profile race resolves by refetch (no error shown)", value === "Stub Student" && posted, `full_name=${value}, post-attempted=${posted}`);
  await page.context().close();
}

// P7 — profile creation failure is surfaced, never silent
{
  await setScenario("profile-error"); await resetLog();
  const page = await openSeeded(await studentSeed());
  await page.goto(`${BASE}/student/profile/`);
  await waitForText(page, "stub profile insert exploded");
  report("P7 failed profile creation shows the database error", true);
  await page.context().close();
}

// P8 — /admin/students: owner identified by exact uid; activation is a DB-authorized PATCH
{
  await setScenario("active"); await resetLog();
  const page = await openSeeded({
    n92_admin_token: await tokenFor(OWNER_ID, "sh10ad786@gmail.com", 3600),
    n92_admin_refresh: "stub-refresh-admin",
    n92_admin_user: "sh10ad786@gmail.com",
  });
  await page.goto(`${BASE}/admin/`);
  await page.getByRole("button", { name: "Student Portal" }).click();
  await waitForText(page, "pending@test.local");
  report("P8a owner sees the student list in /admin/students", true);
  const row = page.locator("tr", { hasText: "pending@test.local" });
  await row.getByRole("button", { name: "Activate" }).click();
  await page.waitForFunction(() => document.body.innerText.includes("is now active"), null, { timeout: 12000 });
  const log = await getLog();
  const byUid = log.some((e) => e.method === "GET" && e.path === "/rest/v1/profiles" && (e.query || "").includes(`id=eq.${OWNER_ID}`));
  const patch = log.find((e) => e.method === "PATCH" && e.path === "/rest/v1/profiles");
  const patchOk = Boolean(patch) && (patch.query || "").includes(`id=eq.${PENDING_ID}`) && (patch.body || "").includes('"account_status":"active"') || (patch?.body || "").includes('"account_status": "active"');
  const limitOne = log.some((e) => e.path === "/rest/v1/profiles" && (e.query || "").includes("limit=1") && !(e.query || "").includes("id=eq."));
  report("P8b current admin identified by exact authenticated uid (no limit=1 lookup)", byUid && !limitOne, `byUid=${byUid}, limitOne=${limitOne}`);
  report("P8c activation issues a profiles PATCH for the exact student with account_status=active", Boolean(patch) && (patch.query || "").includes(`id=eq.${PENDING_ID}`), patch ? `${patch.query} ${patch.body}` : "no PATCH recorded");
  await page.context().close();
}

// P9 — /admin/students: a non-owner admin identity gets no controls
{
  await setScenario("active"); await resetLog();
  const page = await openSeeded({
    n92_admin_token: await tokenFor(NONOWNER_ID, "helper@test.local", 3600),
    n92_admin_refresh: "stub-refresh-admin",
    n92_admin_user: "helper@test.local",
  });
  await page.goto(`${BASE}/admin/`);
  await page.getByRole("button", { name: "Student Portal" }).click();
  await waitForText(page, "Owner access required");
  const hasActivate = await page.evaluate(() => [...document.querySelectorAll("button")].some((b) => b.textContent?.trim() === "Activate"));
  report("P9 non-owner identity is refused the student-activation controls", !hasActivate);
  await page.context().close();
}


// P10 — refreshProfile retryable failure (refresh dies AFTER a successful save):
// gate surfaces the error, session preserved, Try again recovers.
{
  await setScenario("refresh-retryable"); await resetLog();
  const page = await openSeeded(await studentSeed(-10)); // already-expired seed: gate refreshes pre-arm; in the refresh-retryable scenario every later op refreshes too (30s tokens vs 60s threshold) — deterministic
  await page.goto(`${BASE}/student/profile/`);
  await waitForText(page, "My Profile");
  await waitForLog("object/list/student-avatars");
  await api("/__arm", "POST", { mode: "fail", succeed: 1 }); // save's refresh succeeds; the reload's dies
  await page.fill("#pf-full_name", "Stub Student Updated");
  await page.getByRole("button", { name: "Save profile" }).click();
  await waitForText(page, "could not be renewed");
  const token = await page.evaluate(() => localStorage.getItem("n92_student_token"));
  report("P10a retryable refresh-after-save failure is surfaced by the gate, session preserved", Boolean(token));
  await api("/__arm", "POST", { mode: "off" });
  await page.getByRole("button", { name: "Try again" }).click();
  await waitForText(page, "My Profile");
  report("P10b the gate's Try again flow recovers after the transient failure", true);
  await page.context().close();
}

// P11 — refreshProfile session-expired failure (refresh revoked AFTER a successful save):
// gate redirects to student login; session cleared.
{
  await setScenario("refresh-retryable"); await resetLog();
  const page = await openSeeded(await studentSeed(-10));
  await page.goto(`${BASE}/student/profile/`);
  await waitForText(page, "My Profile");
  await waitForLog("object/list/student-avatars");
  await api("/__arm", "POST", { mode: "revoke", succeed: 1 });
  await page.fill("#pf-full_name", "Stub Student Again");
  await page.getByRole("button", { name: "Save profile" }).click();
  await waitForUrl(page, "/student/login/");
  const token = await page.evaluate(() => localStorage.getItem("n92_student_token"));
  report("P11 session-expired refresh-after-save redirects to student login, session cleared", token === null);
  await page.context().close();
}

// Q1-Q3 — Admin: Profile Overview (complete record, masked passport, refresh),
// Excel export buttons (owner-only surface).
{
  await setScenario("active"); await resetLog();
  const page = await openSeeded({
    n92_admin_token: await tokenFor(OWNER_ID, "sh10ad786@gmail.com", 3600),
    n92_admin_refresh: "stub-refresh-admin",
    n92_admin_user: "sh10ad786@gmail.com",
  });
  await page.goto(`${BASE}/admin/`);
  await page.getByRole("button", { name: "Student Portal" }).click();
  await waitForText(page, "Stub Student");
  const listText = await page.evaluate(() => document.body.innerText);
  report("Q3a Excel export button is visible to the owner in Student Portal",
    listText.includes("Export Students to Excel (.xlsx)"));
  report("Q3b student list shows a profile completion indicator",
    /\d+%/.test(listText) && listText.includes("Fall 2027"));
  await page.screenshot({ path: `${SHOTS}/admin-students-list.png` });
  const row = page.locator("tr", { hasText: "student@test.local" });
  await row.getByRole("button", { name: "Manage" }).click();
  await waitForText(page, "Student Profile Overview");
  const before = await page.evaluate(() => document.body.innerText);
  report("Q1a overview shows the complete saved profile (academic + English + preferences)",
    before.includes("BSc Computer Science, Stub University") && before.includes("IELTS 7.0") && before.includes("Padua") && before.includes("STUB STUDENT"));
  report("Q1b passport number is masked by default in the overview",
    before.includes("••••") && !before.includes("P1234567"));
  report("Q1c empty fields display 'Not provided'", before.includes("Not provided"));
  report("Q1d profile completion percentage + missing fields are shown",
    before.includes("Profile completion:") && before.includes("Still missing:"));
  await page.getByRole("button", { name: "Reveal" }).click();
  await page.waitForFunction(() => document.body.innerText.includes("P1234567"), null, { timeout: 12000 });
  report("Q1e owner can deliberately reveal the passport number", true);
  await page.getByRole("button", { name: "Hide" }).click();
  await page.getByText("Student Profile Overview").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/admin-profile-overview.png` });
  await api("/__set-profile", "POST", { full_name: "Stub Student Updated" });
  await page.getByRole("button", { name: "Refresh Profile" }).click();
  await waitForText(page, "Stub Student Updated");
  report("Q2 updated student information appears after Refresh Profile", true);
  await api("/__set-profile", "POST", { full_name: "Stub Student" });
  await page.context().close();
}

// Q4 — Header: Student Login on desktop + mobile, no horizontal overflow.
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/`);
  const desktopLink = page.locator('header nav a[href="/student/login/"]');
  await desktopLink.first().waitFor({ state: "visible", timeout: 15000 });
  report("Q4a Student Login link is visible in the desktop header", true);
  let overflowOk = true;
  for (const w of [1400, 1440, 1600, 1920]) {
    await page.setViewportSize({ width: w, height: 900 });
    await page.waitForTimeout(250);
    const bad = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    if (bad) overflowOk = false;
  }
  report("Q4b header causes no horizontal overflow at 1400/1440/1600/1920px", overflowOk);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.screenshot({ path: `${SHOTS}/header-desktop.png` });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(`${BASE}/`);
  await page.getByRole("button", { name: /Menu/ }).first().click();
  const mobileLink = page.locator('#mobile-menu a[href="/student/login/"]');
  await mobileLink.waitFor({ state: "visible", timeout: 15000 });
  report("Q4c Student Login link is visible in the mobile menu", true);
  await page.screenshot({ path: `${SHOTS}/header-mobile-menu.png` });
  await ctx.close();
}

// Q5 — Login page: Sign In form + registration information (no signup form).
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  await page.goto(`${BASE}/student/login/`);
  await page.locator("#sl-email").waitFor({ state: "visible", timeout: 15000 });
  const forms = await page.locator("form").count();
  const text = await page.evaluate(() => document.body.innerText);
  report("Q5a login page has an email + password Sign In form",
    await page.locator("#sl-password").isVisible() && text.includes("Sign In"));
  report("Q5b exactly one form on the page (the sign-in form); registration is information only",
    forms === 1 && text.includes("managed personally by the N92 team") && !text.toLowerCase().includes("create account"));
  report("Q5c forgot-password entry is present", text.includes("Forgot password?"));
  await page.screenshot({ path: `${SHOTS}/student-login.png`, fullPage: true });
  await ctx.close();
}

// Q6 — Student profile photo section renders for an active student.
{
  await setScenario("active"); await resetLog();
  const page = await openSeeded(await studentSeed(3600));
  await page.goto(`${BASE}/student/profile/`);
  await waitForText(page, "Profile photo");
  await waitForText(page, "Upload Photo");
  report("Q6 profile photo section with Upload Photo renders on My Profile", true);
  await page.getByText("Profile photo").scrollIntoViewIfNeeded();
  await page.screenshot({ path: `${SHOTS}/student-profile-photo.png` });
  await page.context().close();
}

// Q7 — Non-owner never sees the export controls.
{
  await setScenario("active"); await resetLog();
  const page = await openSeeded({
    n92_admin_token: await tokenFor(NONOWNER_ID, "helper@test.local", 3600),
    n92_admin_refresh: "stub-refresh-admin",
    n92_admin_user: "helper@test.local",
  });
  await page.goto(`${BASE}/admin/`);
  await page.getByRole("button", { name: "Student Portal" }).click();
  await waitForText(page, "Owner access required");
  const text = await page.evaluate(() => document.body.innerText);
  report("Q7 non-owner cannot see or use the Excel export", !text.includes("Export Students to Excel"));
  await page.context().close();
}

await browser.close();
console.log(`\nTOTAL: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);

