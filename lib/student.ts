/**
 * Student API layer — Supabase Auth + PostgREST with the STUDENT's own
 * session. Mirrors the conventions of lib/admin.ts (single-flight token
 * refresh, representation-checked writes, errors never swallowed) but is
 * fully independent of it:
 *
 *  - Session storage keys are n92_student_* — the admin keys
 *    (n92_admin_token / n92_admin_refresh / n92_admin_user) are NEVER
 *    read or written here, and this module's session is never used by
 *    the admin layer. A browser can hold an admin session and a
 *    student session at the same time without either disturbing
 *    the other.
 *  - There is exactly one Supabase connection configuration (lib/supabase)
 *    and no second client; this module is a transport layer over REST,
 *    exactly like lib/admin.ts. Security is enforced by database RLS —
 *    frontend checks only shape the UX, they are never the boundary.
 *  - The service-role key is never used anywhere in this project.
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY, isDbConfigured } from "@/lib/supabase";

export { isDbConfigured };

const TOKEN_KEY = "n92_student_token";
const REFRESH_KEY = "n92_student_refresh";
const USER_KEY = "n92_student_user";

export function getStudentToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function getStudentRefreshToken(): string | null {
  try { return localStorage.getItem(REFRESH_KEY); } catch { return null; }
}
export function getStudentEmail(): string | null {
  try { return localStorage.getItem(USER_KEY); } catch { return null; }
}

/** Persist a full Supabase session (access + refresh token + user email). */
export function storeStudentSession(data: { access_token?: string; refresh_token?: string; user?: { email?: string } }, fallbackEmail?: string) {
  try {
    if (data.access_token) localStorage.setItem(TOKEN_KEY, data.access_token);
    if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token);
    const email = data.user?.email || fallbackEmail;
    if (email) localStorage.setItem(USER_KEY, email);
  } catch {}
}

export function clearStudentSession() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
}

/**
 * Sign out: revoke the session at Supabase (best-effort — a network
 * failure must never trap the user in a signed-in UI), then always
 * clear the local student session. Admin keys are untouched.
 */
export async function studentLogout(): Promise<void> {
  const token = getStudentToken();
  if (token && isDbConfigured()) {
    try {
      await fetch(`${SUPABASE_URL}/auth/v1/logout`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
      });
    } catch { /* local clear below is the guarantee */ }
  }
  clearStudentSession();
}

/* ------------------------------------------------------------------ */
/* Session lifecycle (same discipline as lib/admin.ts RC-2): the      */
/* access token expires (default 1 h); the refresh token renews it.   */
/* A dead refresh token ends the session cleanly; a transient network */
/* error keeps it and retries on the next call.                       */
/* ------------------------------------------------------------------ */

/** Expiry (epoch ms) from the JWT's own exp claim; null if unreadable. */
function tokenExpiryMs(token: string): number | null {
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.exp === "number" ? json.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** The authenticated user's id (the JWT `sub` claim); null if unreadable. */
export function studentUserId(): string | null {
  const token = getStudentToken();
  if (!token) return null;
  try {
    const part = token.split(".")[1];
    if (!part) return null;
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    return typeof json.sub === "string" ? json.sub : null;
  } catch {
    return null;
  }
}

let refreshing: Promise<RefreshOutcome> | null = null;

/**
 * Refresh outcomes are kept distinct — collapsing them was the defect
 * this fixes:
 *  - "ok"      the server issued a fresh session;
 *  - "dead"    the server DEFINITIVELY rejected the refresh token
 *              (HTTP 400/401 — invalid, revoked or expired). The local
 *              session is cleared: it can never succeed again.
 *  - "network" the attempt never got a definitive answer (connection
 *              failure, or a 5xx / malformed response). The session
 *              is PRESERVED untouched so a later retry can succeed.
 */
export type RefreshOutcome = "ok" | "dead" | "network";

/** Exchange the stored refresh token for a fresh session (single-flight). */
function refreshStudentSession(): Promise<RefreshOutcome> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const refreshToken = getStudentRefreshToken();
    if (!refreshToken || !isDbConfigured()) return "network";
    let res: Response;
    try {
      res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      return "network"; // no answer at all — retryable, session kept
    }
    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      if (data.access_token) {
        storeStudentSession(data);
        return "ok";
      }
      return "network"; // success status but an unusable body — retryable
    }
    if (res.status === 400 || res.status === 401) {
      // Definitive rejection: the refresh token is invalid/revoked.
      clearStudentSession();
      return "dead";
    }
    return "network"; // 5xx and anything else: not a verdict on the token
  })();
  refreshing.finally(() => { refreshing = null; });
  return refreshing;
}

