/* Functional check #3 — REAL Admin save flow for Student Reviews against a
   STRICT PostgREST emulator: unknown columns are rejected with the exact
   PGRST204 error real Supabase returns. Proves the fixed RecordsManager
   payload saves end-to-end (create → edit → publish → delete) through the
   actual admin UI code. */
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

const TESTIMONIAL_COLUMNS = ["id","display_name","photo_url","university_name","programme","country","service_category","review_text","review_date","source","permission_confirmed","featured","status","admin_notes","created_at","updated_at"];
const store = { testimonials: [] };
const captured = [];
let failures = 0;
const check = (name, ok, extra = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${extra ? " — " + extra : ""}`); if (!ok) failures++; };

const browser = await chromium.launch({ executablePath: CHROME, args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
page.on("dialog", (d) => d.accept());
await page.addInitScript(() => {
  localStorage.setItem("n92_admin_token", "e2e-admin-token");
  localStorage.setItem("n92_admin_user", "sh10ad786@gmail.com");
});
await page.route(/supabase\.co\//, async (route) => {
  const req = route.request();
  const url = req.url();
  const json = (status, body) => route.fulfill({ status, contentType: "application/json", body: typeof body === "string" ? body : JSON.stringify(body) });
  if (url.includes("/auth/v1/user")) return json(200, { id: "u-admin", email: "sh10ad786@gmail.com" });
  if (url.includes("/auth/v1/token")) return json(200, { access_token: "e2e-admin-token", user: { id: "u-admin", email: "sh10ad786@gmail.com" } });
  const m = url.match(/\/rest\/v1\/([a-z_]+)(\?(.*))?$/);
  if (!m) return json(404, { message: "not found" });
  const table = m[1];
  const query = new URLSearchParams(m[3] || "");
  const method = req.method();
  if (method === "GET") {
    if (table === "testimonials") return json(200, store.testimonials);
    return json(200, []);
  }
  const body = req.postData() ? JSON.parse(req.postData()) : null;
  if (table === "testimonials") {
    const rows = Array.isArray(body) ? body : [body];
    if (method === "POST" || method === "PATCH") {
      for (const row of rows) {
        const bad = Object.keys(row).find((k) => !TESTIMONIAL_COLUMNS.includes(k));
        if (bad) return json(400, { code: "PGRST204", message: `Could not find the '${bad}' column of 'testimonials' in the schema cache` });
      }
    }
    if (method === "POST") { captured.push({ method, body: rows[0] }); store.testimonials.push(...rows); return json(201, ""); }
    if (method === "PATCH") {
      captured.push({ method, body });
      const id = (query.get("id") || "").replace("eq.", "");
      const row = store.testimonials.find((r) => r.id === id);
      if (row) Object.assign(row, body);
      return json(204, "");
    }
    if (method === "DELETE") {
      captured.push({ method, body: null });
      const id = (query.get("id") || "").replace("eq.", "");
      store.testimonials = store.testimonials.filter((r) => r.id !== id);
      return json(204, "");
    }
  }
  if (method === "POST") return json(201, ""); // audit_log / content_versions: accept
  return json(204, "");
});

await page.goto(`${base}/admin/`, { waitUntil: "networkidle" });
await page.getByRole("button", { name: "Student Reviews" }).click();
await page.getByRole("button", { name: "+ Add Testimonial" }).click();
await page.getByLabel(/Student display name/).fill("E2E Fixture Student");
await page.getByLabel(/^University/).fill("University of Bologna");
await page.getByLabel(/^Programme/).fill("MSc Artificial Intelligence");
await page.getByLabel(/Review text/).fill("Fixture review used only to test the save operation.");
await page.locator("#f-permissionConfirmed").check();
await page.getByRole("button", { name: "Save Testimonial" }).click();
await page.getByText("Testimonial saved as draft.").waitFor({ timeout: 8000 });
check("CREATE: real admin UI save succeeds against strict emulator", true);
const post = captured.find((c) => c.method === "POST");
check("CREATE payload contains NO phantom columns", !!post && !("verification_status" in post.body) && !("academic_year" in post.body) && !("last_verified" in post.body), post ? Object.keys(post.body).join(",") : "no POST captured");
check("CREATE payload id is a valid unique text id", !!post && /^t-e2e-fixture-student/.test(post.body.id || ""), post?.body.id);
check("row stored by emulator", store.testimonials.length === 1 && store.testimonials[0].permission_confirmed === true);

// EDIT
await page.getByRole("button", { name: "Edit" }).first().click();
await page.getByLabel(/^Programme/).fill("MSc Data Science");
await page.getByRole("button", { name: "Save Testimonial" }).click();
await page.getByText("Testimonial saved as draft.").waitFor({ timeout: 8000 });
const patch = captured.find((c) => c.method === "PATCH");
check("EDIT: save succeeds; stored programme updated", store.testimonials[0].programme === "MSc Data Science");
check("EDIT payload keys all valid columns", !!patch && Object.keys(patch.body).every((k) => TESTIMONIAL_COLUMNS.includes(k)));

// PUBLISH
await page.getByRole("button", { name: "Publish" }).first().click();
await page.waitForFunction(() => document.body.innerText.includes("Published"), null, { timeout: 8000 });
check("PUBLISH toggle works", store.testimonials[0].status === "published");

// DELETE
await page.getByRole("button", { name: "Delete" }).first().click();
await page.waitForFunction(() => document.body.innerText.includes("No records found"), null, { timeout: 8000 });
check("DELETE removes the test record", store.testimonials.length === 0);

await browser.close();
server.close();
console.log(failures === 0 ? "\nALL ADMIN SAVE CHECKS PASSED" : `\n${failures} FAILURES`);
process.exit(failures ? 1 : 0);
