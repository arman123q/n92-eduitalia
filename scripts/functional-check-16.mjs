/**
 * functional-check-16 — Student Essentials PREMIUM REDESIGN
 * (public side, stub build): cinematic hero + CTAs, category
 * cards with real counts, accordion checklist, circular progress
 * with the v1 localStorage key preserved, save/print/reset,
 * tutorial modal empty state, products panel, header unchanged,
 * responsive overflow at the owner's six widths.
 * (Replaces functional-check-14, which tested the v1 layout.)
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

const browser = await chromium.launch({ executablePath: "/home/hatch/workspace/tmp_chrome/chrome-linux64/chrome", args: ["--no-sandbox", "--use-gl=swiftshader"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await page.goto(base + "/student-checklist/", { waitUntil: "networkidle" });
await page.waitForTimeout(2500);

// ---------- Hero ----------
const body = () => page.locator("body").innerText();
check("hero: title renders", (await body()).includes("Italy Student Checklist & Essentials"));
check("hero: subtitle renders", (await body()).includes("Everything Indian students need to prepare before moving to Italy."));
check("hero: both CTAs present", await page.getByRole("button", { name: /Start My Checklist/ }).isVisible().catch(() => false) && await page.getByRole("button", { name: /How to Use This Guide/ }).isVisible().catch(() => false));
const heroVisual = await page.evaluate(() => {
  const canvas = document.querySelector("section canvas");
  const img = document.querySelector('section img[src*="essentials-hero"]');
  return { canvas: !!canvas, imgVisible: !!img && img.style.display !== "none" };
});
check("hero: WebGL canvas active OR fallback still shown", heroVisual.canvas || heroVisual.imgVisible, JSON.stringify(heroVisual));
await page.getByRole("button", { name: /Start My Checklist/ }).click();
await page.waitForTimeout(1200);
const checklistInView = await page.evaluate(() => {
  const el = [...document.querySelectorAll("h2")].find((h) => h.textContent.includes("My Packing Checklist"));
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return r.top >= -10 && r.top < window.innerHeight;
});
check("hero: Start My Checklist smooth-scrolls to the checklist", checklistInView);

// ---------- Category cards ----------
const cards = await page.evaluate(() => [...document.querySelectorAll('[aria-label="Checklist categories"] button')].map((b) => b.textContent.replace(/\s+/g, " ").trim()));
check("cards: All + fixture categories with real counts", cards.length === 3 && cards[0].includes("All Items") && cards[0].includes("(4)") && cards.some((c) => c.includes("(3)")) && cards.some((c) => c.includes("(1)")), cards.join(" | "));

// ---------- Accordion + progress ----------
check("accordion: first category expanded by default (Passport visible)", await page.getByText("Passport", { exact: true }).isVisible().catch(() => false));
check("accordion: second category collapsed (Winter jacket hidden)", !(await page.getByText("Winter jacket", { exact: true }).isVisible().catch(() => false)));
await page.getByRole("button", { name: /Clothing/ }).first().click();
await page.waitForTimeout(400);
check("accordion: expanding shows its items", await page.getByText("Winter jacket", { exact: true }).isVisible().catch(() => false));
check("progress: starts at 0 / 3 with 0%", (await body()).includes("0 / 3 items") && (await body()).includes("0%"));
await page.getByRole("checkbox", { name: "Passport" }).click();
await page.waitForTimeout(400);
const afterTick = await body();
check("progress: tick updates ring counts (1 / 3, 33%, 1 Completed, 2 Remaining)", afterTick.includes("1 / 3 items") && afterTick.includes("33%") && afterTick.includes("1 Completed") && afterTick.includes("2 Remaining"));
const stored = await page.evaluate(() => localStorage.getItem("n92_checklist_v1"));
check("progress: saved under the SAME v1 key/format", stored === JSON.stringify(["s-passport"]), stored ?? "null");
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(400);
check("progress: tick survives reload", (await body()).includes("1 / 3 items"));
await page.getByRole("button", { name: /Save My Progress/ }).click();
await page.waitForTimeout(300);
check("progress: Save button confirms", (await body()).includes("Saved ✓"));
await page.getByRole("button", { name: "Hide packed items" }).click();
await page.waitForTimeout(300);
check("filter: Hide packed removes ticked rows", !(await page.getByText("Passport", { exact: true }).isVisible().catch(() => false)));
await page.getByRole("button", { name: "Hide packed items" }).click();
page.once("dialog", (d) => void d.accept());
await page.getByRole("button", { name: /Reset Checklist/ }).click();
await page.waitForTimeout(300);
check("progress: reset clears to 0 / 3", (await body()).includes("0 / 3 items"));

// ---------- Tutorial modal (empty state: stub has no tutorial table) ----------
await page.evaluate(() => window.scrollTo(0, 0));
await page.getByRole("button", { name: /How to Use This Guide/ }).click();
await page.waitForTimeout(900);
check("tutorial: modal opens with polished empty state", await page.getByText("Video guide coming soon").isVisible().catch(() => false));
check("tutorial: no broken iframe in empty state", (await page.locator('[role="dialog"] iframe').count()) === 0);
await page.keyboard.press("Escape");
await page.waitForTimeout(300);
check("tutorial: Esc closes the modal", !(await page.getByText("Video guide coming soon").isVisible().catch(() => false)));

// ---------- Products panel ----------
check("products panel: fixture product with verified price", (await body()).includes("Fixture Suitcase") && (await body()).includes("₹4,999"));
check("products panel: links to the full catalogue", (await page.locator('a[href="/student-checklist/products/"]').count()) >= 1);
check("legend: Italy Applicability card present", (await body()).includes("Italy Applicability") && (await body()).includes("Not applicable"));

// ---------- Header untouched ----------
await page.setViewportSize({ width: 1920, height: 1000 });
await page.goto(base + "/", { waitUntil: "networkidle" });
const primary = await page.evaluate(() => [...document.querySelectorAll('nav[aria-label="Primary"] a')].map((a) => a.textContent.trim()));
check("header: desktop bar unchanged (six links, no Student Essentials)", primary.length === 6 && !primary.includes("Student Essentials"), primary.join(" | "));
check("homepage: no Student Essentials content", !(await body()).includes("Student Essentials"));

// ---------- Responsive ----------
for (const w of [375, 430, 768, 1024, 1440, 1920]) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(base + "/student-checklist/", { waitUntil: "networkidle" });
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  check(`responsive: no horizontal overflow at ${w}px`, overflow <= 0, `${overflow}px`);
}

console.log(fails === 0 ? "\nFUNCTIONAL CHECK 16: ALL PASSED" : `\nFUNCTIONAL CHECK 16: ${fails} FAILURES`);
await browser.close();
server.close();
process.exit(fails ? 1 : 0);
