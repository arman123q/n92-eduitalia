#!/usr/bin/env node
/**
 * Functional check for the upgrades release (Playwright Chromium over the
 * production export in out/). Supabase REST calls are intercepted and
 * answered from data/seed.json, so the REAL page code runs against the
 * NEW 30-course catalogue exactly as it will after migration_006.
 * Tests: course filters (level/subject/language/university/year/search),
 * homepage services overview + bands, service pages, refund policy +
 * instalments, and the IELTS enquiry form → leads insert payload.
 */
import { chromium } from "playwright-core";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const OUT = path.resolve("out");
const seed = JSON.parse(fs.readFileSync("data/seed.json", "utf8"));

const toDb = (o) => {
  const r = {};
  for (const [k, v] of Object.entries(o)) r[k.replace(/([A-Z])/g, "_$1").toLowerCase()] = v;
  return r;
};
const TABLES = {
  universities: seed.universities.map(toDb),
  courses: seed.courses.map(toDb),
  scholarships: seed.scholarships.map(toDb),
  faqs: seed.faqs.map(toDb),
  calculator_settings: [
    { city_tier: "metro", tiers: seed.calculator.tiers, living: seed.calculator.living, one_off: seed.calculator.oneOff, notes: seed.calculator.notes },
  ],
  admission_rounds: [],
  notices: [],
  site_content: [],
};

let leadPayload = null;

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

const browser = await chromium.launch({ executablePath: process.env.CHROME || `${process.env.HOME}/workspace/tmp_chrome/chrome-linux64/chrome`, args: ["--no-sandbox"] });
const page = await browser.newPage();

await page.route("**/rest/v1/**", async (route) => {
  const req = route.request();
  const url = new URL(req.url());
  const table = url.pathname.split("/").pop();
  if (req.method() === "POST" && table === "leads") {
    const parsed = JSON.parse(req.postData() || "{}");
    leadPayload = Array.isArray(parsed) ? parsed[0] : parsed; // PostgREST bulk-insert form
    return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
  }
  const rows = TABLES[table] || [];
  // honour status=eq.published like RLS+query would
  const filtered = url.searchParams.get("status") === "eq.published" ? rows.filter((r) => r.status === "published") : rows;
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(filtered) });
});
await page.route("**/auth/v1/**", (route) => route.fulfill({ status: 400, contentType: "application/json", body: "{}" }));