/**
 * What ensureFreshStudentToken did, so callers can react correctly:
 *  - "fresh"     the access token is still comfortably valid;
 *  - "refreshed" it was renewed just now;
 *  - "proceed"   no renewal was possible (unreadable token, or none
 *                stored): the caller's server check must decide;
 *  - "dead"      renewal proved the session over — it was cleared;
 *  - "network"   renewal could not be answered — session preserved,
 *                and an expired access token must NOT be used as if
 *                it were authenticated. Callers return a retryable
 *                error instead of making doomed requests with it.
 */
export type EnsureOutcome = "fresh" | "refreshed" | "proceed" | "dead" | "network";

/** Renew the session BEFORE a request goes out when expiry is near. */
export async function ensureFreshStudentToken(): Promise<EnsureOutcome> {
  const token = getStudentToken();
  if (!token) return "proceed";
  const exp = tokenExpiryMs(token);
  if (exp === null) return "proceed"; // not a JWT we can read — the server decides
  if (exp - Date.now() > 60_000) return "fresh";
  if (!getStudentRefreshToken()) return "proceed"; // nothing to renew with; server check decides
  const outcome = await refreshStudentSession();
  if (outcome === "ok") return "refreshed";
  if (outcome === "dead") return "dead";
  return "network";
}

/**
 * Centralised authentication preparation for EVERY student REST and
 * storage operation (select/insert/update/delete/signed URL). This is
 * the single place that consumes the ensure outcome:
 *  - "network"  → the request is NOT sent. Sending it would mean
 *                 using an expired access token — the exact defect
 *                 this fixes. The caller gets a retryable error and
 *                 the session is left untouched.
 *  - "dead"     → the request is NOT sent; the session is already
 *                 cleared. The caller gets a session-expired error.
 *  - "fresh" / "refreshed" / "proceed" → the normal request flow.
 */
export type AuthPrep =
  | { ok: true }
  | { ok: false; error: string; retryable: boolean; sessionExpired: boolean };

export async function prepareStudentAuth(): Promise<AuthPrep> {
  const outcome = await ensureFreshStudentToken();
  if (outcome === "network") {
    return {
      ok: false,
      retryable: true,
      sessionExpired: false,
      error: "Your session could not be renewed because the sign-in service could not be reached. Check your connection and try again — you have not been signed out.",
    };
  }
  if (outcome === "dead") {
    return {
      ok: false,
      retryable: false,
      sessionExpired: true,
      error: "Your session has expired. Please sign in again.",
    };
  }
  return { ok: true };
}

export type StudentAuthState =
  | { state: "ok"; user: { id: string; email: string } }
  | { state: "none" }                       // no stored session at all
  | { state: "invalid" }                    // server rejected the session — cleared
  | { state: "error"; error: string; retryable: boolean }; // transient — session kept

/** Verify the stored session against Supabase; never guesses. */
export async function currentStudentUser(): Promise<StudentAuthState> {
  if (!isDbConfigured()) return { state: "error", error: "Database is not configured yet.", retryable: false };
  if (!getStudentToken()) return { state: "none" };
  const ensured = await ensureFreshStudentToken();
  if (ensured === "network") {
    // The access token is expired (or near it) and renewal could not
    // be answered. Do NOT fire a request with the expired token and
    // mistake its inevitable 401 for a dead session — report a
    // retryable error and keep the session exactly as it was.
    return {
      state: "error",
      retryable: true,
      error: "We could not reach the sign-in service to renew your session. Check your connection and try again — you have not been signed out.",
    };
  }
  const token = getStudentToken();
  if (!token) return { state: "none" }; // renewal proved the session dead and cleared it
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (res.status === 401 || res.status === 403) {
      clearStudentSession();
      return { state: "invalid" };
    }
    if (!res.ok) return { state: "error", error: `Session check failed (HTTP ${res.status}).`, retryable: true };
    const u = await res.json();
    if (!u?.id) return { state: "error", error: "Session check returned an unexpected response.", retryable: true };
    return { state: "ok", user: { id: u.id, email: u.email || "" } };
  } catch {
    return { state: "error", error: "Network error while checking your session.", retryable: true };
  }
}

