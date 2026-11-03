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
  if (!fs.existsSync(f)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { "Content-Type": MIME[path.extname(f)] || "application/octet-stream" });
  res.end(fs.readFileSync(f));
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}`;
const browser = await chromium.launch({ executablePath: "/home/hatch/workspace/tmp_chrome/chrome-linux64/chrome", args: ["--no-sandbox", "--use-gl=swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1680, height: 950 } });
await page.goto(base + "/student-checklist/", { waitUntil: "networkidle" });
await page.waitForFunction(() => window.__essentialsHeroReady === true, null, { timeout: 20000 }).catch(() => {});
await page.waitForTimeout(2600);
const hero = page.locator("section").first();
await hero.screenshot({ path: "/tmp/hero-full.png" });
// TRUE canvas-only capture via toDataURL (preserveDrawingBuffer is on):
// no DOM overlay text leaks into the fallback still.
const dataUrl = await page.evaluate(() => document.querySelector("section canvas").toDataURL("image/png"));
fs.writeFileSync("/tmp/hero-canvas.png", Buffer.from(dataUrl.split(",")[1], "base64"));
console.log("captured");
await browser.close(); server.close();
