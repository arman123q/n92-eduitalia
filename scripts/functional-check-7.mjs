/**
 * functional-check-7 — Header right-side overflow (31 Oct 2026).
 * Owner's production screenshot: at his window width the CTA group was
 * squeezed (ghost button text wrapped in a tall pill) and the Book
 * Consultation button was cut off at the right edge, because the header
 * row's min-content (~1386px) exceeded the 1280px container.
 * Fix: header container widened to 1600px; the full desktop bar (nav +
 * both CTAs) is shown only from 1600px up; below that the hamburger menu
 * is used. CTAs are flex-none + nowrap so they can never be squeezed.
 * This check replays the REAL live ticker payload and asserts, at the
 * owner's eight widths: no document overflow, the Book Consultation
 * button fully inside the viewport, nav content fits its box when the
 * full bar is shown, and the hamburger + menu work below 1600px.
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

const LIVE_ROUNDS = [{ id: "r-iuav-university-of-venice", university_id: null, university_name: "University of Padua", programme_name: null, intake_year: 2027, intake_semester: "Fall", round_name: "First Call", custom_round_label: null, opens_at: null, deadline_at: null, deadline_verified: true, manual_status: "results-published", official_url: "https://apply.unipd.it/", source_url: null, last_verified: "2026-10-30", message: "Applications are open.", pinned: true, status: "published", admin_notes: null, created_at: "2026-10-30T16:10:53Z", updated_at: "2026-10-30T16:24:59Z" }];
const LIVE_NOTICES = [{ id: "n-visa", title: "Important: 2026/27 Italy Student Visa Deadline – 30 November 2026", message: "The deadline does not apply in the same way to postgraduate Master courses, PhD or Erasmus programmes. Visa approval is decided by the consulate.", category: "University admission calls", priority: "high", starts_at: null, ends_at: null, source_url: null, last_verified: "2026-10-30", link_text: null, link_url: null, pinned: true, status: "published", admin_notes: null, created_at: "2026-10-30T15:57:57Z", updated_at: "2026-10-30T15:59:40Z" }];

const browser = await chromium.launch({ executablePath: process.env.CHROME || "/home/hatch/workspace/tmp_chrome/chrome-linux64/chrome", args: ["--no-sandbox"] });
let pass = 0, fail = 0;
const check = (name, ok) => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}`); ok ? pass++ : fail++; };

for (const w of [1920, 1809, 1440, 1280, 1024, 768, 430, 390]) {
  const page = await browser.newPage({ viewport: { width: w, height: 880 } });
  await page.route(/supabase\.co\//, (route) => {
    const url = route.request().url();
    const body = url.includes("admission_rounds") ? LIVE_ROUNDS : url.includes("notices") ? LIVE_NOTICES : [];
    route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
  });
  await page.goto(base + "/", { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const r = await page.evaluate(() => {
    const cw = document.documentElement.clientWidth;
    const header = document.querySelector("header");
    const btns = [...header.querySelectorAll("a")];
    const book = btns.find((a) => a.textContent.trim() === "Book Consultation" && a.closest("div.flex.flex-none"));
    const ghost = btns.find((a) => a.textContent.trim() === "Check My Eligibility" && a.closest("div.flex.flex-none"));
    const nav = header.querySelector('nav[aria-label="Primary"]');
    const ul = nav ? nav.querySelector("ul") : null;
    const menuBtn = [...header.querySelectorAll("button")].find((b) => b.textContent.includes("Menu"));
    const vis = (el) => { if (!el) return null; const b = el.getBoundingClientRect(); return b.width === 0 ? null : { left: Math.round(b.left), right: Math.round(b.right), h: Math.round(b.height) }; };
    const lis = ul ? [...ul.querySelectorAll("li")].map((li) => Math.round(li.getBoundingClientRect().height)) : [];
    return {
      cw, overflow: document.documentElement.scrollWidth > cw,
      book: vis(book), ghost: vis(ghost), navShown: !!vis(nav),
      ulFit: ul ? ul.scrollWidth <= ul.clientWidth + 1 : null,
      liMax: lis.length ? Math.max(...lis) : 0,
      menuBtn: !!vis(menuBtn),
    };
  });
  check(`w=${w} no horizontal overflow`, !r.overflow);
  if (w >= 640) check(`w=${w} Book Consultation fully inside viewport`, !!r.book && r.book.left >= 0 && r.book.right <= r.cw);
  if (w >= 1600) {
    check(`w=${w} full nav shown, single line, content fits its box`, r.navShown && r.liMax <= 24 && r.ulFit === true);
    check(`w=${w} ghost button on one line (not squeezed)`, !!r.ghost && r.ghost.h <= 48);
    check(`w=${w} no hamburger in full-bar mode`, !r.menuBtn);
  } else {
    check(`w=${w} hamburger mode (nav hidden, Menu shown)`, !r.navShown && r.menuBtn);
  }
  if (w === 1809 || w === 1440 || w === 390) await page.screenshot({ path: `/tmp/hdrfix-${w}.png` });
  // Hamburger opens a menu containing both CTAs + all links (spot-check at 1440)
  if (w === 1440) {
    await page.click("header button");
    await page.waitForTimeout(300);
    const menu = await page.evaluate(() => {
      const m = document.querySelector("#mobile-menu");
      if (!m) return "";
      return m.textContent;
    });
    check("w=1440 hamburger menu lists all links + both CTAs", ["Study in Italy", "Universities", "Cost Calculator", "About", "Check My Eligibility", "Book Consultation"].every((s) => menu.includes(s)));
  }
  await page.close();
}
console.log(`\nfunctional-check-7: ${pass} passed, ${fail} failed`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
