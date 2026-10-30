/* Functional check #4 — the repair release (RC-2, RC-3, RC-4) driven
   through the REAL admin UI against an emulator that behaves like real
   Supabase: refresh-token grant, return=representation writes, and a
   zero-row mode that simulates RLS matching nothing. */
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

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = (expSec) => `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub: "u-admin", email: "sh10ad786@gmail.com", exp: expSec })}.fakesig`;
const EXPIRED = jwt(Math.floor(Date.now() / 1000) - 600);
const FRESH = jwt(Math.floor(Date.now() / 1000) + 3600);

let failures = 0;
const check = (name, ok, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? " — " + extra : ""}`); if (!ok) failures++; };

const state = {
  refreshCalls: 0,
  restAuth: [],       // Authorization headers seen on REST calls, in order
  zeroRowPatch: false,
  zeroRowDelete: false,
  rows: Array.from({ length: 10 }, (_, i) => ({
    id: `t-seed-${i + 1}`, display_name: `Seed Student ${i + 1}`, photo_url: "", university_name: "University of Padova",
    programme: "MSc", country: "India", service_category: "visa-guidance", review_text: "seed", review_date: null,
    source: "manual", permission_confirmed: true, featured: false, status: "draft", admin_notes: "",
  })),
};

const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("dialog", (d) => d.accept());
await page.addInitScript(([expired]) => {
  localStorage.setItem("n92_admin_token", expired);
  localStorage.setItem("n92_admin_refresh", "e2e-refresh-token");
  localStorage.setItem("n92_admin_user", "sh10ad786@gmail.com");
}, [EXPIRED]);

await page.route(/supabase\.co\//, async (route) => {
  const req = route.request();
  const url = req.url();
  const json = (status, body) => route.fulfill({ status, contentType: "application/json", body: typeof body === "string" ? body : JSON.stringify(body) });
  if (url.includes("/auth/v1/token")) {
    const body = req.postData() ? JSON.parse(req.postData()) : {};
    if (body.refresh_token === "e2e-refresh-token") {
      state.refreshCalls++;
      return json(200, { access_token: FRESH, refresh_token: "e2e-refresh-token-2", user: { id: "u-admin", email: "sh10ad786@gmail.com" } });
    }
    return json(400, { error_description: "bad grant" });
  }
  if (url.includes("/auth/v1/user")) {
    if ((req.headers()["authorization"] || "").includes(EXPIRED)) return json(401, { message: "JWT expired" });
    return json(200, { id: "u-admin", email: "sh10ad786@gmail.com" });
  }
  const m = url.match(/\/rest\/v1\/([a-z_]+)(\?(.*))?$/);
  if (!m) return json(404, { message: "not found" });
  const table = m[1];
  state.restAuth.push({ table, auth: req.headers()["authorization"] || "" });
  const query = new URLSearchParams(m[3] || "");
  const method = req.method();
  if (table !== "testimonials") {
    if (method === "GET") return json(200, []);
    if (method === "POST") return json(201, [{ id: 1 }]);
    return json(200, [{ id: 1 }]);
  }
  const body = req.postData() ? JSON.parse(req.postData()) : null;
  if (method === "GET") return json(200, state.rows);
  if (method === "POST") { const rows = Array.isArray(body) ? body : [body]; state.rows.push(...rows); return json(201, rows); }
  const id = (query.get("id") || "").replace("eq.", "");
  const row = state.rows.find((r) => r.id === id);
  if (method === "PATCH") {
    if (state.zeroRowPatch) return json(200, []);
    if (row) Object.assign(row, body);
    return json(200, row ? [row] : []);
  }
  if (method === "DELETE") {
    if (state.zeroRowDelete) return json(200, []);
    state.rows = state.rows.filter((r) => r.id !== id);
    return json(200, row ? [row] : []);
  }
  return json(204, "");
});

await page.goto(`${base}/admin/`, { waitUntil: "networkidle" });

// ---- RC-2: expired token transparently refreshed before data loads ----
await page.getByRole("button", { name: "Student Reviews" }).click();
await page.getByRole("cell", { name: "Seed Student 1", exact: true }).waitFor({ timeout: 8000 });
check("RC-2 refresh grant was called for the expired session", state.refreshCalls >= 1, `${state.refreshCalls} call(s)`);
check("RC-2 the EXPIRED token is never sent to the database",
  state.restAuth.length > 0 && state.restAuth.every((c) => !c.auth.includes(EXPIRED)),
  `${state.restAuth.length} REST call(s)`);
check("RC-2 admin-table calls carry the FRESH token",
  state.restAuth.some((c) => c.table === "testimonials" && c.auth.includes(FRESH)));

// ---- RC-4: Edit on the last (far-down) row scrolls the form into view ----
const editButtons = page.getByRole("button", { name: "Edit" });
await editButtons.last().click();
await page.waitForTimeout(1200); // smooth scroll settles
const rect = await page.locator('section[aria-label^="Edit Testimonial"]').evaluate((el) => {
  const r = el.getBoundingClientRect();
  return { top: r.top, bottom: r.bottom, vh: window.innerHeight };
});
check("RC-4 edit form is scrolled into the viewport", rect.top >= -10 && rect.top < rect.vh && rect.bottom > 0, JSON.stringify(rect));
await page.getByRole("button", { name: "Cancel" }).click().catch(() => page.keyboard.press("Escape"));

// ---- RC-3: zero-row PATCH must surface an error, never a success ----
state.zeroRowPatch = true;
await page.getByRole("button", { name: "Publish" }).first().click();
await page.getByText(/No record was changed \(0 rows updated\)/).waitFor({ timeout: 8000 });
check("RC-3 zero-row update shows the explicit error", true);
check("RC-3 zero-row update did NOT publish the record", state.rows[0].status === "draft");
state.zeroRowPatch = false;

// ---- RC-3: zero-row DELETE must surface an error ----
state.zeroRowDelete = true;
await page.getByRole("button", { name: "Delete" }).first().click();
await page.getByText(/No record was deleted \(0 rows deleted\)/).waitFor({ timeout: 8000 });
check("RC-3 zero-row delete shows the explicit error", true);
state.zeroRowDelete = false;

// ---- Healthy path still works under representation responses ----
await page.getByRole("button", { name: "Publish" }).first().click();
await page.waitForFunction(() => document.body.innerText.includes("Published"), null, { timeout: 8000 });
check("Healthy publish still works (row actually changed)", state.rows[0].status === "published");
await page.getByRole("button", { name: "Delete" }).first().click();
await page.waitForFunction(() => !Array.from(document.querySelectorAll("td")).some((td) => td.textContent === "Seed Student 1"), null, { timeout: 8000 });
check("Healthy delete still works", state.rows.length === 9);

await browser.close();
server.close();
console.log(failures === 0 ? "\nALL REPAIR-RELEASE CHECKS PASSED" : `\n${failures} FAILURES`);
process.exit(failures ? 1 : 0);
