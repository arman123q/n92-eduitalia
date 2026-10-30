"use client";

import { useEffect, useMemo, useState } from "react";
import { getUniversities, getCourses, type DataSource } from "@/lib/data";
import type { University, Course } from "@/lib/types";
import { PageHeader, VerifyBadge, DataNotice, SUBJECT_LABELS, LEVEL_LABELS } from "@/components/ui";
import { detailHref } from "@/lib/links";

const SHORTLIST_KEY = "n92_shortlist";
const COMPARE_KEY = "n92_compare";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [unis, setUnis] = useState<Map<string, University>>(new Map());
  const [source, setSource] = useState<DataSource>("seed");
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("");
  const [subject, setSubject] = useState("");
  const [language, setLanguage] = useState("");
  const [uniId, setUniId] = useState("");
  const [year, setYear] = useState("");
  const [shortlist, setShortlist] = useState<string[]>([]);
  const [compare, setCompare] = useState<string[]>([]);

  useEffect(() => {
    (async () => {
      const [c, u] = await Promise.all([getCourses(), getUniversities()]);
      setCourses(c.rows);
      setUnis(new Map(u.rows.map((x) => [x.id, x])));
      setSource(c.source);
      setLoading(false);
    })();
    try {
      setShortlist(JSON.parse(localStorage.getItem(SHORTLIST_KEY) || "[]"));
      setCompare(JSON.parse(localStorage.getItem(COMPARE_KEY) || "[]"));
    } catch {}
  }, []);

  const save = (key: string, v: string[]) => {
    try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
  };
  const toggleShort = (id: string) =>
    setShortlist((s) => { const n = s.includes(id) ? s.filter((x) => x !== id) : [...s, id]; save(SHORTLIST_KEY, n); return n; });
  const toggleCompare = (id: string) =>
    setCompare((s) => {
      const n = s.includes(id) ? s.filter((x) => x !== id) : s.length >= 3 ? s : [...s, id];
      save(COMPARE_KEY, n); return n;
    });

  const years = useMemo(() => [...new Set(courses.map((c) => c.academicYear).filter(Boolean))].sort(), [courses]);

  const filtered = useMemo(
    () =>
      courses.filter(
        (c) =>
          (!q || `${c.name} ${unis.get(c.universityId)?.name || ""}`.toLowerCase().includes(q.toLowerCase())) &&
          (!level || c.level === level) &&
          (!subject || c.subject === subject) &&
          (!language || c.language === language) &&
          (!uniId || c.universityId === uniId) &&
          (!year || c.academicYear === year)
      ),
    [courses, unis, q, level, subject, language, uniId, year]
  );

  const compared = compare.map((id) => courses.find((c) => c.id === id)).filter(Boolean) as Course[];
  const reset = () => { setQ(""); setLevel(""); setSubject(""); setLanguage(""); setUniId(""); setYear(""); };

  return (
    <div className="pb-20">
      <PageHeader
        kicker="Directory"
        title="Courses & Programmes"
        intro="Programmes listed with honest status labels. Fees and deadlines are shown only when verified — otherwise the card says so and links to the official programme page. Save courses to your shortlist (stored in your browser) and compare up to three side by side."
      />
      <DataNotice source={source} />
      <div className="mx-auto max-w-7xl px-4 sm:px-6">
        <div className="mt-8 grid gap-3 rounded-2xl border border-[#103f35]/12 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
          <input className="field-input lg:col-span-2" type="search" placeholder="Search course or university…" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search courses" />
          <select className="field-input" value={level} onChange={(e) => setLevel(e.target.value)} aria-label="Degree level">
            <option value="">All levels</option>
            {Object.entries(LEVEL_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="field-input" value={subject} onChange={(e) => setSubject(e.target.value)} aria-label="Subject">
            <option value="">All subjects</option>
            {Object.entries(SUBJECT_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
          <select className="field-input" value={language} onChange={(e) => setLanguage(e.target.value)} aria-label="Teaching language">
            <option value="">Any language</option>
            <option value="english">English</option>
            <option value="italian">Italian</option>
            <option value="both">Both</option>
          </select>
          <select className="field-input" value={uniId} onChange={(e) => setUniId(e.target.value)} aria-label="University">
            <option value="">All universities</option>
            {[...unis.values()].map((u) => <option key={u.id} value={u.id}>{u.name}</option>)}
          </select>
          <select className="field-input" value={year} onChange={(e) => setYear(e.target.value)} aria-label="Academic year">
            <option value="">All academic years</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <button type="button" className="btn-ghost" onClick={reset}>Reset filters</button>
        </div>

        {shortlist.length > 0 && (
          <p className="mt-4 text-sm text-[#202824]/70">♥ Your shortlist: {shortlist.length} saved in this browser.</p>
        )}

        {loading ? (
          <p className="mt-10 text-[#202824]/60" role="status">Loading courses…</p>
        ) : filtered.length === 0 ? (
          <div className="mt-10 rounded-2xl border border-dashed border-[#103f35]/25 p-10 text-center">
            <p className="font-display text-xl font-bold text-[#103f35]">No courses match those filters</p>
            <p className="mt-2 text-[#202824]/70">Our directory is growing. Meanwhile, the full official catalogue is on Universitaly.</p>
            <button type="button" className="btn-primary mt-5" onClick={reset}>Clear all filters</button>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <article key={c.id} className="card flex flex-col p-6">
                <div className="flex items-start justify-between gap-3">
                  <h2 className="font-display text-lg font-bold leading-snug text-[#103f35]">{c.name}</h2>
                  <VerifyBadge status={c.verificationStatus} />
                </div>
                <p className="mt-1.5 text-sm font-medium text-[#202824]/70">{unis.get(c.universityId)?.name} · {unis.get(c.universityId)?.city}</p>
                <p className="mt-2 text-[0.85rem] text-[#202824]/65">
                  {LEVEL_LABELS[c.level]} · {c.language === "english" ? "English-taught" : c.language === "italian" ? "Italian-taught" : "English & Italian"} · {c.durationYears ? `${c.durationYears} years` : "Duration: check official page"} · {c.credits ? `${c.credits} ECTS` : ""}
                </p>
                <p className="mt-2 text-[0.85rem] text-[#202824]/65">Fees: {c.tuitionNote}</p>
                <div className="mt-auto pt-5 flex flex-wrap gap-2">
                  <a className="btn-primary flex-1 !py-2.5 text-sm" href={detailHref("courses", c.slug)}>Details</a>
                  <button type="button" className="btn-ghost !py-2.5 text-sm" onClick={() => toggleShort(c.id)} aria-pressed={shortlist.includes(c.id)}>
                    {shortlist.includes(c.id) ? "♥ Saved" : "♡ Save"}
                  </button>
                  <button type="button" className="btn-ghost !py-2.5 text-sm" onClick={() => toggleCompare(c.id)} aria-pressed={compare.includes(c.id)}>
                    {compare.includes(c.id) ? "✓ Comparing" : "Compare"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}

        {compared.length > 0 && (
          <section className="mt-12" aria-label="Course comparison">
            <h2 className="font-display text-2xl font-bold text-[#103f35]">Compare courses</h2>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-[#103f35]/12 bg-white">
              <table className="w-full min-w-[560px] text-left text-[0.9rem]">
                <thead>
                  <tr className="border-b border-[#103f35]/10 bg-[#faf9f5]">
                    <th className="p-4 font-semibold text-[#103f35]">Programme</th>
                    {compared.map((c) => <th key={c.id} className="p-4 font-display font-bold text-[#103f35]">{c.name}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {([
                    ["University", (c: Course) => unis.get(c.universityId)?.name || ""],
                    ["Level", (c: Course) => LEVEL_LABELS[c.level]],
                    ["Language", (c: Course) => c.language],
                    ["Duration", (c: Course) => (c.durationYears ? `${c.durationYears} years` : "Not verified")],
                    ["Credits", (c: Course) => (c.credits ? `${c.credits} ECTS` : "Not verified")],
                    ["Fees", (c: Course) => c.tuitionNote],
                    ["Deadline", (c: Course) => c.deadlineNote],
                    ["Requirements", (c: Course) => c.requirements],
                  ] as [string, (c: Course) => string][]).map(([label, fn]) => (
                    <tr key={label} className="border-b border-[#103f35]/8 align-top">
                      <th className="p-4 font-semibold text-[#103f35] whitespace-nowrap">{label}</th>
                      {compared.map((c) => <td key={c.id} className="p-4 text-[#202824]/80">{fn(c)}</td>)}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <button type="button" className="btn-ghost mt-4" onClick={() => { setCompare([]); save(COMPARE_KEY, []); }}>Clear comparison</button>
          </section>
        )}
      </div>
    </div>
  );
}
