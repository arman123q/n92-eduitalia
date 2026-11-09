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
