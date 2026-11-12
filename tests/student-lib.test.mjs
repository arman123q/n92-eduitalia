/**
 * Unit tests for lib/student.ts — the two review fixes:
 *  (1) session refresh outcomes: a temporary network failure during
 *      refresh must preserve the session and surface a retryable
 *      error (never verify with the expired token, never clear);
 *      only a definitive refresh rejection clears the session.
 *  (2) write validation: return=representation writes must come back
 *      as a JSON row array — empty/malformed bodies are explicit
 *      errors, never confirmed successes.
 *
 * The TypeScript source is transpiled on the fly with the repo's own
 * typescript package; its "@/lib/supabase" import is pointed at a
 * stub, and fetch/localStorage are scripted per test.
 */
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const require = createRequire(new URL("../package.json", import.meta.url));
const ts = require("typescript");

const TOKEN_KEY = "n92_student_token";
const REFRESH_KEY = "n92_student_refresh";
const USER_KEY = "n92_student_user";

const store = new Map();
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
};

let fetchHandler = null;
let fetchCalls = [];
globalThis.fetch = async (url, opts = {}) => {
  fetchCalls.push({ url: String(url), opts });
  if (!fetchHandler) throw new Error("no fetch handler installed");
  return fetchHandler(String(url), opts);
};

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
function makeJwt(expOffsetSec, sub = "user-1") {
  const now = Math.floor(Date.now() / 1000);
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub, email: "s@test.local", exp: now + expOffsetSec })}.sig`;
}
function seedSession(accessToken, refreshToken = "refresh-1") {
  store.clear();
  if (accessToken) localStorage.setItem(TOKEN_KEY, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_KEY, "s@test.local");
}
const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

let student;
before(async () => {
  const dir = mkdtempSync(join(tmpdir(), "n92-student-lib-"));
  writeFileSync(join(dir, "supabase-stub.mjs"), `
    export const SUPABASE_URL = "http://stub.local";
    export const SUPABASE_ANON_KEY = "anon-stub";
    export function isDbConfigured() { return true; }
  `);
  const src = readFileSync(new URL("../lib/student.ts", import.meta.url), "utf8");
  const { outputText } = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
  });
  writeFileSync(join(dir, "student.mjs"), outputText.replaceAll('"@/lib/supabase"', '"./supabase-stub.mjs"'));
  student = await import(`file://${join(dir, "student.mjs")}`);
});

/* ---------------- Fix 1: refresh outcomes ---------------- */

test("R1 expired token + refresh network failure: session preserved, retryable error, expired token never verified", async () => {
  const expired = makeJwt(-600);
  seedSession(expired);
  fetchCalls = [];
  fetchHandler = async (url) => {
    if (url.includes("/auth/v1/token")) throw new TypeError("fetch failed");
    throw new Error(`unexpected call: ${url}`);
  };
  const r = await student.currentStudentUser();
  assert.equal(r.state, "error");
  assert.equal(r.retryable, true);
  assert.equal(localStorage.getItem(TOKEN_KEY), expired, "access token must be preserved");
  assert.equal(localStorage.getItem(REFRESH_KEY), "refresh-1", "refresh token must be preserved");
  assert.equal(fetchCalls.filter((c) => c.url.includes("/auth/v1/user")).length, 0, "must not verify with the expired token");
});

test("R2 expired token + refresh HTTP 503: treated as transient, session preserved", async () => {
  const expired = makeJwt(-600);
  seedSession(expired);
  fetchCalls = [];
  fetchHandler = async (url) => {
    if (url.includes("/auth/v1/token")) return json({ error: "temporarily unavailable" }, 503);
    throw new Error(`unexpected call: ${url}`);
  };
  const r = await student.currentStudentUser();
  assert.equal(r.state, "error");
  assert.equal(r.retryable, true);
  assert.equal(localStorage.getItem(TOKEN_KEY), expired);
  assert.equal(fetchCalls.filter((c) => c.url.includes("/auth/v1/user")).length, 0);
});

