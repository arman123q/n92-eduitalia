/**
 * functional-check-9 — GA4 consent TIMING fix verification (31 Oct 2026).
 * Uses the REAL gtag.js library (downloaded from Google) and captures
 * the actual GA4 collect requests. Scenarios per the owner's spec:
 *  1 first visit denied (gcs=G100)
 *  2 Accept All -> consent update, then exactly ONE granted page_view
 *  3 returning visitor -> FIRST page_view already granted (gcs=G111)
 *  4 Reject All -> stays denied after reload
 *  5 Custom analytics-only -> analytics granted, advertising denied
 *  6 no duplicate tags / config calls / page_views
 */
import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const OUT = "/home/hatch/workspace/n92-eduitalia/out";
const GTAG = fs.readFileSync("/tmp/gtag.js", "utf8");
const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".jpg": "image/jpeg", ".png": "image/png", ".svg": "image/svg+xml", ".txt": "text/plain", ".xml": "text/xml", ".ico": "image/x-icon", ".woff2": "font/woff2" };
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
const browser = await chromium.launch({ executablePath: process.env.CHROME || "/home/hatch/workspace/tmp_chrome/chrome-linux64/chrome", args: ["--no-sandbox"] });

let pass = 0, fail = 0;
const check = (name, ok) => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}`); ok ? pass++ : fail++; };

async function newRig() {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await ctx.newPage();
  const rig = { ctx, page, collects: [] };
  await page.route(/googletagmanager\.com\/gtag\/js/, (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: GTAG }));
  // AdSense is unreachable from the sandbox and its pending request
  // skews page-load timing; stub it (it plays no role in GA consent).
  await page.route(/pagead2\.googlesyndication\.com/, (route) =>
    route.fulfill({ status: 200, contentType: "text/javascript", body: "" }));
  await page.route(/google-analytics\.com\/(g|j)\/collect|analytics\.google\.com/, (route) => {
    const req = route.request();
    const u = new URL(req.url());
    const q = Object.fromEntries(u.searchParams.entries());
    const events = [{ en: q.en, gcs: q.gcs, tid: q.tid }];
    const body = req.postData() || "";
    for (const line of body.split("\n")) {
      if (!line.trim()) continue;
      const p = new URLSearchParams(line);
      if (p.get("en")) events.push({ en: p.get("en"), gcs: p.get("gcs"), tid: p.get("tid") });
    }
    rig.collects.push(...events.filter((e) => e.en));
    route.fulfill({ status: 204, body: "" });
  });
  return rig;
}
// gtag batches hits after consent changes; poll instead of fixed sleeps.
async function waitForCollects(rig, n, timeout = 9000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (rig.collects.length >= n) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return rig.collects.length >= n;
}
async function waitForPageView(rig, timeout = 9000) {
  const t0 = Date.now();
  while (Date.now() - t0 < timeout) {
    if (rig.collects.some((c) => c.en === "page_view")) return true;
    await new Promise((r) => setTimeout(r, 250));
  }
  return rig.collects.some((c) => c.en === "page_view");
}
const dataLayer = (page) => page.evaluate(() =>
  (window.dataLayer || []).map((e) => { try { return Array.from(e); } catch { return null; } }).filter(Boolean));
const banner = (page) => page.locator('[role="dialog"][aria-label="Cookie consent"]');

// ---------- 1 + 2 + 3: first visit, Accept All, returning visit ----------
{
  const { ctx, page, collects } = await newRig();
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(2200);
  const pv1 = collects.filter((c) => c.en === "page_view");
  check("1. first visit: exactly one page_view, gcs=G100 (denied)", pv1.length === 1 && pv1[0].gcs === "G100" && pv1[0].tid === "G-5QYEH4Q69Q");
  const dl0 = await dataLayer(page);
  check("6a. exactly one gtag loader tag in the DOM", await page.evaluate(() => document.querySelectorAll('script[src*="googletagmanager.com/gtag/js"]').length) === 1);
  check("6b. exactly one config call in the dataLayer", dl0.filter((a) => a[0] === "config").length === 1);

  await banner(page).waitFor({ state: "visible", timeout: 8000 });
  collects.length = 0;
  await page.getByRole("button", { name: "Accept All" }).click();
  await waitForPageView({ collects });
  await page.waitForTimeout(600);
  const pv2 = collects.filter((c) => c.en === "page_view");
  check("2. Accept All: exactly ONE make-up page_view, granted (gcs=G111)", pv2.length === 1 && pv2[0].gcs === "G111");
  const dl = await dataLayer(page);
  const updIdx = dl.findIndex((a) => a[0] === "consent" && a[1] === "update");
  const evIdx = dl.findIndex((a) => a[0] === "event" && a[1] === "page_view");
  check("2b. consent update was pushed BEFORE the make-up page_view", updIdx !== -1 && evIdx !== -1 && updIdx < evIdx);
  const upd = dl.filter((a) => a[0] === "consent" && a[1] === "update").pop();
  check("2c. the update grants all four categories", !!upd && upd[2].analytics_storage === "granted" && upd[2].ad_storage === "granted" && upd[2].ad_user_data === "granted" && upd[2].ad_personalization === "granted");

  collects.length = 0;
  await page.reload({ waitUntil: "networkidle" });
  await waitForCollects({ collects }, 1);
  await page.waitForTimeout(600);
  const pv3 = collects.filter((c) => c.en === "page_view");
  check("3. returning visitor: FIRST page_view already granted (gcs=G111), exactly one", pv3.length === 1 && pv3[0].gcs === "G111");
  const dl3 = await dataLayer(page);
  const def3 = dl3.find((a) => a[0] === "consent" && a[1] === "default");
  check("3b. head consent DEFAULT itself carries the saved granted choice", !!def3 && def3[2].analytics_storage === "granted" && def3[2].ad_storage === "granted");
  check("3c. no make-up page_view event pushed on a granted load", !dl3.some((a) => a[0] === "event" && a[1] === "page_view"));
  await ctx.close();
}

// ---------- 4: Reject All persists as denied ----------
{
  const { ctx, page, collects } = await newRig();
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await banner(page).waitFor({ state: "visible", timeout: 8000 });
  collects.length = 0;
  await page.getByRole("button", { name: "Reject All" }).click();
  await page.waitForTimeout(1500);
  check("4. Reject All: no granted page_view is sent after rejecting", !collects.some((c) => c.en === "page_view" && c.gcs !== "G100"));
  collects.length = 0;
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(2200);
  const pv = collects.filter((c) => c.en === "page_view");
  check("4b. after reload, page_view is still denied (gcs=G100)", pv.length === 1 && pv[0].gcs === "G100");
  await ctx.close();
}

// ---------- 5: Custom analytics-only ----------
{
  const { ctx, page, collects } = await newRig();
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);
  await banner(page).waitFor({ state: "visible", timeout: 8000 });
  await page.getByRole("button", { name: "Customize Preferences" }).click();
  await page.getByRole("switch", { name: "Analytics cookies" }).click();
  collects.length = 0;
  await page.getByRole("button", { name: "Save My Preferences" }).click();
  await waitForPageView({ collects });
  await page.waitForTimeout(600);
  const pv = collects.filter((c) => c.en === "page_view");
  check("5. analytics-only save: exactly one make-up page_view, not fully denied, not all-granted", pv.length === 1 && pv[0].gcs !== "G100" && pv[0].gcs !== "G111");
  const dl = await dataLayer(page);
  const upd = dl.filter((a) => a[0] === "consent" && a[1] === "update").pop();
  check("5b. update: analytics granted, all ad categories denied", !!upd && upd[2].analytics_storage === "granted" && upd[2].ad_storage === "denied" && upd[2].ad_user_data === "denied" && upd[2].ad_personalization === "denied");
  collects.length = 0;
  await page.reload({ waitUntil: "networkidle" });
  await waitForCollects({ collects }, 1);
  await page.waitForTimeout(600);
  const dlR = await dataLayer(page);
  const defR = dlR.find((a) => a[0] === "consent" && a[1] === "default");
  check("5c. after reload, head default seeds analytics=granted / ads=denied from storage", !!defR && defR[2].analytics_storage === "granted" && defR[2].ad_storage === "denied");
  const pvR = collects.filter((c) => c.en === "page_view");
  check("5d. reload page_view is not the all-denied state", pvR.length === 1 && pvR[0].gcs !== "G100");
  await ctx.close();
}

console.log(`\nfunctional-check-9: ${pass} passed, ${fail} failed`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
