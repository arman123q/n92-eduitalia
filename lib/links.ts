import seed from "@/data/seed.json";

/**
 * Detail-page links. Records that ship in the bundled seed get real
 * static paths (/universities/<slug>) which work on direct navigation
 * and refresh. Records added later in the Admin (database-only) use the
 * query fallback page (/universities/detail/?slug=...) which resolves
 * any slug at runtime.
 */
const STATIC_SLUGS: Record<string, Set<string>> = {
  universities: new Set((seed.universities as { slug: string }[]).map((u) => u.slug)),
  courses: new Set((seed.courses as { slug: string }[]).map((c) => c.slug)),
  scholarships: new Set((seed.scholarships as { slug: string }[]).map((s) => s.slug)),
};

export function detailHref(kind: "universities" | "courses" | "scholarships", slug: string): string {
  return STATIC_SLUGS[kind].has(slug)
    ? `/${kind}/${slug}`
    : `/${kind}/detail/?slug=${encodeURIComponent(slug)}`;
}