/** Google sign-in entry point (Supabase Auth authorize endpoint). */
export function googleAuthorizeUrl(): string {
  const redirect = `${window.location.origin}/student/auth/callback/`;
  return `${SUPABASE_URL}/auth/v1/authorize?provider=google&redirect_to=${encodeURIComponent(redirect)}`;
}

/* ------------------------------------------------------------------ */
/* Checked REST transport. Every response is inspected; failures are  */
/* returned to the caller with the database's own message — nothing   */
/* is silently ignored.                                               */
/* ------------------------------------------------------------------ */

export type DbResult<T> =
  | { ok: true; rows: T[] }
  | { ok: false; error: string; retryable?: boolean; sessionExpired?: boolean };

function studentHeaders(prefer?: string): Record<string, string> {
  const token = getStudentToken();
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

async function errorOf(res: Response): Promise<string> {
  let detail = `HTTP ${res.status}`;
  try {
    const body = await res.json();
    if (body?.message) detail = `${body.message}${body.code ? ` (code ${body.code})` : ""}`;
    else if (body?.error_description) detail = body.error_description;
  } catch { /* keep the HTTP status */ }
  return detail;
}

const ZERO_ROW_ERROR: Record<"insert" | "update" | "delete", string> = {
  insert: "The database accepted the request but created no record (0 rows inserted). Nothing was saved.",
  update: "No record was changed (0 rows updated). It may have been removed already, or this account is not permitted to edit it. Nothing was saved.",
  delete: "No record was deleted (0 rows deleted). It may already be gone, or this account is not permitted to delete it.",
};

export async function studentSelect<T>(table: string, query = "select=*"): Promise<DbResult<T>> {
  if (!isDbConfigured()) return { ok: false, error: "Database not configured." };
  const prep = await prepareStudentAuth();
  if (!prep.ok) return { ok: false, error: prep.error, retryable: prep.retryable, sessionExpired: prep.sessionExpired };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: studentHeaders() });
    if (!res.ok) return { ok: false, error: await errorOf(res) };
    return { ok: true, rows: (await res.json()) as T[] };
  } catch {
    return { ok: false, error: "Network error — the database could not be reached." };
  }
}

const UNCONFIRMED_WRITE_ERROR =
  "The database returned an unreadable response, so this change could NOT be confirmed as saved. Check the current state before trying again.";

async function writeResult<T>(res: Response | null, op: "insert" | "update" | "delete"): Promise<DbResult<T>> {
  if (!res) return { ok: false, error: "Network error — the database could not be reached." };
  if (!res.ok) return { ok: false, error: await errorOf(res) };
  // Every write in this layer requests Prefer: return=representation,
  // so a confirmed success MUST come back as a JSON array of the
  // affected rows. An empty body, malformed JSON, or a non-array
  // payload means the outcome is unknown — reporting it as success
  // was the defect this fixes; it is an explicit error instead.
  let rows: unknown;
  try {
    rows = await res.json();
  } catch {
    return { ok: false, error: UNCONFIRMED_WRITE_ERROR };
  }
  if (!Array.isArray(rows)) return { ok: false, error: UNCONFIRMED_WRITE_ERROR };
  if (rows.length === 0) return { ok: false, error: ZERO_ROW_ERROR[op] };
  return { ok: true, rows: rows as T[] };
}

export async function studentInsert<T>(table: string, row: Record<string, unknown>, prefer = "return=representation"): Promise<DbResult<T>> {
  if (!isDbConfigured()) return { ok: false, error: "Database not configured." };
  const prep = await prepareStudentAuth();
  if (!prep.ok) return { ok: false, error: prep.error, retryable: prep.retryable, sessionExpired: prep.sessionExpired };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST", headers: studentHeaders(prefer), body: JSON.stringify([row]),
    });
    return writeResult<T>(res, "insert");
  } catch {
    return { ok: false, error: "Network error — the database could not be reached." };
  }
}

