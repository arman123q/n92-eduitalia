/**
 * functional-check-13 — Header navigation hierarchy (owner spec,
 * 3 Nov 2026): desktop bar keeps the SIX main links + both CTAs +
 * Menu button; the side menu holds ONLY secondary links in five
 * groups (plus, below desktop width, the main links and CTAs so
 * nothing is unreachable). Tested at the owner's exact widths:
 * 375, 768, 1024, 1280, 1440, 1920 — overflow, overlap, clipping,
 * menu contents and navigation.
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

const MAIN = ["Study in Italy", "Universities", "Courses", "Scholarships", "Admissions", "Blog & Articles", "Student Login"];
const GROUPS = ["Planning", "Updates", "About N92", "Services", "Policies"];
const WIDTHS = [375, 768, 1024, 1280, 1440, 1920];

const browser = await chromium.launch({ executablePath: "/home/hatch/workspace/tmp_chrome/chrome-linux64/chrome", args: ["--no-sandbox"] });
const page = await browser.newPage();

for (const w of WIDTHS) {
  await page.setViewportSize({ width: w, height: 900 });
  await page.goto(base + "/", { waitUntil: "networkidle" });
  const m = await page.evaluate(() => {
    const header = document.querySelector("header");
    const bar = header.querySelector(":scope > div:nth-child(2)");
    const logo = header.querySelector('img[alt="N92 Edu-Italia logo"]');
    const book = [...header.querySelectorAll("a")].find((a) => a.textContent.trim() === "Book Consultation" && a.closest("nav") === null);
    const menuBtn = header.querySelector("button[aria-controls='mobile-menu']");
    const primary = header.querySelector('nav[aria-label="Primary"]');
    const vis = (el) => !!el && el.getBoundingClientRect().width > 0 && getComputedStyle(el).visibility !== "hidden";
    const rects = [...bar.children].filter(vis).map((el) => { const r = el.getBoundingClientRect(); return { l: r.left, r: r.right, t: r.top, b: r.bottom }; });
    let overlap = false;
    for (let i = 0; i < rects.length; i++) for (let j = i + 1; j < rects.length; j++) {
      if (rects[i].l < rects[j].r - 1 && rects[j].l < rects[i].r - 1 && rects[i].t < rects[j].b - 1 && rects[j].t < rects[i].b - 1) overlap = true;
    }
    const linkInfo = primary && vis(primary) ? [...primary.querySelectorAll("a")].map((a) => ({ label: a.textContent.trim(), visible: vis(a), clipped: a.scrollWidth > a.clientWidth + 1 })) : [];
    const elig = [...header.querySelectorAll("a")].find((a) => a.textContent.trim() === "Check My Eligibility" && a.closest("nav") === null);
    return {
      overflow: header.scrollWidth - header.clientWidth,
      logoVisible: vis(logo), bookVisible: vis(book), menuVisible: vis(menuBtn),
      overlap, primaryVisible: vis(primary), linkInfo, eligVisible: vis(elig),
    };
  });
  check(`w=${w}: no header overflow`, m.overflow <= 0, `overflow=${m.overflow}px`);
  check(`w=${w}: logo + Book Consultation + Menu visible`, m.logoVisible && m.bookVisible && m.menuVisible);
  check(`w=${w}: no overlapping bar elements`, !m.overlap);
  if (w >= 1440) {
    check(`w=${w}: DESKTOP main nav visible`, m.primaryVisible);
    check(`w=${w}: all seven main links visible, none clipped`, m.linkInfo.length === 7 && m.linkInfo.every((l) => l.visible && !l.clipped) && MAIN.every((x) => m.linkInfo.some((l) => l.label === x)), JSON.stringify(m.linkInfo.map((l) => l.label)));
    check(`w=${w}: Check My Eligibility visible`, m.eligVisible);
  } else {
    check(`w=${w}: main nav collapsed into menu (bar stays clean)`, !m.primaryVisible);
  }
}

// --- Side menu at mobile width: everything reachable ---
await page.setViewportSize({ width: 375, height: 844 });
await page.goto(base + "/", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /menu/i }).first().click();
await page.waitForTimeout(400);
const panel = page.locator("#mobile-menu");
check("mobile menu: panel opens", await panel.isVisible().catch(() => false));
for (const g of GROUPS) check(`mobile menu: group '${g}' present`, await panel.getByText(g, { exact: true }).isVisible().catch(() => false));
for (const l of MAIN) check(`mobile menu: main link '${l}' present`, await panel.getByRole("link", { name: l }).isVisible().catch(() => false));
for (const [label, href] of [["Cost Calculator", "/calculator/"], ["Application Process", "/process/"], ["Important Notices", "/notices/"], ["Student Reviews", "/reviews/"], ["IELTS Online Coaching", "/ielts-coaching/"], ["Privacy Notice", "/privacy/"], ["Terms of Use", "/terms/"]]) {
  const link = panel.getByRole("link", { name: label });
  check(`mobile menu: '${label}' -> ${href}`, (await link.getAttribute("href").catch(() => "")) === href);
}
await panel.getByRole("link", { name: "Blog & Articles" }).click();
await page.waitForTimeout(500);
check("mobile menu: Blog link navigates to /blog/", page.url().includes("/blog/"), page.url());

// --- Side menu at desktop width: secondary only ---
await page.setViewportSize({ width: 1920, height: 1000 });
await page.goto(base + "/", { waitUntil: "networkidle" });
await page.getByRole("button", { name: /menu/i }).first().click();
await page.waitForTimeout(400);
check("desktop menu: panel opens", await panel.isVisible().catch(() => false));
for (const g of GROUPS) check(`desktop menu: group '${g}' present`, await panel.getByText(g, { exact: true }).isVisible().catch(() => false));
check("desktop menu: main links NOT duplicated in panel", !(await panel.getByText("Explore", { exact: true }).isVisible().catch(() => false)));
await panel.getByRole("link", { name: "Cost Calculator" }).click();
await page.waitForTimeout(500);
check("desktop menu: Cost Calculator navigates", page.url().includes("/calculator/"), page.url());

console.log(fails === 0 ? "\nFUNCTIONAL CHECK 13: ALL PASSED" : `\nFUNCTIONAL CHECK 13: ${fails} FAILURES`);
await browser.close();
server.close();
process.exit(fails ? 1 : 0);
