import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import BlogList from "@/components/BlogList";
import { fetchPublishedPosts } from "@/lib/blog";

const BASE = "https://n92-eduitalia.pages.dev";

export const metadata: Metadata = {
  title: "Blog & Articles — Study in Italy Guides | N92 Edu-Italia",
  description:
    "Practical guides for Indian students and parents: admissions, scholarships, visas, costs and student life in Italy — from the N92 Edu-Italia team.",
  alternates: { canonical: `${BASE}/blog/` },
  openGraph: {
    type: "website",
    title: "Blog & Articles — Study in Italy Guides | N92 Edu-Italia",
    description:
      "Practical guides for Indian students and parents: admissions, scholarships, visas, costs and student life in Italy.",
    url: `${BASE}/blog/`,
  },
};

export default async function BlogPage() {
  const { posts } = await fetchPublishedPosts();
  // The listing never renders article bodies — pass card-shaped
  // posts so stored raw HTML is not serialised into this page.
  const listPosts = posts.map((p) => ({ ...p, contentHtml: "" }));
  return (
    <div className="pb-20">
      <PageHeader
        kicker="Blog & Articles"
        title="Guides for your Italy journey"
        intro="Admissions, scholarships, visas, budgets and student life — written for Indian students and parents, and kept honest: if we have not verified something, we say so."
      />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mt-10">
          {posts.length > 0 ? (
            <BlogList posts={listPosts} />
          ) : (
            <div className="rounded-2xl border border-[#103f35]/15 bg-white p-10 text-center">
              <h2 className="font-display text-2xl font-bold text-[#103f35]">Our first articles are on the way</h2>
              <p className="mx-auto mt-3 max-w-xl text-[#202824]/70">
                We are preparing detailed, verified guides on studying in Italy. In the meantime, you can check your
                eligibility or ask us a question directly.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/eligibility/" className="rounded-full bg-[#103f35] px-5 py-2.5 font-semibold text-white hover:bg-[#0b2e27]">
                  Check My Eligibility
                </Link>
                <Link href="/faq/" className="rounded-full border border-[#103f35]/30 px-5 py-2.5 font-semibold text-[#103f35]">
                  Read the FAQ
                </Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
