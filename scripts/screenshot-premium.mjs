/**
 * screenshot-premium.mjs — delivery screenshots + production
 * assertions for the Student Essentials premium redesign, run
 * against the FINAL production build (real Supabase data baked):
 * desktop 1440 (hero + dashboard top, and a mid-page shot),
 * mobile 375 (fallback still hero), real card counts (217),
 * progress denominator (215 packable), products empty state,
 * tutorial empty state against the live project (migration_010
 * not yet applied → graceful empty state, no broken player).
 */
import { chromium } from "playwright-core";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const OUT = "/home/hatch/workspace/n92-eduitalia/out";
const SHOTS = "/home/hatch/workspace/n92_premium_shots";
fs.mkdirSync(SHOTS, { recursive: true });
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

const browser = await chromium.launch({ executablePath: "/home/hatch/workspace/tmp_chrome/chrome-linux64/chrome", args: ["--no-sandbox", "--use-gl=swiftshader"] });

// ---- Desktop 1440 ----
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(base + "/student-checklist/", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
// Dismiss the first-visit cookie banner so the screenshots show the page itself
await page.getByRole("button", { name: "Reject All" }).click().catch(() => {});
await page.waitForTimeout(2200);
await page.screenshot({ path: `${SHOTS}/premium-desktop-1440.png` });
const body = () => page.locator("body").innerText();
const cards = await page.evaluate(() => [...document.querySelectorAll('[aria-label="Checklist categories"] button')].map((b) => b.textContent.replace(/\s+/g, " ").trim()));
check("PROD cards: 12 cards with the owner's exact counts", cards.length === 12 && cards[0].includes("(217)") && cards[1].includes("(25)") && cards[2].includes("(21)") && cards[5].includes("(27)") && cards[7].includes("(34)") && cards[10].includes("(2)") && cards[11].includes("(16)"), cards.join(" | "));
check("PROD progress: '0 / 215 items' (N/A excluded)", (await body()).includes("0 / 215 items"));
check("PROD progress: N/A footnote present", (await body()).includes("2 items are not applicable to Italy"));
check("PROD products: premium empty state (no products published)", (await body()).includes("Products are being added"));
await page.evaluate(() => document.getElementById("checklist")?.scrollIntoView());
for (let pass = 0; pass < 12; pass++) {
  const clicked = await page.evaluate(() => {
    const btns = [...document.querySelectorAll("section[aria-label='My packing checklist'] button[aria-expanded='false']")];
    btns.forEach((b) => b.click());
    return btns.length;
  });
  if (!clicked) break;
  await page.waitForTimeout(200);
}
check("PROD checklist: 217 checkboxes across all categories, exactly 2 disabled", await page.evaluate(() => {
  const boxes = [...document.querySelectorAll('[role="checkbox"]')];
  return boxes.length === 217 && boxes.filter((b) => b.disabled).length === 2;
}));
await page.evaluate(() => document.getElementById("checklist")?.scrollIntoView());
await page.waitForTimeout(900);
await page.screenshot({ path: `${SHOTS}/premium-desktop-dashboard.png` });
// Tutorial modal against the LIVE project (no tutorial table yet)
await page.evaluate(() => window.scrollTo(0, 0));
await page.waitForTimeout(400);
await page.getByRole("button", { name: /How to Use This Guide/ }).click();
await page.waitForTimeout(2500);
check("PROD tutorial: graceful empty state against live project", await page.getByText("Video guide coming soon").isVisible().catch(() => false));
check("PROD tutorial: no iframe (nothing published)", (await page.locator('[role="dialog"] iframe').count()) === 0);
await page.keyboard.press("Escape");

// ---- Mobile 375 (fallback still, no WebGL by design) ----
await page.setViewportSize({ width: 375, height: 780 });
await page.goto(base + "/student-checklist/", { waitUntil: "networkidle" });
await page.waitForTimeout(1200);
const mobile = await page.evaluate(() => ({
  canvas: !!document.querySelector("section canvas"),
  img: !!document.querySelector('section img[src*="essentials-hero"]'),
  overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
}));
check("MOBILE: fallback still used (no canvas), no overflow", !mobile.canvas && mobile.img && mobile.overflow <= 0, JSON.stringify(mobile));
await page.screenshot({ path: `${SHOTS}/premium-mobile-375.png` });
await page.evaluate(() => document.getElementById("checklist")?.scrollIntoView());
await page.waitForTimeout(700);
await page.screenshot({ path: `${SHOTS}/premium-mobile-dashboard.png` });

console.log(fails === 0 ? "\nPROD SHOTS + ASSERTIONS: ALL PASSED" : `\n${fails} FAILURES`);
await browser.close();
server.close();
process.exit(fails ? 1 : 0);
