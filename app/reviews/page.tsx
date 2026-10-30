"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui";
import { TestimonialCard, GoogleReviewsButton, TESTIMONIAL_CATEGORY_LABELS } from "@/components/Testimonials";
import { getTestimonials } from "@/lib/data";
import type { Testimonial, TestimonialCategory } from "@/lib/types";

const CATEGORIES = Object.keys(TESTIMONIAL_CATEGORY_LABELS) as TestimonialCategory[];

export default function ReviewsPage() {
  const [rows, setRows] = useState<Testimonial[] | null>(null);
  const [cat, setCat] = useState<string>("");

  useEffect(() => {
    let alive = true;
    getTestimonials()
      .then((r) => alive && setRows(r))
      .catch(() => alive && setRows([]));
    return () => {
      alive = false;
    };
  }, []);

  const filtered = useMemo(
    () => (rows || []).filter((t) => !cat || t.serviceCategory === cat),
    [rows, cat]
  );

  return (
    <div className="pb-20">
      <PageHeader
        kicker="Student reviews"
        title="Reviews from our students"
        intro="Every testimonial here was submitted directly to N92 Edu-Italia and is published only with the student's permission, in their own words. For independent reviews, see our Google listing — we never edit, buy or invent reviews."
      />
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mt-8 flex flex-wrap items-center gap-3">
          <GoogleReviewsButton />
          <p className="text-sm text-[#202824]/60">
            Google reviews open on Google, where they are written and moderated independently.
          </p>
        </div>

        <div className="mt-8 flex flex-wrap gap-2" role="group" aria-label="Filter reviews by service">
          <button
            type="button"
            onClick={() => setCat("")}
            className={`rounded-full border px-4 py-2 text-sm font-semibold ${cat === "" ? "border-[#103f35] bg-[#103f35] text-white" : "border-[#103f35]/25 text-[#103f35] hover:bg-[#103f35]/5"}`}
            aria-pressed={cat === ""}
          >
            All services
          </button>
          {CATEGORIES.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              className={`rounded-full border px-4 py-2 text-sm font-semibold ${cat === c ? "border-[#103f35] bg-[#103f35] text-white" : "border-[#103f35]/25 text-[#103f35] hover:bg-[#103f35]/5"}`}
              aria-pressed={cat === c}
            >
              {TESTIMONIAL_CATEGORY_LABELS[c]}
            </button>
          ))}
        </div>

        {rows === null ? (
          <p className="mt-10 text-[#202824]/55">Loading reviews…</p>
        ) : filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-[#103f35]/12 bg-white px-6 py-7">
            <p className="max-w-2xl leading-relaxed text-[#202824]/78">
              {rows.length === 0
                ? "No student testimonials have been published yet. We are a young consultancy — as our first students share their experiences (always with their permission), their reviews will appear here. You can read independent reviews today on our Google listing."
                : "No published reviews in this category yet — please choose another service, or read independent reviews on our Google listing."}
            </p>
            <div className="mt-5">
              <GoogleReviewsButton />
            </div>
          </div>
        ) : (
          <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((t) => (
              <TestimonialCard key={t.id} t={t} />
            ))}
          </div>
        )}

        <p className="mt-10 text-sm leading-relaxed text-[#202824]/55">
          Studied with N92 Edu-Italia and happy to share your experience? Message us on WhatsApp and, with your
          permission, we will publish your words here exactly as you write them.
        </p>
      </div>
    </div>
  );
}