test("R3 expired token + revoked refresh token (400): session cleared, no verification attempt", async () => {
  seedSession(makeJwt(-600));
  fetchCalls = [];
  fetchHandler = async (url) => {
    if (url.includes("/auth/v1/token")) return json({ error: "invalid_grant", error_description: "Invalid Refresh Token: Already Used" }, 400);
    throw new Error(`unexpected call: ${url}`);
  };
  const r = await student.currentStudentUser();
  assert.notEqual(r.state, "ok");
  assert.equal(localStorage.getItem(TOKEN_KEY), null, "access token cleared");
  assert.equal(localStorage.getItem(REFRESH_KEY), null, "refresh token cleared");
  assert.equal(localStorage.getItem(USER_KEY), null, "user key cleared");
  assert.equal(fetchCalls.filter((c) => c.url.includes("/auth/v1/user")).length, 0);
});

test("R4 expired token + successful refresh: new token stored and used for verification", async () => {
  const fresh = makeJwt(3600);
  seedSession(makeJwt(-600));
  fetchCalls = [];
  fetchHandler = async (url, opts) => {
    if (url.includes("/auth/v1/token")) {
      return json({ access_token: fresh, refresh_token: "refresh-2", user: { id: "user-1", email: "s@test.local" } });
    }
    if (url.includes("/auth/v1/user")) {
      assert.equal(opts.headers.Authorization, `Bearer ${fresh}`, "verification must use the refreshed token");
      return json({ id: "user-1", email: "s@test.local" });
    }
    throw new Error(`unexpected call: ${url}`);
  };
  const r = await student.currentStudentUser();
  assert.equal(r.state, "ok");
  assert.equal(r.user.id, "user-1");
  assert.equal(localStorage.getItem(TOKEN_KEY), fresh);
  assert.equal(localStorage.getItem(REFRESH_KEY), "refresh-2");
});

test("R5 valid token: no refresh attempted, verified directly", async () => {
  seedSession(makeJwt(3600));
  fetchCalls = [];
  fetchHandler = async (url) => {
    if (url.includes("/auth/v1/token")) throw new Error("refresh must not be called for a valid token");
    if (url.includes("/auth/v1/user")) return json({ id: "user-1", email: "s@test.local" });
    throw new Error(`unexpected call: ${url}`);
  };
  const r = await student.currentStudentUser();
  assert.equal(r.state, "ok");
});

/* ---------------- Fix 2: write response validation ---------------- */

function writeSetup(response) {
  seedSession(makeJwt(3600)); // valid token: ensureFreshStudentToken stays out of the way
  fetchCalls = [];
  fetchHandler = async () => response;
}

test("W1 insert with EMPTY success body is an explicit error, not success", async () => {
  writeSetup(new Response("", { status: 201 }));
  const r = await student.studentInsert("student_messages", { student_id: "user-1", sender_id: "user-1", body: "hi" });
  assert.equal(r.ok, false);
  assert.match(r.error, /could NOT be confirmed/);
});

test("W2 insert with MALFORMED JSON success body is an explicit error", async () => {
  writeSetup(new Response("{not json", { status: 201, headers: { "Content-Type": "application/json" } }));
  const r = await student.studentInsert("student_messages", { student_id: "user-1", sender_id: "user-1", body: "hi" });
  assert.equal(r.ok, false);
  assert.match(r.error, /could NOT be confirmed/);
});

test("W3 insert with non-array JSON success body is an explicit error", async () => {
  writeSetup(json({ id: "m1" }, 201));
  const r = await student.studentInsert("student_messages", { student_id: "user-1", sender_id: "user-1", body: "hi" });
  assert.equal(r.ok, false);
  assert.match(r.error, /could NOT be confirmed/);
});

test("W4 insert with ZERO returned rows is the zero-row error", async () => {
  writeSetup(json([], 201));
  const r = await student.studentInsert("student_messages", { student_id: "user-1", sender_id: "user-1", body: "hi" });
  assert.equal(r.ok, false);
  assert.match(r.error, /0 rows inserted/);
});

