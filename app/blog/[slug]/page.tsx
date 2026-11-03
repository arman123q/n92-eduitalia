import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import ArticleView from "@/components/ArticleView";
import BlogCta from "@/components/BlogCta";
import { fetchPublishedPosts } from "@/lib/blog";
// @ts-ignore - plain JS module
import { isSafeImageUrl } from "@/lib/sanitize.js";
import { formatBlogDate, type BlogPost } from "@/lib/blog-shared";

const BASE = "https://n92-eduitalia.pages.dev";

export const dynamicParams = false;

// With output:"export", generateStaticParams() may not return an
// empty list (Next treats that as a missing function and fails the
// build) and dynamicParams:true is forbidden — yet "zero published
// articles" is a legitimate state. So when there are no posts we
// generate ONE sentinel page; it renders the article-not-found state,
// is never linked anywhere and is never in the sitemap. The admin
// reserves this slug so a real article can never collide with it.
const EMPTY_SENTINEL = "__no-articles";

export async function generateStaticParams() {
  const { posts } = await fetchPublishedPosts();
  if (posts.length === 0) return [{ slug: EMPTY_SENTINEL }];
  return posts.map((p) => ({ slug: p.slug }));
}

async function findPost(slug: string): Promise<BlogPost | undefined> {
  const { posts } = await fetchPublishedPosts();
  return posts.find((p) => p.slug === slug);
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const post = await findPost(slug);
  if (!post) return {};
  const url = `${BASE}/blog/${post.slug}/`;
  const title = post.seoTitle || `${post.title} | N92 Edu-Italia Blog`;
  const description = post.metaDescription || post.excerpt;
  return {
    title,
    description,
    ...(post.focusKeyword ? { keywords: post.focusKeyword } : {}),
    alternates: { canonical: url },
    openGraph: {
      type: "article",
      title,
      description,
      url,
      siteName: "N92 Edu-Italia",
      ...(post.publishedDate ? { publishedTime: `${post.publishedDate}T00:00:00Z` } : {}),
      ...(post.updatedAt ? { modifiedTime: post.updatedAt } : {}),
      authors: [post.authorName],
      ...(post.tags.length ? { tags: post.tags } : {}),
      ...(post.featuredImageUrl && isSafeImageUrl(post.featuredImageUrl)
        ? { images: [{ url: post.featuredImageUrl, alt: post.imageAlt || post.title }] }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      ...(post.featuredImageUrl && isSafeImageUrl(post.featuredImageUrl) ? { images: [post.featuredImageUrl] } : {}),
    },
  };
}

export default async function BlogArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { posts } = await fetchPublishedPosts();
  const post = posts.find((p) => p.slug === slug);
  if (!post) {
    // Reached only by the EMPTY_SENTINEL page generated when no
    // articles are published (see generateStaticParams above).
    return (
      <div className="mx-auto max-w-3xl px-4 py-20 text-center sm:px-6">
        <h1 className="font-display text-3xl font-bold text-[#103f35]">Article not found</h1>
        <p className="mt-3 text-[#202824]/65">This article is not available. It may not have been published yet.</p>
        <Link href="/blog/" className="mt-6 inline-block rounded-full bg-[#103f35] px-5 py-2.5 font-semibold text-white">
          Back to the blog
        </Link>
      </div>
    );
  }
  const url = `${BASE}/blog/${post.slug}/`;
  const related = posts.filter((p) => p.slug !== post.slug && p.category === post.category).slice(0, 3);

  const articleLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.metaDescription || post.excerpt,
    ...(post.featuredImageUrl && isSafeImageUrl(post.featuredImageUrl) ? { image: [post.featuredImageUrl] } : {}),
    author: { "@type": "Organization", name: post.authorName },
    publisher: { "@type": "Organization", name: "N92 Edu-Italia" },
    ...(post.publishedDate ? { datePublished: post.publishedDate } : {}),
    ...(post.updatedAt ? { dateModified: post.updatedAt.slice(0, 10) } : {}),
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    ...(post.focusKeyword ? { keywords: post.focusKeyword } : {}),
    articleSection: post.category,
    inLanguage: "en",
  };
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${BASE}/` },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${BASE}/blog/` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  return (
    <div className="pb-20">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }} />
      <ArticleView post={post} url={url} />

      <BlogCta />

      {related.length > 0 && (
        <section className="mx-auto mt-16 max-w-6xl px-4 sm:px-6" aria-labelledby="related-heading">
          <h2 id="related-heading" className="font-display text-2xl font-bold text-[#103f35]">Related articles</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((p) => (
              <article key={p.id} className="card flex flex-col overflow-hidden p-0">
                {p.featuredImageUrl && isSafeImageUrl(p.featuredImageUrl) && (
                  <Link href={`/blog/${p.slug}/`} className="block">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={p.featuredImageUrl} alt={p.imageAlt} className="h-36 w-full object-cover" loading="lazy" />
                  </Link>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-[0.75rem] font-semibold uppercase tracking-[0.12em] text-[#8a6d35]">
                    {p.category}
                    {p.publishedDate && <span className="ml-2 font-medium normal-case tracking-normal text-[#202824]/50">{formatBlogDate(p.publishedDate)}</span>}
                  </p>
                  <h3 className="mt-2 font-display text-lg font-bold leading-snug text-[#103f35]">
                    <Link href={`/blog/${p.slug}/`} className="hover:underline">{p.title}</Link>
                  </h3>
                  <Link href={`/blog/${p.slug}/`} className="mt-3 inline-flex items-center gap-1.5 text-[0.85rem] font-semibold text-[#103f35]">
                    Read article <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto mt-16 max-w-3xl px-4 sm:px-6">
        <div className="rounded-2xl bg-[#103f35] p-8 text-center text-white">
          <h2 className="font-display text-2xl font-bold">Planning to study in Italy?</h2>
          <p className="mx-auto mt-2 max-w-lg text-white/80">
            Check your eligibility for the 2027–28 intake or book a consultation with our team.
          </p>
          <div className="mt-5 flex flex-wrap justify-center gap-3">
            <Link href="/eligibility/" className="rounded-full bg-[#c7a05a] px-5 py-2.5 font-semibold text-[#103f35] hover:bg-[#b8912f]">
              Check My Eligibility
            </Link>
            <Link href="/blog/" className="rounded-full border border-white/40 px-5 py-2.5 font-semibold text-white">
              More articles
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
