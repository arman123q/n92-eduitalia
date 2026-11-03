/**
 * functional-check-11 — Blog article CTA (components/BlogCta.tsx):
 * present at the end of EVERY published article, after the article
 * content and before Related Articles, never inside the article
 * body; exact copy; the button links to the real Eligibility
 * Assessment page (/eligibility/); clicking fires the GA4 event
 * blog_eligibility_cta_click through window.gtag; responsive at
 * mobile width.
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
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });

for (const slug of ["test-guide-italy", "evil-article"]) {
  await page.goto(`${base}/blog/${slug}/`, { waitUntil: "networkidle" });
  const cta = page.locator('section[aria-label="Free eligibility assessment"]');
  check(`${slug}: CTA section present`, await cta.isVisible().catch(() => false));
  check(`${slug}: exact heading`, await cta.locator("h2", { hasText: "Your Italy journey starts with the right university." }).isVisible().catch(() => false));
  check(`${slug}: supporting question present`, await cta.getByText("Not sure which Italian university matches your academic profile, budget and career goals?").isVisible().catch(() => false));
  check(`${slug}: description present`, await cta.getByText(/free preliminary profile assessment and personalised guidance/).isVisible().catch(() => false));
  check(`${slug}: disclaimer present (verbatim)`, await cta.getByText("Assessment is preliminary and does not guarantee admission, scholarship or visa approval. Final decisions are made by the relevant institutions and authorities.").isVisible().catch(() => false));
  check(`${slug}: small supporting text present`, await cta.getByText("Start your Italy admission journey with N92 Edu-Italia.").isVisible().catch(() => false));
  const btn = cta.getByRole("link", { name: "Get Your Free Eligibility Assessment" });
  check(`${slug}: CTA button present`, await btn.isVisible().catch(() => false));
  check(`${slug}: button links to /eligibility/`, (await btn.getAttribute("href")) === "/eligibility/", await btn.getAttribute("href"));
  const placement = await page.evaluate(() => {
    const section = document.querySelector('section[aria-label="Free eligibility assessment"]');
    const body = document.querySelector(".article-body");
    const related = document.querySelector("#related-heading");
    if (!section || !body) return { ok: false, why: "missing elements" };
    const afterBody = (body.compareDocumentPosition(section) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
    const insideBody = body.contains(section);
    const beforeRelated = related ? (section.compareDocumentPosition(related) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0 : true;
    return { ok: afterBody && !insideBody && beforeRelated, afterBody, insideBody, beforeRelated, hasRelated: !!related };
  });
  check(`${slug}: after article content, before related, NOT inside body`, placement.ok, JSON.stringify(placement));
}

// --- Click tracking (spy on window.gtag, the site's own pattern) ---
await page.goto(`${base}/blog/test-guide-italy/`, { waitUntil: "networkidle" });
const events = await page.evaluate(() => {
  const w = window;
  w.__ctaCalls = [];
  const orig = w.gtag;
  w.gtag = (...args) => { w.__ctaCalls.push(args); if (typeof orig === "function") orig(...args); };
  const link = document.querySelector('section[aria-label="Free eligibility assessment"] a');
  link.click();
  return w.__ctaCalls;
});
const fired = events.some((a) => a[0] === "event" && a[1] === "blog_eligibility_cta_click");
check("click fires GA4 event blog_eligibility_cta_click via window.gtag", fired, JSON.stringify(events).slice(0, 160));
await page.waitForTimeout(600);
check("click navigates to the eligibility page", page.url().includes("/eligibility/"), page.url());

// --- Destination is a real page in this build ---
await page.goto(`${base}/eligibility/`, { waitUntil: "networkidle" });
check("/eligibility/ renders the assessment", await page.locator('section[aria-label="Eligibility assessment"]').isVisible().catch(() => false));

// --- Mobile layout ---
await page.setViewportSize({ width: 390, height: 844 });
await page.goto(`${base}/blog/test-guide-italy/`, { waitUntil: "networkidle" });
const ctaM = page.locator('section[aria-label="Free eligibility assessment"]');
check("mobile: CTA visible", await ctaM.isVisible().catch(() => false));
const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
check("mobile: no horizontal overflow", overflow <= 0, `overflow=${overflow}px`);

console.log(fails === 0 ? "\nFUNCTIONAL CHECK 11: ALL PASSED" : `\nFUNCTIONAL CHECK 11: ${fails} FAILURES`);
await browser.close();
server.close();
process.exit(fails ? 1 : 0);
