/**
 * Supabase connection helpers (browser-safe values only).
 * The anon/publishable key is public BY DESIGN and is restricted by Row
 * Level Security. The service-role key must NEVER appear in this codebase.
 */

export const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
export const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

export function isDbConfigured(): boolean {
  return Boolean(SUPABASE_URL && SUPABASE_ANON_KEY);
}

export function authHeaders(extra: Record<string, string> = {}): Record<string, string> {
  const token = typeof window !== "undefined" ? window.localStorage.getItem("n92_admin_token") : null;
  return {
    apikey: SUPABASE_ANON_KEY,
    Authorization: `Bearer ${token || SUPABASE_ANON_KEY}`,
    "Content-Type": "application/json",
    ...extra,
  };
}

/** Minimal PostgREST read. Returns null on any failure (caller falls back). */
export async function restSelect<T>(table: string, query: string): Promise<T[] | null> {
  if (!isDbConfigured()) return null;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      headers: authHeaders(),
    });
    if (!res.ok) return null;
    return (await res.json()) as T[];
  } catch {
    return null;
  }
}

/** PostgREST insert/update/delete. Returns true only when the server confirms. */
export async function restWrite(
  method: "POST" | "PATCH" | "DELETE",
  table: string,
  query: string,
  body?: unknown
): Promise<boolean> {
  if (!isDbConfigured()) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/${table}?${query}`, {
      method,
      headers: authHeaders({ Prefer: "return=minimal" }),
      body: body ? JSON.stringify(body) : undefined,
    });
    return res.ok;
  } catch {
    return false;
  }
}
