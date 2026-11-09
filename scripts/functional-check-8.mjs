/**
 * functional-check-8 — GDPR cookie consent banner (31 Oct 2026).
 * Verifies Consent Mode v2 behaviour end-to-end against the real build:
 * default denied, Accept All / Reject All / Customize flows, consent
 * updates in the dataLayer, localStorage persistence across reload and
 * navigation, the footer "Cookie Settings" re-open path, and that the
 * Necessary category cannot be switched off.
 */
import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const OUT = "/home/hatch/workspace/n92-eduitalia/out";
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
const ALL_DENIED = { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" };
const ALL_GRANTED = { analytics_storage: "granted", ad_storage: "granted", ad_user_data: "granted", ad_personalization: "granted" };
const same = (a, b) => !!a && ["analytics_storage", "ad_storage", "ad_user_data", "ad_personalization"].every((k) => a[k] === b[k]);

async function consentEvents(page) {
  return page.evaluate(() =>
    (window.dataLayer || [])
      .map((e) => { try { return Array.from(e); } catch { return null; } })
      .filter((a) => a && a[0] === "consent")
      .map((a) => [a[1], a[2]]),
  );
}
async function stored(page) {
  return page.evaluate(() => {
    const raw = window.localStorage.getItem("n92_cookie_consent_v1");
    return raw ? JSON.parse(raw) : null;
  });
}
async function freshPage(width = 1440) {
  const ctx = await browser.newContext({ viewport: { width, height: width < 600 ? 844 : 900 } });
  const page = await ctx.newPage();
  await page.goto(base + "/", { waitUntil: "networkidle" });
  return { ctx, page };
}
const banner = (page) => page.locator('[role="dialog"][aria-label="Cookie consent"]');

// ---------- Scenario 1+2: first visit, defaults, Reject All ----------
{
  const { ctx, page } = await freshPage();
  await banner(page).waitFor({ state: "visible", timeout: 8000 });
  check("S1 banner appears on first visit", true);
  let ev = await consentEvents(page);
  check("S1 consent DEFAULT is all-denied (from layout)", ev.length >= 1 && ev[0][0] === "default" && same(ev[0][1], ALL_DENIED));
  check("S1 no consent UPDATE before any choice", !ev.some((e) => e[0] === "update"));
  await page.screenshot({ path: "/tmp/consent-desktop.png" });
  await page.getByRole("button", { name: "Reject All" }).click();
  await page.waitForTimeout(300);
  check("S2 banner hides after Reject All", !(await banner(page).isVisible().catch(() => false)));
  ev = await consentEvents(page);
  const upd = ev.filter((e) => e[0] === "update").pop();
  check("S2 Reject All pushes an all-denied consent update", !!upd && same(upd[1], ALL_DENIED));
  const st = await stored(page);
  check("S2 choice stored (analytics/advertising false)", !!st && st.analytics === false && st.advertising === false && st.necessary === true);
  await page.reload({ waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  check("S2 banner stays hidden after refresh", !(await banner(page).isVisible().catch(() => false)));
  ev = await consentEvents(page);
  check("S2 stored choice re-applied on reload (update present)", ev.some((e) => e[0] === "update" && same(e[1], ALL_DENIED)));
  await ctx.close();
}

// ---------- Scenario 3: Accept All + navigation persistence ----------
{
  const { ctx, page } = await freshPage();
  await banner(page).waitFor({ state: "visible", timeout: 8000 });
  await page.getByRole("button", { name: "Accept All" }).click();
  await page.waitForTimeout(300);
  let ev = await consentEvents(page);
  const upd = ev.filter((e) => e[0] === "update").pop();
  check("S3 Accept All pushes an all-granted consent update", !!upd && same(upd[1], ALL_GRANTED));
  await page.goto(base + "/universities/", { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  check("S3 banner stays hidden after navigating to another page", !(await banner(page).isVisible().catch(() => false)));
  ev = await consentEvents(page);
  check("S3 granted choice re-applied on the new page load", ev.some((e) => e[0] === "update" && same(e[1], ALL_GRANTED)));
  await ctx.close();
}

// ---------- Scenario 4: Customize (analytics only) ----------
{
  const { ctx, page } = await freshPage();
  await banner(page).waitFor({ state: "visible", timeout: 8000 });
  await page.getByRole("button", { name: "Customize Preferences" }).click();
  await page.waitForTimeout(300);
  const necessary = page.getByRole("switch", { name: /Necessary cookies/ });
  check("S4 Necessary switch is ON and locked (disabled)", (await necessary.getAttribute("aria-checked")) === "true" && (await necessary.isDisabled()));
  await page.screenshot({ path: "/tmp/consent-customize.png" });
  await page.getByRole("switch", { name: "Analytics cookies" }).click();
  await page.getByRole("button", { name: "Save My Preferences" }).click();
  await page.waitForTimeout(300);
  const ev = await consentEvents(page);
  const upd = ev.filter((e) => e[0] === "update").pop();
  check("S4 customize saves analytics=granted, advertising=denied", !!upd && upd[1].analytics_storage === "granted" && upd[1].ad_storage === "denied" && upd[1].ad_user_data === "denied" && upd[1].ad_personalization === "denied");
  const st = await stored(page);
  check("S4 stored prefs match (analytics true, advertising false)", !!st && st.analytics === true && st.advertising === false);
  await ctx.close();
}

// ---------- Scenario 5: footer Cookie Settings reopens ----------
{
  const { ctx, page } = await freshPage();
  await banner(page).waitFor({ state: "visible", timeout: 8000 });
  await page.getByRole("button", { name: "Reject All" }).click();
  await page.waitForTimeout(300);
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.getByRole("button", { name: "Cookie Settings" }).click();
  await page.waitForTimeout(400);
  check("S5 footer Cookie Settings reopens the preferences panel", await banner(page).isVisible() && (await page.getByRole("button", { name: "Save My Preferences" }).isVisible()));
  await page.getByRole("switch", { name: "Advertising cookies" }).click();
  await page.getByRole("button", { name: "Save My Preferences" }).click();
  await page.waitForTimeout(300);
  const ev = await consentEvents(page);
  const upd = ev.filter((e) => e[0] === "update").pop();
  check("S5 changed preference pushes a new update (ad granted, analytics still denied)", !!upd && upd[1].ad_storage === "granted" && upd[1].analytics_storage === "denied");
  await ctx.close();
}

// ---------- Scenario 6: mobile layout ----------
{
  const { ctx, page } = await freshPage(390);
  await banner(page).waitFor({ state: "visible", timeout: 8000 });
  const box = await banner(page).boundingBox();
  check("S6 mobile banner fits the viewport width", !!box && box.x >= 0 && box.x + box.width <= 390 + 1);
  check("S6 no horizontal overflow with banner open (mobile)", await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth));
  await page.screenshot({ path: "/tmp/consent-mobile.png" });
  await ctx.close();
}

console.log(`\nfunctional-check-8: ${pass} passed, ${fail} failed`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