export async function studentUpdate<T>(table: string, match: string, patch: Record<string, unknown>): Promise<DbResult<T>> {
  if (!isDbConfigured()) return { ok: false, error: "Database not configured." };
  const prep = await prepareStudentAuth();
  if (!prep.ok) return { ok: false, error: prep.error, retryable: prep.retryable, sessionExpired: prep.sessionExpired };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${match}`, {
      method: "PATCH", headers: studentHeaders("return=representation"), body: JSON.stringify(patch),
    });
    return writeResult<T>(res, "update");
  } catch {
    return { ok: false, error: "Network error — the database could not be reached." };
  }
}

export async function studentDelete<T>(table: string, match: string): Promise<DbResult<T>> {
  if (!isDbConfigured()) return { ok: false, error: "Database not configured." };
  const prep = await prepareStudentAuth();
  if (!prep.ok) return { ok: false, error: prep.error, retryable: prep.retryable, sessionExpired: prep.sessionExpired };
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${match}`, {
      method: "DELETE", headers: studentHeaders("return=representation"),
    });
    return writeResult<T>(res, "delete");
  } catch {
    return { ok: false, error: "Network error — the database could not be reached." };
  }
}

/** Short-lived signed download URL for a private student document. */
export async function studentDocumentSignedUrl(storagePath: string): Promise<{ ok: boolean; url?: string; error?: string; retryable?: boolean; sessionExpired?: boolean }> {
  if (!isDbConfigured()) return { ok: false, error: "Database not configured." };
  const prep = await prepareStudentAuth();
  if (!prep.ok) return { ok: false, error: prep.error, retryable: prep.retryable, sessionExpired: prep.sessionExpired };
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/sign/student-documents`, {
      method: "POST",
      headers: studentHeaders(),
      body: JSON.stringify({ expiresIn: 120, paths: [storagePath] }),
    });
    if (!res.ok) return { ok: false, error: await errorOf(res) };
    const rows = await res.json();
    const signed = Array.isArray(rows) ? rows[0]?.signedURL : rows?.signedURL;
    if (!signed) return { ok: false, error: "The storage service returned no download link." };
    return { ok: true, url: `${SUPABASE_URL}/storage/v1${signed}` };
  } catch {
    return { ok: false, error: "Network error while preparing the download." };
  }
}

/* ------------------------------------------------------------------ */
/* Domain types — exact audited column names (audit Queries 1–2 +     */
/* Migration 013.1). Do not rename: these map 1:1 to the database.    */
/* ------------------------------------------------------------------ */

export interface AccountProfile {
  id: string;
  email: string | null;
  role: "owner" | "student";
  account_status: "pending" | "active" | "suspended";
  created_at: string;
}

export interface StudentProfile {
  user_id: string;
  full_name: string | null;
  phone: string | null;
  date_of_birth: string | null;
  nationality: string | null;
  passport_name: string | null;
  current_country: string | null;
  current_city: string | null;
  current_address: string | null;
  preferred_intake: string | null;
  target_degree: string | null;
  preferred_destination: string | null;
  education_history: string | null;
  graduation_year: number | null;
  cgpa: string | null;
  english_proficiency: string | null;
  passport_number: string | null;
  notes_from_student: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentApplication {
  id: string;
  student_id: string;
  university_id: string | null;
  university_name: string;
  course_id: string | null;
  programme_name: string;
  intake: string | null;
  application_status: string;
  application_reference: string | null;
  submitted_at: string | null;
  decision_at: string | null;
  student_notes: string | null;
  owner_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicationEvent {
  id: string;
  application_id: string;
  student_id: string;
  event_type: string;
  title: string;
  description: string | null;
  event_at: string;
  created_by: string | null;
  created_at: string;
}

export interface StudentDocument {
  id: string;
  student_id: string;
  application_id: string | null;
  requirement_id: string | null;
  document_type: string;
  original_filename: string;
  storage_path: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  review_status: "pending" | "approved" | "rejected" | "revision_requested";
  owner_review_note: string | null;
  uploaded_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface DocumentRequirement {
  id: string;
  title: string;
  description: string | null;
  category: string;
  applies_to: string;
  is_required: boolean;
  sort_order: number;
  is_active: boolean;
}

export interface StudentMessage {
  id: string;
  student_id: string;
  sender_id: string;
  subject: string | null;
  body: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface StudentDeadline {
  id: string;
  student_id: string;
  application_id: string | null;
  title: string;
  description: string | null;
  deadline_at: string;
  deadline_type: string;
  is_completed: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface StudentNotification {
  id: string;
  student_id: string;
  title: string;
  body: string | null;
  notification_type: string;
  target_url: string | null;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
}

export interface ShortlistItem {
  id: string;
  student_id: string;
  university_id: string | null;
  course_id: string | null;
  university_name: string | null;
  programme_name: string | null;
  intake: string | null;
  student_note: string | null;
  created_at: string;
}

export interface StudentPayment {
  id: string;
  student_id: string;
  application_id: string | null;
  description: string;
  amount: number;
  currency: string;
  payment_status: string;
  due_date: string | null;
  paid_at: string | null;
  payment_reference: string | null;
  owner_note: string | null;
  created_at: string;
  updated_at: string;
}

/* ------------------------------------------------------------------ */
/* Account + profile resolution                                       */
/* ------------------------------------------------------------------ */

/**
 * The signed-in user's OWN account profile, fetched by their exact
 * authenticated user id — never an unfiltered or first-row lookup.
 */
export async function fetchAccountProfile(userId: string): Promise<
  | { ok: true; profile: AccountProfile }
  | { ok: false; error: string; retryable?: boolean; sessionExpired?: boolean }
> {
  const r = await studentSelect<AccountProfile>(
    "profiles",
    `select=id,email,role,account_status,created_at&id=eq.${encodeURIComponent(userId)}`
  );
  if (!r.ok) {
    // Preserve the auth-preparation flags: a retryable renewal failure
    // must stay retryable at this layer, and a session-expired result
    // must stay distinguishable from an ordinary lookup failure.
    return { ok: false, error: r.error, retryable: r.retryable, sessionExpired: r.sessionExpired };
  }
  if (r.rows.length === 0) {
    return { ok: false, error: "No account profile was found for this sign-in. Please contact N92 support." };
  }
  return { ok: true, profile: r.rows[0] };
}

const profileInFlight = new Map<string, Promise<
  | { ok: true; profile: StudentProfile }
  | { ok: false; error: string; retryable?: boolean; sessionExpired?: boolean }
>>();

/**
 * Fetch the student's detail profile, creating it on first login when
 * the account is active. Race-safe:
 *  - concurrent calls share one in-flight request;
 *  - if the create collides with a row created by a parallel tab or a
 *    double-invoked effect (PostgreSQL 23505 / HTTP 409), the row is
 *    simply re-fetched and treated as success;
 *  - auth-preparation failures (retryable renewal failure, or a
 *    definitively expired session) are returned WITH their flags and
 *    are never misread as a duplicate-key race or a generic error;
 *  - every other failure is returned to the caller — never swallowed.
 */
export function ensureStudentProfile(userId: string): Promise<
  | { ok: true; profile: StudentProfile }
  | { ok: false; error: string; retryable?: boolean; sessionExpired?: boolean }
> {
  const existing = profileInFlight.get(userId);
  if (existing) return existing;
  const p = (async () => {
    const sel = await studentSelect<StudentProfile>("student_profiles", `select=*&user_id=eq.${encodeURIComponent(userId)}`);
    if (!sel.ok) {
      return { ok: false as const, error: sel.error, retryable: sel.retryable, sessionExpired: sel.sessionExpired };
    }
    if (sel.rows.length > 0) return { ok: true as const, profile: sel.rows[0] };
    const ins = await studentInsert<StudentProfile>("student_profiles", { user_id: userId });
    if (ins.ok) {
      if (ins.rows.length > 0) return { ok: true as const, profile: ins.rows[0] };
      return { ok: false as const, error: "Profile creation returned no record." };
    }
    // Auth-preparation failures are NOT duplicates and NOT generic
    // profile errors: propagate them with their flags untouched.
    if (ins.retryable || ins.sessionExpired) {
      return { ok: false as const, error: ins.error, retryable: ins.retryable, sessionExpired: ins.sessionExpired };
    }
    if (/23505|409|duplicate/i.test(ins.error)) {
      const again = await studentSelect<StudentProfile>("student_profiles", `select=*&user_id=eq.${encodeURIComponent(userId)}`);
      if (again.ok && again.rows.length > 0) return { ok: true as const, profile: again.rows[0] };
      if (!again.ok) {
        return { ok: false as const, error: again.error, retryable: again.retryable, sessionExpired: again.sessionExpired };
      }
      return { ok: false as const, error: "Profile creation conflicted with an existing record, but the record could not be loaded." };
    }
    return { ok: false as const, error: ins.error };
  })();
  profileInFlight.set(userId, p);
  p.finally(() => profileInFlight.delete(userId));
  return p;
}
