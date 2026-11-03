/**
 * Blog data layer — BUILD-TIME only (owner-approved architecture,
 * 3 Nov 2026).
 *
 * The site is a static export: there is no server at runtime, so a
 * published article can only become a page when the site is built.
 * During `next build` this module fetches PUBLISHED posts from
 * Supabase (publishable key + RLS — the public read policy serves
 * published rows to the anon role) and the blog pages + sitemap are
 * generated from that result. Publishing/unpublishing in the admin
 * therefore takes effect at the NEXT SUCCESSFUL DEPLOYMENT.
 *
 * SNAPSHOT FALLBACK (deliberate, and documented for the owner):
 * If the fetch cannot be completed (Supabase unreachable, table not
 * created yet, build env vars missing), the build does NOT fail —
 * it falls back to `data/blog-snapshot.json`, a repo copy of
 * previously published posts, and logs a loud warning. Consequence
 * the owner accepted explicitly: a snapshot build can still contain
 * an article that has since been UNPUBLISHED (and will miss newly
 * published ones). An unpublish is only confirmed once a deployment
 * whose fetch succeeded has completed. A successful fetch that
 * returns zero rows is NOT a fallback — the blog is then genuinely
 * empty.
 */
import snapshot from "@/data/blog-snapshot.json";
import type { BlogPost } from "@/lib/blog-shared";
// @ts-ignore - plain JS module
import { isSafeImageUrl } from "./sanitize.js";

export type { BlogPost } from "@/lib/blog-shared";

interface BlogRow {
  id: string;
  slug: string;
  title: string;
  excerpt?: string;
  content_html?: string;
  seo_title?: string;
  meta_description?: string;
  focus_keyword?: string;
  featured_image_url?: string;
  image_alt?: string;
  author_name?: string;
  category?: string;
  tags?: string;
  published_date?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
}

const COLUMNS =
  "id,slug,title,excerpt,content_html,seo_title,meta_description,focus_keyword,featured_image_url,image_alt,author_name,category,tags,published_date,status,created_at,updated_at";

function mapRow(r: BlogRow): BlogPost {
  return {
    id: r.id,
    slug: r.slug,
    title: r.title,
    excerpt: r.excerpt ?? "",
    contentHtml: r.content_html ?? "",
    seoTitle: r.seo_title ?? "",
    metaDescription: r.meta_description ?? "",
    focusKeyword: r.focus_keyword ?? "",
    // The featured image URL is validated at the data layer too:
    // anything that is not HTTPS or a safe relative URL is dropped
    // here, so no surface (card, article figure, OG/Twitter tags,
    // JSON-LD, serialised page data) can ever receive it. Renderers
    // re-check as a second layer (ArticleView/BlogList/metadata).
    featuredImageUrl: isSafeImageUrl(r.featured_image_url) ? String(r.featured_image_url) : "",
    imageAlt: r.image_alt ?? "",
    authorName: r.author_name ?? "N92 Edu-Italia",
    category: r.category ?? "Study in Italy",
    tags: (r.tags ?? "")
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean),
    publishedDate: r.published_date ?? null,
    status: r.status ?? "draft",
    createdAt: r.created_at ?? "",
    updatedAt: r.updated_at ?? "",
  };
}

export interface BlogFetchResult {
  posts: BlogPost[];
  source: "supabase" | "snapshot";
  snapshotDate?: string;
}

export async function fetchPublishedPosts(): Promise<BlogFetchResult> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    try {
      const res = await fetch(
        `${url}/rest/v1/blog_posts?select=${COLUMNS}&status=eq.published&order=published_date.desc.nullslast,created_at.desc`,
        {
          headers: { apikey: key, Authorization: `Bearer ${key}` },
          // NOTE: no cache:"no-store" here — in a static-export build
          // that marks the fetch dynamic and Next aborts prerendering
          // (DynamicServerError). The default build-time fetch is
          // memoised across generateStaticParams / metadata / page /
          // sitemap, so one build always sees one consistent set.
          signal: AbortSignal.timeout(15_000),
        }
      );
      if (res.ok) {
        const rows = (await res.json()) as BlogRow[];
        return { posts: rows.map(mapRow), source: "supabase" };
      }
      console.warn(
        `[blog] WARNING: Supabase blog fetch failed (HTTP ${res.status}). ` +
          `Falling back to snapshot dated ${(snapshot as { generatedAt: string }).generatedAt} — ` +
          `recently published articles may be missing and recently unpublished ones may still appear in this build.`
      );
    } catch (err) {
      console.warn(
        `[blog] WARNING: Supabase blog fetch errored (${err instanceof Error ? err.message : "unknown"}). ` +
          `Falling back to snapshot dated ${(snapshot as { generatedAt: string }).generatedAt} — ` +
          `recently published articles may be missing and recently unpublished ones may still appear in this build.`
      );
    }
  }
  const snap = snapshot as unknown as { generatedAt: string; posts: BlogRow[] };
  return { posts: snap.posts.map(mapRow), source: "snapshot", snapshotDate: snap.generatedAt };
}
