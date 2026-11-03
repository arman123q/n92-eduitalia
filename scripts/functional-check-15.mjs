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
check("admin: login reaches the console", (await page.locator("body").innerText()).includes("Blog / Articles"));

await page.getByRole("button", { name: "Student Essentials" }).click();
await page.waitForTimeout(800);

// ---- Product create with offer ----
await page.getByRole("button", { name: "New product" }).click();
await page.getByLabel("Product name *").fill("Admin Test Bag");
await page.getByLabel("Category").fill("Luggage");
await page.getByRole("button", { name: "Add marketplace offer" }).click();
const offerBox = page.locator("fieldset", { hasText: "Marketplace offers" });
await offerBox.getByLabel("Marketplace").selectOption("flipkart");
await offerBox.getByLabel("Product URL").fill("https://example.com/bag");
await page.getByRole("button", { name: "Create product" }).click();
await page.waitForTimeout(700);
check("product: created in store as draft with 1 offer", store.essential_products.length === 1 && store.essential_products[0].status === "draft" && store.essential_products[0].offers.length === 1 && store.essential_products[0].offers[0].marketplace === "flipkart");
check("product: list shows it as Draft", (await page.locator("body").innerText()).includes("Admin Test Bag"));

// ---- Publish ----
await page.getByRole("button", { name: "Publish" }).first().click();
await page.waitForTimeout(600);
check("product: publish flips status in store", store.essential_products[0].status === "published");

// ---- Edit + image upload ----
await page.getByRole("button", { name: "Edit" }).first().click();
await page.waitForTimeout(300);
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");
await page.locator('input[type="file"]').first().setInputFiles({ name: "bag.png", mimeType: "image/png", buffer: png });
await page.waitForTimeout(700);
const imgVal = await page.getByLabel("Main image URL").inputValue();
check("product: upload fills the main image URL from storage", imgVal.includes("/storage/v1/object/public/media/"), imgVal);
// The stub's storage URL is http:// (localhost); production storage
// URLs are https:// and the form rightly enforces HTTPS. Swap in
// the production-shaped URL to exercise the save path itself.
await page.getByLabel("Main image URL").fill("https://example.com/bag-photo.jpg");
await page.getByLabel("Price last verified").fill("2026-11-02");
const priceInput = page.getByLabel("Price", { exact: true });
await priceInput.fill("3499");
await page.getByRole("button", { name: "Save changes" }).click();
await page.waitForTimeout(700);
const saved = store.essential_products[0];
check("product: edit saved image + verified price to store", saved.image_url === "https://example.com/bag-photo.jpg" && saved.offers[0].price === 3499 && saved.offers[0].lastVerifiedDate === "2026-11-02", JSON.stringify({ image_url: saved.image_url, offer: saved.offers[0] }));

// ---- Checklist item create ----
await page.getByRole("button", { name: "Checklist" }).click();
await page.waitForTimeout(700);
await page.getByRole("button", { name: "New item" }).click();
await page.getByLabel("Item name *").fill("Admin Test Item");
await page.getByLabel("Italy applicability").selectOption("applicable");
await page.getByLabel(/Published \(visible publicly/).check();
await page.getByRole("button", { name: "Create item" }).click();
await page.waitForTimeout(700);
check("item: created published + applicable in store", store.checklist_items.length === 1 && store.checklist_items[0].published === true && store.checklist_items[0].italy_status === "applicable");

// ---- Category create ----
await page.getByRole("button", { name: "Categories" }).click();
await page.waitForTimeout(400);
await page.getByRole("button", { name: "New category" }).click();
await page.getByLabel("Code *").fill("K");
await page.getByLabel("Name *").fill("Keys & Locks");
await page.getByRole("button", { name: "Save category" }).click();
await page.waitForTimeout(700);
check("category: created in store", store.checklist_categories.some((c) => c.code === "K" && c.name === "Keys & Locks"));

// ---- Item delete ----
await page.getByRole("button", { name: "Items" }).click();
await page.waitForTimeout(500);
page.once("dialog", (d) => void d.accept());
await page.getByRole("button", { name: "Delete" }).first().click();
await page.waitForTimeout(600);
check("item: delete removes it from store", store.checklist_items.length === 0);

console.log(fails === 0 ? "\nFUNCTIONAL CHECK 15: ALL PASSED" : `\nFUNCTIONAL CHECK 15: ${fails} FAILURES`);
await browser.close();
server.close();
process.exit(fails ? 1 : 0);
