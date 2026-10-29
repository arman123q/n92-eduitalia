#!/usr/bin/env node
/**
 * RLS verification probes (spec: test BEFORE trusting the connection).
 * Usage: SUPABASE_URL=https://xxx.supabase.co SUPABASE_ANON_KEY=... node scripts/test-rls.mjs
 * Uses ONLY the public anon key, exactly like a website visitor's browser.
 */
const URL_BASE = process.env.SUPABASE_URL;
const KEY = process.env.SUPABASE_ANON_KEY;
if (!URL_BASE || !KEY) {
  console.error("Set SUPABASE_URL and SUPABASE_ANON_KEY first.");
  process.exit(2);
}
const H = { apikey: KEY, Authorization: `Bearer ${KEY}`, "Content-Type": "application/json" };
let pass = 0, fail = 0;
const check = (name, ok, detail = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? " — " + detail : ""}`);
  ok ? pass++ : fail++;
};

const get = (path) => fetch(`${URL_BASE}/rest/v1/${path}`, { headers: H });

// 1. Public can read published universities
let r = await get("universities?select=id,status&status=eq.published");
let rows = r.ok ? await r.json() : [];
check("anon reads published universities", r.ok && rows.every((x) => x.status === "published"), `${rows.length} rows`);

// 2. Drafts are invisible to the public
r = await get("universities?select=id&status=eq.draft");
rows = r.ok ? await r.json() : null;
check("anon cannot see draft universities", rows !== null && rows.length === 0, rows ? `${rows.length} draft rows leaked` : `HTTP ${r.status}`);

// 3. Public cannot create content
r = await fetch(`${URL_BASE}/rest/v1/universities`, {
  method: "POST", headers: H,
  body: JSON.stringify({ id: "hack-test", slug: "hack-test", name: "Hack Test" }),
});
check("anon cannot insert a university", r.status === 401 || r.status === 403, `HTTP ${r.status}`);

// 4. Public CAN submit a lead (the one allowed write)
r = await fetch(`${URL_BASE}/rest/v1/leads`, {
  method: "POST", headers: { ...H, Prefer: "return=minimal" },
  body: JSON.stringify({ name: "RLS Probe", email: "probe@example.com", consent: true, summary: "Automated RLS test lead — safe to delete" }),
});
check("anon can submit a lead", r.status === 201, `HTTP ${r.status}`);

// 5. Public cannot read leads back (blocked by RLS returning 0 rows,
//    or even stronger: no SELECT privilege at all -> HTTP 401/403)
r = await get("leads?select=id");
rows = r.ok ? await r.json() : null;
check("anon cannot read leads", (rows !== null && rows.length === 0) || r.status === 401 || r.status === 403, rows ? `${rows.length} leads leaked` : `HTTP ${r.status} (privilege-level block)`);

// 6. Public cannot read the audit log
r = await get("audit_log?select=id");
rows = r.ok ? await r.json() : null;
check("anon cannot read audit log", (rows !== null && rows.length === 0) || r.status === 401 || r.status === 403, `HTTP ${r.status}`);

// 7. Calculator defaults are public-readable
r = await get("calculator_settings?select=id");
rows = r.ok ? await r.json() : [];
check("anon reads calculator settings", r.ok && rows.length === 1, `${rows.length} rows`);

console.log(`\nRLS probes: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
