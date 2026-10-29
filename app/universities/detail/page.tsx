"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getUniversities, getCourses, universityBySlug } from "@/lib/data";
import type { University, Course } from "@/lib/types";
import { VerifyBadge, SourceLine, SUBJECT_LABELS, LEVEL_LABELS } from "@/components/ui";

function Detail() {
  const params = useSearchParams();
  const slug = params.get("slug");
  const [uni, setUni] = useState<University | undefined | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);

  useEffect(() => {
    (async () => {
      const [u, c] = await Promise.all([getUniversities(), getCourses()]);
      setUni(universityBySlug(u.rows, slug));
      setCourses(c.rows.filter((x) => x.universityId === universityBySlug(u.rows, slug)?.id));
    })();
  }, [slug]);

  if (uni === null) return <p className="mx-auto max-w-4xl px-4 py-16 text-[#202824]/60" role="status">Loading…</p>;
  if (!uni)
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="font-display text-3xl font-bold text-[#103f35]">University not found</h1>
        <p className="mt-3 text-[#202824]/75">This record may have been unpublished. Browse the full directory instead.</p>
        <a className="btn-primary mt-6" href="/universities/">Back to Universities</a>
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 pb-20">
      <a href="/universities/" className="text-sm font-semibold text-[#103f35] underline decoration-[#c7a05a] decoration-2 underline-offset-4">← All universities</a>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-display text-4xl font-bold text-[#103f35]">{uni.name}</h1>
        <VerifyBadge status={uni.verificationStatus} />
      </div>
      <p className="mt-2 text-lg text-[#202824]/70">📍 {uni.city}, {uni.region} · {uni.type} university · Academic year {uni.academicYear}</p>

      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        <section className="card p-6">
          <h2 className="font-display text-lg font-bold text-[#103f35]">Study options</h2>
          <dl className="mt-3 space-y-2 text-[0.93rem]">
            <div><dt className="font-semibold inline">Degree levels: </dt><dd className="inline">{uni.degreeLevels.map((l) => LEVEL_LABELS[l]).join(", ")}</dd></div>
            <div><dt className="font-semibold inline">Subject areas: </dt><dd className="inline">{uni.subjects.map((s) => SUBJECT_LABELS[s] || s).join(", ")}</dd></div>
            <div><dt className="font-semibold inline">Teaching languages: </dt><dd className="inline">{uni.languages.join(" & ")} (varies by programme)</dd></div>
          </dl>
        </section>
        <section className="card p-6">
          <h2 className="font-display text-lg font-bold text-[#103f35]">Fees & admission</h2>
          <p className="mt-3 text-[0.93rem] leading-relaxed">{uni.tuitionNote}</p>
          <p className="mt-2 text-[0.93rem] leading-relaxed">{uni.admissionNote}</p>
        </section>
      </div>

      <h2 className="font-display mt-10 text-2xl font-bold text-[#103f35]">Listed courses at this university</h2>
      {courses.length === 0 ? (
        <p className="mt-3 text-[#202824]/70">
          No courses are listed for this university yet. Use the official programme catalogue and Universitaly to
          explore current offerings.
        </p>
      ) : (
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          {courses.map((c) => (
            <li key={c.id} className="card p-5">
              <a className="font-display text-lg font-bold text-[#103f35] hover:underline" href={`/courses/detail/?slug=${c.slug}`}>{c.name}</a>
              <p className="mt-1 text-sm text-[#202824]/65">{LEVEL_LABELS[c.level]} · {c.language === "english" ? "English-taught" : c.language} · {c.durationYears ? `${c.durationYears} years` : ""}</p>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-10 flex flex-wrap gap-3">
        <a className="btn-gold" href={uni.applicationUrl} target="_blank" rel="noopener noreferrer">Official admissions ↗</a>
        <a className="btn-ghost" href="/eligibility/">Check my eligibility</a>
      </div>
      <div className="mt-8"><SourceLine sourceUrl={uni.sourceUrl} lastVerified={uni.lastVerified} /></div>
    </div>
  );
}

export default function UniversityDetailPage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-4xl px-4 py-16 text-[#202824]/60">Loading…</p>}>
      <Detail />
    </Suspense>
  );
}
