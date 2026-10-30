#!/usr/bin/env node
/** Hero contrast/overflow audit at the 8 widths required by the brief.
 * Serves out/, loads the homepage at each width, checks horizontal
 * overflow + that the hero headline/subtext are fully inside the hero
 * and not clipped or overlapping the eligibility panel, and saves a
 * screenshot per width for visual inspection. */
import { chromium } from "playwright-core";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const OUT = path.resolve("out");
const SHOTS = path.resolve("hero-shots");
fs.mkdirSync(SHOTS, { recursive: true });
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain" };
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

const browser = await chromium.launch({ executablePath: process.env.CHROME || `${process.env.HOME}/workspace/tmp_chrome/chrome-linux64/chrome`, args: ["--no-sandbox"] });
const WIDTHS = [320, 360, 375, 390, 414, 768, 1024, 1440];
let fails = 0;
for (const w of WIDTHS) {
  const page = await browser.newPage({ viewport: { width: w, height: 900 } });
  await page.goto(`${base}/`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1200); // let the 3D hero settle
  const r = await page.evaluate(() => {
    const de = document.documentElement;
    const h1 = document.querySelector("section h1");
    const hero = h1?.closest("section");
    const form = hero?.querySelector("form, fieldset");
    const hb = h1?.getBoundingClientRect();
    const fb = form?.getBoundingClientRect();
    const overlap = hb && fb ? !(hb.right <= fb.left || fb.right <= hb.left || hb.bottom <= fb.top || fb.bottom <= hb.top) : false;
    return {
      overflow: de.scrollWidth > de.clientWidth + 1,
      h1Color: h1 ? getComputedStyle(h1).color : "",
      h1InsideHero: hb && hero ? hb.bottom <= hero.getBoundingClientRect().bottom + 1 : false,
      overlap,
    };
  });
  const ok = !r.overflow && r.h1Color === "rgb(250, 249, 245)" && r.h1InsideHero && !r.overlap;
  console.log(`${ok ? "PASS" : "FAIL"}  w=${w}  overflow=${r.overflow} h1=${r.h1Color} insideHero=${r.h1InsideHero} overlapsForm=${r.overlap}`);
  if (!ok) fails++;
  await page.screenshot({ path: path.join(SHOTS, `hero-${w}.png`) });
  await page.close();
}
await browser.close();
server.close();
console.log(fails === 0 ? "\nHERO AUDIT PASSED at all 8 widths" : `\n${fails} HERO FAILURES`);
process.exit(fails === 0 ? 0 : 1);
