"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getScholarships, scholarshipBySlug } from "@/lib/data";
import type { Scholarship } from "@/lib/types";
import { VerifyBadge, SourceLine, LEVEL_LABELS } from "@/components/ui";

function Row({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <tr className="border-b border-[#103f35]/8 last:border-0 align-top">
      <th className="w-48 bg-[#faf9f5] p-4 text-left font-semibold text-[#103f35]">{k}</th>
      <td className="p-4 leading-relaxed text-[#202824]/85">{children}</td>
    </tr>
  );
}

function Detail() {
  const slug = useSearchParams().get("slug");
  const [s, setS] = useState<Scholarship | undefined | null>(null);

  useEffect(() => {
    (async () => {
      const res = await getScholarships();
      setS(scholarshipBySlug(res.rows, slug));
    })();
  }, [slug]);

  if (s === null) return <p className="mx-auto max-w-4xl px-4 py-16 text-[#202824]/60" role="status">Loading…</p>;
  if (!s)
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="font-display text-3xl font-bold text-[#103f35]">Scholarship not found</h1>
        <p className="mt-3 text-[#202824]/75">This record may have been unpublished or has expired.</p>
        <a className="btn-primary mt-6" href="/scholarships/">Back to Scholarships</a>
      </div>
    );

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 pb-20">
      <a href="/scholarships/" className="text-sm font-semibold text-[#103f35] underline decoration-[#c7a05a] decoration-2 underline-offset-4">← All scholarships</a>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-display text-4xl font-bold text-[#103f35]">{s.name}</h1>
        <VerifyBadge status={s.verificationStatus} />
      </div>
      <p className="mt-2 text-lg text-[#202824]/70">{s.provider} · Academic year {s.academicYear}</p>

      <div className="card mt-8 overflow-hidden">
        <table className="w-full text-[0.93rem]">
          <tbody>
            <Row k="Who can apply">{s.studentEligibility}</Row>
            <Row k="Geographic eligibility">{s.geographicEligibility}</Row>
            <Row k="Degree levels">{s.degreeLevels.length ? s.degreeLevels.map((l) => LEVEL_LABELS[l] || l).join(", ") : "All levels (per call)"}</Row>
            <Row k="Requirements">{s.requirements}</Row>
            <Row k="Benefits">{s.benefits}</Row>
            <Row k="When it opens">{s.opensNote}</Row>
            <Row k="Deadline">{s.closesNote}</Row>
            <Row k="How to apply">{s.procedure}</Row>
            <Row k="Documents">
              <ul className="list-disc space-y-1 pl-5">
                {s.documents.map((d) => <li key={d}>{d}</li>)}
              </ul>
            </Row>
          </tbody>
        </table>
      </div>

      <div className="mt-6 rounded-xl border border-[#c7a05a]/50 bg-[#faf6ea] px-4 py-3 text-[0.88rem]">
        Scholarships are competitive and income- or merit-assessed. Meeting the listed criteria does not guarantee
        an award — always follow the current official call.
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        <a className="btn-gold" href={s.officialUrl} target="_blank" rel="noopener noreferrer">Official application/info ↗</a>
        <a className="btn-ghost" href="/eligibility/">Check my eligibility</a>
      </div>
      <div className="mt-8"><SourceLine sourceUrl={s.sourceUrl} lastVerified={s.lastVerified} /></div>
    </div>
  );
}

export default function ScholarshipDetailPage() {
  return (
    <Suspense fallback={<p className="mx-auto max-w-4xl px-4 py-16 text-[#202824]/60">Loading…</p>}>
      <Detail />
    </Suspense>
  );
}
