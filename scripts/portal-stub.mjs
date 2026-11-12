/**
 * Portal test stub — a Supabase-shaped fake (Auth + PostgREST + Storage
 * sign) that also serves the static export from ../out on one origin.
 * TEST SCAFFOLDING ONLY — never deployed.
 *
 * Control endpoints:
 *   POST /__scenario  {name}         pending|active|suspended|invalid|race|profile-error
 *   GET  /__log                      recorded /auth + /rest requests
 *   POST /__reset                    clear log + per-scenario state
 *   GET  /__token?sub&email&exp      mint a stub JWT (exp = seconds offset)
 */
import http from "node:http";
import { readFileSync, existsSync, statSync } from "node:fs";
import { join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(fileURLToPath(new URL(".", import.meta.url)), "..");
const OUT = join(ROOT, "out");
const PORT = Number(process.env.PORT || 8923);

export const STUDENT_ID = "57aa0000-0000-4000-8000-000000000001";
export const PENDING_ID = "57aa0000-0000-4000-8000-000000000002";
export const OWNER_ID = "57aa0000-0000-4000-8000-0000000000ff";
export const NONOWNER_ID = "57aa0000-0000-4000-8000-0000000000ee";

let scenario = "active";
let log = [];
let armed = null; // {mode:'fail'|'revoke', succeed:n} — refresh sabotage for gate tests
let raceStep = 0;

const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
export function mintJwt(sub, email, expOffsetSec = 3600) {
  const now = Math.floor(Date.now() / 1000);
  return `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ sub, email, role: "authenticated", exp: now + expOffsetSec, iat: now })}.stub-sig`;
}
function jwtPayload(token) {
  try { return JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString()); } catch { return {}; }
}

const accountRow = (id, email, role, status) => ({ id, email, role, account_status: status, created_at: "2026-11-01T10:00:00Z" });
let profileRow = { user_id: STUDENT_ID, full_name: "Stub Student", phone: "+91 99999 88888", date_of_birth: "2003-05-14", nationality: "Indian", passport_name: "STUB STUDENT", current_country: "India", current_city: "Jaipur", current_address: null, preferred_intake: "Fall 2027", target_degree: "Master's", preferred_destination: "Padua", education_history: "BSc Computer Science, Stub University", graduation_year: 2024, cgpa: "8.5", english_proficiency: "IELTS 7.0", passport_number: "P1234567", notes_from_student: null, created_at: "2026-11-01T10:00:00Z", updated_at: "2026-11-01T10:00:00Z" };
const appRow = { id: "57bb0000-0000-4000-8000-000000000001", student_id: STUDENT_ID, university_id: "uni-padova", university_name: "University of Padua", course_id: null, programme_name: "MSc Planning", intake: "Fall 2027", application_status: "submitted", application_reference: "REF-1", submitted_at: "2026-10-01T00:00:00Z", decision_at: null, student_notes: null, owner_notes: null, created_by: OWNER_ID, created_at: "2026-09-01T10:00:00Z", updated_at: "2026-10-02T10:00:00Z" };

function send(res, code, body, type = "application/json") {
  const data = typeof body === "string" || Buffer.isBuffer(body) ? body : JSON.stringify(body);
  res.writeHead(code, { "Content-Type": type, "Cache-Control": "no-store" });
  res.end(data);
}

