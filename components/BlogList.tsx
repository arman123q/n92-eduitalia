"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, CalendarDays } from "lucide-react";
import { formatBlogDate, type BlogPost } from "@/lib/blog-shared";
// @ts-ignore - plain JS module
import { isSafeImageUrl } from "@/lib/sanitize.js";

/** Blog listing grid with a category filter (client-side, instant). */
export default function BlogList({ posts }: { posts: BlogPost[] }) {
  const categories = useMemo(() => ["All", ...Array.from(new Set(posts.map((p) => p.category)))], [posts]);
  const [active, setActive] = useState("All");
  const visible = active === "All" ? posts : posts.filter((p) => p.category === active);

  return (
    <div>
      {categories.length > 2 && (
        <div className="flex flex-wrap gap-2" role="group" aria-label="Filter articles by category">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setActive(c)}
              aria-pressed={active === c}
              className={`rounded-full px-4 py-2 text-[0.85rem] font-semibold ${active === c ? "bg-[#103f35] text-white" : "border border-[#103f35]/25 bg-white text-[#103f35]"}`}
            >
              {c}
            </button>
          ))}
        </div>
      )}

      <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {visible.map((p) => (
          <article key={p.id} className="card group flex flex-col overflow-hidden p-0 transition duration-300 hover:-translate-y-1 hover:shadow-xl">
            <Link href={`/blog/${p.slug}/`} className="relative block">
              {p.featuredImageUrl && isSafeImageUrl(p.featuredImageUrl) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.featuredImageUrl} alt={p.imageAlt} className="h-48 w-full object-cover" loading="lazy" />
              ) : (
                <span className="flex h-48 w-full items-center justify-center bg-[#103f35]">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src="/logo-header.png" alt="" className="h-20 w-auto opacity-90" />
                </span>
              )}
              <span className="absolute left-4 top-4 rounded-full bg-[#C7A05A] px-3 py-1 text-xs font-semibold text-[#103F35]">
                {p.category}
              </span>
            </Link>
            <div className="flex flex-1 flex-col p-5">
              {p.publishedDate && (
                <span className="inline-flex items-center gap-1 text-[0.8rem] font-medium text-[#202824]/50">
                  <CalendarDays size={13} aria-hidden="true" /> {formatBlogDate(p.publishedDate)}
                </span>
              )}
              <h2 className="mt-2 font-display text-[1.3rem] font-bold leading-snug text-[#103f35]">
                <Link href={`/blog/${p.slug}/`} className="hover:underline">{p.title}</Link>
              </h2>
              {p.excerpt && <p className="mt-2 line-clamp-3 text-[0.92rem] leading-relaxed text-[#202824]/70">{p.excerpt}</p>}
              <Link href={`/blog/${p.slug}/`} className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[0.88rem] font-semibold text-[#103f35] hover:gap-2.5">
                Read article <ArrowRight size={15} aria-hidden="true" />
              </Link>
            </div>
          </article>
        ))}
      </div>

      {visible.length === 0 && (
        <p className="mt-10 rounded-xl border border-[#103f35]/15 bg-white p-6 text-center text-[#202824]/60">
          No articles in this category yet.
        </p>
      )}
    </div>
  );
}
