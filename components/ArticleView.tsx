import Link from "next/link";
import { CalendarDays, Clock3, Tag, User } from "lucide-react";
import { formatBlogDate, readingMinutes, type BlogPost } from "@/lib/blog-shared";
// @ts-ignore - plain JS module
import { sanitizeHtml, isSafeImageUrl } from "@/lib/sanitize.js";

/**
 * Presentational article renderer — used by the public article page
 * AND the admin preview, so what the admin previews is exactly what
 * visitors get. Pure (no data fetching); safe in server and client
 * components.
 *
 * SECURITY: the article HTML is sanitised HERE, at render time, with
 * the shared DOMPurify allowlist (lib/sanitize.js) — the same
 * function the admin applies at save time — so stored content is
 * never trusted, however it reached the database.
 */
export default function ArticleView({ post, url }: { post: BlogPost; url?: string }) {
  const date = formatBlogDate(post.publishedDate);
  const shareText = encodeURIComponent(post.title);
  const shareUrl = encodeURIComponent(url ?? "");
  return (
    <article className="mx-auto max-w-3xl px-4 sm:px-6">
      <nav aria-label="Breadcrumb" className="pt-8 text-[0.82rem] text-[#202824]/55">
        <ol className="flex flex-wrap items-center gap-1.5">
          <li><Link href="/" className="hover:text-[#103f35] hover:underline">Home</Link></li>
          <li aria-hidden="true">/</li>
          <li><Link href="/blog/" className="hover:text-[#103f35] hover:underline">Blog</Link></li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="max-w-[46vw] truncate font-medium text-[#103f35]">{post.title}</li>
        </ol>
      </nav>

      <header className="mt-6">
        <p className="inline-block rounded-full bg-[#c7a05a]/15 px-3 py-1 text-[0.75rem] font-bold uppercase tracking-[0.14em] text-[#8a6d35]">
          {post.category}
        </p>
        <h1 className="mt-4 font-display text-4xl font-bold leading-[1.12] text-[#103f35] sm:text-[2.75rem]">{post.title}</h1>
        {post.excerpt && <p className="mt-4 text-[1.08rem] leading-relaxed text-[#202824]/70">{post.excerpt}</p>}
        <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 border-y border-[#103f35]/10 py-3 text-[0.85rem] text-[#202824]/60">
          <span className="inline-flex items-center gap-1.5"><User size={14} aria-hidden="true" /> {post.authorName}</span>
          {date && <span className="inline-flex items-center gap-1.5"><CalendarDays size={14} aria-hidden="true" /> {date}</span>}
          <span className="inline-flex items-center gap-1.5"><Clock3 size={14} aria-hidden="true" /> {readingMinutes(post.contentHtml)} min read</span>
        </div>
      </header>

      {post.featuredImageUrl && isSafeImageUrl(post.featuredImageUrl) && (
        <figure className="mt-8">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={post.featuredImageUrl} alt={post.imageAlt} className="w-full rounded-2xl object-cover" />
          {post.imageAlt && <figcaption className="mt-2 text-center text-[0.8rem] text-[#202824]/45">{post.imageAlt}</figcaption>}
        </figure>
      )}

      <div className="article-body mt-9" dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.contentHtml) }} />

      {post.tags.length > 0 && (
        <div className="mt-10 flex flex-wrap items-center gap-2">
          <Tag size={15} className="text-[#103f35]/50" aria-hidden="true" />
          {post.tags.map((t) => (
            <span key={t} className="rounded-full border border-[#103f35]/20 px-3 py-1 text-[0.78rem] font-medium text-[#103f35]">{t}</span>
          ))}
        </div>
      )}

      {url && (
        <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-[#103f35]/10 pt-6 text-[0.85rem]">
          <span className="font-semibold text-[#103f35]">Share this article:</span>
          <a className="rounded-full bg-[#103f35] px-3.5 py-1.5 font-medium text-white hover:bg-[#0b2e27]" href={`https://wa.me/?text=${shareText}%20${shareUrl}`} target="_blank" rel="noopener noreferrer">WhatsApp</a>
          <a className="rounded-full bg-[#103f35] px-3.5 py-1.5 font-medium text-white hover:bg-[#0b2e27]" href={`https://www.facebook.com/sharer/sharer.php?u=${shareUrl}`} target="_blank" rel="noopener noreferrer">Facebook</a>
          <a className="rounded-full bg-[#103f35] px-3.5 py-1.5 font-medium text-white hover:bg-[#0b2e27]" href={`https://www.linkedin.com/sharing/share-offsite/?url=${shareUrl}`} target="_blank" rel="noopener noreferrer">LinkedIn</a>
        </div>
      )}
    </article>
  );
}