let fails = 0;
const check = (name, ok, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`); if (!ok) fails++; };
const cards = async () => page.locator("main article.card").count();

/* ---------- Courses: catalogue + filters ---------- */
await page.goto(`${base}/courses/`, { waitUntil: "networkidle" });
await page.waitForFunction(() => document.querySelectorAll("main article").length >= 30, null, { timeout: 15000 }).catch(() => {});
check("courses catalogue shows all 30 courses", (await cards()) === 30, `${await cards()} cards`);

const selects = page.locator("main select");
await selects.nth(0).selectOption("bachelor");
await page.waitForTimeout(300);
check("filter Degree level = Bachelor's → 6", (await cards()) === 6, `${await cards()}`);
await selects.nth(0).selectOption("single_cycle");
await page.waitForTimeout(300);
check("filter Degree level = Single-cycle → 2", (await cards()) === 2, `${await cards()}`);
await selects.nth(0).selectOption("phd");
await page.waitForTimeout(300);
check("filter Degree level = PhD → 3", (await cards()) === 3, `${await cards()}`);
await selects.nth(0).selectOption("");
await page.waitForTimeout(300);

await selects.nth(1).selectOption("medicine-health");
await page.waitForTimeout(300);
check("filter Subject = Medicine & Health → 2", (await cards()) === 2, `${await cards()}`);
await selects.nth(1).selectOption("");
await page.waitForTimeout(300);

await selects.nth(2).selectOption("both");
await page.waitForTimeout(300);
check("filter Language = English & Italian → 2", (await cards()) === 2, `${await cards()}`);
await selects.nth(2).selectOption("");
await page.waitForTimeout(300);

const uniSelect = selects.nth(3);
const bolognaId = await uniSelect.locator("option", { hasText: "University of Bologna" }).getAttribute("value");
await uniSelect.selectOption(bolognaId);
await page.waitForTimeout(300);
check("filter University = Bologna → 4", (await cards()) === 4, `${await cards()}`);
await uniSelect.selectOption("");
await page.waitForTimeout(300);

const yearSelect = selects.nth(4);
const yearOptions = await yearSelect.locator("option").allTextContents();
check("Academic year filter exists with 2026/27", yearOptions.some((t) => t.includes("2026/27")), yearOptions.join("|"));
await yearSelect.selectOption("2026/27");
await page.waitForTimeout(300);
check("filter Academic year = 2026/27 → 30", (await cards()) === 30, `${await cards()}`);

await page.locator('input[type="search"]').fill("Robotics");
await page.waitForTimeout(300);
check("search 'Robotics' → 2 (Genoa Robotics Eng. + Sapienza AI & Robotics)", (await cards()) === 2, `${await cards()}`);
await page.getByRole("button", { name: "Reset filters" }).click();
await page.waitForTimeout(300);
check("Reset filters restores 30", (await cards()) === 30, `${await cards()}`);

/* ---------- Homepage: services overview + bands ---------- */
await page.goto(`${base}/`, { waitUntil: "networkidle" });
const servicesText = await page.locator("#services").innerText();
for (const t of ["IELTS Online Coaching", "Visa & Documentation Support", "Accommodation & Arrival Support", "University Course & Admission Guidance", "100% Consultancy Fee Refund Guarantee"]) {
  check(`homepage services overview includes “${t}”`, servicesText.includes(t));
}
const homeText = await page.locator("body").innerText();
check("homepage shows IELTS headline", homeText.includes("IELTS Online Coaching — Prepare with Confidence."));
check("homepage shows refund headline", homeText.includes("Your Visa. Our Commitment."));
check("homepage shows refund main statement", homeText.includes("100% Consultancy Fee Refund if Your Italian Student Visa Is Rejected."));
check("homepage links to full refund policy", homeText.includes("Read Full Refund Policy"));

/* ---------- IELTS page + enquiry form → leads ---------- */
await page.goto(`${base}/ielts-coaching/`, { waitUntil: "networkidle" });
const ieltsText = await page.locator("body").innerText();
check("IELTS page headline", ieltsText.includes("IELTS Online Coaching — Prepare with Confidence."));
check("IELTS page lists Writing Task 1 and Task 2 evaluation", ieltsText.includes("Writing Task 1 and Task 2 evaluation"));
check("IELTS page has no-partnership disclaimer", ieltsText.includes("not affiliated with IELTS"));
check("IELTS page CTA present", ieltsText.includes("Book Your Free Demo Class"));

await page.locator('input[autocomplete="name"]').fill("Test Student");
await page.locator('input[type="tel"]').fill("+919999999999");
await page.locator('input[type="checkbox"]').first().check();
await page.getByRole("button", { name: "Book Your Free Demo Class" }).last().click();
await page.waitForTimeout(800);
check("IELTS enquiry shows success after server confirmation", (await page.locator("body").innerText()).includes("Enquiry recorded"));
check("lead payload tagged with the service", leadPayload?.subject_interest === "IELTS Online Coaching", JSON.stringify(leadPayload?.subject_interest));
check("lead payload carries consent", leadPayload?.consent === true);
check("lead payload has no invented source column", leadPayload && !("source" in leadPayload));

/* ---------- Visa + Accommodation pages ---------- */
await page.goto(`${base}/visa-support/`, { waitUntil: "networkidle" });
const visaText = await page.locator("body").innerText();
check("Visa page headline", visaText.includes("Your Italy Journey, Made Easier."));
check("Visa page lists Universitaly guidance", visaText.includes("Universitaly pre-enrolment guidance"));
check("Visa page states no guaranteed approval", visaText.includes("cannot guarantee visa approval"));
check("Visa page CTA present", visaText.includes("Get Visa Assistance"));

await page.goto(`${base}/accommodation-support/`, { waitUntil: "networkidle" });
const accText = await page.locator("body").innerText();
check("Accommodation page headline", accText.includes("From Arrival to Settling In"));
check("Accommodation page lists Codice Fiscale guidance", accText.includes("Codice Fiscale guidance"));
check("Accommodation page lists Permesso di Soggiorno guidance", accText.includes("Permesso di Soggiorno (residence permit) guidance"));
check("Accommodation page CTA present", accText.includes("Get Arrival Support"));

/* ---------- Refund policy page + payment plan ---------- */
await page.goto(`${base}/refund-policy/`, { waitUntil: "networkidle" });
const refText = await page.locator("body").innerText();
check("Refund page headline", refText.includes("Your Visa. Our Commitment."));
check("Refund page states third-party exclusions", refText.includes("VFS charges") && refText.includes("University tuition fees"));
check("Refund page explains instalment refunds", refText.includes("one, two or all three instalments"));
check("Refund page lists refusal evidence", refText.includes("official visa refusal letter"));
check("Payment plan: Instalment 1 — Registration", refText.includes("Instalment 1 — Registration"));
check("Payment plan: Instalment 2 — Application Stage", refText.includes("Instalment 2 — Application Stage"));
check("Payment plan: Instalment 3 — Final Stage", refText.includes("Instalment 3 — Final Stage"));
check("Payment plan: instalments make up the total fee", refText.includes("together make up the total consultancy fee"));
check("Payment plan: no invented amounts", !/₹|€\s?\d|%\s?at enrolment/.test(refText));

await browser.close();
server.close();
console.log(fails === 0 ? "\nALL FUNCTIONAL CHECKS PASSED" : `\n${fails} FUNCTIONAL FAILURES`);
process.exit(fails === 0 ? 0 : 1);
