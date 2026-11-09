/* Functional check #5 — Admission Rounds repair.
   Part A (admin UI): an emulator that enforces the REAL database CHECK
   (manual_status must be NULL / 'results-published' / 'awaiting-
   confirmation' — anything else, including "", gets the 23514-style
   rejection). Proves Automatic now saves as NULL and all three statuses
   create/edit/persist, and that an invalid date pair is blocked in the
   form before any request is sent.
   Part B (public /admissions): snake_case fixtures exactly as Supabase
   returns them, asserting the public badges per the owner's rule:
   unverified → NOT VERIFIED regardless of manual status; verified +
   manual → the manual label; verified + automatic → calculated. */
import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const OUT = "/home/hatch/workspace/n92-eduitalia/out";
const CHROME = process.env.CHROME || "/home/hatch/workspace/tmp_chrome/chrome-linux64/chrome";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain", ".xml": "text/xml", ".ico": "image/x-icon", ".woff2": "font/woff2" };
const server = http.createServer((req, res) => {
  const u = new URL(req.url, "http://x");
  let p = decodeURIComponent(u.pathname);
  if (p.endsWith("/")) p += "index.html";
  let file = path.join(OUT, p);
  if (!fs.existsSync(file) && fs.existsSync(file + ".html")) file += ".html";
  if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  res.end(fs.readFileSync(file));
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

let failures = 0;
const check = (name, ok, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? " — " + extra : ""}`); if (!ok) failures++; };

const ALLOWED = [null, "results-published", "awaiting-confirmation"];
const store = { rounds: [] };
const posts = [];
let publicFixtures = [];

const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });

async function routeHandler(route) {
  const req = route.request();
  const url = req.url();
  const json = (status, body) => route.fulfill({ status, contentType: "application/json", body: typeof body === "string" ? body : JSON.stringify(body) });
  if (url.includes("/auth/v1/user")) return json(200, { id: "u-admin", email: "sh10ad786@gmail.com" });
  if (url.includes("/auth/v1/token")) return json(200, { access_token: "tok", refresh_token: "ref", user: { id: "u-admin", email: "sh10ad786@gmail.com" } });
  const m = url.match(/\/rest\/v1\/([a-z_]+)(\?(.*))?$/);
  if (!m) return json(404, { message: "not found" });
  const table = m[1];
  const query = new URLSearchParams(m[3] || "");
  const method = req.method();
  if (table === "admission_rounds") {
    if (method === "GET") {
      if (query.get("status") === "eq.published") return json(200, publicFixtures); // public read
      return json(200, store.rounds); // admin read
    }
    const body = req.postData() ? JSON.parse(req.postData()) : null;
    const rowsIn = Array.isArray(body) ? body : [body];
    for (const r of rowsIn) {
      if (r && "manual_status" in r && !ALLOWED.includes(r.manual_status)) {
        return json(400, { code: "23514", message: 'new row for relation "admission_rounds" violates check constraint "admission_rounds_manual_status_check"' });
      }
    }
    if (method === "POST") { posts.push(rowsIn[0]); store.rounds.push(...rowsIn); return json(201, rowsIn); }
    const id = (query.get("id") || "").replace("eq.", "");
    const row = store.rounds.find((r) => r.id === id);
    if (method === "PATCH") { if (row) Object.assign(row, body); return json(200, row ? [row] : []); }
    if (method === "DELETE") { store.rounds = store.rounds.filter((r) => r.id !== id); return json(200, row ? [row] : []); }
  }
  if (method === "GET") return json(200, []);
  if (method === "POST") return json(201, [{ id: 1 }]);
  return json(200, [{ id: 1 }]);
}

/* ---------------- Part A: admin ---------------- */
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
page.on("dialog", (d) => d.accept());
await page.addInitScript(() => {
  localStorage.setItem("n92_admin_token", "e2e-admin-token");
  localStorage.setItem("n92_admin_user", "sh10ad786@gmail.com");
});
await page.route(/supabase\.co\//, routeHandler);
await page.goto(`${base}/admin/`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Admission Rounds" }).click();

async function createRound(university, manualValue, { verified = true } = {}) {
  await page.getByRole("button", { name: "+ Add Admission Round" }).click();
  await page.getByLabel(/University name/).fill(university);
  await page.locator("#f-opensAt").fill("2026-11-01T09:00");
  await page.locator("#f-deadlineAt").fill("2027-01-31T23:59");
  if (verified) await page.locator("#f-deadlineVerified").check();
  await page.locator("#f-manualStatus").selectOption(manualValue);
  await page.locator("#f-status").selectOption("published");
  await page.getByRole("button", { name: "Save Admission Round" }).click();
  await page.getByText("Admission Round saved and published.").waitFor({ timeout: 8000 });
}

await createRound("Fixture University Auto", "");
const autoPost = posts.find((p) => p.university_name === "Fixture University Auto");
check("AUTOMATIC: saves successfully and sends manual_status = NULL", !!autoPost && autoPost.manual_status === null, JSON.stringify(autoPost?.manual_status));
check("AUTOMATIC: Rome wall-clock converted to UTC (09:00 CET → 08:00Z)", autoPost?.opens_at === "2026-11-01T08:00:00.000Z", autoPost?.opens_at);
check("AUTOMATIC: deadline 23:59 CET → 22:59Z", autoPost?.deadline_at === "2027-01-31T22:59:00.000Z", autoPost?.deadline_at);

await createRound("Fixture University Results", "results-published");
const resPost = posts.find((p) => p.university_name === "Fixture University Results");
check("RESULTS PUBLISHED: saves with exact DB value", resPost?.manual_status === "results-published");
check("RESULTS PUBLISHED: deadline_verified stays as set by the checkbox only", resPost?.deadline_verified === true);

await createRound("Fixture University Awaiting", "awaiting-confirmation", { verified: false });
const awPost = posts.find((p) => p.university_name === "Fixture University Awaiting");
check("AWAITING CONFIRMATION: saves; deadline_verified remains false (independent)", awPost?.manual_status === "awaiting-confirmation" && awPost?.deadline_verified === false);

// Edit the Automatic record → switch to Results Published, save, verify persisted
const autoRow = page.getByRole("row", { name: /Fixture University Auto/ });
await autoRow.getByRole("button", { name: "Edit" }).click();
await page.locator("#f-manualStatus").selectOption("results-published");
await page.getByRole("button", { name: "Save Admission Round" }).click();
await page.getByText(/Admission Round saved/).waitFor({ timeout: 8000 });
check("EDIT: Automatic → Results Published persists", store.rounds.find((r) => r.university_name === "Fixture University Auto")?.manual_status === "results-published");

// Edit it back to Automatic → must persist NULL again
await autoRow.getByRole("button", { name: "Edit" }).click();
await page.locator("#f-manualStatus").selectOption("");
await page.getByRole("button", { name: "Save Admission Round" }).click();
await page.getByText(/Admission Round saved/).waitFor({ timeout: 8000 });
check("EDIT: Results Published → Automatic persists NULL", store.rounds.find((r) => r.university_name === "Fixture University Auto")?.manual_status === null);

// Invalid date combination is blocked in the form (no request sent)
const postsBefore = posts.length;
await page.getByRole("button", { name: "+ Add Admission Round" }).click();
await page.getByLabel(/University name/).fill("Fixture University Invalid");
await page.locator("#f-opensAt").fill("2027-02-01T09:00");
await page.locator("#f-deadlineAt").fill("2027-01-01T09:00");
await page.getByRole("button", { name: "Save Admission Round" }).click();
await page.getByText(/deadline must be after the opening/).waitFor({ timeout: 8000 });
check("INVALID DATES: blocked with a clear message, nothing sent", posts.length === postsBefore);
await page.keyboard.press("Escape").catch(() => {});

/* ---------------- Part B: public display ---------------- */
const now = Date.now();
const iso = (ms) => new Date(ms).toISOString();
const mk = (id, name, extra) => ({
  id, university_name: name, programme_name: null, intake_year: 2027, intake_semester: "Fall",
  round_name: "First Call", custom_round_label: null, pinned: false, status: "published",
  official_url: null, source_url: null, last_verified: null, message: null,
  created_at: iso(now), updated_at: iso(now), ...extra,
});
publicFixtures = [
  mk("pub-1", "Public Uni Verified Results", { manual_status: "results-published", deadline_verified: true, opens_at: iso(now - 86400000), deadline_at: iso(now + 30 * 86400000) }),
  mk("pub-2", "Public Uni Unverified Results", { manual_status: "results-published", deadline_verified: false, opens_at: iso(now - 86400000), deadline_at: iso(now + 30 * 86400000) }),
  mk("pub-3", "Public Uni Verified Auto", { manual_status: null, deadline_verified: true, opens_at: iso(now - 86400000), deadline_at: iso(now + 30 * 86400000) }),
  mk("pub-4", "Public Uni Verified Awaiting", { manual_status: "awaiting-confirmation", deadline_verified: true, opens_at: iso(now - 86400000), deadline_at: iso(now + 30 * 86400000) }),
  mk("pub-5", "Public Uni Unverified Auto", { manual_status: null, deadline_verified: false, opens_at: iso(now - 86400000), deadline_at: iso(now + 30 * 86400000) }),
];
const pub = await browser.newPage({ viewport: { width: 1280, height: 900 } });
await pub.route(/supabase\.co\//, routeHandler);
await pub.goto(`${base}/admissions/`, { waitUntil: "networkidle" });
const bodyText = await pub.locator("body").innerText();
async function badgeFor(articleId) {
  return pub.locator(`article#${articleId}`).innerText();
}
const t1 = await badgeFor("pub-1");
check("PUBLIC verified + Results Published → RESULTS PUBLISHED", t1.includes("RESULTS PUBLISHED"));
const t2 = await badgeFor("pub-2");
check("PUBLIC unverified + Results Published → NOT VERIFIED (owner's rule)", t2.includes("NOT VERIFIED") && !t2.includes("RESULTS PUBLISHED"));
const t3 = await badgeFor("pub-3");
check("PUBLIC verified + Automatic (in window) → OPEN", /\bOPEN\b/.test(t3) && !t3.includes("NOT VERIFIED"));
const t4 = await badgeFor("pub-4");
check("PUBLIC verified + Awaiting → AWAITING OFFICIAL CONFIRMATION", t4.includes("AWAITING OFFICIAL CONFIRMATION"));
const t5 = await badgeFor("pub-5");
check("PUBLIC unverified + Automatic → NOT VERIFIED", t5.includes("NOT VERIFIED"));
check("PUBLIC page rendered all five fixture rounds", bodyText.includes("Public Uni Verified Results") && bodyText.includes("Public Uni Unverified Auto"));

await browser.close();
server.close();
console.log(failures === 0 ? "\nALL ADMISSION-ROUNDS CHECKS PASSED" : `\n${failures} FAILURES`);
process.exit(failures ? 1 : 0);