test("W5 insert with valid returned rows succeeds and returns them", async () => {
  writeSetup(json([{ id: "m1", body: "hi" }], 201));
  const r = await student.studentInsert("student_messages", { student_id: "user-1", sender_id: "user-1", body: "hi" });
  assert.equal(r.ok, true);
  assert.equal(r.rows.length, 1);
  assert.equal(r.rows[0].id, "m1");
});

test("W6 update with EMPTY success body is an explicit error (shared write path)", async () => {
  writeSetup(new Response("", { status: 200 }));
  const r = await student.studentUpdate("student_deadlines", "id=eq.d1", { is_completed: true });
  assert.equal(r.ok, false);
  assert.match(r.error, /could NOT be confirmed/);
});

test("W7 server error responses still surface the database message", async () => {
  writeSetup(json({ message: "new row violates row-level security policy", code: "42501" }, 403));
  const r = await student.studentInsert("student_messages", { student_id: "user-1", sender_id: "user-1", body: "hi" });
  assert.equal(r.ok, false);
  assert.match(r.error, /row-level security/);
});

/* ------------- Fix 3: centralised auth prep, all operations ------------- */

const OPS = [
  ["SELECT", (m) => m.studentSelect("student_applications", "select=*")],
  ["INSERT", (m) => m.studentInsert("student_messages", { student_id: "user-1", sender_id: "user-1", body: "hi" })],
  ["UPDATE", (m) => m.studentUpdate("student_deadlines", "id=eq.d1", { is_completed: true })],
  ["DELETE", (m) => m.studentDelete("student_shortlists", "id=eq.s1")],
  ["SIGNED_URL", (m) => m.studentDocumentSignedUrl("user-1/passport.pdf")],
];
const dataCalls = () => fetchCalls.filter((c) => c.url.includes("/rest/v1/") || c.url.includes("/storage/v1/")).length;

for (const [name, call] of OPS) {
  test(`A-${name} expired token + refresh network failure: request NOT sent, session preserved, retryable error`, async () => {
    const expired = makeJwt(-600);
    seedSession(expired);
    fetchCalls = [];
    fetchHandler = async (url) => {
      if (url.includes("/auth/v1/token")) throw new TypeError("fetch failed");
      throw new Error(`request must not be sent: ${url}`);
    };
    const r = await call(student);
    assert.equal(r.ok, false, name);
    assert.equal(r.retryable, true, name);
    assert.equal(r.sessionExpired, false, name);
    assert.match(r.error, /could not be renewed/);
    assert.equal(localStorage.getItem(TOKEN_KEY), expired, "session must be preserved");
    assert.equal(localStorage.getItem(REFRESH_KEY), "refresh-1");
    assert.equal(dataCalls(), 0, "no PostgREST/storage request may be sent");
  });

  test(`A-${name} revoked refresh token: request NOT sent, session-expired error, session cleared`, async () => {
    seedSession(makeJwt(-600));
    fetchCalls = [];
    fetchHandler = async (url) => {
      if (url.includes("/auth/v1/token")) return json({ error: "invalid_grant", error_description: "Invalid Refresh Token" }, 400);
      throw new Error(`request must not be sent: ${url}`);
    };
    const r = await call(student);
    assert.equal(r.ok, false, name);
    assert.equal(r.sessionExpired, true, name);
    assert.match(r.error, /session has expired/);
    assert.equal(localStorage.getItem(TOKEN_KEY), null, "session cleared only on definitive rejection");
    assert.equal(dataCalls(), 0, "no PostgREST/storage request may be sent");
  });
}

/* --------- Fix 4: flag propagation through the profile helpers --------- */

const restCalls = () => fetchCalls.filter((c) => c.url.includes("/rest/v1/")).length;
const PROFILE_ROW = { user_id: "user-1", full_name: "T", created_at: "2026-11-01T00:00:00Z", updated_at: "2026-11-01T00:00:00Z" };

test("F1 fetchAccountProfile + refresh network failure: retryable flag propagates, no PostgREST request", async () => {
  const expired = makeJwt(-600);
  seedSession(expired);
  fetchCalls = [];
  fetchHandler = async (url) => {
    if (url.includes("/auth/v1/token")) throw new TypeError("fetch failed");
    throw new Error(`request must not be sent: ${url}`);
  };
  const r = await student.fetchAccountProfile("user-1");
  assert.equal(r.ok, false);
  assert.equal(r.retryable, true);
  assert.equal(r.sessionExpired, false);
  assert.equal(restCalls(), 0);
  assert.equal(localStorage.getItem(TOKEN_KEY), expired, "session preserved");
});

