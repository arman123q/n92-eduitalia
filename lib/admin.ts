/**
 * Admin API layer — Supabase Auth + PostgREST with the admin's own token.
 * Security is enforced by RLS in the database; this layer only transports.
 * The service-role key is never used anywhere in this project.
 */
import { SUPABASE_URL, SUPABASE_ANON_KEY, isDbConfigured } from "@/lib/supabase";

export { isDbConfigured };

const TOKEN_KEY = "n92_admin_token";
const USER_KEY = "n92_admin_user";

export function getToken(): string | null {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
}
export function getUserEmail(): string | null {
  try { return localStorage.getItem(USER_KEY); } catch { return null; }
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
    localStorage.setItem(TOKEN_KEY, data.access_token);
    localStorage.setItem(USER_KEY, data.user?.email || email);
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

export function logout() {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  } catch {}
}

/** Verify the stored token is still valid; returns the user or null. */
export async function currentUser(): Promise<{ email: string } | null> {
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
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, { headers: headers() });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

export async function adminInsert(table: string, row: Record<string, unknown>): Promise<boolean> {
  if (!isDbConfigured()) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}`, {
      method: "POST", headers: headers("return=minimal"), body: JSON.stringify([row]),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function adminUpdate(table: string, match: string, patch: Record<string, unknown>): Promise<boolean> {
  if (!isDbConfigured()) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${match}`, {
      method: "PATCH", headers: headers("return=minimal"), body: JSON.stringify(patch),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function adminDelete(table: string, match: string): Promise<boolean> {
  if (!isDbConfigured()) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${match}`, {
      method: "DELETE", headers: headers("return=minimal"),
    });
    return res.ok;
  } catch {
    return false;
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
