import type { MetadataRoute } from "next";
import seed from "@/data/seed.json";

/**
 * XML sitemap for the static export (added 3 Nov 2026 — /sitemap.xml
 * previously returned the custom 404 because no sitemap existed).
 *
 * Public, canonical pages only:
 *  - the static public routes below (mirrors the app/ route tree,
 *    excluding /admin and the query-param /detail fallback shells,
 *    which have no canonical content of their own);
 *  - one entry per seed record for the three detail collections,
 *    using the SAME slug source as each section's
 *    generateStaticParams(), so the sitemap can never list a page the
 *    build did not generate (and vice versa). Database-only records
 *    created later in the admin get query-parameter URLs and are
 *    intentionally excluded.
 * Base URL is the current production origin, per the owner.
 */
export const dynamic = "force-static";

const BASE = "https://n92-eduitalia.pages.dev";

const STATIC_ROUTES = [
  "/",
  "/about/",
  "/accommodation-support/",
  "/admissions/",
  "/book-consultation/",
  "/calculator/",
  "/contact/",
  "/courses/",
  "/documents/",
  "/eligibility/",
  "/faq/",
  "/ielts-coaching/",
  "/notices/",
  "/privacy/",
  "/process/",
  "/refund-policy/",
  "/resources/",
  "/reviews/",
  "/scholarships/",
  "/study-in-italy/",
  "/terms/",
  "/universities/",
  "/visa-guide/",
  "/visa-support/",
];

type SeedRow = { slug: string; lastVerified?: string };

function detailEntries(rows: SeedRow[], prefix: string): MetadataRoute.Sitemap {
  return rows.map((r) => {
    const entry: MetadataRoute.Sitemap[number] = { url: `${BASE}${prefix}${r.slug}/` };
    if (r.lastVerified && !Number.isNaN(new Date(r.lastVerified).getTime())) {
      entry.lastModified = new Date(r.lastVerified);
    }
    return entry;
  });
}

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    ...STATIC_ROUTES.map((path) => ({ url: `${BASE}${path}` })),
    ...detailEntries(seed.universities as SeedRow[], "/universities/"),
    ...detailEntries(seed.courses as SeedRow[], "/courses/"),
    ...detailEntries(seed.scholarships as SeedRow[], "/scholarships/"),
  ];
}