test("F2 fetchAccountProfile + revoked refresh token: sessionExpired flag propagates, no PostgREST request", async () => {
  seedSession(makeJwt(-600));
  fetchCalls = [];
  fetchHandler = async (url) => {
    if (url.includes("/auth/v1/token")) return json({ error: "invalid_grant" }, 400);
    throw new Error(`request must not be sent: ${url}`);
  };
  const r = await student.fetchAccountProfile("user-1");
  assert.equal(r.ok, false);
  assert.equal(r.sessionExpired, true);
  assert.equal(restCalls(), 0);
  assert.equal(localStorage.getItem(TOKEN_KEY), null);
});

test("F3 ensureStudentProfile + refresh network failure on initial SELECT: retryable, not misclassified, no PostgREST request", async () => {
  const expired = makeJwt(-600);
  seedSession(expired);
  fetchCalls = [];
  fetchHandler = async (url) => {
    if (url.includes("/auth/v1/token")) throw new TypeError("fetch failed");
    throw new Error(`request must not be sent: ${url}`);
  };
  const r = await student.ensureStudentProfile("user-1");
  assert.equal(r.ok, false);
  assert.equal(r.retryable, true);
  assert.match(r.error, /could not be renewed/);
  assert.equal(restCalls(), 0, "no SELECT and no INSERT may be attempted");
  assert.equal(localStorage.getItem(TOKEN_KEY), expired);
});

test("F4 ensureStudentProfile + revoked refresh token: sessionExpired propagates, no PostgREST request", async () => {
  seedSession(makeJwt(-600));
  fetchCalls = [];
  fetchHandler = async (url) => {
    if (url.includes("/auth/v1/token")) return json({ error: "invalid_grant" }, 400);
    throw new Error(`request must not be sent: ${url}`);
  };
  const r = await student.ensureStudentProfile("user-1");
  assert.equal(r.ok, false);
  assert.equal(r.sessionExpired, true);
  assert.equal(restCalls(), 0);
});

test("F5 ensureStudentProfile: renewal failure DURING insert is not misread as a duplicate (no race refetch)", async () => {
  seedSession(makeJwt(30)); // near expiry: every operation attempts a refresh
  fetchCalls = [];
  let tokenCalls = 0;
  fetchHandler = async (url) => {
    if (url.includes("/auth/v1/token")) {
      tokenCalls += 1;
      if (tokenCalls === 1) return json({ access_token: makeJwt(30), refresh_token: "refresh-2", user: { id: "user-1", email: "s@test.local" } });
      throw new TypeError("fetch failed"); // the insert's refresh attempt dies on the network
    }
    if (url.includes("/rest/v1/student_profiles")) return json([]); // SELECT: no profile yet
    throw new Error(`unexpected call: ${url}`);
  };
  const r = await student.ensureStudentProfile("user-1");
  assert.equal(r.ok, false);
  assert.equal(r.retryable, true);
  assert.match(r.error, /could not be renewed/);
  assert.equal(restCalls(), 1, "exactly the initial SELECT — the INSERT was gated and no duplicate-refetch happened");
});

test("F6 ensureStudentProfile: genuine duplicate race still recovers by refetch", async () => {
  seedSession(makeJwt(3600));
  fetchCalls = [];
  let gets = 0;
  fetchHandler = async (url, opts) => {
    if (url.includes("/rest/v1/student_profiles")) {
      if (opts.method === "POST") return json({ message: "duplicate key value violates unique constraint", code: "23505" }, 409);
      gets += 1;
      return json(gets <= 1 ? [] : [PROFILE_ROW]);
    }
    throw new Error(`unexpected call: ${url}`);
  };
  const r = await student.ensureStudentProfile("user-1");
  assert.equal(r.ok, true);
  assert.equal(r.profile.user_id, "user-1");
});

