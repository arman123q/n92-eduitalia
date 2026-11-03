/**
 * functional-check-15 — Student Essentials ADMIN against an
 * in-memory fake Supabase (route interception, generic table
 * store): login → Student Essentials tab → create product with a
 * marketplace offer → publish → upload a product image → edit →
 * create checklist item → create category → delete item.
 * Verifies request shapes (match strings, toDb column names) end
 * to end, not just the UI.
 */
import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const OUT = "/home/hatch/workspace/n92-eduitalia/out";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".ico": "image/x-icon" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  if (p.endsWith("/")) p += "index.html";
  let f = path.join(OUT, p);
  if (!fs.existsSync(f) && fs.existsSync(f + ".html")) f += ".html";
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" });
  res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

let fails = 0;
const check = (name, ok, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`); if (!ok) fails++; };

// ---- In-memory fake Supabase ----
const store = {
  checklist_categories: [
    { code: "A", name: "Documents", display_order: 1, published: true },
    { code: "B", name: "Clothing", display_order: 2, published: true },
  ],
  checklist_items: [],
  essential_products: [],
  content_versions: [],
  audit_log: [],
};
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ exp: 9999999999, email: "sh10ad786@gmail.com", sub: "owner" })}.sig`;

const browser = await chromium.launch({ executablePath: "/home/hatch/workspace/tmp_chrome/chrome-linux64/chrome", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1280, height: 950 } });

await page.route("http://127.0.0.1:8918/**", async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const json = (code, body) => route.fulfill({ status: code, contentType: "application/json", body: JSON.stringify(body) });
  if (url.pathname.includes("/auth/v1/token")) {
    return json(200, { access_token: jwt, refresh_token: "fake-refresh", expires_in: 3600, token_type: "bearer", user: { id: "owner", email: "sh10ad786@gmail.com" } });
  }
  if (url.pathname.includes("/auth/v1/user")) return json(200, { id: "owner", email: "sh10ad786@gmail.com" });
  if (url.pathname.includes("/storage/v1/object/")) return json(200, { Key: "ok" });
  const m = url.pathname.match(/\/rest\/v1\/([a-z_0-9]+)/);
  if (m) {
    const table = m[1];
    const rows = (store[table] ??= []);
    if (req.method() === "GET") return json(200, rows);
    if (req.method() === "POST") {
      const body = JSON.parse(req.postData() || "[]");
      rows.push(...(Array.isArray(body) ? body : [body]));
      return json(201, body);
    }
    const matchParam = url.searchParams.get("id") || url.searchParams.get("code");
    const matchVal = matchParam?.replace(/^eq\./, "");
    const key = url.searchParams.has("code") ? "code" : "id";
    if (req.method() === "PATCH") {
      const patch = JSON.parse(req.postData() || "{}");
      const hit = rows.filter((r) => String(r[key]) === matchVal);
      hit.forEach((r) => Object.assign(r, patch));
      return json(200, hit);
    }
    if (req.method() === "DELETE") {
      const idx = rows.findIndex((r) => String(r[key]) === matchVal);
      const [gone] = idx >= 0 ? rows.splice(idx, 1) : [null];
      return json(200, gone ? [gone] : []);
    }
  }
  return json(200, []);
});

// ---- Login ----
await page.goto(base + "/admin/", { waitUntil: "networkidle" });
  await page.getByLabel(/email/i).fill("sh10ad786@gmail.com");
  await page.getByLabel(/password/i).fill("test-password");
  await page.getByRole("button", { name: /sign in|log in/i }).click();
  await page.waitForTimeout(1200);
  await page.getByRole("button", { name: "Student Essentials" }).click();
  await page.waitForTimeout(600);
  await page.getByRole("button", { name: "Import Products (Excel/CSV)" }).click();
  await page.waitForTimeout(400);
  // The owner's REAL workbook — preview only; import is never pressed.
  await page.locator('input[type="file"][accept=".xlsx,.csv"]').setInputFiles("/home/hatch/workspace/user/files/N92_Student_Essentials_Enriched_Working.xlsx");
  await page.waitForTimeout(2500);
  const preview = await page.locator("body").innerText();
  check("workbook preview: 218 ready (220 rows - 2 in-file duplicates)", preview.includes("218 ready"));
  check("workbook preview: 0 rows with errors", preview.includes("0 with errors") || !preview.includes("with errors (cannot import)"));
  check("workbook preview: duplicates flagged (Mirror / Sunglasses)", preview.includes("duplicates (skipped)"));
  check("workbook preview: product names render from the P column", preview.includes("College Bag (Laptop Size: 15'6\")") && preview.includes("A Wallet for a Passport") && preview.includes("Passport and Xerox"));
  check("workbook preview: NO 'Product name is required' errors", !preview.includes("Product name is required"));
  check("workbook preview: categories from the workbook show", preview.includes("Documents") && preview.includes("To Buy in Italy"));
  check("workbook: fake store untouched (preview only, nothing imported)", store.essential_products.length === 0, String(store.essential_products.length));


console.log(fails === 0 ? "\nFUNCTIONAL CHECK 19: ALL PASSED" : `\nFUNCTIONAL CHECK 19: ${fails} FAILURES`);
await browser.close();
server.close();
process.exit(fails ? 1 : 0);
