"use client";

import { useEffect, useState } from "react";
import { Star } from "lucide-react";
import { getTestimonials } from "@/lib/data";
import { useServiceContent } from "@/components/useServiceContent";
import { COMPANY_DEFAULTS, COMPANY_CONTENT_KEY, type CompanyInfo } from "@/lib/company";
import type { Testimonial, TestimonialCategory } from "@/lib/types";

export const TESTIMONIAL_CATEGORY_LABELS: Record<TestimonialCategory, string> = {
  "university-admission": "University Admission",
  "visa-guidance": "Visa Guidance",
  "scholarship-assistance": "Scholarship Assistance",
  "ielts-coaching": "IELTS Coaching",
  "accommodation-arrival": "Accommodation & Arrival Support",
};

export function formatReviewDate(d?: string | null): string {
  if (!d) return "";
  const date = new Date(`${d}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? ""
    : date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join("");
}

export function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <article className="card flex flex-col p-6">
      <div className="flex items-center gap-3.5">
        {t.photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={t.photoUrl} alt={`Photo of ${t.displayName}`} className="h-12 w-12 rounded-full object-cover" width="48" height="48" loading="lazy" />
        ) : (
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#103f35] font-display text-base font-bold text-[#e7d3a1]" aria-hidden="true">
            {initials(t.displayName)}
          </span>
        )}
        <div className="min-w-0">
          <h3 className="font-display text-[1.02rem] font-bold leading-tight text-[#103f35]">{t.displayName}</h3>
          <p className="truncate text-[0.83rem] text-[#202824]/65">
            {[t.programme, t.universityName].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>
      <p className="mt-4 flex-1 text-[0.93rem] leading-relaxed text-[#202824]/82">“{t.reviewText}”</p>
      <div className="mt-4 flex flex-wrap items-center gap-2 text-[0.78rem]">
        <span className="rounded-full bg-[#c7a05a]/15 px-2.5 py-1 font-semibold text-[#103f35]">
          {TESTIMONIAL_CATEGORY_LABELS[t.serviceCategory] || t.serviceCategory}
        </span>
        {t.country && <span className="text-[#202824]/55">{t.country}</span>}
        {t.reviewDate && <span className="text-[#202824]/55">{formatReviewDate(t.reviewDate)}</span>}
        <span className="ml-auto font-medium text-[#202824]/50">
          {t.source === "google" ? "Google review" : "Submitted to N92 · published with permission"}
        </span>
      </div>
    </article>
  );
}

export function GoogleReviewsButton({ className = "btn-ghost" }: { className?: string }) {
  const company = useServiceContent<CompanyInfo>(COMPANY_CONTENT_KEY, COMPANY_DEFAULTS);
  if (!company.mapsUrl) return null;
  return (
    <a className={className} href={company.mapsUrl} target="_blank" rel="noopener noreferrer">
      <Star size={16} className="mr-1.5 inline -mt-0.5 text-[#c7a05a]" aria-hidden="true" />
      Read Google Reviews
    </a>
  );
}

/** Homepage Student Reviews section — featured testimonials, or an honest
 * empty state (never invented reviews, counts or ratings). */
export function ReviewsSection() {
  const [featured, setFeatured] = useState<Testimonial[] | null>(null);
  useEffect(() => {
    let alive = true;
    getTestimonials()
      .then((rows) => {
        if (alive) setFeatured(rows.filter((t) => t.featured).slice(0, 3));
      })
      .catch(() => alive && setFeatured([]));
    return () => {
      alive = false;
    };
  }, []);

  return (
    <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-20" aria-label="Student reviews">
      <p className="kicker">Student reviews</p>
      <h2 className="font-display mt-2 max-w-2xl text-3xl font-bold text-[#103f35] sm:text-4xl">
        What our students say
      </h2>
      <p className="mt-3 max-w-2xl leading-relaxed text-[#202824]/72">
        Testimonials on this page were submitted directly to N92 Edu-Italia and are published only with the
        student's permission. Reviews on Google are written independently by students on our Google listing.
      </p>

      {featured === null ? (
        <p className="mt-8 text-[#202824]/55">Loading reviews…</p>
      ) : featured.length > 0 ? (
        <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((t) => (
            <TestimonialCard key={t.id} t={t} />
          ))}
        </div>
      ) : (
        <div className="mt-9 rounded-2xl border border-[#103f35]/12 bg-white px-6 py-7">
          <p className="max-w-2xl leading-relaxed text-[#202824]/78">
            We are a young consultancy and our first student stories will appear here as students share them —
            always with their permission, in their own words. In the meantime, you can read independent reviews
            on our Google listing.
          </p>
        </div>
      )}

      <div className="mt-7 flex flex-wrap gap-3">
        <GoogleReviewsButton />
        <a className="btn-ghost" href="/reviews/">All student reviews →</a>
      </div>
    </section>
  );
}
