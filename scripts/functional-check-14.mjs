/**
 * functional-check-14 — Student Essentials PUBLIC pages against a
 * stub build (essentials-stub fixtures):
 *  - checklist: renders published items only, category filter,
 *    search, tick → progress + localStorage persistence, reset
 *    with confirmation, N/A item untickable + badged, review
 *    badge, print view present
 *  - products: verified price shows price + date; unverified
 *    offers show "Check current price"; affiliate link carries
 *    rel="sponsored" + target _blank; disclosure visible; draft
 *    product absent
 *  - navigation: Student Essentials inside the side Menu only —
 *    NOT in the desktop bar; homepage carries no trace of it
 *  - responsive smoke at 375px (no horizontal overflow)
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
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });

// ---------- Checklist ----------
await page.goto(base + "/student-checklist/", { waitUntil: "networkidle" });
check("checklist: Passport renders", await page.getByText("Passport", { exact: true }).isVisible().catch(() => false));
check("checklist: draft item NOT rendered", (await page.locator("body").innerText()).includes("Secret Draft Item") === false);
check("checklist: I-20 flagged 'Not applicable to Italy'", await page.getByText("Not applicable to Italy").first().isVisible().catch(() => false));
check("checklist: medicine flagged 'Review for Italy'", await page.getByText("Review for Italy").first().isVisible().catch(() => false));
check("checklist: medicine informational note shown", (await page.locator("body").innerText()).includes("not medical advice"));
const i20box = page.getByRole("checkbox", { name: "I-20 form" });
check("checklist: N/A item checkbox is disabled", await i20box.isDisabled().catch(() => false));
check("checklist: initial progress '0 of 3'", (await page.locator("body").innerText()).includes("0 of 3 items packed"));

await page.getByRole("checkbox", { name: "Passport" }).click();
await page.waitForTimeout(250);
check("checklist: ticking updates progress to '1 of 3'", (await page.locator("body").innerText()).includes("1 of 3 items packed"));
await page.reload({ waitUntil: "networkidle" });
check("checklist: progress persists after reload (localStorage)", (await page.locator("body").innerText()).includes("1 of 3 items packed"));

await page.getByPlaceholder("Search items…").fill("jacket");
await page.waitForTimeout(250);
const afterSearch = await page.locator("body").innerText();
check("checklist: search filters to matching items", afterSearch.includes("Winter jacket") && !afterSearch.includes("Paracetamol tablets"));
await page.getByPlaceholder("Search items…").fill("");
await page.getByRole("button", { name: /B · Clothing/ }).click();
await page.waitForTimeout(250);
const afterCat = await page.locator("body").innerText();
check("checklist: category filter shows only that category", afterCat.includes("Winter jacket") && !afterCat.includes("I-20 form"));
await page.getByRole("button", { name: "All categories" }).click();
page.once("dialog", (d) => void d.accept());
await page.getByRole("button", { name: /Reset/ }).click();
await page.waitForTimeout(250);
check("checklist: reset clears progress", (await page.locator("body").innerText()).includes("0 of 3 items packed"));
const printList = await page.evaluate(() => {
  const el = document.querySelector(".print\\:block");
  return el ? getComputedStyle(el).display : "missing";
});
check("checklist: print view exists in DOM (hidden on screen)", printList !== "missing", `screen display=${printList}`);

// ---------- Products ----------
await page.goto(base + "/student-checklist/products/", { waitUntil: "networkidle" });
check("products: published product renders", await page.getByText("Fixture Suitcase").isVisible().catch(() => false));
check("products: draft product NOT rendered", (await page.locator("body").innerText()).includes("Draft Product Should Not Appear") === false);
check("products: verified price shows amount", (await page.locator("body").innerText()).includes("₹4,999"));
check("products: verified price shows verification date", (await page.locator("body").innerText()).includes("Price verified 2026-11-01"));
const bodyText = await page.locator("body").innerText();
check("products: unverified offers say 'Check current price'", (bodyText.match(/Check current price/g) || []).length >= 2, `count=${(bodyText.match(/Check current price/g) || []).length}`);
check("products: specs render", bodyText.includes("Weight") && bodyText.includes("2.1 kg"));
check("products: affiliate disclosure visible", bodyText.includes("Affiliate disclosure"));
const offerLink = page.locator('a[href="https://example.com/suitcase"]');
const rel = await offerLink.getAttribute("rel");
const target = await offerLink.getAttribute("target");
check("products: offer link rel includes 'sponsored'", !!rel && rel.includes("sponsored") && rel.includes("noopener"), rel ?? "");
check("products: offer link opens in a new tab", target === "_blank");
const affLink = page.locator('a[href="https://example.com/adapter-aff"]');
check("products: affiliate URL is preferred over product URL", (await affLink.count()) === 1);

// ---------- Navigation + homepage restriction ----------
await page.setViewportSize({ width: 1920, height: 1000 });
await page.goto(base + "/", { waitUntil: "networkidle" });
const homeText = await page.locator("body").innerText();
check("homepage: NO Student Essentials anywhere", !homeText.includes("Student Essentials"));
const primaryLabels = await page.evaluate(() => [...document.querySelectorAll('nav[aria-label="Primary"] a')].map((a) => a.textContent.trim()));
check("desktop bar: still exactly the six main links (no Student Essentials)", primaryLabels.length === 6 && !primaryLabels.includes("Student Essentials"), primaryLabels.join(" | "));
await page.getByRole("button", { name: /menu/i }).first().click();
await page.waitForTimeout(400);
const seLink = page.locator('#mobile-menu a[href="/student-checklist/"]');
check("side menu: Student Essentials link present", (await seLink.count()) === 1 && (await seLink.first().innerText()).includes("Student Essentials"));
await seLink.first().click();
await page.waitForTimeout(500);
check("side menu: link navigates to /student-checklist/", page.url().includes("/student-checklist/"), page.url());

// ---------- Mobile ----------
await page.setViewportSize({ width: 375, height: 844 });
await page.goto(base + "/student-checklist/", { waitUntil: "networkidle" });
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check("mobile 375: checklist page has no horizontal overflow", overflow <= 0, `${overflow}px`);
await page.goto(base + "/student-checklist/products/", { waitUntil: "networkidle" });
const overflow2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check("mobile 375: products page has no horizontal overflow", overflow2 <= 0, `${overflow2}px`);

console.log(fails === 0 ? "\nFUNCTIONAL CHECK 14: ALL PASSED" : `\nFUNCTIONAL CHECK 14: ${fails} FAILURES`);
await browser.close();
server.close();
process.exit(fails ? 1 : 0);