/* ------------- Feature round: completion, avatars, export ------------- */

let exporter;
let exportDir;
before(async () => {
  const { fileURLToPath } = await import("node:url");
  const { rmSync } = await import("node:fs");
  const repoRoot = fileURLToPath(new URL("../", import.meta.url));
  exportDir = mkdtempSync(join(repoRoot, "tests", ".tmp-export-"));
  process.on("exit", () => { try { rmSync(exportDir, { recursive: true, force: true }); } catch { /* ignore */ } });
  writeFileSync(join(exportDir, "supabase-stub.mjs"), `
    export const SUPABASE_URL = "http://stub.local";
    export const SUPABASE_ANON_KEY = "anon-stub";
    export function isDbConfigured() { return true; }
  `);
  const studentSrc = readFileSync(new URL("../lib/student.ts", import.meta.url), "utf8");
  const t1 = ts.transpileModule(studentSrc, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  writeFileSync(join(exportDir, "student.mjs"), t1.outputText.replaceAll('"@/lib/supabase"', '"./supabase-stub.mjs"'));
  const exportSrc = readFileSync(new URL("../lib/students-export.ts", import.meta.url), "utf8");
  const t2 = ts.transpileModule(exportSrc, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } });
  writeFileSync(join(exportDir, "students-export.mjs"), t2.outputText.replaceAll('"@/lib/student"', '"./student.mjs"'));
  exporter = await import(`file://${join(exportDir, "students-export.mjs")}`);
});

const FULL_PROFILE = {
  user_id: "u-1", full_name: "Asha Verma", phone: "+91 99999 88888",
  date_of_birth: "2003-05-14", nationality: "Indian", passport_name: "ASHA VERMA",
  passport_number: "P1234567", current_country: "India", current_city: "Jaipur",
  current_address: "12 MG Road, Jaipur", preferred_intake: "Fall 2027",
  target_degree: "Master's", preferred_destination: "Padua",
  education_history: "BSc, University of Rajasthan", graduation_year: 2025,
  cgpa: "8.9", english_proficiency: "IELTS 7.5",
  notes_from_student: "Needs hostel guidance", created_at: "2026-11-01T10:00:00Z", updated_at: "2026-11-02T10:00:00Z",
};

test("C1 completion of a missing profile is 0% with every field missing", () => {
  const c = student.profileCompletion(null);
  assert.equal(c.percent, 0);
  assert.equal(c.filled, 0);
  assert.equal(c.total, 16);
  assert.equal(c.missing.length, 16);
  assert.equal(c.complete, false);
});

test("C2 completion of a full profile is 100% and complete", () => {
  const c = student.profileCompletion(FULL_PROFILE);
  assert.equal(c.percent, 100);
  assert.equal(c.complete, true);
  assert.deepEqual(c.missing, []);
});

test("C3 partial completion counts real fields and lists the missing ones", () => {
  const c = student.profileCompletion({ ...FULL_PROFILE, phone: "", passport_number: null, cgpa: "  " });
  assert.equal(c.filled, 13);
  assert.equal(c.percent, 81);
  assert.ok(c.missing.includes("Phone number"));
  assert.ok(c.missing.includes("Passport number"));
  assert.ok(c.missing.includes("CGPA / percentage"));
});

test("V1-V5 avatar validation: type and 3 MB size rules", () => {
  assert.equal(student.validateAvatarFile({ type: "image/jpeg", size: 1024 }).ok, true);
  assert.equal(student.validateAvatarFile({ type: "image/webp", size: 3 * 1024 * 1024 }).ok, true);
  assert.equal(student.validateAvatarFile({ type: "image/gif", size: 1024 }).ok, false);
  assert.equal(student.validateAvatarFile({ type: "application/pdf", size: 1024 }).ok, false);
  assert.equal(student.validateAvatarFile({ type: "image/png", size: 3 * 1024 * 1024 + 1 }).ok, false);
  assert.equal(student.validateAvatarFile({ type: "image/png", size: 0 }).ok, false);
  assert.equal(student.avatarPath("u-9"), "u-9/profile-photo");
});

