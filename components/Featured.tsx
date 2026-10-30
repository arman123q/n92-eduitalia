"use client";

import { useEffect, useState } from "react";
import { getUniversities, getCourses } from "@/lib/data";
import type { University, Course } from "@/lib/types";
import { SUBJECT_LABELS, LEVEL_LABELS } from "@/components/ui";
import { detailHref } from "@/lib/links";

/** Homepage featured records — always drawn from the live data layer. */
export default function Featured() {
  const [unis, setUnis] = useState<University[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [uniMap, setUniMap] = useState<Map<string, string>>(new Map());

  useEffect(() => {
    (async () => {
      const [u, c] = await Promise.all([getUniversities(), getCourses()]);
      setUnis(u.rows.slice(0, 4));
      setCourses(c.rows.slice(0, 3));
      setUniMap(new Map(u.rows.map((x) => [x.id, x.name])));
    })();
  }, []);

  if (unis.length === 0) return null;

  return (
    <>
      <section className="mx-auto max-w-7xl px-4 pt-16 sm:px-6" aria-label="Featured universities">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="kicker">Directory</p>
            <h2 className="font-display mt-2 text-3xl font-bold text-[#103f35]">Explore universities in Italy</h2>
          </div>
          <a className="btn-ghost" href="/universities/">View all universities →</a>
        </div>
        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {unis.map((u) => (
            <a key={u.id} href={detailHref("universities", u.slug)} className="card group block p-6">
              <div className="flex h-24 items-end">
                <p className="font-display text-4xl font-black text-[#103f35]/12 group-hover:text-[#c7a05a]/50 transition-colors">{u.city.split(" ")[0]}</p>
              </div>
              <h3 className="font-display mt-2 text-lg font-bold leading-snug text-[#103f35]">{u.name}</h3>
              <p className="mt-1 text-[0.85rem] font-medium text-[#202824]/65">{u.city} · {u.region}</p>
              <p className="mt-2 text-[0.8rem] text-[#202824]/55">{u.subjects.map((s) => SUBJECT_LABELS[s] || s).slice(0, 2).join(" · ")}</p>
              <p className="mt-3 text-sm font-bold text-[#103f35]">Explore programmes →</p>
            </a>
          ))}
        </div>
      </section>

      {courses.length > 0 && (
        <section className="mx-auto max-w-7xl px-4 pt-14 sm:px-6" aria-label="Featured courses">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <h2 className="font-display text-2xl font-bold text-[#103f35]">Programmes students ask about</h2>
            <a className="btn-ghost" href="/courses/">Browse all courses →</a>
          </div>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {courses.map((c) => (
              <a key={c.id} href={detailHref("courses", c.slug)} className="card block p-6">
                <h3 className="font-display text-lg font-bold leading-snug text-[#103f35]">{c.name}</h3>
                <p className="mt-1.5 text-[0.87rem] font-medium text-[#202824]/65">{uniMap.get(c.universityId)}</p>
                <p className="mt-2 text-[0.83rem] text-[#202824]/60">{LEVEL_LABELS[c.level]} · {c.language === "english" ? "English-taught" : c.language} · {c.durationYears} years</p>
              </a>
            ))}
          </div>
        </section>
      )}
    </>
  );
}
