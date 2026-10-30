#!/usr/bin/env node
/**
 * Link & route audit over the production export (out/).
 * 1. Every seed university/course/scholarship slug has a static detail file.
 * 2. Every internal href in every exported HTML file resolves to an
 *    exported file (path -> dir/index.html or file). Query strings and
 *    hashes are stripped; /detail/?slug= links resolve to the fallback page.
 * Exits non-zero on any failure.
 */
import fs from "node:fs";
import path from "node:path";

const OUT = path.resolve("out");
const seed = JSON.parse(fs.readFileSync("data/seed.json", "utf8"));
let failures = 0;

// 1. Static detail routes for every seed record
for (const kind of ["universities", "courses", "scholarships"]) {
  for (const r of seed[kind]) {
    const f = path.join(OUT, kind, r.slug, "index.html");
    if (!fs.existsSync(f)) {
      console.log(`MISSING ROUTE  /${kind}/${r.slug}`);
      failures++;
    }
  }
}
console.log(`detail routes: ${seed.universities.length} universities, ${seed.courses.length} courses, ${seed.scholarships.length} scholarships checked`);

// 2. Internal links in exported HTML
function walk(dir, acc = []) {
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else if (e.name.endsWith(".html")) acc.push(p);
  }
  return acc;
}
function resolves(href) {
  const clean = href.split(/[?#]/)[0];
  if (!clean.startsWith("/")) return true;
  const rel = clean.replace(/^\//, "");
  const candidates = [
    path.join(OUT, rel),
    path.join(OUT, rel, "index.html"),
    path.join(OUT, rel.replace(/\/$/, ""), "index.html"),
  ];
  return candidates.some((c) => fs.existsSync(c) && fs.statSync(c).isFile());
}
const seen = new Set();
for (const file of walk(OUT)) {
  const html = fs.readFileSync(file, "utf8");
  for (const m of html.matchAll(/href="(\/[^"]*)"/g)) {
    const href = m[1];
    if (href.startsWith("/_next") || href.startsWith("/api")) continue;
    const key = href.split(/[?#]/)[0];
    if (seen.has(key)) continue;
    seen.add(key);
    if (!resolves(href)) {
      console.log(`BROKEN LINK  ${href}  (first seen in ${path.relative(OUT, file)})`);
      failures++;
    }
  }
}
console.log(`internal link targets checked: ${seen.size}`);
if (failures) {
  console.log(`LINK AUDIT FAILED: ${failures} problem(s)`);
  process.exit(1);
}
console.log("LINK AUDIT PASSED");
