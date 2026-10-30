#!/usr/bin/env node
/**
 * Responsive overflow audit (Playwright Chromium) over the production
 * export in out/. For each viewport width and page:
 *   - loads the page in a real browser (JS on, waits for settle)
 *   - fails if document.documentElement.scrollWidth > clientWidth + 1
 *   - lists the worst offending elements (for diagnosis)
 *   - saves screenshots of key pages at 360px and 390px
 * Usage: node scripts/responsive-check.mjs [--outdir DIR]
 */
import { chromium } from "playwright-core";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const OUT = path.resolve("out");
const SHOTS = path.resolve("responsive-shots");
fs.mkdirSync(SHOTS, { recursive: true });

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain", ".xml": "application/xml" };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, "http://x").pathname);
  let file = path.join(OUT, p);
  if (fs.existsSync(file) && fs.statSync(file).isDirectory()) file = path.join(file, "index.html");
  if (!fs.existsSync(file) && fs.existsSync(file + ".html")) file += ".html";
  if (!fs.existsSync(file)) { res.writeHead(404); return res.end("nf"); }
  res.writeHead(200, { "Content-Type": MIME[path.extname(file)] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;

const PAGES = ["/", "/universities/", "/universities/ca-foscari-university-of-venice/", "/courses/", "/scholarships/", "/admissions/", "/notices/", "/eligibility/", "/calculator/", "/contact/", "/admin/", "/faq/", "/ielts-coaching/", "/visa-support/", "/accommodation-support/", "/refund-policy/", "/reviews/", "/book-consultation/"];
const WIDTHS = [320, 360, 375, 390, 414, 430, 768, 1280];
const SHOT_PAGES = { "/": "home", "/eligibility/": "eligibility" };

const browser = await chromium.launch(process.env.CHROME_PATH ? { executablePath: process.env.CHROME_PATH } : {});
let failures = 0;
for (const width of WIDTHS) {
  const page = await browser.newPage({ viewport: { width, height: 844 } });
  for (const p of PAGES) {
    await page.goto(base + p, { waitUntil: "load", timeout: 30000 }).catch(() => {});
    await page.waitForTimeout(900);
    const report = await page.evaluate(() => {
      const cw = document.documentElement.clientWidth;
      const sw = document.documentElement.scrollWidth;
      const offenders = [];
      if (sw > cw + 1) {
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.width > 0 && (r.right > cw + 1 || r.left < -1)) {
            offenders.push(`${el.tagName.toLowerCase()}.${String(el.className).slice(0, 60)} [${Math.round(r.left)}..${Math.round(r.right)} w=${Math.round(r.width)}]`);
            if (offenders.length >= 4) break;
          }
        }
      }
      return { cw, sw, offenders };
    });
    const ok = report.sw <= report.cw + 1;
    if (!ok) failures++;
    console.log(`${ok ? "PASS" : "FAIL"}  w=${width}  ${p}  scrollWidth=${report.sw} clientWidth=${report.cw}`);
    for (const o of report.offenders) console.log(`        overflow: ${o}`);
    if (SHOT_PAGES[p] && (width === 360 || width === 390)) {
      await page.screenshot({ path: path.join(SHOTS, `${SHOT_PAGES[p]}-${width}.png`), fullPage: false });
    }
  }
  await page.close();
}
await browser.close();
server.close();
console.log(failures ? `\nRESPONSIVE AUDIT FAILED: ${failures} page/width combination(s) overflow` : "\nRESPONSIVE AUDIT PASSED at all widths");
process.exit(failures ? 1 : 0);
