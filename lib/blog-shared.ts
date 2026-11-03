/**
 * Blog types + pure helpers shared by the server pages and the
 * client components (admin preview, listing filter). This module
 * must stay free of fs/fetch/env access so client bundles never
 * pull in the build-time snapshot data: data fetching lives in
 * lib/blog.ts (build-time only), HTML sanitisation in
 * lib/sanitize.js (DOMPurify allowlist — the old regex scrub that
 * briefly lived here was removed by security review, 3 Nov 2026).
 */

export interface BlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  contentHtml: string;
  seoTitle: string;
  metaDescription: string;
  focusKeyword: string;
  featuredImageUrl: string;
  imageAlt: string;
  authorName: string;
  category: string;
  tags: string[];
  publishedDate: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export function formatBlogDate(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(`${iso.slice(0, 10)}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" });
}

/** Rough reading time in minutes for the article meta line. */
export function readingMinutes(html: string): number {
  const words = html.replace(/<[^>]+>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}