const MIME = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".png": "image/png", ".jpg": "image/jpeg", ".svg": "image/svg+xml", ".ico": "image/x-icon", ".txt": "text/plain", ".woff2": "font/woff2" };

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://127.0.0.1:${PORT}`);
  const path = url.pathname;
  let body = "";
  req.on("data", (c) => (body += c));
  await new Promise((r) => req.on("end", r));
  const jsonBody = () => { try { return JSON.parse(body || "{}"); } catch { return {}; } };

  if (path === "/__scenario" && req.method === "POST") { scenario = jsonBody().name || "active"; raceStep = 0; armed = null; return send(res, 200, { ok: true, scenario }); }
  if (path === "/__arm" && req.method === "POST") { const b = jsonBody(); armed = b.mode === "off" ? null : { mode: b.mode || "fail", succeed: b.succeed ?? 1 }; return send(res, 200, { ok: true, armed }); }
  if (path === "/__set-profile" && req.method === "POST") { Object.assign(profileRow, jsonBody()); return send(res, 200, { ok: true }); }
  if (path === "/__reset" && req.method === "POST") { log = []; raceStep = 0; armed = null; return send(res, 200, { ok: true }); }
  if (path === "/__log") return send(res, 200, log);
  if (path === "/__token") {
    return send(res, 200, { token: mintJwt(url.searchParams.get("sub") || STUDENT_ID, url.searchParams.get("email") || "student@test.local", Number(url.searchParams.get("exp") || 3600)) }, "application/json");
  }

  const isApi = path.startsWith("/auth/v1/") || path.startsWith("/rest/v1/") || path.startsWith("/storage/v1/");
  if (isApi) log.push({ method: req.method, path, query: url.search, body: body || undefined });

  // ---- Auth ----
  if (path === "/auth/v1/user" && req.method === "GET") {
    if (scenario === "invalid") return send(res, 401, { msg: "invalid JWT" });
    const payload = jwtPayload((req.headers.authorization || "").replace(/^Bearer\s+/i, ""));
    if (!payload.sub) return send(res, 401, { msg: "no sub" });
    return send(res, 200, { id: payload.sub, email: payload.email || "student@test.local" });
  }
  if (path === "/auth/v1/token" && req.method === "POST") {
    if (armed) {
      if (armed.succeed > 0) { armed.succeed -= 1; }
      else if (armed.mode === "revoke") return send(res, 400, { error: "invalid_grant", error_description: "Invalid Refresh Token" });
      else return send(res, 500, { error: "temporarily unavailable" });
    }
    const payload = jwtPayload((req.headers.authorization || "").replace(/^Bearer\s+/i, "")) ;
    return send(res, 200, {
      access_token: mintJwt(STUDENT_ID, "student@test.local", scenario === "refresh-retryable" ? 30 : 3600),
      refresh_token: "stub-refresh-2",
      user: { id: STUDENT_ID, email: "student@test.local" },
      ...(payload ? {} : {}),
    });
  }
  if (path === "/auth/v1/logout" && req.method === "POST") return send(res, 200, {});

  // ---- Storage sign ----
  if (path === "/storage/v1/object/sign/student-documents" && req.method === "POST") {
    return send(res, 200, [{ signedURL: "/object/sign/student-documents/stub?token=stub", path: "stub" }]);
  }

  // ---- Avatars (Migration 014 surface): sign OK, folder lists empty (no photo) ----
  if (path === "/storage/v1/object/sign/student-avatars" && req.method === "POST") {
    return send(res, 200, [{ signedURL: "/object/sign/student-avatars/stub?token=stub", path: "stub" }]);
  }
  if (path === "/storage/v1/object/list/student-avatars" && req.method === "POST") {
    return send(res, 200, []);
  }
  if (path.startsWith("/storage/v1/object/student-avatars/") && req.method === "POST") {
    return send(res, 200, { Id: "stub-avatar" });
  }
  if (path === "/storage/v1/object/student-avatars" && req.method === "DELETE") {
    return send(res, 200, []);
  }

  // ---- PostgREST ----
  if (path.startsWith("/rest/v1/")) {
    const table = decodeURIComponent(path.slice("/rest/v1/".length));
    const q = url.searchParams;
    if (table === "profiles") {
      if (req.method === "GET") {
        const idEq = q.get("id");
        if (idEq === `eq.${OWNER_ID}`) return send(res, 200, [accountRow(OWNER_ID, "sh10ad786@gmail.com", "owner", "active")]);
        if (idEq === `eq.${NONOWNER_ID}`) return send(res, 200, [accountRow(NONOWNER_ID, "helper@test.local", "student", "active")]);
        if (idEq === `eq.${STUDENT_ID}`) {
          const status = scenario === "pending" ? "pending" : scenario === "suspended" ? "suspended" : "active";
          return send(res, 200, [accountRow(STUDENT_ID, "student@test.local", "student", status)]);
        }
        if (q.get("role") === "eq.student") {
          return send(res, 200, [
            accountRow(STUDENT_ID, "student@test.local", "student", "active"),
            accountRow(PENDING_ID, "pending@test.local", "student", "pending"),
          ]);
        }
        return send(res, 200, []);
      }
      if (req.method === "PATCH") {
        const patch = jsonBody();
        return send(res, 200, [{ ...accountRow(PENDING_ID, "pending@test.local", "student", "pending"), ...patch }]);
      }
    }
    if (table === "student_profiles") {
      if (req.method === "GET") {
        if (q.get("passport_number") === "not.is.null") return send(res, 200, [{ user_id: STUDENT_ID }]);
        if (scenario === "race") { raceStep += 1; return send(res, 200, raceStep <= 1 ? [] : [profileRow]); }
        if (scenario === "profile-error") return send(res, 200, []);
        return send(res, 200, [profileRow]);
      }
      if (req.method === "POST") {
        if (scenario === "race") return send(res, 409, { code: "23505", message: "duplicate key value violates unique constraint \"student_profiles_pkey\"" });
        if (scenario === "profile-error") return send(res, 500, { code: "XX000", message: "stub profile insert exploded" });
        return send(res, 201, [profileRow]);
      }
      if (req.method === "PATCH") return send(res, 200, [{ ...profileRow, ...jsonBody() }]);
    }
    if (table === "student_applications" && req.method === "GET") return send(res, 200, [appRow]);
    if (table === "universities" && req.method === "GET") return send(res, 200, [{ id: "uni-padova", name: "University of Padua", city: "Padua", region: "Veneto", slug: "university-of-padua", subjects: ["Urban Planning"], rows: [] }]);
    if (req.method === "GET") return send(res, 200, []);
    if (req.method === "POST") return send(res, 201, [{ id: "57cc0000-0000-4000-8000-000000000001" }]);
    if (req.method === "PATCH") return send(res, 200, [{ id: "57cc0000-0000-4000-8000-000000000001" }]);
    if (req.method === "DELETE") return send(res, 200, [{ id: "57cc0000-0000-4000-8000-000000000001" }]);
    return send(res, 200, []);
  }

  // ---- Static export ----
  let filePath = join(OUT, path);
  if (path.endsWith("/")) filePath = join(filePath, "index.html");
  else if (existsSync(filePath) && statSync(filePath).isDirectory()) filePath = join(filePath, "index.html");
  else if (!existsSync(filePath) && existsSync(`${filePath}.html`)) filePath = `${filePath}.html`;
  if (existsSync(filePath) && statSync(filePath).isFile()) {
    return send(res, 200, readFileSync(filePath), MIME[extname(filePath)] || "application/octet-stream");
  }
  const notFound = join(OUT, "404.html");
  if (existsSync(notFound)) return send(res, 404, readFileSync(notFound), "text/html");
  return send(res, 404, "not found", "text/plain");
});

server.listen(PORT, "127.0.0.1", () => console.log(`portal stub on http://127.0.0.1:${PORT} (scenario=${scenario})`));
