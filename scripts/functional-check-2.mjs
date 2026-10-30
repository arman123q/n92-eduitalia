#!/usr/bin/env node
/**
 * Functional check #2 — visual polish / reviews / contact release.
 * Same harness as functional-check.mjs (production export + intercepted
 * Supabase answered from seed). Testimonials are answered with FIXTURE
 * rows created only inside this test: one published+permitted+featured
 * (must appear) and one published-without-permission (must NEVER appear —
 * checks the client-side second line of defence; live RLS blocks it too).
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
  testimonials: [
    { id: "t-fixture-ok", display_name: "Fixture Student", photo_url: null, university_name: "University of Bologna", programme: "MSc Artificial Intelligence", country: "India", service_category: "visa-guidance", review_text: "Fixture review text for testing only.", review_date: "2026-09-14", source: "manual", permission_confirmed: true, featured: true, status: "published" },
    { id: "t-fixture-noperm", display_name: "Hidden NoPermission", photo_url: null, university_name: "University of Bologna", programme: "MSc Artificial Intelligence", country: "India", service_category: "visa-guidance", review_text: "This must never be displayed.", review_date: "2026-09-15", source: "manual", permission_confirmed: false, featured: true, status: "published" },
  ],
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
    leadPayload = Array.isArray(parsed) ? parsed[0] : parsed;
    return route.fulfill({ status: 201, contentType: "application/json", body: "[]" });
  }
  const rows = TABLES[table] || [];
  const filtered = url.searchParams.get("status") === "eq.published" ? rows.filter((r) => r.status === "published") : rows;
  return route.fulfill({ status: 200, contentType: "application/json", body: JSON.stringify(filtered) });
});
await page.route("**/auth/v1/**", (route) => route.fulfill({ status: 400, contentType: "application/json", body: "{}" }));

let fails = 0;
const check = (name, ok, detail = "") => { console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`); if (!ok) fails++; };
const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}]/u;

/* ---------- Homepage: hero, journey, reviews, icons ---------- */
await page.goto(`${base}/`, { waitUntil: "networkidle" });
const h1Color = await page.locator("section h1").first().evaluate((el) => getComputedStyle(el).color);
check("hero headline is ivory on the dark overlay", h1Color === "rgb(250, 249, 245)", h1Color);
const homeText = await page.locator("body").innerText();
check("no colourful emoji anywhere on the homepage", !EMOJI.test(homeText.replace(/[✓✕→]/g, "")));
check("journey heading present", homeText.includes("Your Journey to Italy — Step by Step"));
for (const s of ["Free Eligibility Assessment", "Counselling & University Shortlisting", "Application & Documentation", "Admission & Pre-enrolment", "Visa Preparation & Guidance", "Accommodation & Arrival Support"]) {
  check(`journey step: ${s}`, homeText.includes(s));
}
check("journey decision disclaimer present", homeText.includes("Admission decisions are made by the universities"));
check("consultation band present", homeText.includes("Book a Free Consultation"));
check("homepage reviews show the permitted featured testimonial", homeText.includes("Fixture Student") && homeText.includes("Fixture review text for testing only."));
check("homepage NEVER shows the no-permission testimonial", !homeText.includes("Hidden NoPermission") && !homeText.includes("This must never be displayed."));
check("homepage has Read Google Reviews button", homeText.includes("Read Google Reviews"));
check("no star-rating counts invented on homepage", !/\d+(\.\d+)?\s*(stars|★)/i.test(homeText));

/* ---------- Reviews page ---------- */
await page.goto(`${base}/reviews/`, { waitUntil: "networkidle" });
const revText = await page.locator("body").innerText();
check("reviews page shows permitted testimonial", revText.includes("Fixture Student"));
check("reviews page NEVER shows no-permission testimonial", !revText.includes("Hidden NoPermission"));
check("reviews page distinguishes sources", revText.includes("Submitted to N92 · published with permission"));
check("reviews page has category filters", revText.includes("Scholarship Assistance") && revText.includes("IELTS Coaching"));
await page.getByRole("button", { name: "Scholarship Assistance" }).click();
await page.waitForTimeout(300);
const revFiltered = await page.locator("body").innerText();
check("category filter hides other categories", !revFiltered.includes("Fixture Student") && revFiltered.includes("No published reviews in this category yet"));

/* ---------- Consultation booking ---------- */
await page.goto(`${base}/book-consultation/`, { waitUntil: "networkidle" });
await page.locator("#bc-service").selectOption({ index: 1 });
await page.locator("#bc-name").fill("Fixture Booker");
await page.locator("#bc-phone").fill("+919999999999");
await page.locator("#bc-date").fill("2026-11-20");
await page.locator('input[type="checkbox"]').first().check();
await page.getByRole("button", { name: "Request My Free Consultation" }).click();
await page.waitForTimeout(800);
const bcText = await page.locator("body").innerText();
check("consultation shows confirmation after server OK", bcText.includes("Consultation request recorded"));
check("confirmation repeats not-confirmed note", bcText.includes("not a confirmed appointment"));
check("lead tagged as consultation for the chosen service", (leadPayload?.subject_interest || "").startsWith("Free Consultation —"), leadPayload?.subject_interest);
check("lead message carries the preferred date", (leadPayload?.message || "").includes("2026-11-20"), leadPayload?.message?.split("\n")[0]);

/* ---------- Contact page: location section ---------- */
await page.goto(`${base}/contact/`, { waitUntil: "networkidle" });
const contactText = await page.locator("body").innerText();
check("contact page has Company location section", contactText.includes("Company location & contact"));
check("contact page links Directions to the owner's Google link", await page.locator('a[href="https://share.google/SMZxVZdUWDem9ucYB"]').count() >= 1);
const contactStripped = contactText.replaceAll("+91 94525 32786", "").replaceAll("919452532786", "").replace("2027–28", "");
check("no invented street address on contact page", !/\bVia\s+[A-Z]/.test(contactStripped) && !/\b\d{5} [A-Z][a-z]+/.test(contactStripped), JSON.stringify((contactStripped.match(/\bVia\s+[A-Z].{0,40}/) || contactStripped.match(/\b\d{5} [A-Z][a-z]+.{0,40}/) || [""])[0]));
check("contact page has privacy note", contactText.includes("Privacy note:"));

/* ---------- Service page icons + privacy note ---------- */
await page.goto(`${base}/ielts-coaching/`, { waitUntil: "networkidle" });
const ieltsText = await page.locator("body").innerText();
check("service enquiry form has privacy note", ieltsText.includes("Privacy note:"));

await browser.close();
server.close();
console.log(fails === 0 ? "\nALL FUNCTIONAL CHECKS #2 PASSED" : `\n${fails} FUNCTIONAL FAILURES`);
process.exit(fails === 0 ? 0 : 1);
