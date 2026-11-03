/**
 * functional-check-10 — Blog CMS admin lifecycle against a FAKE
 * Supabase backend (route interception; an in-memory PostgREST for
 * blog_posts + an auth user stub). Verifies the complete owner
 * workflow with no live database writes: create draft content in
 * the rich-text editor, publish, preview, edit, unpublish, delete.
 * The DB-side rules themselves are proven separately by the
 * PostgreSQL rig (test-migration-008.mjs, 15/15).
 */
import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const OUT = "/home/hatch/workspace/n92-eduitalia/out";
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain", ".xml": "application/xml", ".ico": "image/x-icon" };
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

// ---- fake backend state ----
const store = new Map();
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const jwt = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ email: "sh10ad786@gmail.com", sub: "owner", exp: 4102444800 })}.fakesig`;

const browser = await chromium.launch({ executablePath: "/home/hatch/workspace/tmp_chrome/chrome-linux64/chrome", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.addInitScript(([token]) => {
  localStorage.setItem("n92_admin_token", token);
  localStorage.setItem("n92_admin_refresh", "fake-refresh");
  localStorage.setItem("n92_admin_user", "sh10ad786@gmail.com");
}, [jwt]);

await page.route(/\/auth\/v1\/user/, (route) =>
  route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify({ id: "owner", email: "sh10ad786@gmail.com", aud: "authenticated" }) })
);
await page.route(/\/rest\/v1\//, (route) => {
  const method = route.request().method();
  return route.fulfill({ status: method === "POST" ? 201 : 200, contentType: "application/json", body: "[]" });
});

await page.route(/\/rest\/v1\/blog_posts/, async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const method = req.method();
  const idEq = (url.searchParams.get("id") || "").replace("eq.", "");
  if (method === "GET") {
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([...store.values()]) });
  }
  if (method === "POST") {
    const body = req.postDataJSON();
    const rows = Array.isArray(body) ? body : [body];
    for (const r of rows) store.set(r.id, { ...r, created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
    return route.fulfill({ status: 201, contentType: "application/json", body: JSON.stringify(rows) });
  }
  if (method === "PATCH") {
    const patch = req.postDataJSON();
    const cur = store.get(idEq) || {};
    const next = { ...cur, ...patch, updated_at: new Date().toISOString() };
    store.set(idEq, next);
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify([next]) });
  }
  if (method === "DELETE") {
    // PostgREST with Prefer: return=representation returns the DELETED
    // rows; lib/admin.ts treats 0 returned rows as a failed delete.
    const gone = store.get(idEq);
    store.delete(idEq);
    return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(gone ? [gone] : []) });
  }
  return route.fulfill({ status: 200, contentType: "application/json", body: "[]" });
});
page.on("dialog", (d) => d.accept());
await page.goto(base + "/admin/", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);

const blogTab = page.getByRole("button", { name: "Blog / Articles" });
check("admin shows the Blog / Articles tab", await blogTab.isVisible().catch(() => false));
await blogTab.click();
await page.waitForTimeout(600);
check("blog list starts empty with guidance", await page.getByText("No articles yet").isVisible().catch(() => false));

// --- Create (publish directly), exercising the rich-text editor ---
await page.getByRole("button", { name: "New article" }).click();
await page.waitForTimeout(400);
await page.fill("#blog-title", "Lifecycle Test Article");
const slugVal = await page.inputValue("#blog-slug");
check("slug auto-generated from title", slugVal === "lifecycle-test-article", slugVal);
const editor = page.locator(".tiptap");
await editor.click();
await page.keyboard.type("Hello blog world");
await page.keyboard.press("Control+a");
await page.getByRole("button", { name: "Bold", exact: true }).click();
await page.keyboard.press("End");
await page.selectOption("#blog-status", "published");
await page.getByRole("button", { name: "Create article" }).click();
await page.waitForTimeout(800);
check("article stored after create", store.size === 1);
const created = [...store.values()][0];
check("stored as published with the chosen slug", created?.status === "published" && created?.slug === "lifecycle-test-article", created?.status);
check("editor HTML saved with <strong> (DOMPurify kept it)", (created?.content_html || "").includes("<strong>Hello blog world</strong>"), (created?.content_html || "").slice(0, 80));
check("published_date auto-set on publish", /^\d{4}-\d{2}-\d{2}$/.test(created?.published_date || ""), created?.published_date);
check("list shows the article as Published", await page.locator("td", { hasText: "Lifecycle Test Article" }).isVisible().catch(() => false));

// --- Preview ---
await page.getByRole("button", { name: "Preview Lifecycle Test Article" }).click();
await page.waitForTimeout(500);
const dialog = page.getByRole("dialog");
check("preview modal renders the article title as h1", await dialog.locator("h1", { hasText: "Lifecycle Test Article" }).isVisible().catch(() => false));
check("preview renders the bold content", await dialog.locator(".article-body strong", { hasText: "Hello blog world" }).isVisible().catch(() => false));
await page.getByRole("button", { name: "Close preview" }).click();
await page.waitForTimeout(300);

// --- Edit the published article ---
await page.getByRole("button", { name: "Edit Lifecycle Test Article" }).click();
await page.waitForTimeout(500);
await page.fill("#blog-title", "Lifecycle Test Article Edited");
await page.getByRole("button", { name: "Save changes" }).click();
await page.waitForTimeout(800);
check("edit saved (title updated in store)", [...store.values()][0]?.title === "Lifecycle Test Article Edited");
check("slug unchanged by title edit", [...store.values()][0]?.slug === "lifecycle-test-article");

// --- Unpublish ---
await page.getByRole("button", { name: "Unpublish" }).click();
await page.waitForTimeout(700);
check("unpublish sets status back to draft", [...store.values()][0]?.status === "draft");
check("list badge shows Draft", await page.locator("span", { hasText: /^Draft$/ }).first().isVisible().catch(() => false));

// --- Delete ---
await page.getByRole("button", { name: "Delete Lifecycle Test Article Edited" }).click();
await page.waitForTimeout(700);
check("delete removes the record", store.size === 0);
await page.waitForTimeout(1500); check("list is empty again", await page.getByText("No articles yet").isVisible().catch(() => false));

// --- Featured image URL validation (separate policy, 3 Nov fix) ---
await page.getByRole("button", { name: "New article" }).click();
await page.waitForTimeout(400);
await page.fill("#blog-title", "Bad Image Article");
await page.fill("#blog-image", "http://evil.example/steal.jpg");
await page.getByRole("button", { name: "Create article" }).click();
await page.waitForTimeout(500);
check("http:// featured image is rejected at save time", await page.getByText(/Featured image URL is not allowed/).isVisible().catch(() => false));
check("rejected article was NOT stored", store.size === 0);
await page.fill("#blog-image", "javascript:alert(1)");
await page.getByRole("button", { name: "Create article" }).click();
await page.waitForTimeout(400);
check("javascript: featured image is rejected too", store.size === 0);
await page.fill("#blog-image", "https://example.com/ok.jpg");
await page.getByRole("button", { name: "Create article" }).click();
await page.waitForTimeout(700);
check("https:// featured image saves normally", store.size === 1 && [...store.values()][0]?.featured_image_url === "https://example.com/ok.jpg");
await page.getByRole("button", { name: "Delete Bad Image Article" }).click();
await page.waitForTimeout(600);
check("cleanup: validation-test article deleted", store.size === 0);

console.log(fails === 0 ? "\nFUNCTIONAL CHECK 10: ALL PASSED" : `\nFUNCTIONAL CHECK 10: ${fails} FAILURES`);
await browser.close();
server.close();
process.exit(fails ? 1 : 0);
