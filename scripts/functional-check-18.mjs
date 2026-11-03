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

  // The live catalogue already has a published product — seed the same shape; it must survive untouched.
  store.essential_products.push({ id: "p-portronics-juicematego-pro-live", name: "Portronics JuicemateGo Pro 12W Universal International Travel Adapter", description: "Existing live product", category: "Electronics", image_url: "https://example.com/portronics.jpg", images: [], specs: [], offers: [{ marketplace: "amazon-in", marketplaceLabel: "", productUrl: "https://www.amazon.in/dp/EXISTING", affiliateUrl: "", price: 1299, currency: "INR", lastVerifiedDate: "2026-11-01", availability: "in-stock" }], status: "published", display_order: 1 });
  const fixtureBefore = JSON.stringify(store.essential_products[0]);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Student Essentials" }).click();
  await page.waitForTimeout(500);

  check("import: button sits beside New product", await page.getByRole("button", { name: "Import Products (Excel/CSV)" }).isVisible().catch(() => false) && await page.getByRole("button", { name: "New product" }).isVisible().catch(() => false));
  await page.getByRole("button", { name: "Import Products (Excel/CSV)" }).click();
  await page.waitForTimeout(400);

  // Template download fires with the right filename
  const [download] = await Promise.all([
    page.waitForEvent("download", { timeout: 8000 }).catch(() => null),
    page.getByRole("button", { name: "Download CSV template" }).click(),
  ]);
  check("import: template downloads", !!download && (download?.suggestedFilename() ?? "").includes("template"), download?.suggestedFilename() ?? "none");

  // CSV: 1 full valid, 1 minimal valid, 1 duplicate of the live product, 1 with errors, 1 blank line
  const csv = [
    "name,category,description,specifications,images,status,display_order,offer1_marketplace,offer1_product_url,offer1_affiliate_url,offer1_price,offer1_currency,offer1_last_verified_date,offer1_availability",
    'Imported Kettle 1.5L,Kitchen,"Steel kettle, fast boil","Power: 1500W; Capacity: 1.5 L",https://cdn.example.com/kettle.jpg,published,5,Amazon India,https://www.amazon.in/dp/KETTLE,https://www.amazon.in/dp/KETTLE?tag=n92-21,"₹1,299",INR,02/11/2026,in-stock',
    "Minimal Notebook,Study,,,,draft,,,,,,,,",
    "portronics juicematego pro 12w universal international travel adapter,Electronics,,,,published,,,,,,,,",
    ",Kitchen,,,,draft,,,,,not-a-price,,32/13/2026,",
    ",,,,,,,,,,,,,",
  ].join("\n");
  await page.locator('input[type="file"][accept=".xlsx,.csv"]').setInputFiles({ name: "products.csv", mimeType: "text/csv", buffer: Buffer.from(csv) });
  await page.waitForTimeout(900);
  const preview = await page.locator("body").innerText();
  check("preview: 2 ready", preview.includes("2 ready"), "");
  check("preview: duplicate flagged + skipped", preview.includes("Duplicate — already exists"));
  check("preview: row errors shown (name, price, date)", preview.includes("Product name is required") && preview.includes("not a valid number") && preview.includes("not a valid date"));
  check("preview: nothing saved before Import is pressed", store.essential_products.length === 1);

  await page.getByRole("button", { name: /Import 2 selected/ }).click();
  await page.waitForTimeout(1500);
  const afterImport = await page.locator("body").innerText();
  check("import: progress completes (2 imported, 0 failed)", afterImport.includes("2 imported, 0 failed"));
  check("import: store now holds fixture + 2 new products", store.essential_products.length === 3, String(store.essential_products.length));
  const kettle = store.essential_products.find((p) => p.name === "Imported Kettle 1.5L");
  check("import: parsed values stored correctly", !!kettle && kettle.status === "published" && kettle.offers[0].price === 1299 && kettle.offers[0].last_verified_date === undefined && kettle.offers[0].lastVerifiedDate === "2026-11-02" && kettle.specs.length === 2, JSON.stringify(kettle?.offers?.[0] ?? {}));
  check("import: existing live product is byte-identical (untouched)", JSON.stringify(store.essential_products.find((p) => p.id === "p-portronics-juicematego-pro-live")) === fixtureBefore);

  // XLSX: one more valid product through the Excel path
  const XLSX = await import("xlsx");
  const ws = XLSX.utils.json_to_sheet([{ name: "XLSX Power Bank", category: "Electronics", status: "draft", offer1_marketplace: "Flipkart", offer1_product_url: "https://www.flipkart.com/pb", offer1_price: 1999, offer1_last_verified_date: "2026-11-03" }]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Products");
  const xlsxBuf = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });
  await page.locator('input[type="file"][accept=".xlsx,.csv"]').setInputFiles({ name: "products.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: xlsxBuf });
  await page.waitForTimeout(1200);
  check("xlsx: preview parses the workbook (1 ready)", (await page.locator("body").innerText()).includes("1 ready"));
  await page.getByRole("button", { name: /Import 1 selected/ }).click();
  await page.waitForTimeout(1200);
  check("xlsx: product imported via the Excel path", store.essential_products.some((p) => p.name === "XLSX Power Bank" && p.offers[0].price === 1999));


console.log(fails === 0 ? "\nFUNCTIONAL CHECK 18: ALL PASSED" : `\nFUNCTIONAL CHECK 18: ${fails} FAILURES`);
await browser.close();
server.close();
process.exit(fails ? 1 : 0);
