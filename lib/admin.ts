/**
 * Admin API layer — Supabase Auth + PostgREST with the admin's own token.
 * Security is enforced by RLS in the database; this layer only transports.
 * The service-role key is never used anywhere in this project.
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY, isDbConfigured } from "@/lib/supabase";

export { isDbConfigured };

const TOKEN_KEY = "n92_admin_token";
const REFRESH_KEY = "n92_admin_refresh";
const USER_KEY = "n92_admin_user";

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
function getRefreshToken(): string | null {
  try { return localStorage.getItem(REFRESH_KEY); } catch { return null; }
}
export function getUserEmail(): string | null {
  try { return localStorage.getItem(USER_KEY); } catch { return null; }
}

/** Persist a full Supabase session (access + refresh token + user email). */
function storeSession(data: { access_token?: string; refresh_token?: string; user?: { email?: string } }, fallbackEmail?: string) {
  try {
    if (data.access_token) localStorage.setItem(TOKEN_KEY, data.access_token);
    if (data.refresh_token) localStorage.setItem(REFRESH_KEY, data.refresh_token);
    const email = data.user?.email || fallbackEmail;
    if (email) localStorage.setItem(USER_KEY, email);
  } catch {}
}

export function logout() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(REFRESH_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
}

/* ------------------------------------------------------------------ */
/* RC-2: session renewal. Supabase access tokens expire (default 1 h); */
/* the refresh token is what lets a signed-in admin stay signed in.    */
/* The previous code stored only the access token, so every admin      */
/* session silently died at expiry and all saves began failing.        */
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

let refreshing: Promise<boolean> | null = null;

