/**
 * Runtime fetch for the "How to Use This Guide" tutorial — the ONE
 * Student Essentials element that is NOT baked at build time, so
 * the owner can change the video from the admin without a site
 * redeployment (same runtime pattern as the admissions ticker).
 * Reads the published row (id 'main') from essentials_tutorial via
 * the publishable key + RLS. Any failure — table missing
 * (migration_010 not yet applied), unpublished, empty URL — returns
 * null and the public UI shows its polished empty state.
 */
export interface TutorialData {
  videoUrl: string;
  title: string;
  description: string;
}

export async function fetchTutorial(): Promise<TutorialData | null> {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!base || !key) return null;
  const k = key;
  try {
    const res = await fetch(
      `${base}/rest/v1/essentials_tutorial?select=video_url,title,description&id=eq.main&published=eq.true`,
      { headers: { apikey: k, Authorization: `Bearer ${k}` }, signal: AbortSignal.timeout(10000) }
    );
    if (!res.ok) return null;
    const rows = (await res.json()) as { video_url?: string; title?: string; description?: string }[];
    const row = rows[0];
    if (!row || !row.video_url) return null;
    return {
      videoUrl: row.video_url,
      title: row.title?.trim() || "How to Use This Guide",
      description: row.description?.trim() || "",
    };
  } catch {
    return null;
  }
}
