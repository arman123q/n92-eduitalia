import Link from "next/link";
import { fetchPublishedPosts } from "@/lib/blog";
import { formatBlogDate } from "@/lib/blog-shared";
// @ts-ignore - plain JS module
import { isSafeImageUrl } from "@/lib/sanitize.js";

/**
 * "Latest from N92" — the homepage blog section. Build-time data
 * (same fetchPublishedPosts as /blog itself): only PUBLISHED
 * articles can ever appear, newest first, at most three. When
 * there are no published articles the section renders NOTHING —
 * no placeholder or dummy content is ever shown on the homepage.
 */
export default async function LatestArticles() {
  const { posts } = await fetchPublishedPosts();
  const latest = posts.slice(0, 3);
  if (latest.length === 0) return null;

  return (
    <section aria-labelledby="latest-heading" className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker">From the blog</p>
          <h2 id="latest-heading" className="font-display mt-2 text-3xl font-bold text-[#103f35] sm:text-4xl">
            Latest from N92
          </h2>
        </div>
        <Link href="/blog/" className="hidden font-semibold text-[#103f35] underline decoration-[#c7a05a] decoration-2 underline-offset-4 hover:text-[#0b2e27] sm:inline-block">
          View All Articles
        </Link>
      </div>

      <div className="mt-10 grid gap-7 sm:grid-cols-2 lg:grid-cols-3">
        {latest.map((p) => (
          <article key={p.id} className="group flex flex-col overflow-hidden rounded-3xl bg-white ring-1 ring-[#103f35]/10 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
            <Link href={`/blog/${p.slug}/`} className="relative block">
              {p.featuredImageUrl && isSafeImageUrl(p.featuredImageUrl) ? (
                <img src={p.featuredImageUrl} alt={p.imageAlt} className="h-48 w-full object-cover" loading="lazy" />
              ) : (
                <span className="flex h-48 items-center justify-center bg-[#103f35]">
                  <img src="/logo-header.png" alt="" className="h-20 w-auto opacity-90" />
                </span>
              )}
              <span className="absolute left-4 top-4 rounded-full bg-[#C7A05A] px-3 py-1 text-xs font-semibold text-[#103F35]">
                {p.category}
              </span>
            </Link>
            <div className="flex flex-1 flex-col p-6">
              {p.publishedDate && (
                <time dateTime={p.publishedDate} className="text-xs font-medium uppercase tracking-wide text-[#202824]/50">
                  {formatBlogDate(p.publishedDate)}
                </time>
              )}
              <h3 className="mt-2 font-display text-xl font-bold leading-snug text-[#103f35]">
                <Link href={`/blog/${p.slug}/`} className="hover:underline">
                  {p.title}
                </Link>
              </h3>
              {p.excerpt && <p className="mt-2 line-clamp-3 leading-relaxed text-[#202824]/70">{p.excerpt}</p>}
              <Link href={`/blog/${p.slug}/`} className="mt-auto inline-flex items-center gap-1.5 pt-4 font-semibold text-[#103f35]">
                Read Article
                <span aria-hidden="true" className="text-[#C7A05A] transition-transform group-hover:translate-x-0.5">→</span>
              </Link>
            </div>
          </article>
        ))}
      </div>

      <div className="mt-10 text-center sm:hidden">
        <Link href="/blog/" className="font-semibold text-[#103f35] underline decoration-[#c7a05a] decoration-2 underline-offset-4">
          View All Articles
        </Link>
      </div>
    </section>
  );
}
