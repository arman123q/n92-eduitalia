/**
 * functional-check-6 — Ticker resilience (31 Oct 2026).
 * The public ticker must NEVER print "undefined"/"null": incomplete
 * admission rounds / notices are hidden or reduced to their valid parts.
 * Scenario A replays the REAL live Supabase payload (fetched 31 Oct);
 * B is a degraded payload; C is all-incomplete -> honest empty state.
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

const LIVE_ROUNDS = [{ id: "r-iuav-university-of-venice", university_id: null, university_name: "University of Padua", programme_name: null, intake_year: 2027, intake_semester: "Fall", round_name: "First Call", custom_round_label: null, opens_at: null, deadline_at: null, deadline_verified: true, manual_status: "results-published", official_url: "https://apply.unipd.it/", source_url: "https://www.unipd.it/en/ammissione-studenti-internazionali", last_verified: "2026-10-30", message: "Applications are open.", pinned: true, status: "published", admin_notes: null, created_at: "2026-10-30T16:10:53Z", updated_at: "2026-10-30T16:24:59Z" }];
const LIVE_NOTICES = [{ id: "n-visa", title: "Important: 2026/27 Italy Student Visa Deadline – 30 November 2026", message: "The deadline does not apply in the same way to postgraduate Master courses, PhD or Erasmus programmes. Visa approval is decided by the consulate.", category: "University admission calls", priority: "high", starts_at: null, ends_at: null, source_url: "https://www.universitaly.org/en/studenti-stranieri", last_verified: "2026-10-30", link_text: "Official procedures", link_url: null, pinned: true, status: "published", admin_notes: null, created_at: "2026-10-30T15:57:57Z", updated_at: "2026-10-30T15:59:40Z" }];

const DEGRADED_ROUNDS = [
  { id: "r-bad", university_name: null, round_name: null, programme_name: null, intake_year: null, intake_semester: null, opens_at: null, deadline_at: null, deadline_verified: false, manual_status: null, pinned: false, status: "published" },
  { id: "r-part", university_name: "Sapienza University of Rome", round_name: null, programme_name: null, intake_year: null, intake_semester: null, opens_at: null, deadline_at: null, deadline_verified: false, manual_status: null, pinned: false, status: "published" },
];
const DEGRADED_NOTICES = [
  { id: "n-bad", title: "", message: "", category: "general", priority: "normal", starts_at: null, ends_at: null, pinned: false, status: "published" },
  { id: "n-part", title: "Library Notice", message: null, category: "", priority: "normal", starts_at: null, ends_at: null, pinned: false, status: "published" },
];

let payload = { rounds: LIVE_ROUNDS, notices: LIVE_NOTICES };
const browser = await chromium.launch({ executablePath: process.env.CHROME || "/home/hatch/workspace/tmp_chrome/chrome-linux64/chrome", args: ["--no-sandbox"] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.route(/supabase\.co\//, (route) => {
  const url = route.request().url();
  const body = url.includes("admission_rounds") ? payload.rounds : url.includes("notices") ? payload.notices : [];
  route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
});

let pass = 0, fail = 0;
const check = (name, ok) => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}`); ok ? pass++ : fail++; };
const tickerText = async () => page.evaluate(() => {
  const t = document.querySelector('[aria-label="Admission notices"]') || [...document.querySelectorAll("div")].find((d) => d.textContent?.includes("No published admission notices"));
  return t ? t.textContent : "";
});
const badWords = (t) => /\bundefined\b|\bnull\b|NaN/.test(t);

await page.goto(base + "/", { waitUntil: "networkidle" });
await page.waitForTimeout(900);

// --- Scenario A: real live payload ---
let t = await tickerText();
check("A1 Padua round renders with its real name", t.includes("University of Padua — First Call · Fall 2027"));
check("A2 status preserved: RESULTS PUBLISHED badge", t.includes("RESULTS PUBLISHED"));
check("A3 visa notice renders", t.includes("Italy Student Visa Deadline"));
check("A4 no undefined/null/NaN anywhere in ticker", !badWords(t));
check("A5 verified-but-dateless round prints no contradictory deadline text", !t.includes("Deadline not officially verified") || t.includes("Sapienza"));
await page.screenshot({ path: "/tmp/ticker-desktop.png" });
const mob = await browser.newPage({ viewport: { width: 390, height: 844 } });
await mob.route(/supabase\.co\//, (route) => {
  const url = route.request().url();
  const body = url.includes("admission_rounds") ? payload.rounds : url.includes("notices") ? payload.notices : [];
  route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(body) });
});
await mob.goto(base + "/", { waitUntil: "networkidle" });
await mob.waitForTimeout(900);
await mob.screenshot({ path: "/tmp/ticker-mobile.png" });
const tm = await mob.evaluate(() => document.querySelector('[aria-label="Admission notices"]')?.textContent || "");
check("A6 mobile ticker clean too", tm.includes("University of Padua") && !badWords(tm));
await mob.close();

// --- Scenario B: degraded payload ---
payload = { rounds: DEGRADED_ROUNDS, notices: DEGRADED_NOTICES };
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(900);
t = await tickerText();
check("B1 fully-incomplete round hidden", !t.includes("r-bad") && !/—\s*·/.test(t));
check("B2 partial round shows only valid part + honest status", t.includes("Sapienza University of Rome") && t.includes("NOT VERIFIED") && t.includes("Deadline not officially verified"));
check("B3 empty notice hidden, partial notice shows title only", t.includes("Library Notice") && !t.includes("Library Notice —"));
check("B4 no undefined/null/NaN in degraded ticker", !badWords(t));

// --- Scenario C: everything incomplete -> honest empty state ---
payload = { rounds: [DEGRADED_ROUNDS[0]], notices: [DEGRADED_NOTICES[0]] };
await page.reload({ waitUntil: "networkidle" });
await page.waitForTimeout(900);
t = await tickerText();
check("C1 all-incomplete falls back to the honest empty state", t.includes("No published admission notices right now."));

console.log(`\nfunctional-check-6: ${pass} passed, ${fail} failed`);
await browser.close();
server.close();
process.exit(fail ? 1 : 0);
