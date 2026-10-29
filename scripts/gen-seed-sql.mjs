#!/usr/bin/env node
/** Generate supabase/seed.sql from data/seed.json (single source of truth). */
import { readFileSync, writeFileSync } from "node:fs";

const seed = JSON.parse(readFileSync(new URL("../data/seed.json", import.meta.url), "utf8"));
const q = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const arr = (a) => (Array.isArray(a) && a.length ? `ARRAY[${a.map(q).join(",")}]::text[]` : "'{}'::text[]");
const num = (v) => (v === null || v === undefined ? "NULL" : String(v));

let out = `-- N92 Edu-Italia — SEED DATA (generated from data/seed.json; do not edit by hand)
-- Run AFTER schema.sql. Safe to re-run: inserts are ON CONFLICT DO NOTHING.
-- Records are honest starter data: verification_status stays 'needs-review'
-- until a human checks the official source.

`;

for (const u of seed.universities) {
  out += `INSERT INTO public.universities (id, slug, name, city, region, type, website, application_url, degree_levels, subjects, languages, tuition_note, admission_note, academic_year, source_url, last_verified, verification_status, status) VALUES (${q(u.id)}, ${q(u.slug)}, ${q(u.name)}, ${q(u.city)}, ${q(u.region)}, ${q(u.type)}, ${q(u.website)}, ${q(u.applicationUrl)}, ${arr(u.degreeLevels)}, ${arr(u.subjects)}, ${arr(u.languages)}, ${q(u.tuitionNote)}, ${q(u.admissionNote)}, ${q(u.academicYear)}, ${q(u.sourceUrl)}, ${q(u.lastVerified)}, ${q(u.verificationStatus)}, ${q(u.status)}) ON CONFLICT (id) DO NOTHING;\n`;
}
for (const c of seed.courses) {
  out += `INSERT INTO public.courses (id, slug, name, university_id, level, subject, language, duration_years, credits, requirements, tuition_note, deadline_note, official_url, academic_year, source_url, last_verified, verification_status, status) VALUES (${q(c.id)}, ${q(c.slug)}, ${q(c.name)}, ${q(c.universityId)}, ${q(c.level)}, ${q(c.subject)}, ${q(c.language)}, ${num(c.durationYears)}, ${num(c.credits)}, ${q(c.requirements)}, ${q(c.tuitionNote)}, ${q(c.deadlineNote)}, ${q(c.officialUrl)}, ${q(c.academicYear)}, ${q(c.sourceUrl)}, ${q(c.lastVerified)}, ${q(c.verificationStatus)}, ${q(c.status)}) ON CONFLICT (id) DO NOTHING;\n`;
}
for (const s of seed.scholarships) {
  out += `INSERT INTO public.scholarships (id, slug, name, provider, kind, academic_year, geographic_eligibility, student_eligibility, degree_levels, requirements, documents, procedure, opens_note, closes_note, benefits, official_url, source_url, last_verified, verification_status, status) VALUES (${q(s.id)}, ${q(s.slug)}, ${q(s.name)}, ${q(s.provider)}, ${q(s.kind)}, ${q(s.academicYear)}, ${q(s.geographicEligibility)}, ${q(s.studentEligibility)}, ${arr(s.degreeLevels)}, ${q(s.requirements)}, ${arr(s.documents)}, ${q(s.procedure)}, ${q(s.opensNote)}, ${q(s.closesNote)}, ${q(s.benefits)}, ${q(s.officialUrl)}, ${q(s.sourceUrl)}, ${q(s.lastVerified)}, ${q(s.verificationStatus)}, ${q(s.status)}) ON CONFLICT (id) DO NOTHING;\n`;
}
for (const f of seed.faqs) {
  out += `INSERT INTO public.faqs (id, category, question, answer, source_url, status) VALUES (${q(f.id)}, ${q(f.category)}, ${q(f.question)}, ${q(f.answer)}, ${q(f.sourceUrl ?? null)}, ${q(f.status)}) ON CONFLICT (id) DO NOTHING;\n`;
}
out += `INSERT INTO public.calculator_settings (id, value) VALUES (1, ${q(JSON.stringify(seed.calculator))}::jsonb) ON CONFLICT (id) DO NOTHING;\n`;

writeFileSync(new URL("../supabase/seed.sql", import.meta.url), out);
console.log(`seed.sql written: ${seed.universities.length} universities, ${seed.courses.length} courses, ${seed.scholarships.length} scholarships, ${seed.faqs.length} faqs, calculator row`);