/** Exchange the stored refresh token for a fresh session (single-flight). */
function refreshSession(): Promise<boolean> {
  if (refreshing) return refreshing;
  refreshing = (async () => {
    const refreshToken = getRefreshToken();
    if (!refreshToken || !isDbConfigured()) return false;
    try {
      const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=refresh_token`, {
        method: "POST",
        headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.access_token) {
        // Refresh token is dead (revoked/expired): end the session cleanly
        // so the UI returns to the login screen instead of failing saves.
        logout();
        return false;
      }
      storeSession(data);
      return true;
    } catch {
      return false; // transient network error — keep the session, retry next call
    } finally {
      refreshing = null;
    }
  })();
  return refreshing;
}

/**
 * Best-effort: if the access token is expired or about to expire and a
 * refresh token exists, renew the session BEFORE the request goes out.
 * Legacy sessions (login before this fix, no refresh token stored) are
 * left untouched — they end at expiry and the next login is refresh-capable.
 */
export async function ensureFreshToken(): Promise<void> {
  const token = getToken();
  if (!token) return;
  const exp = tokenExpiryMs(token);
  if (exp === null) return; // not a JWT we can read — leave it to the server
  if (exp - Date.now() > 60_000) return; // still comfortably valid
  if (getRefreshToken()) await refreshSession();
}

export async function login(email: string, password: string): Promise<{ ok: boolean; error?: string }> {
  if (!isDbConfigured()) return { ok: false, error: "Database is not configured yet." };
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.access_token) {
      return { ok: false, error: data.error_description || data.msg || "Login failed — check email and password." };
    }
    storeSession(data, email);
    return { ok: true };
  } catch {
    return { ok: false, error: "Network error while signing in." };
  }
}

export async function requestPasswordReset(email: string): Promise<boolean> {
  if (!isDbConfigured()) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/recover`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Verify the stored session is still valid; returns the user or null. */
export async function currentUser(): Promise<{ email: string } | null> {
  await ensureFreshToken();
  const token = getToken();
  if (!token || !isDbConfigured()) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${token}` },
    });
    if (!res.ok) return null;
    const u = await res.json();
    return { email: u.email };
  } catch {
    return null;
  }
}

function headers(prefer?: string): Record<string, string> {
  const token = getToken();
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    ...(prefer ? { Prefer: prefer } : {}),
  };
}

export async function adminSelect<T>(table: string, query = "select=*"): Promise<T[] | null> {
  if (!isDbConfigured()) return null;
  await ensureFreshToken();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: headers() });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

export interface AdminResult {
  ok: boolean;
  /** The database's own error message when ok is false — never swallowed. */
  error?: string;
}

async function errorOf(res: Response): Promise<AdminResult> {
  let detail = `HTTP ${res.status}`;
  try {
    const body = await res.json();
    if (body?.message) detail = `${body.message}${body.code ? ` (code ${body.code})` : ""}`;
  } catch {
    /* keep the HTTP status as the detail */
  }
  return { ok: false, error: detail };
}

const ZERO_ROW_ERROR: Record<"insert" | "update" | "delete", string> = {
  insert: "The database accepted the request but created no record (0 rows inserted). Nothing was saved.",
  update: "No record was changed (0 rows updated). The record may have been deleted already, or this account is not permitted to edit it. Nothing was saved.",
  delete: "No record was deleted (0 rows deleted). It may already be gone, or this account is not permitted to delete it.",
};

/**
 * RC-3: writes ask PostgREST to RETURN the affected rows and the result
 * is only "ok" when at least one row actually came back. The previous
 * return=minimal flow reported success even when RLS silently matched
 * zero rows and nothing was saved.
 */
async function resultOfRows(res: Response | null, op: "insert" | "update" | "delete"): Promise<AdminResult> {
  if (!res) return { ok: false, error: "Network error — the database could not be reached." };
  if (!res.ok) return errorOf(res);
  try {
    const rows = await res.json();
    if (Array.isArray(rows) && rows.length === 0) return { ok: false, error: ZERO_ROW_ERROR[op] };
  } catch {
    /* empty body on a success status — accept */
  }
  return { ok: true };
}

export async function adminInsert(table: string, row: Record<string, unknown>): Promise<AdminResult> {
  if (!isDbConfigured()) return { ok: false, error: "Database not configured." };
  await ensureFreshToken();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST", headers: headers("return=representation"), body: JSON.stringify([row]),
    });
    return resultOfRows(res, "insert");
  } catch {
    return { ok: false, error: "Network error — the database could not be reached." };
  }
}

export async function adminUpdate(table: string, match: string, patch: Record<string, unknown>): Promise<AdminResult> {
  if (!isDbConfigured()) return { ok: false, error: "Database not configured." };
  await ensureFreshToken();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${match}`, {
      method: "PATCH", headers: headers("return=representation"), body: JSON.stringify(patch),
    });
    return resultOfRows(res, "update");
  } catch {
    return { ok: false, error: "Network error — the database could not be reached." };
  }
}

export async function adminDelete(table: string, match: string): Promise<AdminResult> {
  if (!isDbConfigured()) return { ok: false, error: "Database not configured." };
  await ensureFreshToken();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${match}`, {
      method: "DELETE", headers: headers("return=representation"),
    });
    return resultOfRows(res, "delete");
  } catch {
    return { ok: false, error: "Network error — the database could not be reached." };
  }
}

/** Best-effort audit entry (never blocks the main action). */
export async function audit(action: string, entity: string, entityId: string) {
  try {
    await adminInsert("audit_log", { action, entity, entity_id: entityId });
  } catch {}
}

/** Snapshot a record into content_versions before it changes (rollback). */
export async function snapshot(entity: string, entityKey: string, row: unknown) {
  try {
    await adminInsert("content_versions", { entity, entity_key: entityKey, snapshot: row });
  } catch {}
}

/** Convert camelCase form data to snake_case DB columns (and back). */
export function toDb(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k.replace(/([A-Z])/g, "_$1").toLowerCase()] = v;
  return out;
}
export function fromDb<T>(obj: Record<string, unknown>): T {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) out[k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())] = v;
  return out as T;
}

/** Storage: upload/list/delete in the public `media` bucket (admin writes). */
export async function storageUpload(file: File): Promise<{ ok: boolean; url?: string; error?: string }> {
  if (!isDbConfigured()) return { ok: false, error: "Database not configured." };
  await ensureFreshToken();
  const path = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/media/${encodeURIComponent(path)}`, {
      method: "POST",
      headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${getToken()}`, "Content-Type": file.type || "application/octet-stream" },
      body: file,
    });
    if (!res.ok) return { ok: false, error: `Upload failed (HTTP ${res.status}).` };
    return { ok: true, url: `${SUPABASE_URL}/storage/v1/object/public/media/${path}` };
  } catch {
    return { ok: false, error: "Network error during upload." };
  }
}

export interface StorageItem { name: string; created_at?: string }
export async function storageList(): Promise<StorageItem[]> {
  if (!isDbConfigured()) return [];
  await ensureFreshToken();
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/list/media`, {
      method: "POST",
      headers: headers(),
      body: JSON.stringify({ prefix: "", limit: 200 }),
    });
    if (!res.ok) return [];
    const rows = await res.json();
    return rows.filter((r: StorageItem) => r.name && !r.name.endsWith("/"));
  } catch {
    return [];
  }
}
export function storagePublicUrl(name: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/media/${name}`;
}
export async function storageDelete(name: string): Promise<boolean> {
  if (!isDbConfigured()) return false;
  await ensureFreshToken();
  try {
    const res = await fetch(`${SUPABASE_URL}/storage/v1/object/media`, {
      method: "DELETE",
      headers: headers(),
      body: JSON.stringify({ prefixes: [name] }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