const SOURCE_A = { account: { id: "u-1", email: "asha@example.com", accountStatus: "active", createdAt: "2026-11-01T10:00:00Z" }, profile: FULL_PROFILE };
const SOURCE_B = { account: { id: "u-2", email: "pending@example.com", accountStatus: "pending", createdAt: "2026-11-03T10:00:00Z" }, profile: null };

test("X1 export rows: real dates, no passport number anywhere, completion matches", () => {
  const rows = exporter.buildStudentExportRows([SOURCE_A, SOURCE_B]);
  assert.equal(exporter.EXPORT_HEADERS.length, 18);
  assert.equal(rows.length, 2);
  assert.ok(rows[0][14] instanceof Date, "registration date must be a Date");
  assert.equal(rows[0][16], 100);
  assert.equal(rows[0][17], "Complete");
  assert.equal(rows[1][16], 0);
  assert.equal(rows[1][17], "Incomplete");
  assert.ok(!JSON.stringify(rows).includes("P1234567"), "passport number must never appear in export rows");
});

test("X2 export filters: status, search and completion are respected", () => {
  const all = [SOURCE_A, SOURCE_B];
  assert.equal(exporter.filterStudentSources(all, { status: "all", query: "", completion: "all" }).length, 2);
  assert.equal(exporter.filterStudentSources(all, { status: "pending", query: "", completion: "all" }).length, 1);
  assert.equal(exporter.filterStudentSources(all, { status: "all", query: "asha", completion: "all" }).length, 1);
  assert.equal(exporter.filterStudentSources(all, { status: "all", query: "u-2", completion: "all" }).length, 1);
  assert.equal(exporter.filterStudentSources(all, { status: "all", query: "", completion: "complete" }).length, 1);
  assert.equal(exporter.filterStudentSources(all, { status: "all", query: "", completion: "incomplete" }).length, 1);
});

test("X3 workbook: valid xlsx, sheet name, headers, filters, frozen header row", async () => {
  const XLSX = require("xlsx");
  const zlib = await import("node:zlib");
  const buffer = await exporter.buildStudentsWorkbookBuffer([SOURCE_A, SOURCE_B]);
  const bytes = Buffer.from(buffer);
  assert.equal(bytes.subarray(0, 2).toString("latin1"), "PK");
  const wb = XLSX.read(bytes, { type: "buffer", cellDates: true });
  assert.deepEqual(wb.SheetNames, ["N92 Students"]);
  const ws = wb.Sheets["N92 Students"];
  const aoa = XLSX.utils.sheet_to_json(ws, { header: 1 });
  assert.deepEqual(aoa[0], [...exporter.EXPORT_HEADERS]);
  assert.equal(aoa.length, 3);
  assert.equal(aoa[1][1], "Asha Verma");
  assert.ok(ws["!autofilter"]?.ref?.startsWith("A1:"), "autofilter must be set");
  assert.ok(!JSON.stringify(aoa).includes("P1234567"), "passport must not be in the workbook");
  // Extract sheet1.xml (independent minimal zip walk) and check the freeze pane.
  let off = 0;
  let sheetXml = "";
  while (off + 30 <= bytes.length && bytes.readUInt32LE(off) === 0x04034b50) {
    const method = bytes.readUInt16LE(off + 8);
    const csize = bytes.readUInt32LE(off + 18);
    const nlen = bytes.readUInt16LE(off + 26);
    const elen = bytes.readUInt16LE(off + 28);
    const name = bytes.subarray(off + 30, off + 30 + nlen).toString("utf8");
    const data = bytes.subarray(off + 30 + nlen + elen, off + 30 + nlen + elen + csize);
    if (name === "xl/worksheets/sheet1.xml") {
      sheetXml = (method === 8 ? zlib.inflateRawSync(data) : data).toString("utf8");
      break;
    }
    off += 30 + nlen + elen + csize;
  }
  assert.ok(sheetXml.includes('<pane ySplit="1"'), `header row must be frozen; sheet xml starts: ${sheetXml.slice(0, 300)}`);
  assert.ok(sheetXml.includes('state="frozen"'));
});
