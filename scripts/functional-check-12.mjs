/**
 * functional-check-12 — Consolidated blog release checks:
 *  - Header: "Blog & Articles" in the desktop nav (>=1600px) and in
 *    the mobile menu, linking to /blog/.
 *  - Homepage "Latest from N92": published articles only, cards
 *    with image/title/date/Read Article, View All -> /blog/.
 *  - Blog listing: polished cards with category chip + article links.
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

const browser = await chromium.launch({ executablePath: "/home/hatch/workspace/tmp_chrome/chrome-linux64/chrome", args: ["--no-sandbox"] });

// --- Desktop nav (1920px: full bar visible) ---
const page = await browser.newPage({ viewport: { width: 1920, height: 1000 } });
await page.goto(base + "/", { waitUntil: "networkidle" });
const deskLink = page.locator('nav[aria-label="Primary"] a[href="/blog/"]');
check("desktop nav shows Blog & Articles", (await deskLink.isVisible().catch(() => false)) && (await deskLink.innerText()).includes("Blog & Articles"));

// --- Homepage Latest from N92 ---
const latest = page.locator('section[aria-labelledby="latest-heading"]');
check("homepage has Latest from N92 section", await latest.isVisible().catch(() => false));
check("latest shows published article 1", await latest.getByRole("link", { name: /Test Guide to Italy/ }).first().isVisible().catch(() => false));
check("latest shows published article 2", await latest.getByRole("link", { name: /Evil Article/ }).first().isVisible().catch(() => false));
check("latest NEVER shows the draft", !(await latest.getByText("Secret Draft").isVisible().catch(() => false)));
check("latest card shows the https featured image", await latest.locator('img[src="https://example.com/img.jpg"]').isVisible().catch(() => false));
check("latest card shows a publication date", await latest.locator("time").first().isVisible().catch(() => false));
check("latest has Read Article links", (await latest.getByRole("link", { name: /Read Article/ }).count().catch(() => 0)) >= 2);
check("View All Articles links to /blog/", (await latest.getByRole("link", { name: "View All Articles" }).first().getAttribute("href").catch(() => "")) === "/blog/");
await latest.getByRole("link", { name: /Test Guide to Italy/ }).first().click();
await page.waitForTimeout(500);
check("latest card navigates to the article", page.url().includes("/blog/test-guide-italy/"), page.url());

// --- Blog listing polish ---
await page.goto(base + "/blog/", { waitUntil: "networkidle" });
const cards = page.locator("article");
check("listing renders article cards", (await cards.count()) >= 2, `count=${await cards.count()}`);
check("listing card has gold category chip", await page.locator("article span", { hasText: "Admissions" }).first().isVisible().catch(() => false));
check("listing excludes the draft", !(await page.getByText("Secret Draft").isVisible().catch(() => false)));

// --- Mobile menu (390px) ---
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(base + "/", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /menu/i }).first().click();
await page.waitForTimeout(400);
const mobLink = page.locator('#mobile-menu a[href="/blog/"]');
check("mobile menu shows Blog & Articles", await mobLink.isVisible().catch(() => false));
await mobLink.click();
await page.waitForTimeout(500);
check("mobile Blog link navigates to /blog/", page.url().includes("/blog/"), page.url());

console.log(fails === 0 ? "\nFUNCTIONAL CHECK 12: ALL PASSED" : `\nFUNCTIONAL CHECK 12: ${fails} FAILURES`);
await browser.close();
server.close();
process.exit(fails ? 1 : 0);
