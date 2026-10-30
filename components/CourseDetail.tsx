"use client";

import { useEffect, useState } from "react";
import { getCourses, getUniversities, courseBySlug } from "@/lib/data";
import type { Course, University } from "@/lib/types";
import { VerifyBadge, SourceLine, SUBJECT_LABELS, LEVEL_LABELS } from "@/components/ui";
import { detailHref } from "@/lib/links";
import { ArrowUpRight, ArrowLeft } from "lucide-react";

export default function CourseDetail({ slug }: { slug: string | null }) {
  const [course, setCourse] = useState<Course | undefined | null>(null);
  const [uni, setUni] = useState<University | undefined>(undefined);

  useEffect(() => {
    (async () => {
      const [c, u] = await Promise.all([getCourses(), getUniversities()]);
      const found = courseBySlug(c.rows, slug);
      setCourse(found);
      setUni(u.rows.find((x) => x.id === found?.universityId));
    })();
  }, [slug]);

  if (course === null) return <p className="mx-auto max-w-4xl px-4 py-16 text-[#202824]/60" role="status">Loading…</p>;
  if (!course)
    return (
      <div className="mx-auto max-w-4xl px-4 py-16">
        <h1 className="font-display text-3xl font-bold text-[#103f35]">Course not found</h1>
        <p className="mt-3 text-[#202824]/75">This record may have been unpublished. Browse all courses instead.</p>
        <a className="btn-primary mt-6" href="/courses/">Back to Courses</a>
      </div>
    );

  const rows: [string, string][] = [
    ["University", uni ? `${uni.name} — ${uni.city}` : ""],
    ["Degree level", LEVEL_LABELS[course.level]],
    ["Subject", SUBJECT_LABELS[course.subject] || course.subject],
    ["Teaching language", course.language === "english" ? "English" : course.language === "italian" ? "Italian" : "English & Italian"],
    ["Duration", course.durationYears ? `${course.durationYears} years` : "Not verified — check official page"],
    ["Credits", course.credits ? `${course.credits} ECTS` : "Not verified"],
    ["Tuition", course.tuitionNote],
    ["Application deadline", course.deadlineNote],
    ["Academic year", course.academicYear],
  ];

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 pb-20">
      <a href="/courses/" className="text-sm font-semibold text-[#103f35] underline decoration-[#c7a05a] decoration-2 underline-offset-4"><ArrowLeft size={14} className="inline -mt-0.5" aria-hidden="true" /> All courses</a>
      <div className="mt-4 flex flex-wrap items-start justify-between gap-3">
        <h1 className="font-display text-4xl font-bold text-[#103f35]">{course.name}</h1>
        <VerifyBadge status={course.verificationStatus} />
      </div>
      <div className="card mt-8 overflow-hidden">
        <div className="overflow-x-auto"><table className="w-full min-w-[30rem] text-left text-[0.93rem]">
          <tbody>
            {rows.map(([k, v]) => (
              <tr key={k} className="border-b border-[#103f35]/8 last:border-0">
                <th className="w-44 bg-[#faf9f5] p-4 align-top font-semibold text-[#103f35]">{k}</th>
                <td className="p-4 text-[#202824]/85">{v}</td>
              </tr>
            ))}
            <tr>
              <th className="w-44 bg-[#faf9f5] p-4 align-top font-semibold text-[#103f35]">Entry requirements</th>
              <td className="p-4 leading-relaxed text-[#202824]/85">{course.requirements}</td>
            </tr>
          </tbody>
        </table></div>
      </div>
      <div className="mt-8 flex flex-wrap gap-3">
        <a className="btn-gold" href={course.officialUrl} target="_blank" rel="noopener noreferrer">Official programme page <ArrowUpRight size={14} className="inline -mt-0.5" aria-hidden="true" /></a>
        {uni && <a className="btn-ghost" href={detailHref("universities", uni.slug)}>About {uni.name}</a>}
        <a className="btn-ghost" href="/eligibility/">Check my eligibility</a>
      </div>
      <div className="mt-8"><SourceLine sourceUrl={course.sourceUrl} lastVerified={course.lastVerified} /></div>
    </div>
  );
}

