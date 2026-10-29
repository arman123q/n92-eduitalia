import { test } from "node:test";
import assert from "node:assert/strict";
import { assess, validateStep, validateLead } from "../lib/eligibility.js";

const base = {
  degree: "master",
  qualification: "bachelor",
  field: "computer-science-data",
  marks: "75–89",
  gradYear: "2024",
  englishStatus: "ielts-6.5+",
  studyField: "computer-science-data",
  intake: "2027",
  teachingLanguage: "english",
  budget: "8000-12000",
  funding: "scholarship-preferred",
  uniType: "",
};

test("validation: step 1 requires degree, qualification, marks", () => {
  const e = validateStep(1, {});
  assert.ok(e.degree && e.qualification && e.marks);
  assert.deepEqual(validateStep(1, base), {});
});

test("validation: step 2 requires english status, intake, teaching language", () => {
  const e = validateStep(2, {});
  assert.ok(e.englishStatus && e.intake && e.teachingLanguage);
  assert.deepEqual(validateStep(2, base), {});
});

test("validation: step 3 requires budget and funding", () => {
  const e = validateStep(3, {});
  assert.ok(e.budget && e.funding);
  assert.deepEqual(validateStep(3, base), {});
});

test("assess: complete profile yields all sections and no probability claims", () => {
  const r = assess(base);
  assert.ok(r.factors.length >= 3);
  assert.ok(r.courseDirections.length >= 2);
  assert.ok(r.documents.length >= 6);
  assert.ok(r.nextSteps.length >= 4);
  const all = JSON.stringify(r).toLowerCase();
  for (const banned of ["probability", "% chance", "guaranteed admission", "guaranteed scholarship", "you are eligible", "will be admitted"]) {
    assert.ok(!all.includes(banned), `output must not contain "${banned}"`);
  }
});

test("assess: qualification gap is flagged (Class 12 applying for Master's)", () => {
  const r = assess({ ...base, qualification: "class-12" });
  assert.ok(r.checks.some((c) => c.includes("Entry level gap")));
});

test("assess: no English test yet produces a language check", () => {
  const r = assess({ ...base, englishStatus: "none-yet" });
  assert.ok(r.checks.some((c) => c.toLowerCase().includes("english proof")));
  assert.ok(r.documents.some((d) => d.toLowerCase().includes("english test result")));
});

test("assess: Italian-taught preference without Italian triggers a check", () => {
  const r = assess({ ...base, teachingLanguage: "italian", englishStatus: "ielts-6.5+" });
  assert.ok(r.checks.some((c) => c.toLowerCase().includes("italian-taught")));
});

test("assess: low budget + scholarship essential prioritises DSU", () => {
  const r = assess({ ...base, budget: "under-5000", funding: "scholarship-essential" });
  assert.ok(r.scholarshipPriorities.some((s) => s.includes("DSU")));
  assert.ok(r.checks.some((c) => c.toLowerCase().includes("budget reality check")));
});

test("assess: self-funded profile still mentions DSU fee waiver", () => {
  const r = assess({ ...base, funding: "self-funded" });
  assert.ok(r.scholarshipPriorities.some((s) => s.toLowerCase().includes("fee waiver")));
  assert.ok(!r.scholarshipPriorities.some((s) => s.includes("Invest Your Talent")));
});

test("lead validation: needs name, a contact channel and consent; honeypot blocks", () => {
  assert.ok(validateLead({ name: "", email: "", whatsapp: "", consent: false }).name);
  const ok = validateLead({ name: "Asha Rao", email: "asha@example.com", whatsapp: "", consent: true, website: "" });
  assert.deepEqual(ok, {});
  const bot = validateLead({ name: "Bot", email: "b@example.com", whatsapp: "", consent: true, website: "http://spam" });
  assert.ok(bot.website);
  const noConsent = validateLead({ name: "Asha Rao", email: "", whatsapp: "+91 98765 43210", consent: false });
  assert.ok(noConsent.consent);
});
