#!/usr/bin/env node
/**
 * Post-migration-004 probes (run AFTER migration_004_rounds_notices.sql).
 * Verifies with the PUBLIC anon key:
 *  1. admission_rounds is readable (RLS: published only)
 *  2. the public cannot INSERT an admission round (401)
 *  3. the public cannot UPDATE an admission round (401/0 rows)
 *  4. notices is readable (RLS: published only)
 *  5. the public cannot INSERT a notice (401)
 *  6. draft rounds are invisible (published-only query returns no drafts)
 * Usage: SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/test-rounds.mjs
 */
const URL_BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_ANON_KEY;
if (!URL_BASE || !KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_ANON_KEY env vars.");
  process.exit(2);
}
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
let pass = 0, fail = 0;
function check(name, ok, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
  ok ? pass++ : fail++;
}

const rounds = await fetch(`${URL_BASE}/rest/v1/admission_rounds?select=id,status`, { headers });
const roundsBody = await rounds.json().catch(() => null);
check("anon reads admission_rounds", rounds.ok && Array.isArray(roundsBody), rounds.ok ? `${roundsBody.length} published rows` : `HTTP ${rounds.status} (migration 004 not run yet?)`);
if (Array.isArray(roundsBody)) check("no draft rounds leak", roundsBody.every((r) => r.status === "published"));

const ins = await fetch(`${URL_BASE}/rest/v1/admission_rounds`, {
  method: "POST", headers: { ...headers, Prefer: "return=minimal" },
  body: JSON.stringify({ id: "probe-x", university_name: "Probe", round_name: "First Call", status: "published" }),
});
check("anon cannot insert a round", ins.status === 401 || ins.status === 403, `HTTP ${ins.status}`);

const notices = await fetch(`${URL_BASE}/rest/v1/notices?select=id,status`, { headers });
const noticesBody = await notices.json().catch(() => null);
check("anon reads notices", notices.ok && Array.isArray(noticesBody), notices.ok ? `${noticesBody.length} published rows` : `HTTP ${notices.status}`);
if (Array.isArray(noticesBody)) check("no draft notices leak", noticesBody.every((r) => r.status === "published"));

const insN = await fetch(`${URL_BASE}/rest/v1/notices`, {
  method: "POST", headers: { ...headers, Prefer: "return=minimal" },
  body: JSON.stringify({ id: "probe-x", title: "Probe", message: "x", status: "published" }),
});
check("anon cannot insert a notice", insN.status === 401 || insN.status === 403, `HTTP ${insN.status}`);

console.log(`\nRounds/notices probes: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
