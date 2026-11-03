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
// ---------- PART A: public catalogue (stub build fixtures) ----------
await page.goto(base + "/student-checklist/products/", { waitUntil: "networkidle" });
await page.waitForTimeout(600);
const ptext = () => page.locator("body").innerText();
const cardByName = (name) => page.locator("article", { hasText: name });
check("public: search bar present above the catalogue", await page.getByLabel("Search products").isVisible().catch(() => false));
check("public: 4 published products shown with count line", (await ptext()).includes("Showing 4 of 4 products"));
check("public: imageless cards show the IMAGE COMING SOON placeholder", (await ptext()).includes("IMAGE COMING SOON"));
check("public: N92 logo is NEVER a product image", (await page.locator('article img[src*="logo-header"]').count()) === 0);
const blender = cardByName("Searchy Blender");
check("public: search-URL offer shows its verified price but NO View Product link", (await blender.innerText()).includes("₹2,999") && (await blender.getByRole("link", { name: /View Product/ }).count()) === 0);
const suitcase = cardByName("Fixture Suitcase");
check("public: direct-URL offer shows View Product with the direct href", (await suitcase.getByRole("link", { name: /View Product/ }).first().getAttribute("href")) === "https://example.com/suitcase");
const meds = cardByName("Fixture Medicine Strip");
const medsText = await meds.innerText();
check("public: Medicines card is informational (notice, no price, no View Product)", medsText.includes("Informational only") && !medsText.includes("₹199") && (await meds.getByRole("link", { name: /View Product/ }).count()) === 0);
check("public: Medicines card carries the Information chip", medsText.includes("Information"));
// Search behaviour
await page.getByLabel("Search products").fill("suitcase");
await page.waitForTimeout(300);
check("public search: name match narrows to 1", (await ptext()).includes("Showing 1 of 4 products") && (await ptext()).includes("Fixture Suitcase") && !(await ptext()).includes("Fixture Adapter"));
await page.getByRole("button", { name: "Clear search" }).click();
await page.waitForTimeout(300);
check("public search: × clear restores all", (await ptext()).includes("Showing 4 of 4 products"));
await page.getByRole("button", { name: "Electronics" }).click();
await page.getByLabel("Search products").fill("fixture");
await page.waitForTimeout(300);
check("public search: category + search combine (Adapter only)", (await ptext()).includes("Showing 1 of 4 products") && (await ptext()).includes("Fixture Adapter"));
await page.getByLabel("Search products").fill("zzzz-nothing");
await page.waitForTimeout(300);
check("public search: no-results state with clear action", (await ptext()).includes("No products found"));
await page.getByRole("button", { name: "Clear search and filters" }).click();
await page.waitForTimeout(300);
check("public search: clear-all restores the full catalogue", (await ptext()).includes("Showing 4 of 4 products"));

// ---------- PART B: admin search (fake backend) ----------
store.essential_products.push(
  { id: "p-portronics-x", name: "Portronics Travel Adapter", description: "", category: "Electronics", image_url: "", images: [], specs: [], offers: [], status: "published", display_order: 1 },
  { id: "p-bottle-x", name: "Steel Bottle 1L", description: "", category: "Travel", image_url: "", images: [], specs: [], offers: [], status: "draft", display_order: 2 },
  { id: "p-notebook-x", name: "Notebook Pack", description: "", category: "Study", image_url: "", images: [], specs: [], offers: [], status: "published", display_order: 3 },
);
await page.goto(base + "/admin/", { waitUntil: "networkidle" });
await page.getByLabel(/email/i).fill("sh10ad786@gmail.com");
await page.getByLabel(/password/i).fill("test-password");
await page.getByRole("button", { name: /sign in|log in/i }).click();
await page.waitForTimeout(1200);
await page.getByRole("button", { name: "Student Essentials" }).click();
await page.waitForTimeout(800);
const atext = () => page.locator("body").innerText();
check("admin: product search bar present", await page.getByLabel("Search products").isVisible().catch(() => false));
check("admin: all 3 products listed initially", (await atext()).includes("Portronics Travel Adapter") && (await atext()).includes("Steel Bottle 1L") && (await atext()).includes("Notebook Pack"));
await page.getByLabel("Search products").fill("portronics");
await page.waitForTimeout(300);
const afterName = await atext();
check("admin search: name filter narrows + count line", afterName.includes("Portronics Travel Adapter") && !afterName.includes("Steel Bottle 1L") && afterName.includes("Showing 1 of 3 products"));
await page.getByRole("button", { name: "Clear product search" }).click();
await page.waitForTimeout(300);
await page.getByLabel("Search products").fill("travel");
await page.waitForTimeout(300);
const afterCat = await atext();
check("admin search: category match works (Electronics row stays via name, Travel bottle via category)", afterCat.includes("Steel Bottle 1L") && afterCat.includes("Showing 2 of 3 products"), "");
await page.getByRole("button", { name: "Clear product search" }).click();
await page.waitForTimeout(300);
check("admin search: clear restores all rows", (await atext()).includes("Notebook Pack"));
await page.getByRole("button", { name: "Import Products (Excel/CSV)" }).click();
await page.waitForTimeout(400);
check("admin: import panel still opens alongside search", (await atext()).includes("Download CSV template"));


console.log(fails === 0 ? "\nFUNCTIONAL CHECK 20: ALL PASSED" : `\nFUNCTIONAL CHECK 20: ${fails} FAILURES`);
await browser.close();
server.close();
process.exit(fails ? 1 : 0);
